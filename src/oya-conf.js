(function(exports) {

    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(opts) {
            this.update(opts);
        }
        
        _updateCycle(name, defaultCycle, optMist) {
            this.mist[name] = Object.assign({}, defaultCycle, 
                this.mist && this.mist[name], optMist[name]);
        }

        update(opts = {}) {
            this.name = opts.name || this.name || 'test';
            this.startCycle = opts.startCycle || this.startCycle || OyaConf.CYCLE_STANDARD;
            this.tempUnit = opts.tempUnit || this.tempUnit || OyaConf.TEMP_FAHRENHEIT;
            this.fanThreshold = opts.fanThreshold == null ? (this.fanThreshold || 80) : opts.fanThreshold;

            var optMist = opts.mist || {};
            this.mist = this.mist || {};
            this._updateCycle(OyaConf.CYCLE_FAN, {
                desc: "Misting cycle for use with cooling fan air intake",
                on: 15,
                off: 15,
            }, optMist);
            this._updateCycle(OyaConf.CYCLE_STANDARD, {
                desc: "Standard misting cycle for all phases of plant growth",
                on: 30,
                off: 60,
            }, optMist);
            this._updateCycle(OyaConf.CYCLE_DRAIN, {
                desc: "Incremental drain cycle ",
                on: Math.round(60 * 3.78541/0.73), // about 1 gallon for Aquatec CDP6800 pump operating with no load
                off: -1,
            }, optMist);

            return this;
        }

        static get CYCLES() { return [
            OyaConf.CYCLE_STANDARD,
            OyaConf.CYCLE_FAN,
            OyaConf.CYCLE_DRAIN,
        ]};
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
                startCycle: this.startCycle,
                mist: this.mist,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

