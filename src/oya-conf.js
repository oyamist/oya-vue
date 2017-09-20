(function(exports) {

    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(opts = {}) {
            this.update(opts);
        }
        
        _updateActuator(index, newAct) {
            var defAct = OyaConf.createActuator(index);
            var curAct = this.actuators[index] || {};
            ['name', 'type', 'enabled', 'startCycle', 'cycleDelay', 'pin', 'fanThreshold']
            .forEach(prop => {
                curAct[prop] = newAct[prop] == null 
                    ? (curAct[prop] == null ? defAct[prop] : curAct[prop])
                    : newAct[prop];
            });
            if (newAct.cycles) {
                Object.keys(curAct.cycles).forEach(key => {
                    if (!newAct.cycles.hasOwnProperty(key)) {
                        delete curAct.cycles[key];
                    }
                });
                Object.keys(newAct.cycles).forEach(key => {
                    curAct.cycles[key] = Object.assign(curAct.cycles[key], newAct.cycles[key]);
                });
            }
        }

        static get DEFAULT_CYCLES() { return {
            [OyaConf.CYCLE_STANDARD]: {
                name: "Standard",
                desc: "Standard cycle for all phases of plant growth",
                on: 30,
                off: 60,
            },
            [OyaConf.CYCLE_DRAIN]: {
                name: "Drain",
                desc: "Partially drain reservoir and stop to add fresh nutrients",
                on: Math.round(60 * 3.78541/0.73), // about 1 gallon for Aquatec CDP6800 pump operating with no load
                off: -1,
            },
            [OyaConf.CYCLE_FAN]: {
                name: "Cool",
                desc: "Hot day evaporative cooling cycle with fan",
                on: 15,
                off: 15,
            },
            [OyaConf.CYCLE_CONSERVE]: {
                name: "Conserve",
                desc: "Conservative misting cycle for plants with good roots",
                on: 5,
                off: 60,
            },
        }}

        static createActuator(index=0, opts={}) {
            const defaultPins = [ 
                33, // Pimoroni Automation Hat relay 1
                35, // Pimoroni Automation Hat relay 2
                36, // Pimoroni Automation Hat relay 3
            ];
            return {
                name: opts.name || `mist${index+1}`,
                type: opts.type || 'timer-cycle',
                enabled: opts.enabled == null ? true : opts.enabled, // actuator can be activated
                startCycle: opts.startCycle || OyaConf.CYCLE_STANDARD,
                fanThreshold: opts.fanThreshold || 80,
                maxCycles: opts.maxCycles || 0,
                cycleDelay: opts.cycleDelay || 0,
                pin: opts.pin == null ?  (defaultPins[index] || -1) : opts.pin,
                cycles: opts.cycles || this.DEFAULT_CYCLES,
            }
        }

        update(opts = {}) {
            this.name = opts.name || this.name || 'test';
            if (this.actuators == null) {
                if (opts.actuators) {
                    this.actuators = opts.actuators.map((a,i) => OyaConf.createActuator(i));
                } else {
                    this.actuators = [
                        OyaConf.createActuator(0),
                        OyaConf.createActuator(1),
                        OyaConf.createActuator(2),
                    ];
                }
            }
            opts.actuators && opts.actuators.forEach((newAct, i) => {
                this._updateActuator(i, newAct);
            });

            this.startCycle = opts.startCycle || this.startCycle || OyaConf.CYCLE_STANDARD;
            this.tempUnit = opts.tempUnit || this.tempUnit || OyaConf.TEMP_FAHRENHEIT;
            this.fanThreshold = opts.fanThreshold == null ? (this.fanThreshold || 80) : opts.fanThreshold;

            return this;
        }

        static get CYCLES() { return [
            OyaConf.CYCLE_STANDARD,
            OyaConf.CYCLE_FAN,
            OyaConf.CYCLE_CONSERVE,
            OyaConf.CYCLE_DRAIN,
        ]};
        static get CYCLE_STANDARD() { return "Cycle #1"; }
        static get CYCLE_DRAIN() { return "Cycle #2"; }
        static get CYCLE_FAN() { return "Cycle #3"; }
        static get CYCLE_CONSERVE() { return "Cycle #4"; }
        static get TEMP_FAHRENHEIT() { return "F"; }
        static get TEMP_CENTIGRADE() { return "C"; }

        toJSON() {
            return {
                name: this.name,
                type: "OyaConf",
                tempUnit: this.tempUnit,
                fanThreshold: this.fanThreshold,
                startCycle: this.startCycle,
                actuators: this.actuators,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

