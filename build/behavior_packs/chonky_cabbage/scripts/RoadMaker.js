import { world, BlockPermutation } from "@minecraft/server";
import Debug from "./Debug";
export var WorkType;
(function (WorkType) {
    WorkType[WorkType["None"] = 0] = "None";
    WorkType[WorkType["Road"] = 1] = "Road";
    WorkType[WorkType["Rail"] = 2] = "Rail";
    WorkType[WorkType["StairsUp"] = 3] = "StairsUp";
    WorkType[WorkType["StairsDown"] = 4] = "StairsDown";
    WorkType[WorkType["RailUp"] = 5] = "RailUp";
    WorkType[WorkType["RailDown"] = 6] = "RailDown";
    WorkType[WorkType["CornerLeft"] = 7] = "CornerLeft";
    WorkType[WorkType["CornerRight"] = 8] = "CornerRight";
    WorkType[WorkType["TeeLeft"] = 9] = "TeeLeft";
    WorkType[WorkType["TeeRight"] = 10] = "TeeRight";
    WorkType[WorkType["Intersection"] = 11] = "Intersection";
})(WorkType || (WorkType = {}));
// For block definitions, see:
// https://www.npmjs.com/package/@minecraft/vanilla-data?activeTab=code
export default class RoadMaker {
    constructor() {
        // these fields are used to keep track
        // of where we are in the current work
        // queue, allowing us to do long-running
        // work across multiple ticks
        this.qInProgress = false;
        this.qStartCoord = { x: 0, y: 0, z: 0 };
        this.qCurrentCoord = { x: 0, y: 0, z: 0 };
        this.qViewDir = { x: 0, y: 0, z: 0 };
        this.qIteration = 0;
        this.qLength = 0;
        this.qCardinal = 0;
        this.qWorkType = WorkType.None;
        this.SlicesPerTick = 2;
        this.MaxBridgeSupportHeight = 64;
        this.StairDirectionStateName = "weirdo_direction";
        this.DistanceBetweenLights = 8;
        this.DistanceBetweenSupports = 16;
        this.DistanceBetweenFancy = 16;
        // these properties allow implementations to specify the specific
        // road style
        this.Dimension = "overworld";
        this.Air = BlockPermutation.resolve("minecraft:air");
        this.Dirt = BlockPermutation.resolve("minecraft:dirt");
        this.Foundation = BlockPermutation.resolve("minecraft:cobblestone");
        this.Wall = BlockPermutation.resolve("minecraft:cobblestone_wall");
        this.Path = BlockPermutation.resolve("minecraft:bamboo_planks");
        this.Post = BlockPermutation.resolve("minecraft:bamboo_fence");
        this.Light = BlockPermutation.resolve("minecraft:lantern");
        this.Stair = BlockPermutation.resolve("minecraft:bamboo_stairs");
        this.Rail = BlockPermutation.resolve("minecraft:rail");
        this.GoldenRail = BlockPermutation.resolve("minecraft:golden_rail");
        this.RedTorch = BlockPermutation.resolve("minecraft:redstone_torch");
        // this maps block types to an integer index, allowing easy
        // creation of visual templates
        this.blockInts = [
            this.Air,
            this.Foundation,
            this.Wall,
            this.Path,
            this.Post,
            this.Light,
            this.Stair,
            this.Rail,
            this.GoldenRail,
            this.RedTorch, //9
        ];
        // converts my cardinal directions into stair cardinal
        // directions
        this.stairCardinalConversion = [
            0,
            2,
            1,
            3, // cardinal north 3 = stair north 2
        ];
        // these are template 5x5 "slices" of a type of road. These use the
        // int list above to resolve blocks when rendering the slice
        this.RoadNormal = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            2, 0, 0, 0, 2,
            1, 3, 3, 3, 1
        ];
        this.RoadNormalLit = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            5, 0, 0, 0, 5,
            2, 0, 0, 0, 2,
            1, 3, 3, 3, 1
        ];
        this.RoadFancy = [
            5, 0, 0, 0, 5,
            4, 0, 0, 0, 4,
            4, 0, 0, 0, 4,
            2, 0, 0, 0, 2,
            1, 3, 3, 3, 1
        ];
        this.RoadTunnel = [
            1, 3, 3, 3, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 3, 3, 3, 1
        ];
        this.RoadTunnelLit = [
            1, 3, 3, 3, 1,
            3, 0, 0, 0, 3,
            5, 0, 0, 0, 5,
            3, 0, 0, 0, 3,
            1, 3, 3, 3, 1
        ];
        this.RoadTunnelFancy = [
            1, 1, 1, 1, 1,
            1, 0, 0, 0, 1,
            5, 0, 0, 0, 5,
            1, 0, 0, 0, 1,
            1, 1, 1, 1, 1
        ];
        this.RoadStairNormal = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            2, 0, 0, 0, 2,
            1, 6, 6, 6, 1,
            1, 1, 1, 1, 1
        ];
        this.RoadStairLit = [
            5, 0, 0, 0, 5,
            4, 0, 0, 0, 4,
            2, 0, 0, 0, 2,
            1, 6, 6, 6, 1,
            1, 1, 1, 1, 1
        ];
        this.RailNormal = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            2, 0, 8, 0, 2,
            1, 3, 3, 3, 1
        ];
        this.RailLit = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            5, 0, 0, 0, 5,
            2, 0, 8, 9, 2,
            1, 3, 3, 3, 1
        ];
        this.RailFancy = [
            5, 0, 0, 0, 5,
            4, 0, 0, 0, 4,
            4, 0, 0, 0, 4,
            2, 0, 8, 9, 2,
            1, 3, 3, 3, 1
        ];
        this.RailTunnel = [
            1, 3, 3, 3, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 8, 0, 1,
            1, 3, 3, 3, 1
        ];
        this.RailTunnelLit = [
            1, 3, 3, 3, 1,
            3, 0, 0, 0, 3,
            5, 0, 0, 0, 5,
            3, 0, 8, 9, 3,
            1, 3, 3, 3, 1
        ];
        this.RailTunnelFancy = [
            1, 1, 1, 1, 1,
            1, 0, 0, 0, 1,
            5, 0, 0, 0, 5,
            1, 0, 8, 9, 1,
            1, 1, 1, 1, 1
        ];
        this.RailStairNormal = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            2, 0, 0, 0, 2,
            1, 6, 8, 0, 1,
            1, 1, 1, 1, 1
        ];
        this.RailStairLit = [
            5, 0, 0, 0, 5,
            4, 0, 0, 0, 4,
            2, 0, 0, 0, 2,
            1, 6, 8, 9, 1,
            1, 1, 1, 1, 1
        ];
        Debug.debug("RoadMaker has been created...");
    }
    // returns whether a road is being built
    isRoadInProgress() {
        return this.qInProgress;
    }
    // returns where the road building is occuring so progress
    // can be traced
    getWorkPoint() {
        return this.qCurrentCoord;
    }
    cancelRoad() {
        this.qInProgress = false;
        this.qStartCoord = { x: 0, y: 0, z: 0 };
        this.qCurrentCoord = { x: 0, y: 0, z: 0 };
        this.qViewDir = { x: 0, y: 0, z: 0 };
        this.qIteration = 0;
        this.qLength = 0;
        this.qCardinal = 0;
        this.qWorkType = WorkType.None;
    }
    tryAssignBlockType(blockKey, blockType) {
        try {
            blockType = "minecraft:" + blockType;
            let block = BlockPermutation.resolve(blockType);
            switch (blockKey) {
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
            this.blockInts = [
                this.Air,
                this.Foundation,
                this.Wall,
                this.Path,
                this.Post,
                this.Light,
                this.Stair, //6
            ];
            Debug.info(`Set ${blockKey} to ${blockType}`);
        }
        catch (e) {
            Debug.error(`Couldn't locate block type: ${blockType}`);
            return;
        }
    }
    // starts building a new road at the provided coordinates, in the provided view direction
    // of the provided length.
    startNewRoad(startCoord, viewDirection, length, type = WorkType.Road) {
        // EARLY OUT: road already in progress
        if (this.qInProgress === true) {
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
            z: startCoord.z,
        };
        Debug.debug(`Starting road(${length}) at ${Debug.printCoordinate3(startCoord)} and direction ${this.qCardinal}.`);
    }
    // builds a road segment for this tick, updates the inProgress status
    // if the road has been completed
    tryTickIteration() {
        // EARLY OUT: nothing in progress
        if (this.qInProgress === false) {
            return;
        }
        Debug.debug(`Building road: ${this.qIteration}/${this.qLength}`);
        let tickMaxIteration = this.qIteration + this.SlicesPerTick;
        let thisTickEnd = Math.min(this.qLength, tickMaxIteration);
        // loop through our length, creating strips of road depending on our cardinal alignment
        // we are 1 indexed so the road starts just in front of the player, otherwise it
        // won't render correctly
        for (let i = this.qIteration + 1; i <= thisTickEnd; i++) {
            switch (this.qWorkType) {
                case WorkType.Road:
                    this.makeRoad(i, this.RoadNormal, this.RoadNormalLit, this.RoadFancy, this.RoadTunnel, this.RoadTunnelLit, this.RoadTunnelFancy);
                    break;
                case WorkType.StairsUp:
                    this.makeStair(i, +1, this.RoadStairNormal, this.RoadStairLit);
                    break;
                case WorkType.StairsDown:
                    this.makeStair(i, -1, this.RoadStairNormal, this.RoadStairLit);
                    break;
                case WorkType.RailUp:
                    this.makeStair(i, +1, this.RailStairNormal, this.RailStairLit);
                    break;
                case WorkType.RailDown:
                    this.makeStair(i, -1, this.RailStairNormal, this.RailStairLit);
                    break;
                case WorkType.Rail:
                    this.makeRoad(i, this.RailNormal, this.RailLit, this.RailFancy, this.RailTunnel, this.RailTunnelLit, this.RailTunnelFancy);
                    break;
            }
        }
        this.qIteration = thisTickEnd;
        if (thisTickEnd == this.qLength) {
            this.cancelRoad();
        }
    }
    makeStair(i, dir = +1, stairNormal, stairLit) {
        let drawLights = i % 8 === 0;
        let drawSupports = i % 16 === 0;
        // dynamically set our length-walking coordinate
        let coordToChange = this.qCardinal % 2 == 0 ? "x" : "z";
        let directionModifier = this.qCardinal > 1 ? -1 : 1;
        this.qCurrentCoord[coordToChange] = this.qStartCoord[coordToChange] + i * directionModifier;
        let sliceTemplate = drawLights ? stairLit : stairNormal;
        if (dir > 0) {
            this.renderSlice(sliceTemplate, this.qCurrentCoord, this.qCardinal, false);
            this.qCurrentCoord.y++;
        }
        else {
            this.qCurrentCoord.y--;
            this.renderSlice(sliceTemplate, this.qCurrentCoord, this.qCardinal, true);
        }
    }
    makeRoad(i, normalSlice, litSlice, fancySlice, normalTunnel, litTunnel, fancyTunnel) {
        let drawLights = i % this.DistanceBetweenLights === 0;
        let drawSupports = i % this.DistanceBetweenSupports === 0;
        let drawFancy = i % this.DistanceBetweenFancy === 0;
        // dynamically set our length-walking coordinate
        let coordToChange = this.qCardinal % 2 == 0 ? "x" : "z";
        let directionModifier = this.qCardinal > 1 ? -1 : 1;
        this.qCurrentCoord[coordToChange] = this.qStartCoord[coordToChange] + i * directionModifier;
        // set our default slice type
        let sliceTemplate = drawLights ? litSlice : normalSlice;
        sliceTemplate = drawFancy ? fancySlice : sliceTemplate;
        // if the top block is not air, we should tunnel
        if (this.getBlock({ x: this.qCurrentCoord.x, y: this.qCurrentCoord.y + 3, z: this.qCurrentCoord.z })?.permutation !==
            this.Air) {
            sliceTemplate = drawLights ? litTunnel : normalTunnel;
            sliceTemplate = drawFancy ? fancyTunnel : sliceTemplate;
        }
        // generate supports
        let supportY = { x: this.qCurrentCoord.x, y: this.qCurrentCoord.y - 1, z: this.qCurrentCoord.z };
        let supportHeight = 0;
        while (drawSupports &&
            this.getBlock(supportY)?.permutation !== this.Dirt &&
            supportHeight < this.MaxBridgeSupportHeight) {
            try {
                this.setBlock(this.Foundation, supportY);
                supportY.y -= 1;
                supportHeight++;
            }
            catch (e) {
                break;
            }
        }
        this.renderSlice(sliceTemplate, this.qCurrentCoord, this.qCardinal, false);
    }
    // renders a single slice of road using the provided template. It uses the
    // coordinate as the bottom center of the template slice and transforms
    // based on the cardinal direction
    renderSlice(sliceTemplate, coord, cardinalDirection, invertStairs = false) {
        const rowOffset = 4;
        const colOffset = -2;
        Debug.trace(`Rendering slice at ${Debug.printCoordinate3(coord)}`);
        // loop through each row in the slice template,
        // we start at 5 above the starting coord and loop
        // in reverse so we render the slice from the top
        // left
        for (let row = 0; row < 5; row++) {
            // loop through each column in this row,
            // we start at -2 so that we start rendering
            // blocks to the left of the starting coord
            // and center the slice at the bottom center block
            for (let col = 0; col < 5; col++) {
                // get the block int from the slice template
                var blockIndex = sliceTemplate[row * 5 + col];
                // resolve the block type based on the int
                var block = this.blockInts[blockIndex];
                // this block is a stair, set direction based on cardinal direction
                if (blockIndex == 6) {
                    let stairCard = invertStairs ? RoadMaker.invertCardinalInteger(this.qCardinal) : this.qCardinal;
                    let stairBit = this.stairCardinalConversion[stairCard];
                    Debug.trace(`Setting stair bit for ${cardinalDirection} to ${stairBit}.`);
                    block = block.withState(this.StairDirectionStateName, stairBit);
                }
                // transform our slice based on the cardinal direction
                switch (cardinalDirection) {
                    case 0: // west
                        this.setBlock(block, {
                            x: coord.x,
                            y: coord.y + (rowOffset - row),
                            z: coord.z + (colOffset + col),
                        });
                        break;
                    case 1: // south
                        this.setBlock(block, {
                            x: coord.x + (colOffset + col),
                            y: coord.y + (rowOffset - row),
                            z: coord.z,
                        });
                        break;
                    case 2: // east
                        this.setBlock(block, {
                            x: coord.x,
                            y: coord.y + (rowOffset - row),
                            z: coord.z - (colOffset + col),
                        });
                        break;
                    case 3: // north
                        this.setBlock(block, {
                            x: coord.x - (colOffset + col),
                            y: coord.y + (rowOffset - row),
                            z: coord.z,
                        });
                        break;
                }
            }
        }
    }
    // sets the block at the provided coordinates to the provided permutation
    setBlock(blockPerm, coord) {
        Debug.trace(`Setting block at ${Debug.printCoordinate3(coord)}.`);
        this.getBlock(coord)?.setPermutation(blockPerm);
    }
    // gets the block at the provided coordinates
    getBlock(coord) {
        const overworld = world.getDimension(this.Dimension);
        return overworld.getBlock(coord);
    }
    // gets a cardinally-aligned value expressed as an integer where
    // 0 = West
    // 1 = South
    // 2 = East
    // 3 = North
    static getCardinalInteger(viewDirection) {
        // figure out our 2d look angle
        let lookAngle2d = Math.atan2(viewDirection.z, viewDirection.x);
        // regulate our angle so it's positive
        while (lookAngle2d < 0) {
            lookAngle2d += Math.PI * 2;
        }
        // clamp our look angle to a cardinal coordinate
        let cardinal = Math.round(lookAngle2d / (Math.PI / 2));
        // clamp our look angle to 0 - 3
        cardinal = cardinal > 3 ? 0 : cardinal;
        Debug.trace(`Calculated cardinal direction at ${cardinal}.`);
        return cardinal;
    }
    // inverts a cardinally-aligned value
    static invertCardinalInteger(cardinal) {
        let inverse = cardinal + 2;
        while (inverse > 3) {
            inverse -= 4;
        }
        Debug.debug(`Inverting cardingal ${cardinal} to get ${inverse}`);
        return inverse;
    }
}

//# sourceMappingURL=../../_chonky_cabbageDebug/RoadMaker.js.map
