(function(exports) {
    const winston = require('winston');
    const EventEmitter = require("events");
    const srcPkg = require("../package.json");
    const OyaConf = require("./oya-conf");
    const Actuator = require("./actuator");
    const Sensor = require("./sensor");
    const OyaVessel = require("./oya-vessel");
    const path = require("path");
    const rb = require("rest-bundle");
    const SENSOR_EVENTS = {
        tempInternal: OyaVessel.SENSE_TEMP_INTERNAL,
        humidityInternal: OyaVessel.SENSE_HUMIDITY_INTERNAL,
    };

    class OyaReactor extends rb.RestBundle {
        constructor(name = "test", opts = {}) {
            super(name, Object.assign({
                srcPkg,
            }, opts));

            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    this.resourceMethod("get", "oya-conf", this.getOyaConf),
                    this.resourceMethod("put", "oya-conf", this.putOyaConf),
                    this.resourceMethod("get", "sensor/data-by-hour/:field/:date", this.getSensorDataByHour),
                    this.resourceMethod("get", "sensor/types", this.getSensorTypes),
                    this.resourceMethod("get", "sensor/locations", this.getSensorLocations),
                    this.resourceMethod("post", "reactor", this.postReactor),
                    this.resourceMethod("post", "actuator", this.postActuator),
                    this.resourceMethod("post", "sensor", this.postSensor),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${this.name}.oya-conf`;
            this.oyaConf = new OyaConf(opts);
            this.emitter = new EventEmitter(),
            this.vessels = this.oyaConf.vessels.map((vconf,iv) => {
                var vessel = new OyaVessel(Object.assign({
                    name: `${name}-vessel${iv}`,
                }, vconf, opts));
                vessel.emitter.on(OyaVessel.EVENT_MIST, (value) => {
                    this.onActuator(OyaVessel.EVENT_MIST, value, iv);
                });
                vessel.emitter.on(OyaVessel.EVENT_PUMP_MANUAL, (value) => {
                    this.onActuator(OyaVessel.EVENT_PUMP_MANUAL, value, iv);
                });
                vessel.emitter.on(OyaVessel.EVENT_COOL, (value) => {
                    this.onActuator(OyaVessel.EVENT_COOL, value, iv);
                });
                vessel.emitter.on(OyaVessel.EVENT_PRIME, (value) => {
                    this.onActuator(OyaVessel.EVENT_PRIME, value, iv);
                });
                return vessel;
            });
            this.vessel = this.vessels[0];
            this.loadApiModel(this.apiFile).then(() => this.onApiModelLoaded());
        }

        static get EVENT_RELAY() { return "event:relay"; }
        static get EVENT_BUTTON1() { return "event:button1"; }
        static get EVENT_PUMP_OVERRIDE() { return "event:pump-override"; }
        static get DEFAULT_PINS() { return [ 
            33, // Pimoroni Automation Hat relay 1
            35, // Pimoroni Automation Hat relay 2
            36, // Pimoroni Automation Hat relay 3
        ]};

        onActuator(event, value, vesselIndex) {
            var vessel = this.vessels[vesselIndex];
            this.oyaConf.actuators.map((a,ia) => {
                if (event === a.activate && a.vesselIndex === vesselIndex) {
                    if (a.pin === Actuator.NOPIN) {
                        winston.debug(`${vessel.name} onActuator ${event}:${value} ignored (no pin)`);
                    } else {
                        winston.debug(`${vessel.name} onActuator ${event}:${value} pin:${a.pin}`);
                        this.emitter.emit(OyaReactor.EVENT_RELAY, value, a.pin);
                    }
                }
            });
        }

        onApiModelLoaded() {
            winston.info("OyaReactor api model loaded");
            this.loadApiModel(this.apiFile).then(() => this.vessel.activate(true));
        }

        updateConf(conf) {
            var that = this;
            return new Promise((resolve, reject) => {
                try {
                    conf && conf.vessels.forEach((v,i) => {
                        OyaVessel.applyDelta(this.vessels[i], v);
                    });
                    resolve( that.oyaConf.update(conf) );
                } catch (err) {
                    winston.warn(err.stack);
                    reject(err);
                }
            });
        }

        loadApiModel(filePath) {
            return new Promise((resolve, reject) => {
                super.loadApiModel(filePath)
                    .then(model => {
                        try {
                            if (model) {
                                this.updateConf(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                            } else if (filePath === this.apiFile) {
                                this.updateConf().then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                            } else {
                                throw new Error("unknown api model:" + filePath);
                            }
                        } catch (err) { // implementation error
                            winston.error(err.message, err.stack);
                            reject(err);
                        }
                    })
                    .catch(err => reject(err));
            });
        }

        saveApiModel(model, filePath) {
            return new Promise((resolve, reject) => {
                super.saveApiModel(model, filePath)
                    .then(res => {
                        try {
                            if (filePath !== this.apiFile) {
                                throw new Error(`filePath expected:${this.apiFile} actual:${filePath}`);
                            }
                            this.updateConf(model).then(r=>resolve(r.toJSON())).catch(e=>reject(e));
                        } catch (err) { // implementation error
                            winston.error(err.message, err.stack);
                            reject(err);
                        }
                    })
                    .catch(e => reject(e));
            });
        }

        getOyaConf(req, res, next) {
            return this.getApiModel(req, res, next, this.apiFile);
        }

        getSensorDataByHour(req, res, next) {
            return new Promise((resolve, reject) => {
                try {
                    var dbf = this.vessel.dbfacade;
                    var yyyy = Number(req.params.date.substr(0,4));
                    var mo = Number(req.params.date.substr(5,2))-1;
                    var dd = Number(req.params.date.substr(8,2));
                    var date = new Date(yyyy,mo,dd,23,59,59,999);
                    if (req.params.field === 'internal-temp') {
                        var evt = OyaVessel.SENSE_TEMP_INTERNAL;
                        dbf.sensorDataByHour(this.vessel.name, evt, date)
                        .then(r => resolve(r))
                        .catch(e => reject(e));
                    } else {
                        reject(new Error(`unknown field:${req.params.field}`));
                    }
                } catch(e) {
                    winston.error(e.stack);
                    reject(e);
                }
            });
        }

        getSensorTypes(req, res, next) {
            return Sensor.TYPE_LIST;
        }

        getSensorLocations(req, res, next) {
            return Sensor.LOCATION_LIST;
        }

        putOyaConf(req, res, next) {
            return this.putApiModel(req, res, next, this.apiFile);
        }

        postActuator(req, res, next) {
            var name = req.body.name;
            var actuator = this.oyaConf.actuators.filter(a => {
                return a.name === name ? a : null;
            })[0];
            if (actuator == null) {
                throw new Error("unknown activator: " + JSON.stringify(req.body));
            }
            var value = actuator && req.body.value;
            if (value == null) {
                throw new Error("no value provided: " + JSON.stringify(req.body));
            }
            this.vessel.emitter.emit(actuator.activate, value);
            return {
                name,
                value: this.vessel.state[name],
            }
        }

        postSensor(req, res, next) {
            var keys = Object.keys(req.body);
            keys.forEach(key => {
                var event = SENSOR_EVENTS[key];
                if (event) {
                    this.vessel.emitter.emit(event, req.body[key]);
                } else {
                    throw new Error(`Unknown sensor: ${key}`);
                }
            });
            return req.body;
        }

        postReactor(req, res, next) {
            var result = {};
            if (req.body.hasOwnProperty('activate')) {
                this.vessel.activate(req.body.activate);
                result.activate = req.body.activate;
            } else if (req.body.hasOwnProperty('cycle')) {
                this.vessel.setCycle(req.body.cycle);
                result.cycle = req.body.cycle;
            } else {
                throw new Error("invalid reactor request: " + JSON.stringify(req.body));
            }
            return result;
        }

        getState() {
            return Object.assign(this.vessel.state, {
                api: 'oya-reactor',
            });
        }


    } //// class OyaReactor

    module.exports = exports.OyaReactor = OyaReactor;
})(typeof exports === "object" ? exports : (exports = {}));
