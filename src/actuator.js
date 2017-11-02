(function(exports) {
    const OyaVessel = require('./oya-vessel');

    class Actuator {
        constructor(opts = {}) {
            if (opts.hasOwnProperty('usage')) {
                if (0>Actuator.USAGE_DEFAULTS.findIndex(ud => (ud.usage === opts.usage))) {
                    throw new Error(`Unknown usage:${opts.usage}`);
                }
                var usage = opts.usage;
            } else {
                var usage = Actuator.USAGE_MIST;
            }
            var actDefault = Actuator.USAGE_DEFAULTS.filter(
                ud => (ud.usage===usage))[0] || {};

            // serializable toJSON() properties
            this.name = opts.name || `${usage}`;
            this.type = opts.type || actDefault.type || Actuator.ACTUATOR_SPST_NO;
            this.usage = usage;
            this.vesselIndex = opts.vesselIndex || 0;
            this.desc = opts.desc || actDefault.desc || 'generic actuator';
            this.pin = opts.pin || Actuator.NOPIN;
            this.activate = opts.activate || actDefault.activate;
        }

        static get NOPIN() { return -1; }
        static get ACTUATOR_SPST_NO() { return "actuator:spst:no"; }
        static get USAGE_MIST() { return "Mist"; }
        static get USAGE_COOL() { return "Cool"; }
        static get USAGE_PRIME() { return "Prime"; }
        static get USAGE_DEFAULTS() { 
            return [{
                usage: Actuator.USAGE_MIST,
                activate: OyaVessel.EVENT_MIST,
                desc: 'Mist roots',
                type: Actuator.ACTUATOR_SPST_NO,
            },{
                usage: Actuator.USAGE_COOL,
                activate: OyaVessel.EVENT_COOL,
                desc: 'Cool roots',
                type: Actuator.ACTUATOR_SPST_NO,
            },{
                usage: Actuator.USAGE_PRIME,
                activate: OyaVessel.EVENT_PRIME,
                desc: 'Prime mist system ',
                type: Actuator.ACTUATOR_SPST_NO,
            }];
        }

        toJSON() {
            return this;
        }

    } //// class Actuator

    module.exports = exports.Actuator = Actuator;
})(typeof exports === "object" ? exports : (exports = {}));

