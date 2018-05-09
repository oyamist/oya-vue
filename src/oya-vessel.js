(function(exports) {
    const EventEmitter = require("events");
    const winston = require("winston");
    const OyaMist = require("./oyamist");
    const DbFacade = require("./db-facade");
    const uuidv4 = require('uuid/v4');

    var id = 1;

    class OyaVessel {
        constructor(opts = {}) {
            const COOLTHRESHOLD = (70 - 32) / 1.8;

            // serializable toJSON() properties
            this.name = `vessel${id++}`;
            this.enabled = true; // can be activated
            this.startCycle = OyaMist.CYCLE_STANDARD;
            this.hotCycle = OyaMist.CYCLE_COOL;
            this.coolThreshold = COOLTHRESHOLD;
            this.thresholdHysteresis = opts.thresholdHysteresis || 0.99;
            this.sensorExpRate = opts.sensorExpRate || 0.01; // exponential average rate
            this.maxCycles = 0;
            this.cycles = OyaVessel.DEFAULT_CYCLES,
            this._state = {
                type: "OyaVessel",
                Mist: false,
                Cool: false,
                Prime: false,
                countdown: 0,
                countstart: 0,
                tempInternal: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: "C",
                },
                tempCanopy: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: "C",
                },
                tempAmbient: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: "C",
                },
                humidityInternal: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: "%RH",
                },
                humidityCanopy: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: "%RH",
                },
                humidityAmbient: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: "%RH",
                },
                ecInternal: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: '\u00b5S', // microsiemens
                },
                ecCanopy: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: '\u00b5S', // microsiemens
                },
                ecAmbient: {
                    value: null,
                    avg1: null,
                    avg2: null,
                    unit: '\u00b5S', // microsiemens
                },
            };
            OyaVessel.applyDelta(this, opts);
            this.guid == null && (this.guid = uuidv4().toString());
            this._state.cycle = this.startCycle;

            this.nextCycle = this._state.cycle,
            this._state.active = false,
            this.dbfacade = opts.dbfacade || new DbFacade();
            this.dbfacade.open().then(r => {
            }).catch(e=>{
                winston.error(e.stack);
                winston.error("Unrecoverable error. Exiting with error code: 5=EIO");
                process.exit(-5); // EIO
            });
            this.emitter = opts.emitter || new EventEmitter(),
            this._phaseTimeout = false;
            this._state.cycleNumber = 0;
            this.emitter.on(OyaMist.EVENT_MIST, (value) => {
                this._state.Mist = value;
            });
            this.emitter.on(OyaMist.EVENT_COOL, (value) => {
                this._state.Cool = value;
            });
            this.emitter.on(OyaMist.EVENT_PRIME, (value) => {
                this._state.Prime = value;
            });
            this.emitter.on(OyaMist.EVENT_ACTIVATE, (self, event) => {
                winston.debug(this.summary, event);
            });
            this.emitter.on(OyaMist.SENSE_TEMP_INTERNAL, (v) => 
                this.onTemp(v,'tempInternal',OyaMist.SENSE_TEMP_INTERNAL));
            this.emitter.on(OyaMist.SENSE_TEMP_CANOPY, (v) => 
                this.onTemp(v,'tempCanopy',OyaMist.SENSE_TEMP_CANOPY));
            this.emitter.on(OyaMist.SENSE_TEMP_AMBIENT, (v) => 
                this.onTemp(v,'tempAmbient',OyaMist.SENSE_TEMP_AMBIENT));
            this.emitter.on(OyaMist.SENSE_HUMIDITY_INTERNAL, (v) => 
                this.onHumidity(v,'humidityInternal', OyaMist.SENSE_HUMIDITY_INTERNAL));
            this.emitter.on(OyaMist.SENSE_HUMIDITY_AMBIENT, (v) => 
                this.onHumidity(v,'humidityAmbient', OyaMist.SENSE_HUMIDITY_AMBIENT));
            this.emitter.on(OyaMist.SENSE_HUMIDITY_CANOPY, (v) => 
                this.onHumidity(v,'humidityCanopy', OyaMist.SENSE_HUMIDITY_CANOPY));
            this.emitter.on(OyaMist.SENSE_EC_INTERNAL, (v) => 
                this.onEC(v,'ecInternal', OyaMist.SENSE_EC_INTERNAL));
            this.emitter.on(OyaMist.SENSE_EC_CANOPY, (v) => 
                this.onEC(v,'ecCanopy', OyaMist.SENSE_EC_CANOPY));
            this.emitter.on(OyaMist.SENSE_EC_AMBIENT, (v) => 
                this.onEC(v,'ecAmbient', OyaMist.SENSE_EC_AMBIENT));
            this._countdownId = setInterval(() => {
                this._state.countdown = this._state.countdown <= 0 ? 0 : (this._state.countdown-1);
            }, 1000);
        }

        static get DEFAULT_CYCLES() { return {
            [OyaMist.CYCLE_STANDARD]: {
                name: "Standard",
                key: OyaMist.CYCLE_STANDARD,
                desc: "Standard cycle for all phases of plant growth",
                emits: OyaMist.EVENT_MIST,
                on: 10,
                off: 60,
                nextCycle: OyaMist.CYCLE_STANDARD,
            },
            [OyaMist.CYCLE_PRIME]: {
                name: "Prime",
                key: OyaMist.CYCLE_PRIME,
                desc: "Circulate water to prime misting system",
                emits: OyaMist.EVENT_MIST,
                on: 60,
                off: 0,
                nextCycle: OyaMist.CYCLE_STANDARD,
            },
            [OyaMist.CYCLE_COOL]: {
                name: "Cool",
                key: OyaMist.CYCLE_COOL,
                desc: "Hot day evaporative cooling cycle with fan",
                emits: OyaMist.EVENT_MIST,
                on: 10,
                off: 20,
                nextCycle: OyaMist.CYCLE_COOL,
            },
            [OyaMist.CYCLE_CONSERVE]: {
                name: "Conserve",
                key: OyaMist.CYCLE_CONSERVE,
                desc: "Conservative misting cycle for mild conditions",
                emits: OyaMist.EVENT_MIST,
                on: 10,
                off: 120,
                nextCycle: OyaMist.CYCLE_CONSERVE,
            },
        }}

        toJSON() {
            return {
                name: this.name,
                guid: this.guid,
                sensorExpRate: this.sensorExpRate,
                type: 'OyaVessel',
                enabled: this.enabled,
                startCycle: this.startCycle,
                hotCycle: this.hotCycle,
                coolThreshold: this.coolThreshold,
                thresholdHysteresis: this.thresholdHysteresis,
                maxCycles: this.maxCycles,
                cycles: this.cycles,
            }
        }

        static applyDelta(vessel, delta={}) {
            ['name', 'enabled', 'startCycle', 'hotCycle', 'coolThreshold', 'maxCycles', 'guid']
            .forEach(prop => {
                vessel[prop] = delta[prop] == null ? vessel[prop] : delta[prop];
            });
            if (delta.cycles) {
                Object.keys(vessel.cycles).forEach(key => {
                    if (!delta.cycles.hasOwnProperty(key)) {
                        delete vessel.cycles[key];
                    }
                });
                Object.keys(delta.cycles).forEach(key => {
                    vessel.cycles[key] = Object.assign(vessel.cycles[key], delta.cycles[key]);
                });
            }
        }

        get summary() { 
            return `${this.name} ` +
                `cycle:"${this.cycle}" ${this._state.cycleNumber} ` +
                `active:${this.isActive?1:0} ${this.state.Mist?'on':'off'}`;
        }

        get isActive() {
            return this._state.active;
        }

        onEC(value, field, sense) {
            winston.debug(`onEC ${field} ${value}`);
            this.dbfacade.isOpen && this.dbfacade
                .logSensor(this.guid, sense, value)
                .catch(e => {
                    winston.debug(e); // ignore sensor errors
                });
            this._state[field].value = value;
            var expRate = Number(this.sensorExpRate);
            this._state[field].avg1 = this._state[field].avg1 == null 
                ? value
                : value * expRate + (1 - expRate) * this._state[field].avg1;
            this._state[field].avg2 = this._state[field].avg2 == null 
                ? this._state[field].avg1 
                : this._state[field].avg1 * expRate + (1 - expRate) * this._state[field].avg2;
        }

        onHumidity(value, field, sense) {
            winston.debug(`onHumidity ${field} ${value}`);
            this.dbfacade.isOpen && this.dbfacade
                .logSensor(this.guid, sense, value)
                .catch(e => {
                    winston.debug(e); // ignore sensor errors
                });
            this._state[field].value = value;
            var expRate = Number(this.sensorExpRate);
            this._state[field].avg1 = this._state[field].avg1 == null 
                ? value
                : value * expRate + (1 - expRate) * this._state[field].avg1;
            this._state[field].avg2 = this._state[field].avg2 == null 
                ? this._state[field].avg1 
                : this._state[field].avg1 * expRate + (1 - expRate) * this._state[field].avg2;
        }

        onTemp(value, field, sense) {
            winston.debug(`onTemp ${field} ${value}`);
            this.dbfacade.isOpen && this.dbfacade
                .logSensor(this.guid, sense, value)
                .catch(e => {
                    winston.debug(e); // ignore sensor errors
                });
            if (value <= this.coolThreshold * this.thresholdHysteresis) {
                if (this.nextCycle === this.hotCycle) {
                    winston.info(`OyaVessel.onTemp() ${field}: reverting to default cycle`);
                    // cancel cooling and revert to default cycle
                    this.nextCycle = this.startCycle;
                }
            } else if (value >= this.coolThreshold && this.nextCycle !== this.hotCycle) {
                winston.info(`OyaVessel.onTemp() ${field}: next cycle will be cooling cycle`);
                this.nextCycle = this.hotCycle;
            }
            this._state[field].value = value;
            var expRate = Number(this.sensorExpRate);
            this._state[field].avg1 = this._state[field].avg1 == null 
                ? value
                : value * expRate + (1 - expRate) * this._state[field].avg1;
            this._state[field].avg2 = this._state[field].avg2 == null 
                ? this._state[field].avg1 
                : this._state[field].avg1 * expRate + (1 - expRate) * this._state[field].avg2;
        }

        activate(value=true) {
            if (this.isActive === value) {
                winston.debug(`OyaVessel.activate() vessel:${this.name} redundant activate ignored`);
            } else if (value === true) {
                winston.debug(`OyaVessel.activate(true) vessel:${this.name} `);
                this._state.active = value;
                this._state.cycleNumber = 0;
                this.emitter.emit(OyaMist.EVENT_ACTIVATE, value);
                updatePhase(this, true);
            } else if (value === false) {
                winston.debug(`OyaVessel.activate(false) vessel:${this.name} `);
                this._state.active = value;
                this._state.countdown = 0;
                this._state.countstart = 0;
                this._phaseTimeout != null && clearTimeout(this._phaseTimeout);
                this._phaseTimeout = null;
                this.emitter.emit(OyaMist.EVENT_ACTIVATE, value);
                this.emitter.emit(OyaMist.EVENT_MIST, false);
                this.emitter.emit(OyaMist.EVENT_COOL, false);
                this.emitter.emit(OyaMist.EVENT_PRIME, false);
            } else {
                var err = new Error(`${this.name} OyaVessel.activate expects a boolean`);
                winston.warn(err.stack);
                throw err;
            }
            return this;
        }

        get cycle() {
            return this._state.cycle;
        }

        set cycle(value) {
            throw new Error('"cycle" is a read-only property. Call setCycle()');
        }

        setCycle(value) {
            var nextCycle = this.cycles[value].nextCycle;
            if (value === this.cycle) {
                winston.debug(`OyaVessel.setCycle() cycle:${value} nextCycle:${nextCycle} no change`);
            } else {
                winston.info(`OyaVessel.setCycle() cycle:${value} nextCycle:${nextCycle}`);
            }
            if (this.isActive) {
                this.activate(false);
                this._state.cycle = value;
                this.activate(true);
            } else {
                this._state.cycle = value;
            }
            this.nextCycle = nextCycle;
            return this;
        }

        get state() {
            return Object.assign({
                cycle: this.cycle,
                nextCycle: this.nextCycle,
            }, this._state);
        }

    } //// class OyaVessel

    function updatePhase(self, value) {
        var cycle = self.cycles[self.cycle];
        self._state.countdown = 0;
        if (!cycle) {
            winston.info(`updatePhase no cycle`);
            return;
        }
        if (!self.isActive) {
            winston.info(`updatePhase inactive`);
            return;
        }
        winston.debug(`updatePhase vessel:${self.name} mist:${value}`);
        if (value) {
            if (!self.maxCycles || self._state.cycleNumber <= self.maxCycles) {
                self._state.cycleNumber++;
            }
            if (self.maxCycles && self._state.cycleNumber > self.maxCycles) {
                self.activate(false);
            } else { 
                self._state.countdown = Math.trunc(cycle.on);
                self._state.countstart = self._state.countdown;
                self.emitter.emit(OyaMist.EVENT_MIST, value);
                var msOn = Number(cycle.on) * 1000;
                if (msOn > 0) {
                    self._phaseTimeout = setTimeout(() => {
                        self._phaseTimeout = null;
                        updatePhase(self, false);
                    }, msOn);
                }
            }
        } else {
            self._state.countdown = Math.trunc(cycle.off);
            self._state.countstart = self._state.countdown;
            self.emitter.emit(OyaMist.EVENT_MIST, value);
            if (OyaVessel.DEFAULT_CYCLES[cycle.off]) {
                self.setCycle(cycle.off);
            } else {
            var msOff = Math.max(0,Number(cycle.off) * 1000);
                self._phaseTimeout = setTimeout(() => {
                    self._phaseTimeout = null;
                    if (self.cycle === self.nextCycle) {
                        updatePhase(self, true);
                    } else {
                        self.setCycle(self.nextCycle);
                    }
                }, msOff);
            }
        }
    }

    module.exports = exports.OyaVessel = OyaVessel;
})(typeof exports === "object" ? exports : (exports = {}));

