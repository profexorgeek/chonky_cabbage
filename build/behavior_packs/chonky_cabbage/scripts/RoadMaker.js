import { world, BlockPermutation } from "@minecraft/server";
import Debug from "./Debug";
export default class RoadMaker {
    constructor() {
        this.Foundation = BlockPermutation.resolve("minecraft:cobblestone");
        this.Wall = BlockPermutation.resolve("minecraft:cobblestone_wall");
        this.Path = BlockPermutation.resolve("minecraft:bamboo_planks");
        this.Post = BlockPermutation.resolve("minecraft:bamboo_fence");
        this.Light = BlockPermutation.resolve("minecraft:lantern");
    }
    // gets a cardinally-aligned value expressed as an integer where 0 = East, 1 = North, etc
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
        return cardinal;
    }
    createRoad(startCoord, viewDirection, length) {
        Debug.debug(`Starting ${length} road at ${Debug.printCoordinate3(startCoord)}.`);
        // round our look angle to a cardinal direction, expressed as an integer where 0 = East
        const cardinalInt = RoadMaker.getCardinalInteger(viewDirection);
        Debug.debug(`Our cardinal integer is: ${cardinalInt}`);
        // loop through our length, creating strips of road depending on our cardinal alignment
        for (let i = 0; i < length; i++) {
            let drawLights = i % 8 === 0;
            let drawSupports = i % 16 === 0;
            switch (cardinalInt) {
                case 0:
                    this.makeXAxisStrip({ x: startCoord.x + i, y: startCoord.y, z: startCoord.z }, drawLights, drawSupports);
                    break;
                case 1:
                    this.makeZAxisStrip({ x: startCoord.x, y: startCoord.y, z: startCoord.z + i }, drawLights, drawSupports);
                    break;
                case 2:
                    this.makeXAxisStrip({ x: startCoord.x - i, y: startCoord.y, z: startCoord.z }, drawLights, drawSupports);
                    break;
                case 3:
                    this.makeZAxisStrip({ x: startCoord.x, y: startCoord.y, z: startCoord.z - i }, drawLights, drawSupports);
                    break;
            }
        }
    }
    // creates a strip of road aligned with the X axis
    makeXAxisStrip(center, drawLights = false, drawSupportst = false) {
        // foundation
        this.setBlock(this.Foundation, { x: center.x, y: center.y, z: center.z + 2 });
        this.setBlock(this.Path, { x: center.x, y: center.y, z: center.z + 1 });
        this.setBlock(this.Path, { x: center.x, y: center.y, z: center.z });
        this.setBlock(this.Path, { x: center.x, y: center.y, z: center.z - 1 });
        this.setBlock(this.Foundation, { x: center.x, y: center.y, z: center.z - 2 });
        // walls
        this.setBlock(this.Wall, { x: center.x, y: center.y + 1, z: center.z + 2 });
        this.setBlock(this.Wall, { x: center.x, y: center.y + 1, z: center.z - 2 });
        if (drawLights === true) {
            this.makeLamp({ x: center.x, y: center.y, z: center.z + 2 });
            this.makeLamp({ x: center.x, y: center.y, z: center.z - 2 });
        }
    }
    // creates a strip of road aligned with the Z axis
    makeZAxisStrip(center, drawLights = false, drawSupportst = false) {
        // foundation
        this.setBlock(this.Foundation, { x: center.x - 2, y: center.y, z: center.z });
        this.setBlock(this.Path, { x: center.x - 1, y: center.y, z: center.z });
        this.setBlock(this.Path, { x: center.x, y: center.y, z: center.z });
        this.setBlock(this.Path, { x: center.x + 1, y: center.y, z: center.z });
        this.setBlock(this.Foundation, { x: center.x + 2, y: center.y, z: center.z });
        // walls
        this.setBlock(this.Wall, { x: center.x + 2, y: center.y + 1, z: center.z });
        this.setBlock(this.Wall, { x: center.x - 2, y: center.y + 1, z: center.z });
        if (drawLights === true) {
            this.makeLamp({ x: center.x + 2, y: center.y, z: center.z });
            this.makeLamp({ x: center.x - 2, y: center.y, z: center.z });
        }
    }
    makeLamp(center) {
        this.setBlock(this.Foundation, { x: center.x, y: center.y + 1, z: center.z });
        this.setBlock(this.Post, { x: center.x, y: center.y + 2, z: center.z });
        this.setBlock(this.Post, { x: center.x, y: center.y + 3, z: center.z });
        this.setBlock(this.Light, { x: center.x, y: center.y + 4, z: center.z });
    }
    // sets the block at the provided coordinates to the provided permutation
    setBlock(blockPerm, coord) {
        Debug.trace(`Setting block at ${Debug.printCoordinate3(coord)}.`);
        const overworld = world.getDimension("overworld");
        overworld.getBlock(coord)?.setPermutation(blockPerm);
    }
}

//# sourceMappingURL=../../_chonky_cabbageDebug/RoadMaker.js.map
