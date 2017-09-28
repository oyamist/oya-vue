(function(exports) {
    const OyaVessel = require('./oya-vessel');
    var id = 0;

    class Actuator {
        constructor(opts = {}) {
            const usage = opts.usage || Actuator.USAGE_MIST;
            const actDefault = Actuator.USAGE_DEFAULTS.filter(
                ud => (ud.usage===usage))[0] || {};

            // serializable toJSON() properties
            id++;
            this.name = opts.name || `Actuator${id}`;
            this.type = opts.type || actDefault.type || Actuator.ACTUATOR_SPST_NO;
            this.usage = usage;
            this.vesselIndex = opts.vesselIndex || 0;
            this.desc = opts.desc || actDefault.desc || 'generic actuator';
            this.activationSink = opts.activationSink || actDefault.activationSink;
        }

        static get ACTUATOR_SPST_NO() { return "actuator:spst:no"; }
        static get USAGE_MIST() { return "Mist"; }
        static get USAGE_FAN() { return "Fan"; }
        static get USAGE_VALVE() { return "Valve"; }
        static get USAGE_DEFAULTS() { 
            return [{
                usage: 'Mist', 
                activationSink: OyaVessel.EVENT_MIST1,
                desc: 'Mist roots',
                type: Actuator.ACTUATOR_SPST_NO,
            },{
                usage: 'Fan', 
                activationSink: OyaVessel.EVENT_FAN1,
                desc: 'Cool roots',
                type: Actuator.ACTUATOR_SPST_NO,
            },{
                usage: 'Valve',
                activationSink: OyaVessel.EVENT_VALVE1,
                desc: 'Drain reservoir ',
                type: Actuator.ACTUATOR_SPST_NO,
            }];
        }

        toJSON() {
            return this;
        }

    } //// class Actuator

    module.exports = exports.Actuator = Actuator;
})(typeof exports === "object" ? exports : (exports = {}));

