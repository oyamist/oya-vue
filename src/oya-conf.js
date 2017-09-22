(function(exports) {
    const OyaVessel = require('./oya-vessel');

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

        static createTimer(index=0, opts={}) {
            return {
                name: opts.name || `vessel${index+1}`,
                type: opts.type || 'OyaVessel',
                enabled: opts.enabled == null ? true : opts.enabled, // timer can be activated
                startCycle: opts.startCycle || OyaVessel.CYCLE_STANDARD,
                hotCycle: opts.hotCycle || OyaVessel.CYCLE_FAN,
                fanThreshold: opts.fanThreshold || 80,
                maxCycles: opts.maxCycles || 0,
                cycleDelay: opts.cycleDelay || 0,
                cycles: opts.cycles || OyaVessel.DEFAULT_CYCLES,
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

