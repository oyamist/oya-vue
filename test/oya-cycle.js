(function(exports) {
    const OyaConf = require("../src/oya-conf");
    const winston = require("winston");

    class OyaCycle {
        constructor(opts = {}) {
            this.oyaConf = new OyaConf(opts);
            this._cycle = this.oyaConf.startCycle;
            this._active = false;
            this.maxCycles = opts.maxCycles || 0;
            this._misting = false; 
            this._events = {};
            this._mistTimeout = null;
            this.on(OyaCycle.EVENT_MIST, (self, event) => {
                winston.debug(this.summary, event);
            });
            this.on(OyaCycle.EVENT_ACTIVATE, (self, event) => {
                winston.debug(this.summary, event);
            });
        }
        
        static get EVENT_MIST() { return "event:mist"; }
        static get EVENT_ACTIVATE() { return "event:activate"; }

        get summary() { 
            return `${this.name} ` +
                `cycle:${this.cycle}#${this.cycles} ` +
                `active:${this.isActive?1:0} mist:${this.isMisting?1:0}`;
        }
        get name() {
            return this.oyaConf.name;
        }

        get isMisting() {
            return this._misting;
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

        activate(value=true, maxCycles=this.maxCycles) {
            if (this.isActive === value) {
                winston.debug(`${this.name} redundant activate ignored`);
            } else if (value === true) {
                this._active = value;
                this.cycles = 0;
                this.fire(OyaCycle.EVENT_ACTIVATE);
                mistCycle(this, true);
            } else if (value === false) {
                this._active = value;
                this._misting = false;
                this._mistTimeout != null & clearTimeout(this._mistTimeout);
                this._mistTimeout = null;
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
                isMisting: this.isMisting,
                cycle: this.cycle,
            };
        }

    } //// class OyaCycle

    function mistCycle(self, value) {
        var mc = self.oyaConf.mist[self.cycle];
        if (self.maxCycles && self.cycles >= self.maxCycles) {
            self.activate(false);
        }
        if (mc && self.isActive) {
            self._misting = value;
            if (value) {
                self.cycles++;
                self.fire(OyaCycle.EVENT_MIST);
                var msOn = Number(mc.on) * 1000;
                if (msOn > 0) {
                    self._mistTimeout = setTimeout(() => {
                        self._mistTimeout = null;
                        mistCycle(self, false);
                    }, msOn);
                }
            } else {
                self.fire(OyaCycle.EVENT_MIST);
                var msOff = Number(mc.off) * 1000;
                if (msOff > 0) {
                    self._mistTimeout = setTimeout(() => {
                        self._mistTimeout = null;
                        mistCycle(self, true);
                    }, msOff);
                }
            }
        }
    }

    module.exports = exports.OyaCycle = OyaCycle;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("OyaCycle", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaCycle = exports.OyaCycle || require("../src/oya-state");
    const OyaConf = require("../src/oya-conf");
    const onSec = 0.005;
    const offSec = 0.01;
    const testMist = {
        standard: {
            on: onSec,
            off: offSec,
        },
        fan: {
            on: onSec * 2,
            off: offSec * 2,
        },
    };
    var level = winston.level;
    winston.level = 'error';

    it ("ctor intializes cycle from configuration", function() {
        var oc1 = new OyaCycle({
            name: 'test1a',
        });
        should(oc1.cycle).equal('standard');
        var oc2 = new OyaCycle({
            name: 'test1b',
            startCycle: 'fan',
        });
        should(oc2.cycle).equal('fan');
    });
    it ("isActive property is initially false", function() {
        var oc = new OyaCycle({
            name: 'test2a',
            maxCycles: 1,
            mist: testMist,
        });
        should(oc.isActive).equal(false);
        oc.activate();
        should(oc.isActive).equal(true);
        var oc2 = new OyaCycle({
            name: 'test2b',
            maxCycles: 1,
            mist: testMist,
        });
        should.throws(() => {
            oc2.activate("should-be-a-boolean");  
        });
    });
    it ("isMisting is true when misting is active", function(done) {
        var async = function*() {
            try {
                var oc = new OyaCycle({
                    name: 'test3a',
                    maxCycles: 2,
                    mist: testMist,
                });
                should(oc.isMisting).equal(false);
                oc.activate();
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isMisting).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isMisting).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), offSec*1000);
                should(oc.cycles).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isMisting).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycles).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isMisting).equal(false);
                should(oc.isActive).equal(false);
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
                var oc = new OyaCycle({
                    name: 'test4a',
                    maxCycles: 2,
                    mist: testMist,
                });
                should(oc.isMisting).equal(false);
                oc.activate();
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isMisting).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isMisting).equal(false);
                should(oc.isActive).equal(true);

                // changing the cycle re-activates
                var to = oc._mistTimeout;
                oc.cycle = OyaConf.CYCLE_FAN;

                yield setTimeout(() => async.next(true), onSec*2000);
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isMisting).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), offSec*2000);
                should(oc.cycles).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isMisting).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*2000);
                should(oc.cycles).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isMisting).equal(false);
                should(oc.isActive).equal(false);
                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
    });
})
