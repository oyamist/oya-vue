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
                    this.resourceMethod("post", "oya-cycle", this.postOyaCycle),
                ]),
            });
            this.apiFile = `${srcPkg.name}.${this.name}.oya-conf`;
            this.senseEmitter = opts.senseEmitter;
            this.senseEmitter && this.senseEmitter.on(OyaReactor.SENSE_TEMP_INTERNAL, 
                (value) => this.onTempInternal(value)
            );
            this.oyaConf = new OyaConf(opts);
            this.vessels = this.oyaConf.vessels.map((vconf,iv) => {
                return new OyaVessel(Object.assign({
                    name: `${name}-vessel${iv}`,
                }, vconf));
            });
            this.vessel = this.vessels[0];
        }

        static get SENSE_TEMP_INTERNAL() { return "sense: temp-internal"; }
        static get SENSE_TEMP_EXTERNAL() { return "sense: temp-external"; }
        static get SENSE_TEMP_AMBIENT() { return "sense: temp-ambient"; }
        static get SENSE_HUMIDITY_INTERNAL() { return "sense: humidity-internal"; }
        static get SENSE_HUMIDITY_ExTERNAL() { return "sense: humidity-external"; }
        static get SENSE_PH() { return "sense: pH"; }
        static get SENSE_PPM() { return "sense: ppm"; }

        onTempInternal(value) {
            winston.debug(`onTempInternal ${value}`);
            if (value < this.oyaConf.fanThreshold) {
                if (this.vessel.nextCycle === this.vessel.hotCycle) {
                    winston.info("onTempInternal: reverting to default cycle");
                    // cancel cooling and revert to default cycle
                    this.vessel.nextCycle = this.vessel.startCycle;
                }
            } else {
                winston.info("onTempInternal: next cycle will be cooling cycle");
                this.vessel.nextCycle = this.vessel.hotCycle;
            }
        }

        updateConf(conf) {
            var that = this;
            return new Promise((resolve, reject) => {
                try {
                    conf && conf.vessels.forEach((v,i) => {
                        that.vessels[i].applyDelta(v);
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

        postOyaCycle(req, res, next) {
            if (req.body.hasOwnProperty('activate')) {
                this.vessel.activate(req.body.activate);
                return {
                    activate: req.body.activate,
                }
            } else if (req.body.hasOwnProperty('cycle')) {
                this.vessel.cycle = req.body.cycle;
                return {
                    cycle: req.body.cycle,
                }
            }
            throw new Error("unknown oya-cycle request: ", req.body);
        }

        getState() {
            return Object.assign(this.vessel.state, {
                api: 'oya-reactor',
                countdown: this.vessel.countdown,
            });
        }


    } //// class OyaReactor

    module.exports = exports.OyaReactor = OyaReactor;
})(typeof exports === "object" ? exports : (exports = {}));
