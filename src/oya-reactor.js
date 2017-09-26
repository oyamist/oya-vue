(function(exports) {
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const OyaConf = require("./oya-conf");
    const OyaVessel = require("./oya-vessel");
    const path = require("path");
    const rb = require("rest-bundle");

    class OyaReactor extends rb.RestBundle {
        constructor(name = "test", opts = {}) {
            super(name, Object.assign({
                srcPkg,
            }, opts));

            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    this.resourceMethod("get", "oya-conf", this.getOyaConf),
                    this.resourceMethod("put", "oya-conf", this.putOyaConf),
                    this.resourceMethod("post", "vessel", this.postVessel),
                    this.resourceMethod("post", "reactor", this.postReactor),
                    this.resourceMethod("post", "actuator", this.postActuator),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${this.name}.oya-conf`;
            this.oyaConf = new OyaConf(opts);
            this.vessels = this.oyaConf.vessels.map((vconf,iv) => {
                return new OyaVessel(Object.assign({
                    name: `${name}-vessel${iv}`,
                }, vconf));
            });
            this.vessel = this.vessels[0];
        }

        static get DEFAULT_PINS() { return [ 
            33, // Pimoroni Automation Hat relay 1
            35, // Pimoroni Automation Hat relay 2
            36, // Pimoroni Automation Hat relay 3
        ]};

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
            this.vessel.emitter.emit(actuator.activationSink, value);
            return {
                name,
                value: this.vessel.state[name],
            }
        }

        postReactor(req, res, next) {
            if (req.body.hasOwnProperty('activate')) {
                this.vessel.activate(req.body.activate);
                return {
                    activate: req.body.activate,
                }
            }
            throw new Error("invalid reactor request: " + JSON.stringify(req.body));
        }

        postVessel(req, res, next) { // DEPRECATED
            if (req.body.hasOwnProperty('cycle')) {
                this.vessel.cycle = req.body.cycle;
                return {
                    cycle: req.body.cycle,
                }
            }
            throw new Error("invalid vessel request: " + JSON.stringify(req.body));
        }

        getState() {
            return Object.assign(this.vessel.state, {
                api: 'oya-reactor',
            });
        }


    } //// class OyaReactor

    module.exports = exports.OyaReactor = OyaReactor;
})(typeof exports === "object" ? exports : (exports = {}));
