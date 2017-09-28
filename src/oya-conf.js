(function(exports) {
    const OyaVessel = require('./oya-vessel');
    const Actuator = require('./actuator');

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

        static createActuator(index=0, usage="Mist", opts={}) {
            if (typeof index === 'object') {
                opts = index;
                index = 0;
                usage = opts.usage || "Mist";
            }
            if (typeof usage === 'object') {
                opts = usage;
                usage = opts.usage || "Mist";
            }
            var nTypes = Object.keys(Actuator.USAGE_DEFAULTS).length;
            var nameId = Math.trunc(index/nTypes)+1;
            return new Actuator({
                    usage,
                    name: `${usage}${nameId}`,
                }, opts);
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

            this.pinMap = opts.pinMap || {
                Mist1: 1,
                Cool1: 2,
                Valve1: 3,
            };

            if (this.actuators == null) {
                if (opts.actuators) {
                    this.actuators = opts.actuators.map((a,i) => OyaConf.createActuator(i));
                } else {
                    this.actuators = [];
                    for(var iVessel = 0; iVessel < this.vessels.length; iVessel++) {
                        this.actuators.push(
                            OyaConf.createActuator(this.actuators.length, 'Mist', {
                                vesselIndex: iVessel,
                                activationSink: OyaVessel.EVENT_MIST1,
                        }));
                        this.actuators.push(
                            OyaConf.createActuator(this.actuators.length, 'Cool', {
                                vesselIndex: iVessel,
                                activationSink: OyaVessel.EVENT_COOL,
                        }));
                        this.actuators.push(
                            OyaConf.createActuator(this.actuators.length, 'Valve', {
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

        toJSON() {
            return {
                name: this.name,
                type: "OyaConf",
                tempUnit: this.tempUnit,
                vessels: this.vessels,
                actuators: this.actuators,
                pinMap: this.pinMap,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

