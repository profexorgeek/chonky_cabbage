import { world } from "@minecraft/server";
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["TRACE"] = 0] = "TRACE";
    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
})(LogLevel || (LogLevel = {}));
;
export default class Debug {
    static trace(message) {
        Debug.log(message, LogLevel.TRACE);
    }
    static debug(message) {
        Debug.log(message, LogLevel.DEBUG);
    }
    static info(message) {
        Debug.log(message, LogLevel.INFO);
    }
    static warn(message) {
        Debug.log(message, LogLevel.WARN);
    }
    static error(message) {
        Debug.log(message, LogLevel.ERROR);
    }
    static log(message, level) {
        if (Debug.Level <= level) {
            world.sendMessage(`${level} - ${message}`);
        }
    }
    // converts radians to degrees, usually to prettify for debugging
    static toDegrees(radians) {
        return radians * (180 / Math.PI);
    }
    // turns coordinates into a pretty string
    static printCoordinate3(coord, digits = 2) {
        return `(${coord.x.toFixed(digits)}, ${coord.y.toFixed(digits)}, ${coord.z.toFixed(digits)})`;
    }
    static printCoordinate2(coord, digits = 2) {
        return `(${coord.x.toFixed(digits)}, ${coord.y.toFixed(digits)})`;
    }
}
Debug.Level = LogLevel.DEBUG;

//# sourceMappingURL=../../_chonky_cabbageDebug/Debug.js.map
