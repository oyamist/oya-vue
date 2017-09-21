(function(exports) {

    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(opts = {}) {
            this.update(opts);
        }
        
        _updateTimer(index, newTimer) {
            var defTimer = OyaConf.createTimer(index);
            var curTimer = this.timers[index] || {};
            ['name', 'type', 'enabled', 'startCycle', 'hotCycle', 'cycleDelay', 'pin', 'fanThreshold']
            .forEach(prop => {
                curTimer[prop] = newTimer[prop] == null 
                    ? (curTimer[prop] == null ? defTimer[prop] : curTimer[prop])
                    : newTimer[prop];
            });
            if (newTimer.cycles) {
                Object.keys(curTimer.cycles).forEach(key => {
                    if (!newTimer.cycles.hasOwnProperty(key)) {
                        delete curTimer.cycles[key];
                    }
                });
                Object.keys(newTimer.cycles).forEach(key => {
                    curTimer.cycles[key] = Object.assign(curTimer.cycles[key], newTimer.cycles[key]);
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

        static createTimer(index=0, opts={}) {
            const defaultPins = [ 
                33, // Pimoroni Automation Hat relay 1
                35, // Pimoroni Automation Hat relay 2
                36, // Pimoroni Automation Hat relay 3
            ];
            return {
                name: opts.name || `mist${index+1}`,
                type: opts.type || 'timer-cycle',
                enabled: opts.enabled == null ? true : opts.enabled, // timer can be activated
                startCycle: opts.startCycle || OyaConf.CYCLE_STANDARD,
                hotCycle: opts.hotCycle || OyaConf.CYCLE_FAN,
                fanThreshold: opts.fanThreshold || 80,
                maxCycles: opts.maxCycles || 0,
                cycleDelay: opts.cycleDelay || 0,
                pin: opts.pin == null ?  (defaultPins[index] || -1) : opts.pin,
                cycles: opts.cycles || this.DEFAULT_CYCLES,
            }
        }

        update(opts = {}) {
            this.name = opts.name || this.name || 'test';
            if (this.timers == null) {
                if (opts.timers) {
                    this.timers = opts.timers.map((a,i) => OyaConf.createTimer(i));
                } else {
                    this.timers = [
                        OyaConf.createTimer(0),
                        OyaConf.createTimer(1),
                        OyaConf.createTimer(2),
                    ];
                }
            }
            opts.timers && opts.timers.forEach((newTimer, i) => {
                this._updateTimer(i, newTimer);
            });

            this.startCycle = opts.startCycle || this.startCycle || OyaConf.CYCLE_STANDARD;
            this.hotCycle = opts.hotCycle || this.hotCycle || OyaConf.CYCLE_FAN;
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
                hotCycle: this.hotCycle,
                timers: this.timers,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

