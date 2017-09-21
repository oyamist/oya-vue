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

        applyDelta(delta) {
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

(typeof describe === 'function') && describe("OyaVessel", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaVessel = exports.OyaVessel || require("../index").OyaVessel;
    const OyaConf = require("../index").OyaConf;
    const STANDARD_ON = 0.01;
    const STANDARD_OFF = 0.02;
    const FAN_ON = 2*STANDARD_ON;
    const FAN_OFF = 2*STANDARD_OFF;
    const SETTLE_MS = 5;
    function createTestVessel(opts) {
        var vessel = new OyaVessel({
            name: opts.name || 'unknown',
            maxCycles: opts.maxCycles,
            startCycle: opts.startCycle,
        });

        // speed up testing
        vessel.cycles[OyaConf.CYCLE_STANDARD].on = STANDARD_ON;
        vessel.cycles[OyaConf.CYCLE_STANDARD].off = STANDARD_OFF;
        vessel.cycles[OyaConf.CYCLE_FAN].on = FAN_ON;
        vessel.cycles[OyaConf.CYCLE_FAN].off = FAN_OFF;

        return vessel;
    }
    var testTimer = OyaConf.createTimer(0, {name: 'test0a'});
    testTimer.cycles[OyaConf.CYCLE_STANDARD].on = STANDARD_ON;
    testTimer.cycles[OyaConf.CYCLE_STANDARD].off = STANDARD_OFF;
    testTimer.cycles[OyaConf.CYCLE_FAN].on = FAN_ON;
    testTimer.cycles[OyaConf.CYCLE_FAN].off = FAN_OFF;
    var level = winston.level;
    winston.level = 'error';

    it ("ctor intializes cycle from provided timer", function() {
        // Default timer
        var oc1 = new OyaVessel({
            name: 'test1a',
        });
        should.deepEqual(oc1.toJSON(), {
            name: 'test1a',
            type: 'OyaVessel',
            enabled: true,
            fanThreshold: 80,
            startCycle: OyaConf.CYCLE_STANDARD,
            hotCycle: OyaConf.CYCLE_FAN,
            maxCycles: 0,
            cycles: OyaConf.DEFAULT_CYCLES,
        });
        should(oc1.cycle).equal(OyaConf.CYCLE_STANDARD);

        // Custom ctor
        var oc2 = new OyaVessel({
            name: 'test1c',
            startCycle: 'fan',
        });
        should(oc2.cycle).equal('fan');
    });
    it ("isActive property is initially false", function() {
        var oc = createTestVessel({name:'test2b', maxCycles:1});
        should(oc.isActive).equal(false);
        oc.activate();
        should(oc.isActive).equal(true);
        var oc2 = new OyaVessel({
            name: 'test2c',
            maxCycles: 1,
        });
        should.throws(() => {
            oc2.activate("should-be-a-boolean");  
        });
    });
    it ("isOn is true when cycle is active and the phase is on", function(done) {
        var async = function*() {
            try {
                var oc = createTestVessel({name:'test3a', maxCycles:2});
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(oc.cycleNumber).equal(3);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(false);

                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it ("on(event, cb) invokes event callback", function(done) {
        var async = function*() {
            try {
                var oc = createTestVessel({name:'test4a', maxCycles:2});
                var count = 0;
                oc.on(OyaVessel.EVENT_PHASE, (context,event,value) => {
                    count++;
                    should(context).equal(oc);
                    should(event).equal(OyaVessel.EVENT_PHASE);
                    should(value).equal(oc.isOn);
                });
                oc.activate();
                should(count).equal(1);
                should(oc.isOn).equal(true);
                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(count).equal(2);
                should(oc.isOn).equal(false);
                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(count).equal(3);
                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(count).equal(4);
                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(count).equal(4); // should not change
                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it ("cycle can be set while when misting is active", function(done) {
        var async = function*() {
            try {
                var oc = createTestVessel({name:'test5a', maxCycles:2});
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                // changing the cycle re-activates
                var to = oc._phaseTimeout;
                oc.cycle = OyaConf.CYCLE_FAN;

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(oc.cycleNumber).equal(3);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(false);

                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it ("state property provides vessel state", function(done) {
        var async = function*() {
            try {
                var oc = createTestVessel({name:'test6a', maxCycles:1});
                should.deepEqual(oc.state, {
                    cycle: OyaConf.CYCLE_STANDARD,
                    isActive: false,
                    isOn: false,
                    nextCycle: OyaConf.CYCLE_STANDARD,
                    type: "OyaVessel",
                    cycleNumber: 0,
                });

                // activation turns stuff on
                oc.activate();
                should.deepEqual(oc.state, {
                    cycle: OyaConf.CYCLE_STANDARD,
                    isActive: true,
                    isOn: true,
                    nextCycle: OyaConf.CYCLE_STANDARD,
                    type: "OyaVessel",
                    cycleNumber: 1,
                });

                // setting nextCycle has no immediate effect
                oc.nextCycle = OyaConf.CYCLE_FAN;
                should.deepEqual(oc.state, {
                    cycle: OyaConf.CYCLE_STANDARD,
                    isActive: true,
                    isOn: true,
                    nextCycle: OyaConf.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1,
                });

                // nextCycle has no effect during off phase
                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should.deepEqual(oc.state, {
                    cycle: OyaConf.CYCLE_STANDARD,
                    isActive: true,
                    isOn: false,
                    nextCycle: OyaConf.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1,
                });

                // nextCycle takes effect after off phase
                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should.deepEqual(oc.state, {
                    cycle: OyaConf.CYCLE_FAN,
                    isActive: true,
                    isOn: true,
                    nextCycle: OyaConf.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1, // first iteration of new cycle
                });

                // off phase of new cycle
                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should.deepEqual(oc.state, {
                    cycle: OyaConf.CYCLE_FAN,
                    isActive: true,
                    isOn: false,
                    nextCycle: OyaConf.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1, 
                });

                // all done
                yield setTimeout(() => async.next(true), FAN_ON*1000+SETTLE_MS);
                should.deepEqual(oc.state, {
                    cycle: OyaConf.CYCLE_FAN,
                    isActive: false,
                    isOn: false,
                    nextCycle: OyaConf.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 2,
                });
                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it ("emit(event, ...) emits event", function() {
        var oc = new OyaVessel({
            name: "test6a",
        });
        var eventValue = null;
        var count = 0;
        oc.on(OyaVessel.EVENT_PHASE, (context,event,value) => {
            count++;
            eventValue = value;
        });
        oc.emit(OyaVessel.EVENT_PHASE, 'hello');
        should(eventValue).equal('hello');
        should(count).equal(1);
    });
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
    });
})
