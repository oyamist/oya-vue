(function(exports) {
    const OyaConf = require("../src/oya-conf");
    const winston = require("winston");

    // OyaMist bioreactor state
    class OyaCycle {
        constructor(opts = {}) {
            this.oyaConf = new OyaConf(opts);
            this._cycle = this.oyaConf.startCycle;
            this._active = false;
            this.maxCycles = opts.maxCycles || 0;
            this._misting = false; 
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

        activate(value=true, maxCycles=this.maxCycles) {
            if (this.isActive === value) {
                winston.debug('activate ignored');
            } else if (value === true) {
                this._active = value;
                this.cycles = 0;
                mistCycle(this, true);
            } else if (value === false) {
                this._active = value;
                this._misting = false;
            } else {
                throw new Error("OyaCycle.activate expects a boolean");
            }
            return this;
        }

        get cycle() {
            return this._cycle;
        }

        set cycle(value) {
            this._cycle = value;
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
                winston.debug(`${self.name} cycle ${self.cycles} mist on`);
                var msOn = Number(mc.on) * 1000;
                msOn > 0 && setTimeout(() => {
                    mistCycle(self, false);
                }, msOn);
            } else {
                winston.debug(`${self.name} cycle ${self.cycles} mist off`);
                var msOff = Number(mc.off) * 1000;
                msOff > 0 && setTimeout(() => {
                    mistCycle(self, true);
                }, msOff);
            }
        }
    }



    module.exports = exports.OyaCycle = OyaCycle;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("OyaCycle", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaCycle = exports.OyaCycle || require("../src/oya-state");
    const onSec = 0.01;
    const offSec = 0.02;
    const testMist = {
        standard: {
            on: onSec,
            off: offSec,
        },
    };

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
                should(oc.isMisting).equal(true);
                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.isMisting).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), offSec*1000);
                should(oc.isMisting).equal(true);
                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.isMisting).equal(false);
                should(oc.isActive).equal(false);
                should(oc.cycles).equal(2);
                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
})
