(typeof describe === 'function') && describe("OyaCycle", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaCycle = exports.OyaCycle || require("../index").OyaCycle;
    const OyaConf = require("../index").OyaConf;
    const onSec = 0.005;
    const offSec = 0.01;
    var testTimer = OyaConf.createTimer();
    testTimer.cycles[OyaConf.CYCLE_STANDARD].on = onSec;
    testTimer.cycles[OyaConf.CYCLE_STANDARD].off = offSec;
    testTimer.cycles[OyaConf.CYCLE_FAN].on = 2*onSec;
    testTimer.cycles[OyaConf.CYCLE_FAN].off = 2*offSec;
    var level = winston.level;
    winston.level = 'error';

    it ("ctor intializes cycle from provided timer", function() {
        // Default timer
        var oc1 = new OyaCycle({
            name: 'test1a',
        });
        should.deepEqual(oc1.timer, OyaConf.createTimer());
        should(oc1.cycle).equal(OyaConf.CYCLE_STANDARD);

        // Custom timer
        var timer = OyaConf.createTimer();
        timer.startCycle = 'fan';
        var oc2 = new OyaCycle({
            name: 'test1b',
            timer,
        });
        should(oc2.cycle).equal('fan');
    });
    it ("isActive property is initially false", function() {
        var timer = OyaConf.createTimer();
        var oc = new OyaCycle({
            name: 'test2a',
            maxCycles: 1,
            timer: testTimer,
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
                var timer = JSON.parse(JSON.stringify(testTimer));
                timer.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test3a',
                    timer,
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
                var timer = JSON.parse(JSON.stringify(testTimer));
                timer.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test3a',
                    timer,
                });
                var count = 0;
                oc.on(OyaCycle.EVENT_PHASE, (context,event,value) => {
                    count++;
                    should(context).equal(oc);
                    should(event).equal(OyaCycle.EVENT_PHASE);
                    should(value).equal(oc.isOn);
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
    it ("emit(event, ...) emits event", function() {
        var oc = new OyaCycle();
        var eventValue = null;
        var count = 0;
        oc.on(OyaCycle.EVENT_PHASE, (context,event,value) => {
            count++;
            eventValue = value;
        });
        oc.emit(OyaCycle.EVENT_PHASE, 'hello');
        should(eventValue).equal('hello');
        should(count).equal(1);
    });
    it ("cycle can be set while when misting is active", function(done) {
        var async = function*() {
            try {
                var timer = JSON.parse(JSON.stringify(testTimer));
                timer.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test4a',
                    timer,
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
