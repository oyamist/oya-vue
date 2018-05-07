(function(exports) {
    const winston = require('winston');
    const OyaMist = require("./oyamist");
    const EventEmitter = require("events");
    const srcPkg = require("../package.json");
    const OyaConf = require("./oya-conf");
    const Actuator = require("./actuator");
    const Light = require("./light");
    const Sensor = require("./sensor");
    const { VmcBundle } = require("vue-motion-cam");
    const Switch = require("./switch");
    const fs = require('fs');
    const OyaVessel = require("./oya-vessel");
    const OyaNet = require('./oya-net');
    const path = require("path");
    const {
        RestBundle,
        RbHash,
        RbSingleton,
    } = require("rest-bundle");
    const DiffUpsert = require('diff-upsert').DiffUpsert;
    const exec = require('child_process').exec;
    const memwatch = require('memwatch-next');
    memwatch.on('leak', (info) => {
        winston.warn('memwatch() => leak', JSON.stringify(info));
    });
    const SENSOR_EVENTS = {
        tempInternal: OyaMist.SENSE_TEMP_INTERNAL,
        humidityInternal: OyaMist.SENSE_HUMIDITY_INTERNAL,
        ecInternal: OyaMist.SENSE_EC_INTERNAL,
    };

    class OyaReactor extends RestBundle {
        constructor(name = "test", opts = {}) {
            super(name, Object.assign({
                srcPkg,
            }, opts));

            winston.info(`OyaReactor.ctor(${name})`);
            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    this.resourceMethod("get", "mcu/hats", this.getMcuHats),
                    this.resourceMethod("get", "net/hosts", this.getNetHosts),
                    this.resourceMethod("get", "net/hosts/:service", this.getNetHosts),
                    this.resourceMethod("get", "oya-conf", this.getOyaConf),
                    this.resourceMethod("get", "sensor/data-by-hour/:field", this.getSensorDataByHour),
                    this.resourceMethod("get", "sensor/data-by-hour/:field/:days/:endDate", this.getSensorDataByHour),
                    this.resourceMethod("get", "sensor/locations", this.getSensorLocations),
                    this.resourceMethod("get", "sensor/types", this.getSensorTypes),
                    this.resourceMethod("post", "actuator", this.postActuator),
                    this.resourceMethod("post", "app/restart", this.postAppRestart),
                    this.resourceMethod("post", "app/update", this.postAppUpdate),
                    this.resourceMethod("post", "reactor", this.postReactor),
                    this.resourceMethod("post", "sensor", this.postSensor),
                    this.resourceMethod("post", "sensor/calibrate", this.postSensorCalibrate),
                    this.resourceMethod("put", "oya-conf", this.putOyaConf),

                ]),
            });
            this.apiFile = opts.apiFile || `${srcPkg.name}.${this.name}`;
            this.oyaConf = new OyaConf(opts);
            RbSingleton.emitter.on("heapMax", heapStat => {
                var heapReboot = this.oyaConf.heapReboot;
                if (heapStat.total_heap_size > heapReboot) {
                    winston.warn(`Memory heap exceeds heapReboot threshold (${heapReboot}. Restarting server...`);
                    this.restart();
                }
            });
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
                this.onLight(Light.SPECTRUM_FULL, value, 'white');
            });
            this.emitter.on(Light.EVENT_LIGHT_BLUE, value => {
                this.onLight(Light.SPECTRUM_BLUE, value, 'blue');
            });
            this.emitter.on(Light.EVENT_LIGHT_RED, value => {
                this.onLight(Light.SPECTRUM_RED, value, 'red');
            });
            this.emitter.on(OyaConf.EVENT_CYCLE_MIST, value => {
                value && this.vessel.setCycle(OyaMist.CYCLE_STANDARD);
            });
            this.emitter.on(OyaConf.EVENT_CYCLE_COOL, value => {
                value && this.vessel.setCycle(OyaMist.CYCLE_COOL);
            });
            this.emitter.on(OyaConf.EVENT_CYCLE_PRIME, value => {
                value && this.vessel.setCycle(OyaMist.CYCLE_PRIME);
            });
            this.vessels = this.oyaConf.vessels.map((vconf,iv) => {
                var vessel = new OyaVessel(Object.assign({
                    name: `${name}-vessel${iv}`,
                }, vconf, opts));
                vessel.emitter.on(OyaMist.EVENT_MIST, (value) => {
                    this.onActuator(OyaMist.EVENT_MIST, value);
                });
                vessel.emitter.on(OyaMist.EVENT_COOL, (value) => {
                    this.onActuator(OyaMist.EVENT_COOL, value);
                });
                vessel.emitter.on(OyaMist.EVENT_PRIME, (value) => {
                    this.onActuator(OyaMist.EVENT_PRIME, value);
                });
                return vessel;
            });
            this.vessel = this.vessels[0];
            this.autoActivate = opts.autoActivate == null ? true : opts.autoActivate;
            var that = this;
            this.restart = opts.restart || OyaReactor.restart;
        }

        static get EVENT_RELAY() { return "event:relay"; }
        static get EVENT_BUTTON1() { return "event:button1"; }
        static get EVENT_PUMP_OVERRIDE() { return "event:pump-override"; }
        static get DEFAULT_PINS() { return [ 
            33, // Pimoroni Automation Hat relay 1
            35, // Pimoroni Automation Hat relay 2
            36, // Pimoroni Automation Hat relay 3
        ]};

        initialize() {
            var promise = super.initialize();
            promise.then(apiModel => {
                var rbHash = apiModel && new RbHash().hash(JSON.parse(JSON.stringify(apiModel)));
                // NOTE: rbHash of updated apiModel will differ from saved if apiModel has 
                // been extended. Difference will persist until model is saved
                winston.info(`OyaReactor-${this.name}.initialize() rbHash:${rbHash} autoActivate:${this.autoActivate} `);
                this.activate(!!this.autoActivate);
                if (apiModel.camera === OyaConf.CAMERA_NONE) {
                    winston.info(`OyaReactor.initialize() camera:${apiModel.camera} `);
                } else if (apiModel.camera === OyaConf.CAMERA_ALWAYS_ON) {
                    winston.info(`OyaReactor.initialize() camera:${apiModel.camera} activating...`);
                    this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATE, true);
                }
            });
            return promise;
        }

        onLight(spectrum, value, key) {
            // note: robust state enforcement continuously generates redundant light events 
            var light = this.oyaConf.lights.filter(l=>l.spectrum === spectrum)[0];
            if (light && light.pin >= 0) {
                if (value !== this.lights[key].active) {
                    winston.info(`OyaReactor-${this.name}.onLight() ${spectrum} value:${value} `);
                    this.lights[key].active = !!value;
                }
                this.emitter.emit(OyaReactor.EVENT_RELAY, value, light.pin);

                if (this.oyaConf.camera === OyaConf.CAMERA_WHEN_LIT) {
                    var anyLightOn = false;
                    Object.keys(this.lights).forEach(key => {
                        anyLightOn = anyLightOn || this.lights[key].active;
                    });
                    winston.debug(`OyaReactor.onLight() camera:${this.oyaConf.camera} activating: ${anyLightOn} ...`);
                    this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATE, anyLightOn);
                }
            };
        }

        onActuator(event, value) {
            var vessel = this.vessel;
            this.oyaConf.actuators.map((a,ia) => {
                if (event === a.activate) {
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
            var rbHash = apiModel && new RbHash().hash(JSON.parse(JSON.stringify(apiModel)));
            // NOTE: rbHash of updated apiModel will differ from saved if apiModel has 
            // been extended. Difference will persist until model is saved
            winston.info(`OyaReactor-${this.name}.onApiModelLoaded() rbHash:${rbHash} autoActivate:${this.autoActivate} `);
            this.activate(!!this.autoActivate);
            if (apiModel.camera === OyaConf.CAMERA_NONE) {
                winston.info(`OyaReactor.onApiModelLoaded() camera:${apiModel.camera} `);
            } else if (apiModel.camera === OyaConf.CAMERA_ALWAYS_ON) {
                winston.info(`OyaReactor.onApiModelLoaded() camera:${apiModel.camera} activating...`);
                this.emitter.emit(VmcBundle.EVT_CAMERA_ACTIVATE, true);
            }
        }

        updateConf(conf) {
            var that = this;
            return new Promise((resolve, reject) => {
                try {
                    conf && [conf.vessels[0]].forEach((v,i) => {
                        OyaVessel.applyDelta(this.vessels[i], v);
                    });
                    that.oyaConf.update(conf);
                    resolve( that.oyaConf) ;

                } catch (err) {
                    winston.warn(err.stack);
                    reject(err);
                }
            });
        }

        loadApiModel(filePath) {
            return new Promise((resolve, reject) => {
                super.loadApiModel(filePath).then(model => {
                        try {
                            var rbh = model ? model.rbHash : 'default';
                            this.updateConf(model).then(r=> {
                                winston.info(`OyaReactor-${this.name}.loadApiModel() rbHash:${rbh} `);
                                resolve(r.toJSON());
                            }).catch(e=>{
                                winston.warn(err.stack);
                                reject(err);
                            });
                        } catch (err) { // implementation error
                            winston.warn(err.stack);
                            reject(err);
                        }
                    })
                    .catch(err => reject(err));
            });
        }

        saveApiModel(model, filePath) {
            return new Promise((resolve, reject) => {
                super.saveApiModel(model, filePath).then(res => {
                    try {
                        this.updateConf(model).then(r=>resolve(r.toJSON())).catch(e=>{
                            winston.warn(e.stack);
                            reject(e);
                        });
                    } catch (err) { // implementation error
                        winston.error(err.stack);
                        reject(err);
                    }
                }).catch(e => {
                    winston.error(e.stack);
                    reject(e);
                });
            });
        }

        getOyaConf(req, res, next) {
            return this.getApiModel(req, res, next);
        }

        getMcuHats(req, res, next) {
            return [ OyaConf.MCU_HAT_NONE ];
        }

        health() {
            // true: nominal
            // false: error
            // Error(): error
            // null: not configured
            var result = {
                active: this.vessel.isActive,
            }
            this.oyaConf.sensors.forEach(sensor => {
                sensor.loc !== OyaMist.LOC_NONE && Object.assign(result, sensor.health());
            });

            return result;
        }

        getSensorDataByHour(req, res, next) {
            var field = req.params.field || 'ecInternal';
            var days = Number(req.params.days) || 7;
            var endDate = req.params.endDate && new Date(req.params.endDate) || new Date();
            var eDate = req.params.endDate || new Date().toString();
            return new Promise((resolve, reject) => {
                try {
                    var evt = OyaMist.eventOfField(field);
                    var dbf = this.vessel.dbfacade;
                    if (evt) {
                        var sensor = this.oyaConf.sensorOfField(field);
                        var hours = days * 24;
                        var startDate = new Date(endDate.getTime() - hours*3600*1000);
                        var tempField = sensor && OyaMist.locationField(sensor.loc, 'temp') || 'tempInternal';
                        var fields = tempField && field !== tempField ? [field,tempField] : [field];
                        dbf.sensorAvgByHour(fields, startDate, hours).then(r => {
                            r.data.map(d => {
                                var temp = d[tempField];
                                if (sensor == null || temp == null || this.oyaConf.chart.showRaw) {
                                    d.vavg = d[field];
                                } else {
                                    d.vavg = sensor.valueForTemp(d[field],temp);
                                }
                                d.evt = evt;
                            });
                            resolve(r);
                        }).catch(e => {
                            winston.warn(e.stack);
                            reject(e);
                        });
                    } else {
                        throw new Error(`unknown field:${field}`);
                    }
                } catch(e) {
                    winston.warn(e.stack);
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

        applyMcuHatDefaults(confnew) {
            return confnew;
        }

        putOyaConf(req, res, next) {
            try {
                var confnew = JSON.parse(JSON.stringify(req.body.apiModel));
                this.apiHash(confnew);
                var confold = JSON.parse(JSON.stringify(this.oyaConf));
                var delta = this.diffUpsert.diff(confnew, confold);
                winston.info('OyaReactor.putOyaConf() delta:', delta);
                var result = this.putApiModel(req, res, next);
                if (this.vessel.isActive) {
                    winston.debug("OyaReactor.putOyaConf() re-activating...");
                    this.activate(false);
                    setTimeout(() => this.activate(true), 500);
                }
            } catch (e) {
                winston.error(e.stack);
                throw e;
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

        postSensorCalibrate(req, res, next) {
            return new Promise((resolve, reject) => {
                try {
                    var opts = req.body;
                    var field = opts.field || 'ecInternal';
                    var startDateStr = opts.startDate || OyaMist.localDate().toISOString();
                    if (startDateStr.indexOf('T') < 0) {
                        startDateStr = OyaMist.localDate(startDateStr);
                    }
                    var startDate = new Date(startDateStr);
                    var hours = opts.hours || 24;
                    var dbf = this.vessel.dbfacade;
                    var sensor = this.oyaConf.sensors.filter(s=>s.name===opts.sensor)[0];
                    sensor = sensor || this.oyaConf.sensorOfField(field);
                    if (sensor == null) {
                        throw new Error(`no sensor found for field:${req.params.field}`);
                    } 
                    if (opts.calibrateDry) {
                        sensor.calibrateDry();
                        var msg = `Performed dry calibration for sensor:${sensor.name}`;
                        winston.info(`OyaReactor.postSensorCalibrate() ${msg}`);
                        resolve(msg);
                        return;
                    }

                    if (field === 'ecInternal') {
                        winston.info(`OyaReactor.postSensorCalibrate() ${startDate}`);
                        dbf.sensorAvgByHour([field,'tempInternal'], startDate, hours).then(r => {
                            var status = sensor.calibrateTemp(r.data, {
                                nominal: opts.nominal,
                                startDate,
                                name: opts.name,
                                unit: opts.unit,
                            });

                            this.saveApiModel(this.oyaConf).then(r => {
                                winston.info(`OyaReactor.postSensorCalibrate() => `, status);
                                resolve(status);
                            }).catch(e => {
                                winston.warn(e.stack);
                                reject(e);
                            });
                        }).catch(e => {
                            winston.warn(e.stack);
                            reject(e);
                        });
                    } else {
                        throw new Error(`unknown field:${req.params.field}`);
                    }
                } catch(e) {
                    winston.warn(e.stack);
                    reject(e);
                }
            });
        }

        syncLights(value, date=new Date()) {
            this.oyaConf.lights.forEach(l => {
                var v = (value == null) ? Light.isLightOnAt(l,date) : value;
                l.pin >= 0 && this.emitter.emit(l.event, v);
            });
        }

        activate(value=true) {
            this.vessel.activate(value);
            if (this.stopLight) {
                this.stopLight.forEach(stop => stop());
                this.stopLight = null;
            }
            if (value) {
                const SYNC_LIGHT_SECONDS = 3;
                var interval = setInterval(() => this.syncLights(), SYNC_LIGHT_SECONDS * 1000);
                this.stopLight = [() => clearInterval(interval)];
                this.syncLights();
            } else {
                this.syncLights(false);
            }
            return value;
        }

        postAppRestart(req, res, next) {
            winston.info('OyaReactor.postAppRestart() restart server');
            this.restart();
        }

        static restart() {
            winston.info('OyaReactor.restart() *** RESTARTING SERVER ***');
            return new Promise((resolve,reject) => {
                try {
                    var script = exec(`shutdown -r now`, (error, stdout, stderr) => {
                        winston.info(`${stdout}`);
                        winston.info(`${stderr}`);
                        if (error) {
                            winston.warn(error.stack);
                            reject(error);
                        } else {
                            resolve({
                                stdout,
                                stderr,
                            });
                        }
                    });
                } catch(e) {
                    winston.warn(e.stack);
                    reject(e);
                }
            });
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
                    winston.error(e.stack);
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
            var service = req.params.service || this.name;
            winston.info(`OyaNet.getNetHosts(${service})`);
            var onet = new OyaNet({ service, });
            return onet.identifyHosts();
        }

        getIdentity(req, res, next) {
            return new Promise((resolve, reject) => {
                var r = super.getIdentity(req,res,next);
                r.vessel = this.vessel.name;
                r.health = this.health();
                resolve(r);
            }).catch(e => {
                winston.warn(e.stack);
                reject(e);
            });
        }

        getState() {
            try {
                var lightConf = this.oyaConf.lights;
                var white = lightConf.filter(l=>l.spectrum === Light.SPECTRUM_FULL)[0];
                var blue = lightConf.filter(l=>l.spectrum === Light.SPECTRUM_BLUE)[0];
                var red = lightConf.filter(l=>l.spectrum === Light.SPECTRUM_RED)[0];
                var active = this.vessel.isActive;
                lightConf.forEach(l => {
                    if (l.spectrum === Light.SPECTRUM_FULL) {
                        this.lights.white.countdown = l.countdown();
                        this.lights.white.active = active && Light.isLightOnAt(l);
                    } else if (l.spectrum === Light.SPECTRUM_BLUE) {
                        this.lights.blue.countdown = l.countdown();
                        this.lights.blue.active = active && Light.isLightOnAt(l);
                    } else if (l.spectrum === Light.SPECTRUM_RED) {
                        this.lights.red.countdown = l.countdown();
                        this.lights.red.active = active && Light.isLightOnAt(l);
                    }
                });
                var state = JSON.parse(JSON.stringify(this.vessel.state));
                state = Object.assign(state, {
                    api: 'oya-reactor',
                    lights: this.lights,
                    health: this.health(),
                });
                ['ecInternal','ecAmbient','ecCanopy'].forEach(field => {
                    var ecSensor = this.oyaConf.sensorOfField(field);
                    if (ecSensor) {
                        if (!this.oyaConf.chart.showRaw && ecSensor.tempCal.ann) {
                            var tempField = ecSensor && OyaMist.locationField(ecSensor.loc, 'temp') || 'tempInternal';
                            var temp = tempField && state[tempField].value;

                            state[field].unit = ecSensor.tempCal.unit;
                            if (state[field].value != null && temp != null) {
                                state[field].value = ecSensor.valueForTemp(state[field].value,temp);
                                state[field].avg1 = ecSensor.valueForTemp(state[field].avg1,temp);
                                state[field].avg2 = ecSensor.valueForTemp(state[field].avg2,temp);
                            }
                            if (ecSensor.tempCal.ann) {
                                state[field].annotation = ecSensor.tempCal.name;
                            }
                        }
                    }
                });
                return state;
            } catch (e) {
                winston.error(`OyaReactor-${this.name}.getState()`, e.stack);
                return e;
            }
        }


    } //// class OyaReactor

    module.exports = exports.OyaReactor = OyaReactor;
})(typeof exports === "object" ? exports : (exports = {}));
