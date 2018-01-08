(function(exports) {
    const EventEmitter = require("events");
    const winston = require("winston");
    const DbFacade = require("./db-facade");
    const uuidv4 = require('uuid/v4');

    var id = 1;

    class OyaVessel {
        constructor(opts = {}) {
            const COOLTHRESHOLD = (70 - 32) / 1.8;

            // serializable toJSON() properties
            this.name = `vessel${id++}`;
            this.enabled = true; // can be activated
            this.startCycle = OyaVessel.CYCLE_STANDARD;
            this.hotCycle = OyaVessel.CYCLE_COOL;
            this.coolThreshold = COOLTHRESHOLD;
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
            };
            OyaVessel.applyDelta(this, opts);
            this.guid == null && (this.guid = uuidv4().toString());
            this._state.cycle = this.startCycle;

            this.nextCycle = this._state.cycle,
            this._state.active = false,
            this.dbfacade = opts.dbfacade || new DbFacade();
            this.dbfacade.open();
            this.emitter = new EventEmitter(),
            this._phaseTimeout = false;
            this._state.cycleNumber = 0;
            this.emitter.on(OyaVessel.EVENT_MIST, (value) => {
                this._state.Mist = value;
            });
            this.emitter.on(OyaVessel.EVENT_COOL, (value) => {
                this._state.Cool = value;
            });
            this.emitter.on(OyaVessel.EVENT_PRIME, (value) => {
                this._state.Prime = value;
            });
            this.emitter.on(OyaVessel.EVENT_ACTIVATE, (self, event) => {
                winston.debug(this.summary, event);
            });
            this.emitter.on(OyaVessel.SENSE_TEMP_INTERNAL, (v) => 
                this.onTemp(v,'tempInternal',OyaVessel.SENSE_TEMP_INTERNAL));
            this.emitter.on(OyaVessel.SENSE_TEMP_CANOPY, (v) => 
                this.onTemp(v,'tempCanopy',OyaVessel.SENSE_TEMP_CANOPY));
            this.emitter.on(OyaVessel.SENSE_TEMP_AMBIENT, (v) => 
                this.onTemp(v,'tempAmbient',OyaVessel.SENSE_TEMP_AMBIENT));
            this.emitter.on(OyaVessel.SENSE_HUMIDITY_INTERNAL, (v) => 
                this.onHumidity(v,'humidityInternal', OyaVessel.SENSE_HUMIDITY_INTERNAL));
            this.emitter.on(OyaVessel.SENSE_HUMIDITY_AMBIENT, (v) => 
                this.onHumidity(v,'humidityAmbient', OyaVessel.SENSE_HUMIDITY_AMBIENT));
            this.emitter.on(OyaVessel.SENSE_HUMIDITY_CANOPY, (v) => 
                this.onHumidity(v,'humidityCanopy', OyaVessel.SENSE_HUMIDITY_CANOPY));
            this._countdownId = setInterval(() => {
                this._state.countdown = this._state.countdown <= 0 ? 0 : (this._state.countdown-1);
            }, 1000);
        }

        static get DEFAULT_CYCLES() { return {
            [OyaVessel.CYCLE_STANDARD]: {
                name: "Standard",
                key: OyaVessel.CYCLE_STANDARD,
                desc: "Standard cycle for all phases of plant growth",
                emits: OyaVessel.EVENT_MIST,
                on: 10,
                off: 60,
                nextCycle: OyaVessel.CYCLE_STANDARD,
            },
            [OyaVessel.CYCLE_PRIME]: {
                name: "Prime",
                key: OyaVessel.CYCLE_PRIME,
                desc: "Circulate water to prime misting system",
                emits: OyaVessel.EVENT_MIST,
                on: 60,
                off: 0,
                nextCycle: OyaVessel.CYCLE_STANDARD,
            },
            [OyaVessel.CYCLE_COOL]: {
                name: "Cool",
                key: OyaVessel.CYCLE_COOL,
                desc: "Hot day evaporative cooling cycle with fan",
                emits: OyaVessel.EVENT_MIST,
                on: 10,
                off: 20,
                nextCycle: OyaVessel.CYCLE_COOL,
            },
            [OyaVessel.CYCLE_CONSERVE]: {
                name: "Conserve",
                key: OyaVessel.CYCLE_CONSERVE,
                desc: "Conservative misting cycle for mild conditions",
                emits: OyaVessel.EVENT_MIST,
                on: 10,
                off: 120,
                nextCycle: OyaVessel.CYCLE_CONSERVE,
            },
        }}

        static get CYCLE_STANDARD() { return "Cycle #1"; }
        static get CYCLE_PRIME() { return "Cycle #2"; }
        static get CYCLE_COOL() { return "Cycle #3"; }
        static get CYCLE_CONSERVE() { return "Cycle #4"; }
        static get EVENT_MIST() { return "event:mist"; }
        static get EVENT_COOL() { return "event:Cool"; }
        static get EVENT_PRIME() { return "event:Prime"; }
        static get EVENT_ACTIVATE() { return "event:activate"; }
        static get SENSE_TEMP_INTERNAL() { return "sense: temp-internal"; }
        static get SENSE_TEMP_CANOPY() { return "sense: temp-canopy"; }
        static get SENSE_TEMP_AMBIENT() { return "sense: temp-ambient"; }
        static get SENSE_HUMIDITY_INTERNAL() { return "sense: humidity-internal"; }
        static get SENSE_HUMIDITY_CANOPY() { return "sense: humidity-canopy"; }
        static get SENSE_HUMIDITY_AMBIENT() { return "sense: humidity-ambient"; }
        static get SENSE_PH() { return "sense: pH"; }
        static get SENSE_PPM() { return "sense: ppm"; }

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
            if (value < this.coolThreshold) {
                if (this.nextCycle === this.hotCycle) {
                    winston.info("OyaVessel.onTemp() ${field}: reverting to default cycle");
                    // cancel cooling and revert to default cycle
                    this.nextCycle = this.startCycle;
                }
            } else if (this.nextCycle !== this.hotCycle) {
                winston.info("OyaVessel.onTemp() ${field}: next cycle will be cooling cycle");
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
                this.emitter.emit(OyaVessel.EVENT_ACTIVATE, value);
                updatePhase(this, true);
            } else if (value === false) {
                winston.debug(`OyaVessel.activate(false) vessel:${this.name} `);
                this._state.active = value;
                this._state.countdown = 0;
                this._state.countstart = 0;
                this._phaseTimeout != null && clearTimeout(this._phaseTimeout);
                this._phaseTimeout = null;
                this.emitter.emit(OyaVessel.EVENT_ACTIVATE, value);
                this.emitter.emit(OyaVessel.EVENT_MIST, false);
                this.emitter.emit(OyaVessel.EVENT_COOL, false);
                this.emitter.emit(OyaVessel.EVENT_PRIME, false);
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
                self.emitter.emit(OyaVessel.EVENT_MIST, value);
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
            self.emitter.emit(OyaVessel.EVENT_MIST, value);
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

