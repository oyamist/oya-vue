(function(exports) {
    const EventEmitter = require("events");
    const winston = require("winston");

    var id = 1;

    class OyaVessel {
        constructor(opts = {}) {
            // serializable toJSON() properties
            this.name = `vessel${id++}`;
            this.enabled = true; // can be activated
            this.startCycle = OyaVessel.CYCLE_STANDARD;
            this.hotCycle = OyaVessel.CYCLE_FAN;
            this.fanThreshold = 80;
            this.maxCycles = 0;
            this.cycles = OyaVessel.DEFAULT_CYCLES,
            OyaVessel.applyDelta(this, opts);

            this._cycle = this.startCycle,
            this.nextCycle = this._cycle,
            this._active = false,
            this.emitter = new EventEmitter(),
            this._on = false,
            this._phaseTimeout = false;
            this.countdown = 0;
            this.cycleNumber = 0;
            this.on(OyaVessel.EVENT_PHASE, (self, event) => {
                winston.debug(this.summary, event);
            });
            this.on(OyaVessel.EVENT_ACTIVATE, (self, event) => {
                winston.debug(this.summary, event);
            });
            this.on(OyaVessel.SENSE_TEMP_INTERNAL, 
                (value) => this.onTempInternal(value)
            );
            this._countdownId = setInterval(() => {
                this.countdown = this.countdown <= 0 ? 0 : (this.countdown-1);
            }, 1000);
        }

        static get DEFAULT_CYCLES() { return {
            [OyaVessel.CYCLE_STANDARD]: {
                name: "Standard",
                desc: "Standard cycle for all phases of plant growth",
                emit: OyaVessel.EVENT_PUMP1,
                on: 30,
                off: 60,
            },
            [OyaVessel.CYCLE_DRAIN]: {
                name: "Drain",
                desc: "Partially drain reservoir and stop to add fresh nutrients",
                emit: OyaVessel.EVENT_PUMP1,
                on: Math.round(60 * 3.78541/0.73), // about 1 gallon for Aquatec CDP6800 pump operating with no load
                off: -1,
            },
            [OyaVessel.CYCLE_FAN]: {
                name: "Cool",
                desc: "Hot day evaporative cooling cycle with fan",
                emit: OyaVessel.EVENT_PUMP1,
                on: 15,
                off: 15,
            },
            [OyaVessel.CYCLE_CONSERVE]: {
                name: "Conserve",
                desc: "Conservative misting cycle for plants with good roots",
                emit: OyaVessel.EVENT_PUMP1,
                on: 5,
                off: 60,
            },
        }}

        static get CYCLE_STANDARD() { return "Cycle #1"; }
        static get CYCLE_DRAIN() { return "Cycle #2"; }
        static get CYCLE_FAN() { return "Cycle #3"; }
        static get CYCLE_CONSERVE() { return "Cycle #4"; }
        static get EVENT_PUMP1() { return "event:pump1"; }
        static get EVENT_FAN1() { return "event:fan1"; }
        static get EVENT_PHASE() { return "event:phase"; }
        static get EVENT_ACTIVATE() { return "event:activate"; }
        static get SENSE_TEMP_INTERNAL() { return "sense: temp-internal"; }
        static get SENSE_TEMP_EXTERNAL() { return "sense: temp-external"; }
        static get SENSE_TEMP_AMBIENT() { return "sense: temp-ambient"; }
        static get SENSE_HUMIDITY_INTERNAL() { return "sense: humidity-internal"; }
        static get SENSE_HUMIDITY_ExTERNAL() { return "sense: humidity-external"; }
        static get SENSE_PH() { return "sense: pH"; }
        static get SENSE_PPM() { return "sense: ppm"; }

        toJSON() {
            return {
                name: this.name,
                type: 'OyaVessel',
                enabled: this.enabled,
                startCycle: this.startCycle,
                hotCycle: this.hotCycle,
                fanThreshold: this.fanThreshold,
                maxCycles: this.maxCycles,
                cycles: this.cycles,
            }
        }

        static applyDelta(vessel, delta={}) {
            ['name', 'enabled', 'startCycle', 'hotCycle', 'fanThreshold', 'maxCycles']
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
                `cycle:"${this.cycle}" ${this.cycleNumber} ` +
                `active:${this.isActive?1:0} ${this.isOn?'on':'off'}`;
        }

        get isOn() {
            return this._on;
        }

        get isActive() {
            return this._active;
        }

        on(event, cb) {
            if (typeof event != 'string') {
                throw new Error("OyaVessel.on(event) requires an event string");
            }
            this.emitter.on(event, cb);
        }

        emit(event) {
            this.emitter.emit(event, this, ...arguments);
        }

        onTempInternal(value) {
            winston.debug(`onTempInternal ${value}`);
            if (value < this.fanThreshold) {
                if (this.nextCycle === this.hotCycle) {
                    winston.info("onTempInternal: reverting to default cycle");
                    // cancel cooling and revert to default cycle
                    this.nextCycle = this.startCycle;
                }
            } else {
                winston.info("onTempInternal: next cycle will be cooling cycle");
                this.nextCycle = this.hotCycle;
            }
        }

        activate(value=true) {
            if (this.isActive === value) {
                winston.debug(`${this.name} redundant activate ignored`);
            } else if (value === true) {
                this._active = value;
                this.cycleNumber = 0;
                this.emit(OyaVessel.EVENT_ACTIVATE, value);
                updatePhase(this, true);
            } else if (value === false) {
                this._active = value;
                this._on = false;
                this.countdown = 0;
                this._phaseTimeout != null & clearTimeout(this._phaseTimeout);
                this._phaseTimeout = null;
                this.emit(OyaVessel.EVENT_ACTIVATE, value);
            } else {
                var err = new Error(`${this.name} OyaVessel.activate expects a boolean`);
                winston.warn(err.stack);
                throw err;
            }
            return this;
        }

        get cycle() {
            return this._cycle;
        }

        set cycle(value) {
            if (this.isActive) {
                this.activate(false);
                this._cycle = value;
                this.activate(true);
            } else {
                this._cycle = value;
            }
            this.nextCycle = this._cycle;
            return this;
        }

        get state() {
            return {
                type: "OyaVessel",
                isActive: this.isActive,
                isOn: this.isOn,
                cycle: this.cycle,
                nextCycle: this.nextCycle,
                cycleNumber: this.cycleNumber,
            };
        }

    } //// class OyaVessel

    function updatePhase(self, value) {
        var cycle = self.cycles[self.cycle];
        self.countdown = 0;
        if (!cycle || !self.isActive) {
            return;
        }
        self._on = value;
        if (value) {
            if (!self.maxCycles || self.cycleNumber <= self.maxCycles) {
                self.cycleNumber++;
            }
            if (self.maxCycles && self.cycleNumber > self.maxCycles) {
                self.activate(false);
            } else { 
                self.emit(OyaVessel.EVENT_PHASE, value);
                var msOn = Number(cycle.on) * 1000;
                self.countdown = Math.trunc(cycle.on);
                if (msOn > 0) {
                    self._phaseTimeout = setTimeout(() => {
                        self._phaseTimeout = null;
                        updatePhase(self, false);
                    }, msOn);
               }
           }
        } else {
            self.emit(OyaVessel.EVENT_PHASE, value);
            var msOff = Number(cycle.off) * 1000;
            self.countdown = Math.trunc(cycle.off);
            if (msOff > 0) {
                self._phaseTimeout = setTimeout(() => {
                    self._phaseTimeout = null;
                    if (self.cycle === self.nextCycle) {
                        updatePhase(self, true);
                    } else {
                        self.cycle = self.nextCycle;
                    }
                }, msOff);
            } else if (msOff < 0) {
                self.activate(false);
            }
        }
    }

    module.exports = exports.OyaVessel = OyaVessel;
})(typeof exports === "object" ? exports : (exports = {}));

