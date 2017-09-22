(function(exports) {
    const OyaVessel = require('./oya-vessel');

    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(opts = {}) {
            this.update(opts);
        }
        
        static createActuatorConfig(index=0, opts={}) {
            return {
                name: opts.name || `actuator${index}`,
                type: opts.type || OyaConf.ACTUATOR_SPST_NO,
            }
        }

        static createVesselConfig(index=0, opts={}) {
            var vessel = new OyaVessel(Object.assign({
                name: `vessel${index+1}`,
            }, opts));
            return vessel.toJSON();
        }

        update(opts = {}) {
            this.name = opts.name || this.name || 'test';

            if (this.vessels == null) {
                if (opts.vessels) {
                    this.vessels = opts.vessels.map((a,i) => OyaConf.createVesselConfig(i));
                } else {
                    this.vessels = [
                        OyaConf.createVesselConfig(0),
                        OyaConf.createVesselConfig(1),
                    ];
                }
            }
            opts.vessels && opts.vessels.forEach((delta, i) => {
                OyaVessel.applyDelta(this.vessels[i], delta);
            });

            if (this.actuators == null) {
                if (opts.actuators) {
                    this.actuators = opts.actuators.map((a,i) => OyaConf.createActuatorConfig(i));
                } else {
                    this.actuators = [
                        OyaConf.createActuatorConfig(0),
                        OyaConf.createActuatorConfig(1),
                    ];
                }
            }
            opts.actuators && opts.actuators.forEach((delta, i) => {
                Object.assign(this.actuators[i], delta);
            });

            this.tempUnit = opts.tempUnit || this.tempUnit || OyaConf.TEMP_FAHRENHEIT;

            return this;
        }

        static get TEMP_FAHRENHEIT() { return "F"; }
        static get TEMP_CENTIGRADE() { return "C"; }
        static get ACTUATOR_SPST_NO() { return "actuator:spst:no"; }

        toJSON() {
            return {
                name: this.name,
                type: "OyaConf",
                tempUnit: this.tempUnit,
                vessels: this.vessels,
                actuators: this.actuators,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

