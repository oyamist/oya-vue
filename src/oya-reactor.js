(function(exports) {
    const winston = require('winston');
    const EventEmitter = require("events");
    const srcPkg = require("../package.json");
    const OyaConf = require("./oya-conf");
    const Actuator = require("./actuator");
    const Light = require("./light");
    const Sensor = require("./sensor");
    const fs = require('fs');
    const OyaVessel = require("./oya-vessel");
    const OyaNet = require('./oya-net');
    const path = require("path");
    const rb = require("rest-bundle");
    const DiffUpsert = require('diff-upsert').DiffUpsert;
    const exec = require('child_process').exec;
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
                    this.resourceMethod("get", "mcu/hats", this.getMcuHats),
                    this.resourceMethod("get", "net/hosts/:service", this.getNetHosts),
                    this.resourceMethod("get", "sensor/data-by-hour/:field/:days/:endDate", this.getSensorDataByHour),
                    this.resourceMethod("get", "sensor/data-by-hour/:field", this.getSensorDataByHour),
                    this.resourceMethod("get", "sensor/types", this.getSensorTypes),
                    this.resourceMethod("get", "sensor/locations", this.getSensorLocations),
                    this.resourceMethod("post", "app/update", this.postAppUpdate),
                    this.resourceMethod("post", "reactor", this.postReactor),
                    this.resourceMethod("post", "actuator", this.postActuator),
                    this.resourceMethod("post", "sensor", this.postSensor),
                ]),
            });
            this.apiFile = opts.apiFile || `${srcPkg.name}.${this.name}.oya-conf`;
            this.oyaConf = new OyaConf(opts);
            this.lights = {
                white: {
                    active: false,
                    countdown: 0,
                },
                blue: {
                    active: false,
                    countdown: 0,
                },
                red: {
                    active: false,
                    countdown: 0,
                },
            };
            this.diffUpsert = new DiffUpsert();
            this.emitter = opts.emitter || new EventEmitter();
            this.emitter.on(Light.EVENT_LIGHT_FULL, value => {
                this.lights.white.active = !!value;
                var whiteConf = this.oyaConf.lights.filter(l=>l.spectrum === Light.SPECTRUM_FULL)[0];
                if (whiteConf && whiteConf.pin >= 0) {
                    this.emitter.emit(OyaReactor.EVENT_RELAY, value, whiteConf.pin);
                }
            });
            this.emitter.on(Light.EVENT_LIGHT_BLUE, value => {
                this.lights.blue.active = !!value;
                var blueConf = this.oyaConf.lights.filter(l=>l.spectrum === Light.SPECTRUM_BLUE)[0];
                if (blueConf && blueConf.pin >= 0) {
                    this.emitter.emit(OyaReactor.EVENT_RELAY, value, blueConf.pin);
                }
            });
            this.emitter.on(Light.EVENT_LIGHT_RED, value => {
                this.lights.red.active = !!value;
                var redConf = this.oyaConf.lights.filter(l=>l.spectrum === Light.SPECTRUM_RED)[0];
                if (redConf && redConf.pin >= 0) {
                    this.emitter.emit(OyaReactor.EVENT_RELAY, value, redConf.pin);
                }
            });
            this.emitter.on(OyaConf.EVENT_CYCLE_MIST, value => {
                value && this.vessel.setCycle(OyaVessel.CYCLE_STANDARD);
            });
            this.emitter.on(OyaConf.EVENT_CYCLE_COOL, value => {
                value && this.vessel.setCycle(OyaVessel.CYCLE_COOL);
            });
            this.emitter.on(OyaConf.EVENT_CYCLE_PRIME, value => {
                value && this.vessel.setCycle(OyaVessel.CYCLE_PRIME);
            });
            this.vessels = this.oyaConf.vessels.map((vconf,iv) => {
                var vessel = new OyaVessel(Object.assign({
                    name: `${name}-vessel${iv}`,
                }, vconf, opts));
                vessel.emitter.on(OyaVessel.EVENT_MIST, (value) => {
                    this.onActuator(OyaVessel.EVENT_MIST, value, iv);
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
            this.autoActivate = opts.autoActivate == null ? true : opts.autoActivate;
            this.loadApiModel(this.apiFile).then(apiModel => {
                this.onApiModelLoaded(apiModel);
            }).catch(e => {
                winston.error('oya-reactor:', e.stack);
            });
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

        onApiModelLoaded(apiModel) {
            var rbHash = apiModel && new rb.RbHash().hash(JSON.parse(JSON.stringify(apiModel)));
            winston.info(`OyaReactor.onApiModelLoaded file:${this.apiFile} `+
                `autoActivate:${this.autoActivate} rbHash:${rbHash}`);
            this.activate(!!this.autoActivate);
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

        getMcuHats(req, res, next) {
            return [ OyaConf.MCU_HAT_NONE ];
        }

        getSensorDataByHour(req, res, next) {
            return new Promise((resolve, reject) => {
                try {
                    var dbf = this.vessel.dbfacade;
                    var days = Number(req.params.days) || 7;
                    var endDate = req.params.endDate || new Date().toISOString().substr(0,10);
                    var yyyy = Number(endDate.substr(0,4));
                    var mo = Number(endDate.substr(5,2))-1;
                    var dd = Number(endDate.substr(8,2));
                    var date = new Date(yyyy,mo,dd,23,59,59,999);
                    if (req.params.field === 'tempInternal') {
                        var evt = OyaVessel.SENSE_TEMP_INTERNAL;
                        dbf.sensorDataByHour(this.vessel.name, evt, date, days)
                        .then(r => resolve(r))
                        .catch(e => reject(e));
                    } else if (req.params.field === 'humidityInternal') {
                        var evt = OyaVessel.SENSE_HUMIDITY_INTERNAL;
                        dbf.sensorDataByHour(this.vessel.name, evt, date, days)
                        .then(r => resolve(r))
                        .catch(e => reject(e));
                    } else if (req.params.field === 'tempExternal') {
                        var evt = OyaVessel.SENSE_TEMP_EXTERNAL;
                        dbf.sensorDataByHour(this.vessel.name, evt, date, days)
                        .then(r => resolve(r))
                        .catch(e => reject(e));
                    } else if (req.params.field === 'humidityExternal') {
                        var evt = OyaVessel.SENSE_HUMIDITY_EXTERNAL;
                        dbf.sensorDataByHour(this.vessel.name, evt, date, days)
                        .then(r => resolve(r))
                        .catch(e => reject(e));
                    } else if (req.params.field === 'tempAmbient') {
                        var evt = OyaVessel.SENSE_TEMP_AMBIENT;
                        dbf.sensorDataByHour(this.vessel.name, evt, date, days)
                        .then(r => resolve(r))
                        .catch(e => reject(e));
                    } else if (req.params.field === 'humidityAmbient') {
                        var evt = OyaVessel.SENSE_HUMIDITY_AMBIENT;
                        dbf.sensorDataByHour(this.vessel.name, evt, date, days)
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
            var confnew = JSON.parse(JSON.stringify(req.body.apiModel));
            this.apiHash(confnew);
            var confold = JSON.parse(JSON.stringify(this.oyaConf));
            var delta = this.diffUpsert.diff(confnew, confold);
            winston.info('OyaReactor.putOyaConf() delta:', delta);
            var result = this.putApiModel(req, res, next, this.apiFile);
            if (this.vessel.isActive) {
                winston.debug("OyaReactor.putOyaConf() re-activating...");
                this.activate(false);
                setTimeout(() => this.activate(true), 500);
            }

            return result;
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

        activate(value=true) {
            this.vessel.activate(value);
            if (this.stopLight) {
                this.stopLight.forEach(stop => stop());
                this.stopLight = null;
            }
            if (value) {
                this.stopLight = this.oyaConf.lights.forEach(l=>{
                    var cycle = l.createCycle();
                    return l.runCycle(this.emitter, cycle);
                });
            } else {
                this.oyaConf.lights.forEach(l=>{ // turn lights off
                    if (l.pin >= 0) {
                        this.emitter.emit(l.event, false);
                    }
                });
            }
            return value;
        }
        postAppUpdate(req, res, next) {
            return new Promise((resolve,reject) => {
                winston.info('OyaReactor.postAppUpdate() update application');
                var scriptPath = path.join(__appdir, 'scripts', 'update');
                try {
                    var script = exec(`${scriptPath} -r`, (error, stdout, stderr) => {
                        winston.info(`${stdout}`);
                        winston.info(`${stderr}`);
                        if (error) {
                            winston.error(error.stack);
                            reject(error);
                        } else {
                            resolve({
                                stdout,
                                stderr,
                            });
                        }
                    });
                } catch(e) {
                    reject(e);
                }
            });
        }
        postReactor(req, res, next) {
            var result = {};
            if (req.body.hasOwnProperty('activate')) {
                winston.info(`OyaReactor.postReactor() activate:${req.body.activate}`);
                result.activate = this.activate(req.body.activate);
            } else if (req.body.hasOwnProperty('cycle')) {
                this.vessel.setCycle(req.body.cycle);
                winston.info(`OyaReactor.postReactor() cycle:${req.body.cycle}`);
                result.cycle = req.body.cycle;
            } else {
                var err = new Error("OyaReactor.postReactor() invalid request: " + JSON.stringify(req.body));
                winston.error(err.stack);
                throw err;
            }
            return result;
        }

        getNetHosts(req,res,next) {
            var onet = new OyaNet({
                service: req.params.service,
            });
            return onet.identifyHosts();
        }

        getState() {
            var lightConf = this.oyaConf.lights;
            var white = lightConf.filter(l=>l.spectrum === Light.SPECTRUM_FULL)[0];
            var blue = lightConf.filter(l=>l.spectrum === Light.SPECTRUM_BLUE)[0];
            var red = lightConf.filter(l=>l.spectrum === Light.SPECTRUM_RED)[0];
            lightConf.forEach(l => {
                if (l.spectrum === Light.SPECTRUM_FULL) {
                    this.lights.white.countdown = l.countdown();
                } else if (l.spectrum === Light.SPECTRUM_BLUE) {
                    this.lights.blue.countdown = l.countdown();
                } else if (l.spectrum === Light.SPECTRUM_RED) {
                    this.lights.red.countdown = l.countdown();
                }
            });
            return Object.assign(this.vessel.state, {
                api: 'oya-reactor',
                lights: this.lights,
            });
        }


    } //// class OyaReactor

    module.exports = exports.OyaReactor = OyaReactor;
})(typeof exports === "object" ? exports : (exports = {}));
