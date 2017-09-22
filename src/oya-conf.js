(function(exports) {

    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(opts = {}) {
            this.update(opts);
        }
        
        updateVessel(index, delta) {
            var defTimer = OyaConf.createTimer(index);
            var curTimer = this.vessels[index] || {};
            ['name', 'enabled', 'startCycle', 'hotCycle', 'cycleDelay','fanThreshold']
            .forEach(prop => {
                curTimer[prop] = delta[prop] == null 
                    ? (curTimer[prop] == null ? defTimer[prop] : curTimer[prop])
                    : delta[prop];
            });
            if (delta.cycles) {
                Object.keys(curTimer.cycles).forEach(key => {
                    if (!delta.cycles.hasOwnProperty(key)) {
                        delete curTimer.cycles[key];
                    }
                });
                Object.keys(delta.cycles).forEach(key => {
                    curTimer.cycles[key] = Object.assign(curTimer.cycles[key], delta.cycles[key]);
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
            return {
                name: opts.name || `vessel${index+1}`,
                type: opts.type || 'OyaVessel',
                enabled: opts.enabled == null ? true : opts.enabled, // timer can be activated
                startCycle: opts.startCycle || OyaConf.CYCLE_STANDARD,
                hotCycle: opts.hotCycle || OyaConf.CYCLE_FAN,
                fanThreshold: opts.fanThreshold || 80,
                maxCycles: opts.maxCycles || 0,
                cycleDelay: opts.cycleDelay || 0,
                cycles: opts.cycles || this.DEFAULT_CYCLES,
            }
        }

        update(opts = {}) {
            this.name = opts.name || this.name || 'test';
            if (this.vessels == null) {
                if (opts.vessels) {
                    this.vessels = opts.vessels.map((a,i) => OyaConf.createTimer(i));
                } else {
                    this.vessels = [
                        OyaConf.createTimer(0),
                        OyaConf.createTimer(1),
                    ];
                }
            }
            opts.vessels && opts.vessels.forEach((delta, i) => {
                this.updateVessel(i, delta);
            });

            this.tempUnit = opts.tempUnit || this.tempUnit || OyaConf.TEMP_FAHRENHEIT;

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
                vessels: this.vessels,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

