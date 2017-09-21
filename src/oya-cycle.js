(function(exports) {
    const OyaConf = require("../src/oya-conf");
    const EventEmitter = require("events");
    const winston = require("winston");

    class OyaCycle {
        constructor(opts = {}) {
            this.timer = opts.timer || OyaConf.createTimer();
            this._cycle = this.timer.startCycle;
            this.nextCycle = this._cycle;
            this._active = false;
            this.emitter = new EventEmitter();
            this._on = false; 
            this._phaseTimeout = null;
            this.cycleNumber = 0;
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
            return this.timer.name;
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
                this.emit(OyaCycle.EVENT_ACTIVATE, value);
                updatePhase(this, true);
            } else if (value === false) {
                this._active = value;
                this._on = false;
                this.countdown = 0;
                this._phaseTimeout != null & clearTimeout(this._phaseTimeout);
                this._phaseTimeout = null;
                this.emit(OyaCycle.EVENT_ACTIVATE, value);
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
            this.nextCycle = this._cycle;
            return this;
        }

        get state() {
            return {
                type: "OyaCycle",
                isActive: this.isActive,
                isOn: this.isOn,
                cycle: this.cycle,
                nextCycle: this.nextCycle,
                cycleNumber: this.cycleNumber,
            };
        }

    } //// class OyaCycle

    function updatePhase(self, value) {
        var timer = self.timer;
        var cycle = timer.cycles[self.cycle];
        self.countdown = 0;
        if (!cycle || !self.isActive) {
            return;
        }
        self._on = value;
        if (value) {
            if (!timer.maxCycles || self.cycleNumber <= timer.maxCycles) {
                self.cycleNumber++;
            }
            if (timer.maxCycles && self.cycleNumber > timer.maxCycles) {
                self.activate(false);
            } else { 
                self.emit(OyaCycle.EVENT_PHASE, value);
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
            self.emit(OyaCycle.EVENT_PHASE, value);
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

    module.exports = exports.OyaCycle = OyaCycle;
})(typeof exports === "object" ? exports : (exports = {}));
