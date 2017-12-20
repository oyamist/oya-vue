(function(exports) {
    const OyaVessel = require('./oya-vessel');
    const Actuator = require('./actuator');
    const Sensor = require('./sensor');
    const Light = require('./light');

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

        update(opts = {}) {
            var i2cRead = opts.i2cRead;
            var i2cWrite = opts.i2cWrite;

            this.name = opts.name || this.name || 'test';

            this.relayController = opts.relayController || "pmi-automation";

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

            if (this.actuators == null && opts.actuators == null) {
                this.actuators = [];
                for(var iVessel = 0; iVessel < this.vessels.length; iVessel++) {
                    var suffix = iVessel ? iVessel+1 : "";
                    this.actuators.push(
                        new Actuator({
                            name: `${Actuator.USAGE_MIST}${suffix}`,
                            usage: Actuator.USAGE_MIST,
                            vesselIndex: iVessel,
                    }));
                    this.actuators.push(
                        new Actuator({
                            name: `${Actuator.USAGE_COOL}${suffix}`,
                            usage: Actuator.USAGE_COOL,
                            vesselIndex: iVessel,
                    }));
                    this.actuators.push(
                        new Actuator({
                            name: `${Actuator.USAGE_PRIME}${suffix}`,
                            usage: Actuator.USAGE_PRIME,
                            vesselIndex: iVessel,
                    }));
                }
            }
            if (opts.actuators) {
                this.actuators = opts.actuators.map((a,i) => {
                    return new Actuator(a);
                });
            }
            if (opts.sensors) {
                this.sensors = opts.sensors.map((s,i) => {
                    return new Sensor(Object.assign({
                        i2cRead,
                        i2cWrite,
                    }, s));
                });
            } else if (this.sensors == null) {
                this.sensors = [];
                for(var iVessel = 0; iVessel < this.vessels.length; iVessel++) {
                    var suffix = iVessel ? iVessel+1 : "";
                    var sensorOpts = Object.assign(Sensor.TYPE_NONE, {
                        vesselIndex: iVessel,
                        i2cRead,
                        i2cWrite,
                    });
                    this.sensors.push(new Sensor(sensorOpts));
                    this.sensors.push(new Sensor(sensorOpts));
                    this.sensors.push(new Sensor(sensorOpts));
                }
            }
            if (opts.lights) {
                this.lights = opts.lights.map((l,i) => {
                    return new Light(l);
                });
            } else if (this.lights == null) {
                this.lights = [];
                this.lights.push(new Light(Light.LIGHT_FULL));
                this.lights.push(new Light(Light.LIGHT_BLUE));
                this.lights.push(new Light(Light.LIGHT_RED));
            }

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
                sensors: this.sensors,
                lights: this.lights,
            };
        }

    } //// class OyaConf

    module.exports = exports.OyaConf = OyaConf;
})(typeof exports === "object" ? exports : (exports = {}));

