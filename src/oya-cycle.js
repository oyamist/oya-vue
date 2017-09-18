(function(exports) {
    const OyaConf = require("../src/oya-conf");
    const winston = require("winston");

    class OyaCycle {
        constructor(opts = {}) {
            this.actuator = opts.actuator || OyaConf.defaultActuator();
            this._cycle = this.actuator.startCycle;
            this._active = false;
            this._on = false; 
            this._events = {};
            this._phaseTimeout = null;
            this.on(OyaCycle.EVENT_PHASE, (self, event) => {
                winston.debug(this.summary, event);
            });
            this.on(OyaCycle.EVENT_ACTIVATE, (self, event) => {
                winston.debug(this.summary, event);
            });
            this.countdown = 0;
            var self = this;
            this._countdownId = setInterval(() => {
                self.countdown = self.countdown <= 0 ? 0 : (self.countdown-1);
            }, 1000);
        }

        static get EVENT_PHASE() { return "event:phase"; }
        static get EVENT_ACTIVATE() { return "event:activate"; }

        get summary() { 
            return `${this.name} ` +
                `cycle:${this.cycle}#${this.cycleNumber} ` +
                `active:${this.isActive?1:0} ${this.isOn?'on':'off'}`;
        }
        get name() {
            return this.actuator.name;
        }

        get isOn() {
            return this._on;
        }

        get isActive() {
            return this._active;
        }

        on(event, cb) {
            this._events[event] = this._events[event] || [];
            this._events[event].push(cb);
        }

        fire(event) {
            var cbs = this._events[OyaCycle.EVENT_ACTIVATE];
            if (cbs == null) {
                var err = new Error(`${this.name} OyaCycle.fire(${event}) unknown event`);
                winston.warn(err);
                throw err;
            }
            cbs.forEach(cb => cb(this, event));
        }

        activate(value=true) {
            if (this.isActive === value) {
                winston.debug(`${this.name} redundant activate ignored`);
            } else if (value === true) {
                this._active = value;
                this.cycleNumber = 0;
                this.fire(OyaCycle.EVENT_ACTIVATE);
                updatePhase(this, true);
            } else if (value === false) {
                this._active = value;
                this._on = false;
                this.countdown = 0;
                this._phaseTimeout != null & clearTimeout(this._phaseTimeout);
                this._phaseTimeout = null;
                this.fire(OyaCycle.EVENT_ACTIVATE);
            } else {
                var err = new Error(`${this.name} OyaCycle.activate expects a boolean`);
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
            return this;
        }

        get state() {
            return {
                type: "OyaCycle",
                isActive: this.isActive,
                isOn: this.isOn,
                cycle: this.cycle,
            };
        }

    } //// class OyaCycle

    function updatePhase(self, value) {
        var actuator = self.actuator;
        var cycle = actuator.cycles[self.cycle];
        if (actuator.maxCycles && self.cycleNumber >= actuator.maxCycles) {
            self.activate(false);
        }
        self.countdown = 0;
        if (cycle && self.isActive) {
            self._on = value;
            if (value) {
                self.cycleNumber++;
                self.fire(OyaCycle.EVENT_PHASE);
                var msOn = Number(cycle.on) * 1000;
                self.countdown = Math.trunc(cycle.on);
                if (msOn > 0) {
                    self._phaseTimeout = setTimeout(() => {
                        self._phaseTimeout = null;
                        updatePhase(self, false);
                    }, msOn);
               } 
            } else {
                self.fire(OyaCycle.EVENT_PHASE);
                var msOff = Number(cycle.off) * 1000;
                self.countdown = Math.trunc(cycle.off);
                if (msOff > 0) {
                    self._phaseTimeout = setTimeout(() => {
                        self._phaseTimeout = null;
                        updatePhase(self, true);
                    }, msOff);
                }
            }
        }
    }

    module.exports = exports.OyaCycle = OyaCycle;
})(typeof exports === "object" ? exports : (exports = {}));
