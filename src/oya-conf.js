(function(exports) {

    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(opts) {
            this.update(opts);
        }
        
        _updateActuator(index, newAct) {
            var defAct = OyaConf.defaultActuator(index);
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

        static defaultActuator(index=0, type='timer-cycle') {
            const defaultPins = [ 
                33, // Pimoroni Automation Hat relay 1
                35, // Pimoroni Automation Hat relay 2
                36, // Pimoroni Automation Hat relay 3
            ];
            if (type === 'timer-cycle') {
                return {
                    name: `mist${index+1}`,
                    type: "timer-cycle",
                    enabled: true, // actuator can be activated
                    startCycle: OyaConf.CYCLE_STANDARD,
                    fanThreshold: 80,
                    maxCycles: 0,
                    cycleDelay: 0,
                    pin: defaultPins[index] || -1,
                    cycles: {
                        [OyaConf.CYCLE_CONSERVE]: {
                            desc: "Conservative misting cycle for plants with good roots",
                            on: 5,
                            off: 60,
                        },
                        [OyaConf.CYCLE_FAN]: {
                            desc: "Misting cycle for use with cooling fan air intake",
                            on: 15,
                            off: 15,
                        },
                        [OyaConf.CYCLE_STANDARD]: {
                            desc: "Standard misting cycle for all phases of plant growth",
                            on: 30,
                            off: 60,
                        },
                        [OyaConf.CYCLE_DRAIN]: {
                            "desc": "Partially drain reservoir before adding fresh nutrients",
                            on: Math.round(60 * 3.78541/0.73), // about 1 gallon for Aquatec CDP6800 pump operating with no load
                            off: -1,
                        },
                    },
                }
            } else {
                return {
                    name: `actuator${index}`,
                    type,
                    enabled: true,
                    pin: defaultPins[index] || -1,
                }
            }
        }

        update(opts = {}) {
            this.name = opts.name || this.name || 'test';
            this.actuators = this.actuators || [
                OyaConf.defaultActuator(0),
                OyaConf.defaultActuator(1),
                OyaConf.defaultActuator(2),
            ];
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
        static get CYCLE_STANDARD() { return "Standard"; }
        static get CYCLE_FAN() { return "Fan"; }
        static get CYCLE_DRAIN() { return "Drain"; }
        static get CYCLE_CONSERVE() { return "Conserve"; }
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

