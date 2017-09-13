(function(exports) {
    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(options = {}) {
            this.name = options.name || 'test';
            this.cycle = options.cycle || OyaConf.CYCLE_STANDARD;
            this.tempUnit = options.tempUnit || OyaConf.TEMP_FAHRENHEIT;
            this.fanThreshold = options.fanThreshold == null ? 80 : options.fanThreshold;

            var optMist = options.mist || {};
            this.mist = {
                [OyaConf.CYCLE_FAN]: Object.assign({
                    desc: "Misting cycle for use with cooling fan air intake",
                    on: 15,
                    off: 15,
                }, optMist[OyaConf.CYCLE_FAN]),
                [OyaConf.CYCLE_STANDARD]: Object.assign({
                    desc: "Standard misting cycle for all phases of plant growth",
                    on: 30,
                    off: 60,
                }, optMist[OyaConf.CYCLE_STANDARD]),
                [OyaConf.CYCLE_DRAIN]: Object.assign({
                    desc: "Incremental drain cycle ",
                    on: Math.round(60 * 3.78541/0.73), // about 1 gallon for Aquatec CDP6800 pump operating with no load
                    off: -1,
                }, optMist[OyaConf.CYCLE_DRAIN]),
            };
        }

        static get CYCLE_STANDARD() { return "standard"; }
        static get CYCLE_FAN() { return "fan"; }
        static get CYCLE_DRAIN() { return "drain"; }
        static get TEMP_FAHRENHEIT() { return "F"; }
        static get TEMP_CENTIGRADE() { return "C"; }

        toJSON() {
            return {
                name: this.name,
                type: "OyaConf",
                tempUnit: this.tempUnit,
                fanThreshold: this.fanThreshold,
                cycle: this.cycle,
                mist: this.mist,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

