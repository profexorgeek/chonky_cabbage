import {world, BlockPermutation, Vector3, Vector2 } from "@minecraft/server";
import Debug from "./Debug";

export default class RoadMaker {

  // creates a road of the provided length and block type
  // starting at the coordinates specified and at the view angle provided
  static makeSimpleRoad(
    blockPerm:BlockPermutation,
    length: number,
    width: number,
    coord: Vector3,
    viewDirection: Vector3
  )
  {
    // we use this to determine where to start the left border of the road
    let halfWidth = Math.ceil(width / 2);

    // we use this to determine whether the player is looking more Xward or Zward
    // which determines which dimension the road width applies to
    let dirMultiplier = (Math.abs(coord.x) > Math.abs(coord.z)) ?
      {x: 0, y: 1, z: 1} :
      {x: 1, y: 1, z: 0};

    for(var i = 0; i < length; i++)
    {
      for(var w = -halfWidth; w < halfWidth; w++)
      {
        let currentCoord = {
          x: Math.round(coord.x + (viewDirection.x * i)) + (w * dirMultiplier.x),
          y: coord.y,
          z: Math.round(coord.z + (viewDirection.z * i)) + (w * dirMultiplier.z)
        };
        this.setBlock(blockPerm, currentCoord);
      }
    }
  }

  
  // converts a view direction as an arbitrary 2d angle, into an angle that aligns
  // with the nearest cardinal coordinate
  static getViewDirectionAsCardinalClampedRadians(viewDirection: Vector3): number
  {
    const halfPi = Math.PI / 2;
    let viewAngle2d:number = Math.atan2(viewDirection.z, viewDirection.x);
    let cardinalDirection:number = Math.round(viewAngle2d / halfPi);
    let clampedAngle = cardinalDirection * halfPi;

    Debug.debug(`Clamped ${Debug.toDegrees(viewAngle2d)} to ${Debug.toDegrees(clampedAngle)}.`);

    return clampedAngle;
  }


  static makeRoadOld(coord: Vector3, viewDirection: Vector3, length: number)
  {
    Debug.debug(`Starting ${length} road at ${Debug.printCoordinate3(coord)}.`);
    
    // define our road blocks
    const foundation = BlockPermutation.resolve("minecraft:cobblestone");
    const wall = BlockPermutation.resolve("minecraft:cobblestone_wall");
    const path = BlockPermutation.resolve("minecraft:bamboo_planks");
    const post = BlockPermutation.resolve("minecraft:bamboo_fence");
    const light = BlockPermutation.resolve("minecraft:lantern");

    const lookAngle2d = Math.atan2(viewDirection.z, viewDirection.x);
    const cardinalInt = Math.round(lookAngle2d / Math.PI / 2);

    

  }

  static makeXAxisStrip(center:Vector3)
  {
    const foundation =  BlockPermutation.resolve("minecraft:cobblestone");
    const wall =        BlockPermutation.resolve("minecraft:cobblestone_wall");
    const path =        BlockPermutation.resolve("minecraft:bamboo_planks");
    const post =        BlockPermutation.resolve("minecraft:bamboo_fence");
    const light =       BlockPermutation.resolve("minecraft:lantern");

    this.setBlock(foundation,{x:center.x,y:center.y,z:center.z+2});
    this.setBlock(wall,{x:center.x,y:center.y,z:center.z+1});
    this.setBlock(wall,{x:center.x,y:center.y,z:center.z});
    this.setBlock(wall,{x:center.x,y:center.y,z:center.z-1});
    this.setBlock(foundation,{x:center.x,y:center.y,z:center.z-2});
  }

  static makeYAxisStrip(center:Vector3)
  {
    
  }



  // makes a pretty road starting at "coord", extending "length" and in the
  // nearest straight direction
  static makeRoadOld(coord: Vector3, viewDirection: Vector3, length: number)
  {
    Debug.debug(`Starting ${length} road at ${Debug.printCoordinate3(coord)}.`);
    
    // define our road blocks
    const foundation = BlockPermutation.resolve("minecraft:cobblestone");
    const wall = BlockPermutation.resolve("minecraft:cobblestone_wall");
    const path = BlockPermutation.resolve("minecraft:bamboo_planks");
    const post = BlockPermutation.resolve("minecraft:bamboo_fence");
    const light = BlockPermutation.resolve("minecraft:lantern");

    // get an angle that is clamped to cardinal directions
    let angle = this.getViewDirectionAsCardinalClampedRadians(viewDirection);
    let direction = {x: Math.cos(angle), y:1, z:Math.sin(angle)};

    Debug.debug(`Got matrix: ${Debug.printCoordinate3(direction)}`);

    // walk the path length
    for(let i = 0; i < length; i++)
    {





      // left wall foundation
      this.setBlock(foundation, {
        x: coord.x + (direction.x * i) + (direction.z * 2),
        y: coord.y,
        z: coord.z + (direction.z * i) - (direction.x * 0)
      });

      // left wall
      this.setBlock(wall, {
        x: coord.x + (direction.x * i) + (direction.z * 2),
        y: coord.y + 1,
        z: coord.z + (direction.z * i) - (direction.x * 0)
      });
      
      // left path block
      this.setBlock(path, {
        x: coord.x + (direction.x * i) + (direction.z * 1),
        y: coord.y,
        z: coord.z + (direction.z * i) - (direction.x * 0)
      });

      // center path block
      this.setBlock(path, {
        x: coord.x + (direction.x * i) + (direction.z * 0),
        y: coord.y,
        z: coord.z + (direction.z * i) - (direction.x * 0)
      });

      // right path block
      this.setBlock(path, {
        x: coord.x + (direction.x * i) + (direction.z * -1),
        y: coord.y,
        z: coord.z + (direction.z * i) - (direction.x * 0)
      });

      // right wall foundation
      this.setBlock(foundation, {
        x: coord.x + (direction.x * i) + (direction.z * -2),
        y: coord.y,
        z: coord.z + (direction.z * i) - (direction.x * 0)
      });

      // right wall
      this.setBlock(wall, {
        x: coord.x + (direction.x * i) + (direction.z * -2),
        y: coord.y + 1,
        z: coord.z + (direction.z * i) - (direction.x * 0)
      });

      // every 8 blocks, place light posts
      if(i % 8 == 0)
      {
        // left posts and light
        this.setBlock(post, {
          x: coord.x + (direction.x * i) + (direction.z * 2),
          y: coord.y + 2,
          z: coord.z + (direction.z * i) - (direction.x * 0)
        });
        this.setBlock(post, {
          x: coord.x + (direction.x * i) + (direction.z * 2),
          y: coord.y + 3,
          z: coord.z + (direction.z * i) - (direction.x * 0)
        });
        this.setBlock(light, {
          x: coord.x + (direction.x * i) + (direction.z * 2),
          y: coord.y + 4,
          z: coord.z + (direction.z * i) - (direction.x * 0)
        });

        // right posts and light
        this.setBlock(post, {
          x: coord.x + (direction.x * i) + (direction.z * -2),
          y: coord.y + 2,
          z: coord.z + (direction.z * i) - (direction.x * 0)
        });
        this.setBlock(post, {
          x: coord.x + (direction.x * i) + (direction.z * -2),
          y: coord.y + 3,
          z: coord.z + (direction.z * i) - (direction.x * 0)
        });
        this.setBlock(light, {
          x: coord.x + (direction.x * i) + (direction.z * -2),
          y: coord.y + 4,
          z: coord.z + (direction.z * i) - (direction.x * 0)
        });
      }
    }
  }

  static get2dPositionOffsetFromAngle(offset: Vector3, angle:number)
  {
    return {
      x: Math.round(Math.cos(angle) * offset.x),
      y: 1,
      z: Math.round(Math.sin(angle) * offset.z)
    };
  }

  static multiplyVector3(vec: Vector3, multiplier: number): Vector3
  {
    return {
      x:vec.x*multiplier,
      y:vec.y*multiplier,
      z:vec.z*multiplier};
  }

  // sets the block at the provided coordinates to the provided permutation
  static setBlock(
    blockPerm:BlockPermutation,
    coord:Vector3
  ) {
    Debug.debug(`Setting block at ${Debug.printCoordinate3(coord)}.`);
    const overworld = world.getDimension("overworld");
    overworld.getBlock(coord)?.setPermutation(blockPerm);
  }
}