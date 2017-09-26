(function(exports) {
    const OyaVessel = require('./oya-vessel');
    const ACTUATOR_USAGES = {
        'Pump': {
            activationSink: OyaVessel.EVENT_PUMP1,
        },
        'Fan': {
            activationSink: OyaVessel.EVENT_FAN1,
        },
        'Valve': {
            activationSink: OyaVessel.EVENT_VALVE1,
        },
    };

    // OyaMist bioreactor configuration
    class OyaConf {
        constructor(opts = {}) {
            this.update(opts);
        }
        
        static createVesselConfig(index=0, opts={}) {
            var vessel = new OyaVessel(Object.assign({
                name: `vessel${index+1}`,
            }, opts));
            return vessel.toJSON();
        }

        static createActuatorConfig(index=0, usage="Pump", opts={}) {
            if (typeof index === 'object') {
                opts = index;
                index = 0;
                usage = opts.usage || "Pump";
            }
            if (typeof usage === 'object') {
                opts = usage;
                usage = opts.usage || "Pump";
            }
            var nTypes = Object.keys(ACTUATOR_USAGES).length;
            return {
                name: opts.name || `${usage}${Math.trunc(index/nTypes)+1}`,
                usage,
                type: opts.type || OyaConf.ACTUATOR_SPST_NO,
                vesselIndex: opts.vesselIndex || 0,
                activationSink: opts.activationSink || ACTUATOR_USAGES[usage].activationSink,
                pin: opts.pin || index, // MCU control pin
            }
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
                    this.actuators = [];
                    for(var iVessel = 0; iVessel < this.vessels.length; iVessel++) {
                        this.actuators.push(
                            OyaConf.createActuatorConfig(this.actuators.length, 'Pump', {
                                vesselIndex: iVessel,
                                activationSink: OyaVessel.EVENT_PUMP1,
                        }));
                        this.actuators.push(
                            OyaConf.createActuatorConfig(this.actuators.length, 'Fan', {
                                vesselIndex: iVessel,
                                activationSink: OyaVessel.EVENT_FAN1,
                        }));
                        this.actuators.push(
                            OyaConf.createActuatorConfig(this.actuators.length, 'Valve', {
                                vesselIndex: iVessel,
                                activationSink: OyaVessel.EVENT_VALVE1,
                        }));
                    }
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

