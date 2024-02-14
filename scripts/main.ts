import { world, system, BlockPermutation } from "@minecraft/server";
import Utilities from "./RoadMaker";
import Debug from "./Debug";

const TicksPerSecond: number = 20;
const HeadHeightInBlocks:number = 2;
const MaxRoadDimension:number = 500;

function mainTick() {
  const secondsBetweenChecks = 10;
  const cobblestone = BlockPermutation.resolve("minecraft:yellow_glazed_terracotta");

  if (system.currentTick % (TicksPerSecond * secondsBetweenChecks) === 0) {
    Debug.trace("Scripting is running correctly: " + system.currentTick);
  }

  system.run(mainTick);
}


system.run(mainTick);

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if(event.id === "chonky:makeroad") {
    const length:number = parseInt(event.message);

    // assume player 1 for now
    var plyr = world.getAllPlayers()[0];

    if(plyr != null)
    {
      const coord = plyr.getHeadLocation();
      const view = plyr.getViewDirection();
      coord.y -= HeadHeightInBlocks;

      Debug.debug("Making road: " + length);
      Utilities.makeRoad(coord, view, length);
    }
    else {
      Debug.error("Cannot execute command because initiator was null.");
    }
  }
});