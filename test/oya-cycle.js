(typeof describe === 'function') && describe("OyaCycle", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaCycle = exports.OyaCycle || require("../index").OyaCycle;
    const OyaConf = require("../index").OyaConf;
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
    it ("isOn is true when cycle is active and the phase is on", function(done) {
        var async = function*() {
            try {
                var oc = new OyaCycle({
                    name: 'test3a',
                    maxCycles: 2,
                    mist: testMist,
                });
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), offSec*1000);
                should(oc.cycles).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycles).equal(2);
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
    it ("cycle can be set while when misting is active", function(done) {
        var async = function*() {
            try {
                var oc = new OyaCycle({
                    name: 'test4a',
                    maxCycles: 2,
                    mist: testMist,
                });
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                // changing the cycle re-activates
                var to = oc._phaseTimeout;
                oc.cycle = OyaConf.CYCLE_FAN;

                yield setTimeout(() => async.next(true), onSec*2000);
                should(oc.cycles).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), offSec*2000);
                should(oc.cycles).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*2000);
                should(oc.cycles).equal(2);
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
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
    });
})
