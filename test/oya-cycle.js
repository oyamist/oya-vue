(typeof describe === 'function') && describe("OyaCycle", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaCycle = exports.OyaCycle || require("../index").OyaCycle;
    const OyaConf = require("../index").OyaConf;
    const onSec = 0.005;
    const offSec = 0.01;
    var testActuator = OyaConf.createActuator();
    testActuator.cycles[OyaConf.CYCLE_STANDARD].on = onSec;
    testActuator.cycles[OyaConf.CYCLE_STANDARD].off = offSec;
    testActuator.cycles[OyaConf.CYCLE_FAN].on = 2*onSec;
    testActuator.cycles[OyaConf.CYCLE_FAN].off = 2*offSec;
    var level = winston.level;
    winston.level = 'error';

    it ("ctor intializes cycle from provided actuator", function() {
        // Default actuator
        var oc1 = new OyaCycle({
            name: 'test1a',
        });
        should.deepEqual(oc1.actuator, OyaConf.createActuator());
        should(oc1.cycle).equal(OyaConf.CYCLE_STANDARD);

        // Custom actuator
        var actuator = OyaConf.createActuator();
        actuator.startCycle = 'fan';
        var oc2 = new OyaCycle({
            name: 'test1b',
            actuator,
        });
        should(oc2.cycle).equal('fan');
    });
    it ("isActive property is initially false", function() {
        var actuator = OyaConf.createActuator();
        var oc = new OyaCycle({
            name: 'test2a',
            maxCycles: 1,
            actuator: testActuator,
        });
        should(oc.isActive).equal(false);
        oc.activate();
        should(oc.isActive).equal(true);
        var oc2 = new OyaCycle({
            name: 'test2b',
            maxCycles: 1,
        });
        should.throws(() => {
            oc2.activate("should-be-a-boolean");  
        });
    });
    it ("isOn is true when cycle is active and the phase is on", function(done) {
        var async = function*() {
            try {
                var actuator = JSON.parse(JSON.stringify(testActuator));
                actuator.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test3a',
                    actuator,
                });
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), offSec*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycleNumber).equal(2);
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
                var actuator = JSON.parse(JSON.stringify(testActuator));
                actuator.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test3a',
                    actuator,
                });
                var count = 0;
                oc.on(OyaCycle.EVENT_PHASE, (context,event) => {
                    count++;
                    should(context).equal(oc);
                    should(event).equal(OyaCycle.EVENT_PHASE);
                });
                oc.activate();
                should(count).equal(1);
                should(oc.isOn).equal(true);
                yield setTimeout(() => async.next(true), onSec*1000);
                should(count).equal(2);
                should(oc.isOn).equal(false);
                yield setTimeout(() => async.next(true), offSec*1000);
                should(count).equal(3);
                yield setTimeout(() => async.next(true), onSec*1000);
                yield setTimeout(() => async.next(true), onSec*1000);
                should(count).equal(3); // should not change
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
                var actuator = JSON.parse(JSON.stringify(testActuator));
                actuator.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test4a',
                    actuator,
                });
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                // changing the cycle re-activates
                var to = oc._phaseTimeout;
                oc.cycle = OyaConf.CYCLE_FAN;

                yield setTimeout(() => async.next(true), onSec*2000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), offSec*2000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaConf.CYCLE_FAN);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), onSec*2000);
                should(oc.cycleNumber).equal(2);
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
