import {world, Vector2, Vector3} from "@minecraft/server";

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4
};

export default class Debug {

  public static Level:LogLevel = LogLevel.DEBUG;

  static trace(message:string)
  {
    Debug.log(message, LogLevel.TRACE);
  }

  static debug(message:string)
  {
    Debug.log(message, LogLevel.DEBUG);
  }

  static info(message:string)
  {
    Debug.log(message, LogLevel.INFO);
  }

  static warn(message:string)
  {
    Debug.log(message, LogLevel.WARN);
  }

  static error(message:string)
  {
    Debug.log(message, LogLevel.ERROR);
  }

  static log(message:string, level: LogLevel)
  {
    if(Debug.Level <= level)
    {
      world.sendMessage(`${LogLevel[level]}: ${message}`);
    }
  }

  // converts radians to degrees, usually to prettify for debugging
  static toDegrees(radians: number): number
  {
    return radians * (180 / Math.PI);
  }

  // turns coordinates into a pretty string
  static printCoordinate3(coord: Vector3, digits:number = 2) {
    return `(${coord.x.toFixed(digits)}, ${coord.y.toFixed(digits)}, ${coord.z.toFixed(digits)})`;
  }

  static printCoordinate2(coord: Vector2, digits:number = 2) {
    return `(${coord.x.toFixed(digits)}, ${coord.y.toFixed(digits)})`;
  }

}