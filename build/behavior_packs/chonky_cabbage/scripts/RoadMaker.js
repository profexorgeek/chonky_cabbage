import { world, BlockPermutation } from "@minecraft/server";
import Debug from "./Debug";
// For block definitions, see:
// https://www.npmjs.com/package/@minecraft/vanilla-data?activeTab=code
export default class RoadMaker {
    constructor() {
        // these fields are used to keep track
        // of where we are in the current work
        // queue, allowing us to do long-running
        // work across multiple ticks
        this.queueInProgress = false;
        this.queueStartCoord = { x: 0, y: 0, z: 0 };
        this.queueWalkingCoord = { x: 0, y: 0, z: 0 };
        this.queueViewDirection = { x: 0, y: 0, z: 0 };
        this.queueCurrentIteration = 0;
        this.queueRoadLength = 0;
        this.queueCardinalDirection = 0;
        // max amount of road slices that will be processed in a
        // single tick
        this.SlicesPerTick = 2;
        // max distance bridge supports can go
        this.MaxBridgeSupportHeight = 64;
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
        // this maps block types to an integer index, allowing easy
        // creation of visual templates
        this.blockInts = [
            this.Air,
            this.Foundation,
            this.Wall,
            this.Path,
            this.Post,
            this.Light //5
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
            5, 0, 0, 0, 5,
            4, 0, 0, 0, 4,
            4, 0, 0, 0, 4,
            1, 0, 0, 0, 1,
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
            1, 0, 0, 0, 1,
            5, 0, 0, 0, 5,
            1, 0, 0, 0, 1,
            1, 3, 3, 3, 1
        ];
        Debug.debug("RoadMaker has been created...");
    }
    // returns whether a road is being built
    isRoadInProgress() {
        return this.queueInProgress;
    }
    // returns where the road building is occuring so progress
    // can be traced
    getWorkPoint() {
        return this.queueWalkingCoord;
    }
    cancelRoad() {
        this.queueInProgress = false;
        this.queueStartCoord = { x: 0, y: 0, z: 0 };
        this.queueWalkingCoord = { x: 0, y: 0, z: 0 };
        this.queueViewDirection = { x: 0, y: 0, z: 0 };
        this.queueCurrentIteration = 0;
        this.queueRoadLength = 0;
        this.queueCardinalDirection = 0;
    }
    tryAssignBlockType(blockKey, blockType) {
        try {
            Debug.debug(`Setting ${blockKey} to ${blockType}`);
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
            }
            this.blockInts = [
                this.Air,
                this.Foundation,
                this.Wall,
                this.Path,
                this.Post,
                this.Light //5
            ];
        }
        catch (e) {
            Debug.error(`Couldn't locate block type: ${blockType}`);
            return;
        }
    }
    // starts building a new road at the provided coordinates, in the provided view direction
    // of the provided length.
    startNewRoad(startCoord, viewDirection, length) {
        // EARLY OUT: road already in progress
        if (this.queueInProgress === true) {
            Debug.warn("Cannot start a new road until the road in progress has completed.");
            return;
        }
        Debug.debug(`Starting ${length} road at ${Debug.printCoordinate3(startCoord)}.`);
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
    }
    // builds a road segment for this tick, updates the inProgress status
    // if the road has been completed
    tryTickIteration() {
        // EARLY OUT: nothing in progress
        if (this.queueInProgress === false) {
            return;
        }
        Debug.debug(`Building road: ${this.queueCurrentIteration}/${this.queueRoadLength}`);
        let tickMaxIteration = this.queueCurrentIteration + this.SlicesPerTick;
        let thisTickEnd = Math.min(this.queueRoadLength, tickMaxIteration);
        // loop through our length, creating strips of road depending on our cardinal alignment
        // we are 1 indexed so the road starts just in front of the player, otherwise it
        // won't render correctly
        for (let i = this.queueCurrentIteration + 1; i <= thisTickEnd; i++) {
            let drawLights = i % 8 === 0;
            let drawSupports = i % 16 === 0;
            // dynamically set our length-walking coordinate
            let coordToChange = this.queueCardinalDirection % 2 == 0 ? "x" : "z";
            let directionModifier = this.queueCardinalDirection > 1 ? -1 : 1;
            this.queueWalkingCoord[coordToChange] = this.queueStartCoord[coordToChange] + (i * directionModifier);
            // resolve our slice template
            let sliceTemplate = drawLights ? this.RoadNormalLit : this.RoadNormal;
            // figure out if we should be tunneling
            if (this.getBlock({ x: this.queueWalkingCoord.x, y: this.queueWalkingCoord.y + 4, z: this.queueWalkingCoord.z })?.permutation !== this.Air) {
                sliceTemplate = drawLights ? this.RoadTunnelLit : this.RoadTunnel;
            }
            // figure out if we are floating and need supports
            let supportY = { x: this.queueWalkingCoord.x, y: this.queueWalkingCoord.y - 1, z: this.queueWalkingCoord.z };
            let supportHeight = 0;
            while (drawSupports && this.getBlock(supportY)?.permutation !== this.Dirt && supportHeight < this.MaxBridgeSupportHeight) {
                try {
                    this.setBlock(this.Foundation, supportY);
                    supportY.y -= 1;
                    supportHeight++;
                }
                catch (e) {
                    break;
                }
            }
            // render our road
            try {
                this.renderSlice(sliceTemplate, this.queueWalkingCoord, this.queueCardinalDirection);
            }
            catch (e) {
                Debug.error(`Failed to render road slice: ${e}.`);
            }
        }
        this.queueCurrentIteration = thisTickEnd;
        if (thisTickEnd == this.queueRoadLength) {
            this.queueInProgress = false;
        }
    }
    // renders a single slice of road using the provided template. It uses the
    // coordinate as the bottom center of the template slice and transforms
    // based on the cardinal direction
    renderSlice(sliceTemplate, coord, cardinalDirection) {
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
                var blockIndex = sliceTemplate[(row * 5) + col];
                // resolve the block type based on the int
                var block = this.blockInts[blockIndex];
                // transform our slice based on the cardinal direction
                switch (cardinalDirection) {
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

//# sourceMappingURL=../../_chonky_cabbageDebug/RoadMaker.js.map
