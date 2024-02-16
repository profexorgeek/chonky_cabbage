import { world, system } from "@minecraft/server";
import RoadMaker, { WorkType } from "./RoadMaker";
import Debug from "./Debug";
const TicksPerSecond = 20;
const HeadHeightInBlocks = 2;
const SecondsBeforeInit = 20;
const SecondsBetweenRoadmakerTicks = 0.2;
let roadmaker;
let initialized = false;
// road maker initialization
function initialize() {
    Debug.trace("Initializing RoadMaker...");
    try {
        roadmaker = new RoadMaker();
    }
    catch (e) {
        Debug.error(`Failed to start RoadMaker: ${e}`);
    }
    Debug.info("RoadMaker initialized:");
    help();
    initialized = true;
}
// main game loop
function mainTick() {
    if (initialized === false && system.currentTick > (TicksPerSecond * SecondsBeforeInit)) {
        Debug.trace("Starting Add-On capabilities...");
        initialize();
    }
    if (initialized === true && system.currentTick % (SecondsBetweenRoadmakerTicks * TicksPerSecond) === 0) {
        try {
            roadmaker.tryTickIteration();
        }
        catch (e) {
            Debug.error(`Failed to complete road: ${e}`);
            roadmaker.cancelRoad();
        }
    }
    system.run(mainTick);
}
function help() {
    Debug.info("Help: /scriptevent rd:help");
    Debug.info("Make Road: /scriptevent rd:road 10");
    Debug.info("Make Stairs Up: /scriptevent rd:stairs_up 10");
    Debug.info("Make Stairs Down: /scriptevent rd:stairs_down 10");
    Debug.info("Cancel Road: /scriptevent rd:cancel");
    Debug.info("Style Road: /scriptevent rd:assign Path=birch_planks");
    Debug.info("Road Block Types:");
    Debug.info("- Foundation");
    Debug.info("- Wall");
    Debug.info("- Path");
    Debug.info("- Post");
    Debug.info("- Light");
    Debug.info("- Stair");
}
// listen for script events
system.afterEvents.scriptEventReceive.subscribe((event) => {
    // assume player 1 for now
    let plyr = world.getAllPlayers()[0];
    // EARLY OUT: no player
    if (plyr == null || roadmaker == null) {
        return;
    }
    const coord = plyr.getHeadLocation();
    const view = plyr.getViewDirection();
    coord.y -= HeadHeightInBlocks;
    switch (event.id) {
        case "rd:help":
            help();
            break;
        case "rd:cancel":
            roadmaker.cancelRoad();
            break;
        case "rd:road":
            if (roadmaker.isRoadInProgress() === false) {
                const length = parseInt(event.message);
                roadmaker.startNewRoad(coord, view, length);
            }
            break;
        case "rd:stairs_up":
            if (roadmaker.isRoadInProgress() === false) {
                const length = parseInt(event.message);
                roadmaker.startNewRoad(coord, view, length, WorkType.StairsUp);
            }
            break;
        case "rd:stairs_down":
            if (roadmaker.isRoadInProgress() === false) {
                const length = parseInt(event.message);
                roadmaker.startNewRoad(coord, view, length, WorkType.StairsDown);
            }
            break;
        case "rd:assign":
            const arg = event.message;
            let kvp = arg.split("=");
            if (kvp.length == 2) {
                let block = kvp[0];
                let assign = kvp[1].replace("minecraft:", "");
                Debug.debug(`Setting ${block} to ${assign}.`);
                roadmaker.tryAssignBlockType(block, assign);
            }
            else {
                Debug.error(`Unexpected argument format: ${arg}`);
            }
            ;
    }
});
// start application
Debug.trace("Starting main tick listener");
system.run(mainTick);

//# sourceMappingURL=../../_chonky_cabbageDebug/main.js.map
