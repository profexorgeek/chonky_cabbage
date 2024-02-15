import {world, BlockPermutation, Vector3, Vector2, Block } from "@minecraft/server";
import Debug from "./Debug";

// For block definitions, see:
// https://www.npmjs.com/package/@minecraft/vanilla-data?activeTab=code
export default class RoadMaker {

  // these fields are used to keep track
  // of where we are in the current work
  // queue, allowing us to do long-running
  // work across multiple ticks
  private queueInProgress: boolean = false;
  private queueStartCoord: Vector3 = {x:0,y:0,z:0};
  private queueWalkingCoord: Vector3 = {x:0,y:0,z:0};
  private queueViewDirection: Vector3 = {x:0,y:0,z:0};
  private queueCurrentIteration: number = 0;
  private queueRoadLength: number = 0;
  private queueCardinalDirection: number = 0;

  // max amount of road slices that will be processed in a
  // single tick
  private SlicesPerTick:number = 2;

  // max distance bridge supports can go
  private MaxBridgeSupportHeight:number = 64;

  private StairDirectionStateName:string = "weirdo_direction";

  // these properties allow implementations to specify the specific
  // road style
  public Dimension =   "overworld";
  public Air =         BlockPermutation.resolve("minecraft:air");
  public Dirt =        BlockPermutation.resolve("minecraft:dirt");
  public Foundation =  BlockPermutation.resolve("minecraft:cobblestone");
  public Wall =        BlockPermutation.resolve("minecraft:cobblestone_wall");
  public Path =        BlockPermutation.resolve("minecraft:bamboo_planks");
  public Post =        BlockPermutation.resolve("minecraft:bamboo_fence");
  public Light =       BlockPermutation.resolve("minecraft:lantern");
  public Stair =       BlockPermutation.resolve("minecraft:bamboo_stairs");

  // this maps block types to an integer index, allowing easy
  // creation of visual templates
  private blockInts:Array<BlockPermutation> =[
    this.Air,         //0
    this.Foundation,  //1
    this.Wall,        //2
    this.Path,        //3
    this.Post,        //4
    this.Light,       //5
    this.Stair        //6
  ]

  // converts my cardinal directions into stair cardinal
  // directions
  private stairCardinalConversion:Array<number> = [
    0, // cardinal west 0 = stair west 0
    2, // cardinal south 1 = stair south 3
    1, // cardinal east 2 = stair east 1
    3  // cardinal north 3 = stair north 2
  ];

  // these are template 5x5 "slices" of a type of road. These use the
  // int list above to resolve blocks when rendering the slice
  private RoadNormal:Array<number> = [
    0,0,0,0,0,
    0,0,0,0,0,
    0,0,0,0,0,
    2,0,0,0,2,
    1,3,3,3,1];

  private RoadNormalLit:Array<number> = [
    5,0,0,0,5,
    4,0,0,0,4,
    4,0,0,0,4,
    2,0,0,0,2,
    1,3,3,3,1];
  
  private RoadTunnel:Array<number> = [
    1,3,3,3,1,
    1,0,0,0,1,
    1,0,0,0,1,
    1,0,0,0,1,
    1,3,3,3,1];

  private RoadTunnelLit:Array<number> = [
    1,3,3,3,1,
    1,0,0,0,1,
    5,0,0,0,5,
    1,0,0,0,1,
    1,3,3,3,1];

  private RoadStairNormal:Array<number> = [
    0,0,0,0,0,
    0,0,0,0,0,
    2,0,0,0,2,
    1,6,6,6,1,
    1,3,3,3,1];

    private RoadStairLit:Array<number> = [
      0,0,0,0,0,
      5,0,0,0,5,
      2,0,0,0,2,
      1,6,6,6,1,
      1,3,3,3,1];


  constructor()
  {
    Debug.debug("RoadMaker has been created...");
  }

  // returns whether a road is being built
  isRoadInProgress() :boolean
  {
    return this.queueInProgress;
  }

  // returns where the road building is occuring so progress
  // can be traced
  getWorkPoint():Vector3
  {
    return this.queueWalkingCoord;
  }

  cancelRoad() {
    this.queueInProgress = false;
    this.queueStartCoord = {x:0,y:0,z:0};
    this.queueWalkingCoord = {x:0,y:0,z:0};
    this.queueViewDirection = {x:0,y:0,z:0};
    this.queueCurrentIteration = 0;
    this.queueRoadLength = 0;
    this.queueCardinalDirection = 0;
  }


  tryAssignBlockType(blockKey:string, blockType:string)
  {
    try {
      Debug.debug(`Setting ${blockKey} to ${blockType}`);
      let block = BlockPermutation.resolve(blockType);
      switch(blockKey){
        case "Foundation":
          this.Foundation = block;
          break;
        case "Wall":
          this.Wall = block;
          break;
        case "Path":
          this.Path = block;
          break;
        case "Post":
          this.Post = block;
          break;
        case "Light":
          this.Light = block;
          break;
        case "Stair":
          this.Stair = block;
          break;
      }

      this.blockInts =[
        this.Air,         //0
        this.Foundation,  //1
        this.Wall,        //2
        this.Path,        //3
        this.Post,        //4
        this.Light,       //5
        this.Stair        //6
      ];
    }
    catch(e)
    {
      Debug.error(`Couldn't locate block type: ${blockType}`);
      return;
    }
    
    
  }

  // starts building a new road at the provided coordinates, in the provided view direction
  // of the provided length.
  startNewRoad(startCoord: Vector3, viewDirection: Vector3, length: number)
  {
    // EARLY OUT: road already in progress
    if(this.queueInProgress === true)
    {
      Debug.warn("Cannot start a new road until the road in progress has completed.");
      return;
    }

    this.queueInProgress = true;
    this.queueCardinalDirection = RoadMaker.getCardinalInteger(viewDirection);
    this.queueCurrentIteration = 0;
    this.queueStartCoord = startCoord;
    this.queueViewDirection = viewDirection;
    this.queueRoadLength = length;

    // copy our provided vector into an object we can walk through
    this.queueWalkingCoord = {
      x: startCoord.x,
      y: startCoord.y,
      z: startCoord.z
    };

    Debug.debug(`Starting road(${length}) at ${Debug.printCoordinate3(startCoord)} and direction ${this.queueCardinalDirection}.`);
  }

  // builds a road segment for this tick, updates the inProgress status
  // if the road has been completed
  tryTickIteration() {

    // EARLY OUT: nothing in progress
    if(this.queueInProgress === false) {
      return;
    }

    Debug.debug(`Building road: ${this.queueCurrentIteration}/${this.queueRoadLength}`);

    let tickMaxIteration = this.queueCurrentIteration + this.SlicesPerTick;
    let thisTickEnd = Math.min(this.queueRoadLength, tickMaxIteration);

    // loop through our length, creating strips of road depending on our cardinal alignment
    // we are 1 indexed so the road starts just in front of the player, otherwise it
    // won't render correctly
    for(let i = this.queueCurrentIteration + 1; i <= thisTickEnd; i++)
    {
      let drawLights = i % 8 === 0;
      let drawSupports = i % 16 === 0;
      let changeY = 0;

      // dynamically set our length-walking coordinate
      let coordToChange: keyof Vector3 = this.queueCardinalDirection % 2 == 0 ? "x" : "z";
      let directionModifier = this.queueCardinalDirection > 1 ? -1 : 1;
      this.queueWalkingCoord[coordToChange] = this.queueStartCoord[coordToChange] + (i * directionModifier);

      // resolve our slice template
      let sliceTemplate = drawLights ? this.RoadNormalLit : this.RoadNormal;

      // if the second block is not air, we should stair up and raise our road elevation
      if(this.getBlock({x: this.queueWalkingCoord.x, y: this.queueWalkingCoord.y + 1, z: this.queueWalkingCoord.z})?.permutation !== this.Air)
      {
        sliceTemplate = drawLights ? this.RoadStairLit : this.RoadStairNormal;
        changeY = +1;
      }

      // if the top block is not air, we should tunnel
      if(this.getBlock({x: this.queueWalkingCoord.x, y: this.queueWalkingCoord.y + 4, z: this.queueWalkingCoord.z})?.permutation !== this.Air)
      {
        sliceTemplate = drawLights ? this.RoadTunnelLit : this.RoadTunnel;
      }

      // figure out if we are floating and need supports
      let supportY = {x: this.queueWalkingCoord.x, y: this.queueWalkingCoord.y - 1, z: this.queueWalkingCoord.z}
      let supportHeight = 0;
      while(drawSupports && this.getBlock(supportY)?.permutation !== this.Dirt && supportHeight < this.MaxBridgeSupportHeight)
      {
        try{
          this.setBlock(this.Foundation, supportY);
          supportY.y -= 1;
          supportHeight++;
        }
        catch(e)
        {
          break;
        }
      }

      try {
        // render our road
        this.renderSlice(sliceTemplate, this.queueWalkingCoord, this.queueCardinalDirection);

        // apply any Y change
        this.queueWalkingCoord.y += changeY;
      }
      catch(e)
      {
        Debug.error(`Failed to render road slice: ${e}.`);
      }
    }

    this.queueCurrentIteration = thisTickEnd;
    if(thisTickEnd == this.queueRoadLength)
    {
      this.queueInProgress = false;
    }
  }

  // renders a single slice of road using the provided template. It uses the
  // coordinate as the bottom center of the template slice and transforms
  // based on the cardinal direction
  renderSlice(sliceTemplate: Array<number>, coord:Vector3, cardinalDirection: number)
  {
    const rowOffset = 4;
    const colOffset = -2;

    Debug.trace(`Rendering slice at ${Debug.printCoordinate3(coord)}`);

    // loop through each row in the slice template,
    // we start at 5 above the starting coord and loop
    // in reverse so we render the slice from the top
    // left
    for(let row = 0; row < 5; row++)
    {
      // loop through each column in this row,
      // we start at -2 so that we start rendering
      // blocks to the left of the starting coord
      // and center the slice at the bottom center block
      for(let col = 0; col < 5; col++)
      {
        // get the block int from the slice template
        var blockIndex = sliceTemplate[(row * 5) + col];

        // resolve the block type based on the int
        var block = this.blockInts[blockIndex];

        // this block is a stair, set direction based on cardinal direction
        if(blockIndex == 6)
        {
          let stairBit = this.stairCardinalConversion[this.queueCardinalDirection];
          Debug.trace(`Setting stair bit for ${cardinalDirection} to ${stairBit}.`);
          block = block.withState(this.StairDirectionStateName, stairBit);
        }

        // transform our slice based on the cardinal direction
        switch(cardinalDirection)
        {
          case 0: // west
            this.setBlock(block, {
              x: coord.x,
              y: coord.y + (rowOffset - row),
              z: coord.z + (colOffset + col)
            });
            break;
          case 1: // south
            this.setBlock(block, {
              x: coord.x + (colOffset + col),
              y: coord.y + (rowOffset - row),
              z: coord.z
            });
            break;
          case 2: // east
            this.setBlock(block, {
              x: coord.x,
              y: coord.y + (rowOffset - row),
              z: coord.z - (colOffset + col)
            });
            break;
          case 3: // north
            this.setBlock(block, {
              x: coord.x - (colOffset + col),
              y: coord.y + (rowOffset - row),
              z: coord.z
            });
            break;
        }
      }
    }
  }

  // sets the block at the provided coordinates to the provided permutation
  setBlock(blockPerm:BlockPermutation, coord:Vector3) {
    Debug.trace(`Setting block at ${Debug.printCoordinate3(coord)}.`);
    this.getBlock(coord)?.setPermutation(blockPerm);
  }

  // gets the block at the provided coordinates
  getBlock(coord: Vector3)
  {
    const overworld = world.getDimension(this.Dimension);
    return overworld.getBlock(coord)
  }

  // gets a cardinally-aligned value expressed as an integer where
  // 0 = West
  // 1 = South
  // 2 = East
  // 3 = North
  static getCardinalInteger(viewDirection:Vector3): number
  {
    // figure out our 2d look angle
    let lookAngle2d = Math.atan2(viewDirection.z, viewDirection.x);

    // regulate our angle so it's positive
    while(lookAngle2d < 0)
    {
      lookAngle2d += (Math.PI * 2);
    }

    // clamp our look angle to a cardinal coordinate
    let cardinal = Math.round(lookAngle2d / (Math.PI / 2));

    // clamp our look angle to 0 - 3
    cardinal = cardinal > 3 ? 0 : cardinal;

    Debug.trace(`Calculated cardinal direction at ${cardinal}.`);
    return cardinal;
  }
}