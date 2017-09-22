(function(exports) {
    const OyaConf = require("../src/oya-conf");
    const EventEmitter = require("events");
    const winston = require("winston");

    var id = 1;

    class OyaVessel {
        constructor(opts = {}) {
            // serializable toJSON() properties
            this.name = `vessel${id++}`;
            this.enabled = true; // can be activated
            this.startCycle = OyaConf.CYCLE_STANDARD;
            this.hotCycle = OyaConf.CYCLE_FAN;
            this.fanThreshold = 80;
            this.maxCycles = 0;
            this.cycles = OyaConf.DEFAULT_CYCLES,
            this.applyDelta(opts);

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
            this._countdownId = setInterval(() => {
                this.countdown = this.countdown <= 0 ? 0 : (this.countdown-1);
            }, 1000);
        }

        static get EVENT_PHASE() { return "event:phase"; }
        static get EVENT_ACTIVATE() { return "event:activate"; }

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

        applyDelta(delta={}) {
            ['name', 'type', 'enabled', 'startCycle', 'hotCycle', 'fanThreshold', 'maxCycles']
            .forEach(prop => {
                this[prop] = delta[prop] == null ? this[prop] : delta[prop];
            });
            if (delta.cycles) {
                Object.keys(this.cycles).forEach(key => {
                    if (!delta.cycles.hasOwnProperty(key)) {
                        delete this.cycles[key];
                    }
                });
                Object.keys(delta.cycles).forEach(key => {
                    this.cycles[key] = Object.assign(this.cycles[key], delta.cycles[key]);
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
            this.emitter.on(event, cb);
        }

        emit(event) {
            this.emitter.emit(event, this, ...arguments);
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

