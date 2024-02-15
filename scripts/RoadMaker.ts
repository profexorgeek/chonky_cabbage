import {world, BlockPermutation, Vector3, Vector2 } from "@minecraft/server";
import Debug from "./Debug";

// For block definitions, see:
// https://www.npmjs.com/package/@minecraft/vanilla-data?activeTab=code
export default class RoadMaker {

  // these fields are used to keep track
  // of where we are in the current work
  // queue, allowing us to do long-running
  // work across multiple ticks
  private queueStartCoord: Vector3;
  private queueViewDirection: Vector3;
  private queueCurrentIteration: number;
  private queueRoadLength: number;
  private queueCardinalDirection: number;

  // these properties allow implementations to specify the specific
  // road style
  public Dimension =   "overworld";
  public Air =         BlockPermutation.resolve("minecraft:air");
  public Dirt =        BlockPermutation.resolve("minecraft:dirt");
  public Foundation =  BlockPermutation.resolve("minecraft:cobblestone");
  public Wall =        BlockPermutation.resolve("minecraft:cobblestone_wall");
  public Path =        BlockPermutation.resolve("minecraft:bamboo_planks");
  public Stair =       BlockPermutation.resolve("minecraft:bamboo_stair");
  public Post =        BlockPermutation.resolve("minecraft:bamboo_fence");
  public Light =       BlockPermutation.resolve("minecraft:lantern");

  // this maps block types to an integer index, allowing easy
  // creation of visual templates
  private blockInts:Array<BlockPermutation> =[
    this.Air,         //0
    this.Foundation,  //1
    this.Wall,        //2
    this.Path,        //3
    this.Post,        //4
    this.Light        //5
  ]

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
    1,0,0,0,1,
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

  // renders a single slice of road using the provided template. It uses the
  // coordinate as the bottom center of the template slice and transforms
  // based on the cardinal direction
  renderSlice(sliceTemplate: Array<number>, coord:Vector3, cardinalDirection: number)
  {
    const rowOffset = 4;
    const colOffset = -2;

    Debug.debug(`Rendering slice at ${Debug.printCoordinate3(coord)}`);

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

  

  createRoad(startCoord: Vector3, viewDirection: Vector3, length: number)
  {
    Debug.debug(`Starting ${length} road at ${Debug.printCoordinate3(startCoord)}.`)

    // round our look angle to a cardinal direction, expressed as an integer where 0 = East
    const cardinalInt = RoadMaker.getCardinalInteger(viewDirection);

    Debug.debug(`Our cardinal integer is: ${cardinalInt}`);

    // copy our provided vector into an object we can walk through
    let walkingCoord = {
      x: startCoord.x,
      y: startCoord.y,
      z: startCoord.z
    };

    // loop through our length, creating strips of road depending on our cardinal alignment
    // we are 1 indexed so the road starts just in front of the player, otherwise it
    // won't render correctly
    for(let i = 1; i <= length; i++)
    {
      let drawLights = i % 8 === 0;
      let drawSupports = i % 16 === 0;

      // dynamically set our length-walking coordinate
      let coordToChange: keyof Vector3 = cardinalInt % 2 == 0 ? "x" : "z";
      let directionModifier = cardinalInt > 1 ? -1 : 1;
      walkingCoord[coordToChange] = startCoord[coordToChange] + (i * directionModifier);

      // resolve our slice template
      let sliceTemplate = drawLights ? this.RoadNormalLit : this.RoadNormal;

      // figure out if we should be tunneling
      if(this.getBlock({x: walkingCoord.x, y: walkingCoord.y + 4, z: walkingCoord.z})?.permutation !== this.Air)
      {
        sliceTemplate = drawLights ? this.RoadTunnelLit : this.RoadTunnel;
      }

      // figure out if we are floating and need supports
      let supportY = {x: walkingCoord.x, y: walkingCoord.y - 1, z: walkingCoord.z}
      while(drawSupports && this.getBlock(supportY)?.permutation !== this.Air)
      {
        this.setBlock(this.Foundation, supportY);
        supportY.y -= 1;
      }

      // render our road
      this.renderSlice(sliceTemplate, walkingCoord, cardinalInt);
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

    return cardinal;
  }
}