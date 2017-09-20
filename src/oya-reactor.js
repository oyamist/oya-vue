(function(exports) {
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const OyaConf = require("./oya-conf");
    const OyaCycle = require("./oya-cycle");
    const path = require("path");
    const rb = require("rest-bundle");

    class OyaReactor extends rb.RestBundle {
        constructor(name = "test", options = {}) {
            super(name, Object.assign({
                srcPkg,
            }, options));

            Object.defineProperty(this, "handlers", {
                value: super.handlers.concat([
                    this.resourceMethod("get", "oya-conf", this.getOyaConf),
                    this.resourceMethod("put", "oya-conf", this.putOyaConf),
                    this.resourceMethod("post", "oya-cycle", this.postOyaCycle),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${this.name}.oya-conf`;
            this.oyaConf = new OyaConf(options);
            this.oyaCycle = new OyaCycle({
                name,
                actuator: this.oyaConf.actuators[0],
            });
        }

        updateConf(conf) {
            var that = this;
            return new Promise((resolve, reject) => {
                try {
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

        postOyaCycle(req, res, next) {
            if (req.body.hasOwnProperty('activate')) {
                this.oyaCycle.activate(req.body.activate);
                return {
                    activate: req.body.activate,
                }
            } else if (req.body.hasOwnProperty('cycle')) {
                this.oyaCycle.cycle = req.body.cycle;
                return {
                    cycle: req.body.cycle,
                }
            }
            throw new Error("unknown oya-cycle request: ", req.body);
        }

        getState() {
            return {
                api: 'oya-reactor',
                cycle: this.oyaCycle.cycle,
                cycleNumber: this.oyaCycle.cycleNumber,
                isActive: this.oyaCycle.isActive,
                isOn: this.oyaCycle.isOn,
                countdown: this.oyaCycle.countdown,
            };
        }


    } //// class OyaReactor

    module.exports = exports.OyaReactor = OyaReactor;
})(typeof exports === "object" ? exports : (exports = {}));
