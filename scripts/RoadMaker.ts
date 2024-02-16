import {world, BlockPermutation, Vector3, Vector2, Block } from "@minecraft/server";
import Debug from "./Debug";

export enum WorkType {
  None,
  Road,
  StairsUp,
  StairsDown,
  Corner
}

// For block definitions, see:
// https://www.npmjs.com/package/@minecraft/vanilla-data?activeTab=code
export default class RoadMaker {

  // these fields are used to keep track
  // of where we are in the current work
  // queue, allowing us to do long-running
  // work across multiple ticks
  private qInProgress: boolean = false;
  private qStartCoord: Vector3 = {x:0,y:0,z:0};
  private qCurrentCoord: Vector3 = {x:0,y:0,z:0};
  private qViewDir: Vector3 = {x:0,y:0,z:0};
  private qIteration: number = 0;
  private qLength: number = 0;
  private qCardinal: number = 0;
  private qWorkType:WorkType = WorkType.None;

  // max amount of road slices that will be processed in a
  // single tick
  private SlicesPerTick:number = 2;

  // max distance bridge supports can go
  private MaxBridgeSupportHeight:number = 64;

  // name of the state that affects stair direction
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
    1,1,1,1,1];

    private RoadStairLit:Array<number> = [
    0,0,0,0,0,
    5,0,0,0,5,
    2,0,0,0,2,
    1,6,6,6,1,
    1,1,1,1,1];


  constructor()
  {
    Debug.debug("RoadMaker has been created...");
  }

  // returns whether a road is being built
  isRoadInProgress() :boolean
  {
    return this.qInProgress;
  }

  // returns where the road building is occuring so progress
  // can be traced
  getWorkPoint():Vector3
  {
    return this.qCurrentCoord;
  }

  cancelRoad() {
    this.qInProgress = false;
    this.qStartCoord = {x:0,y:0,z:0};
    this.qCurrentCoord = {x:0,y:0,z:0};
    this.qViewDir = {x:0,y:0,z:0};
    this.qIteration = 0;
    this.qLength = 0;
    this.qCardinal = 0;
    this.qWorkType = WorkType.None;
  }


  tryAssignBlockType(blockKey:string, blockType:string)
  {
    try {
      blockType = "minecraft:"+blockType;
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

      // reset array
      this.blockInts =[
        this.Air,         //0
        this.Foundation,  //1
        this.Wall,        //2
        this.Path,        //3
        this.Post,        //4
        this.Light,       //5
        this.Stair        //6
      ];
      Debug.info(`Set ${blockKey} to ${blockType}`);
    }
    catch(e)
    {
      Debug.error(`Couldn't locate block type: ${blockType}`);
      return;
    }
  }

  // starts building a new road at the provided coordinates, in the provided view direction
  // of the provided length.
  startNewRoad(startCoord: Vector3, viewDirection: Vector3, length: number, type:WorkType = WorkType.Road)
  {
    // EARLY OUT: road already in progress
    if(this.qInProgress === true)
    {
      Debug.warn("Cannot start a new road until the road in progress has completed.");
      return;
    }

    this.qInProgress = true;
    this.qCardinal = RoadMaker.getCardinalInteger(viewDirection);
    this.qIteration = 0;
    this.qStartCoord = startCoord;
    this.qViewDir = viewDirection;
    this.qLength = length;
    this.qWorkType = type;

    // copy our provided vector into an object we can walk through
    this.qCurrentCoord = {
      x: startCoord.x,
      y: startCoord.y,
      z: startCoord.z
    };

    Debug.debug(`Starting road(${length}) at ${Debug.printCoordinate3(startCoord)} and direction ${this.qCardinal}.`);
  }

  // builds a road segment for this tick, updates the inProgress status
  // if the road has been completed
  tryTickIteration() {

    // EARLY OUT: nothing in progress
    if(this.qInProgress === false) {
      return;
    }

    Debug.debug(`Building road: ${this.qIteration}/${this.qLength}`);

    let tickMaxIteration = this.qIteration + this.SlicesPerTick;
    let thisTickEnd = Math.min(this.qLength, tickMaxIteration);

    // loop through our length, creating strips of road depending on our cardinal alignment
    // we are 1 indexed so the road starts just in front of the player, otherwise it
    // won't render correctly
    for(let i = this.qIteration + 1; i <= thisTickEnd; i++)
    {
      switch(this.qWorkType) {
        case WorkType.Road :
          this.makeRoad(i);
          break;
        case WorkType.StairsUp:
          this.makeStair(i, +1);
          break;
        case WorkType.StairsDown:
          this.makeStair(i, -1);
          break;
      }
    }

    this.qIteration = thisTickEnd;
    if(thisTickEnd == this.qLength)
    {
      this.cancelRoad();
    }
  }

  private makeStair(i:number, dir:number = +1) {
    let drawLights = i % 8 === 0;
    let drawSupports = i % 16 === 0;

    // dynamically set our length-walking coordinate
    let coordToChange: keyof Vector3 = this.qCardinal % 2 == 0 ? "x" : "z";
    let directionModifier = this.qCardinal > 1 ? -1 : 1;
    this.qCurrentCoord[coordToChange] = this.qStartCoord[coordToChange] + (i * directionModifier);

    let sliceTemplate = drawLights ? this.RoadStairLit : this.RoadStairNormal;

    if(dir > 0)
    {
      this.renderSlice(sliceTemplate, this.qCurrentCoord, this.qCardinal, false);
      this.qCurrentCoord.y++;
    }
    else {
      this.qCurrentCoord.y--;
      this.renderSlice(sliceTemplate, this.qCurrentCoord, this.qCardinal, true);
    }
  }

  private makeRoad(i:number) {
    let drawLights = i % 8 === 0;
    let drawSupports = i % 16 === 0;

    // dynamically set our length-walking coordinate
    let coordToChange: keyof Vector3 = this.qCardinal % 2 == 0 ? "x" : "z";
    let directionModifier = this.qCardinal > 1 ? -1 : 1;
    this.qCurrentCoord[coordToChange] = this.qStartCoord[coordToChange] + (i * directionModifier);

    let sliceTemplate = drawLights ? this.RoadNormalLit : this.RoadNormal;

    // if the top block is not air, we should tunnel
    if(this.getBlock({x: this.qCurrentCoord.x, y: this.qCurrentCoord.y + 3, z: this.qCurrentCoord.z})?.permutation !== this.Air)
    {
      sliceTemplate = drawLights ? this.RoadTunnelLit : this.RoadTunnel;
    }

    // generate supports
    let supportY = {x: this.qCurrentCoord.x, y: this.qCurrentCoord.y - 1, z: this.qCurrentCoord.z}
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

    this.renderSlice(sliceTemplate, this.qCurrentCoord, this.qCardinal, false);
  }

  // renders a single slice of road using the provided template. It uses the
  // coordinate as the bottom center of the template slice and transforms
  // based on the cardinal direction
  private renderSlice(sliceTemplate: Array<number>, coord:Vector3, cardinalDirection: number, invertStairs: boolean = false)
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
          let stairCard = invertStairs ? RoadMaker.invertCardinalInteger(this.qCardinal) : this.qCardinal;
          let stairBit = this.stairCardinalConversion[stairCard];
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
  private setBlock(blockPerm:BlockPermutation, coord:Vector3) {
    Debug.trace(`Setting block at ${Debug.printCoordinate3(coord)}.`);
    this.getBlock(coord)?.setPermutation(blockPerm);
  }

  // gets the block at the provided coordinates
  private getBlock(coord: Vector3)
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

  // inverts a cardinally-aligned value
  static invertCardinalInteger(cardinal: number): number
  {
    let inverse = cardinal + 2;
    while(inverse > 3)
    {
      inverse -= 4
    }
    Debug.debug(`Inverting cardingal ${cardinal} to get ${inverse}`);
    return inverse;
  }
}