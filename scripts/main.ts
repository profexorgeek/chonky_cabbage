import { world, system, BlockPermutation } from "@minecraft/server";
import RoadMaker from "./RoadMaker";
import Debug from "./Debug";

const TicksPerSecond: number = 20;
const HeadHeightInBlocks:number = 2;
const SecondsBeforeInit:number = 20;
const SecondsBetweenRoadmakerTicks: number = 0.2;

let roadmaker:RoadMaker;
let initialized:boolean = false;

// road maker initialization
function initialize() {
  Debug.trace("Initializing RoadMaker...");
  try{
    roadmaker = new RoadMaker();
  }
  catch(e)
  {
    Debug.error(`Failed to start RoadMaker: ${e}`);
  }
  Debug.info("RoadMaker initialized:");
  help();
  initialized = true;
}

// main game loop
function mainTick() {
  if(initialized === false && system.currentTick > (TicksPerSecond * SecondsBeforeInit)){
    Debug.trace("Starting Add-On capabilities...");
    initialize();
  }

  if(initialized === true && system.currentTick % (SecondsBetweenRoadmakerTicks * TicksPerSecond) === 0)
  {   
    try {
      roadmaker.tryTickIteration();
    }
    catch(e)
    {
      Debug.error(`Failed to complete road: ${e}`);
      roadmaker.cancelRoad();
    }
    
  }

  system.run(mainTick);
}

function help() {
  Debug.info("Help: /scriptevent chonky:help")
  Debug.info("Make Road: /scriptevent chonky:makeroad [length]");
  Debug.info("Cancel Road: /scriptevent chonky:cancel");
  Debug.info("Style Road: /scriptevent chonky:assign [roadblock_type]=[minecraft_block_id]");
  Debug.info("Road Block Types:")
  Debug.info("- Foundation");
  Debug.info("- Wall");
  Debug.info("- Path");
  Debug.info("- Post");
  Debug.info("- Light");
}



// listen for script events
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if(event.id === "chonky:makeroad") {
    const length:number = parseInt(event.message);

    // assume player 1 for now
    let plyr = world.getAllPlayers()[0];

    if(plyr != null && roadmaker.isRoadInProgress() === false)
    {

      const coord = plyr.getHeadLocation();
      const view = plyr.getViewDirection();
      coord.y -= HeadHeightInBlocks;

      Debug.info("Making road: " + length);

      roadmaker.startNewRoad(coord, view, length);
    }
    else {
      Debug.error("Cannot execute command because road was in progress or no player was found.");
    }
  }
  if(event.id === "chonky:cancelroad")
  {
    roadmaker.cancelRoad();
  }
  if(event.id === "chonky:assign")
  {
    const arg = event.message;
    let kvp = arg.split("=");
    if(kvp.length == 2)
    {
      roadmaker.tryAssignBlockType(kvp[0],kvp[1]);
    }
  }
  if(event.id == "chonky:help")
  {
    help();
  }
});

// start application
Debug.trace("Starting main tick listener");
system.run(mainTick);