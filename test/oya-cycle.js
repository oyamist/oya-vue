(typeof describe === 'function') && describe("OyaCycle", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaCycle = exports.OyaCycle || require("../src/oya-cycle");
    const OyaVessel = exports.OyaVessel || require("../index").OyaVessel;
    const OyaConf = require("../index").OyaConf;
    const STANDARD_ON = 0.01;
    const STANDARD_OFF = 0.02;
    const FAN_ON = 2*STANDARD_ON;
    const FAN_OFF = 2*STANDARD_OFF;
    const SETTLE_MS = 5;
    var testTimer = OyaConf.createVesselConfig(0, {name: 'test0a'});
    testTimer.cycles[OyaVessel.CYCLE_STANDARD].on = STANDARD_ON;
    testTimer.cycles[OyaVessel.CYCLE_STANDARD].off = STANDARD_OFF;
    testTimer.cycles[OyaVessel.CYCLE_FAN].on = FAN_ON;
    testTimer.cycles[OyaVessel.CYCLE_FAN].off = FAN_OFF;
    var level = winston.level;
    winston.level = 'error';

    it ("ctor intializes cycle from provided timer", function() {
        // Default timer
        var oc1 = new OyaCycle({
            name: 'test1a',
        });
        should.deepEqual(oc1.timer, OyaConf.createVesselConfig(0, {name: 'test1a'}));
        should(oc1.cycle).equal(OyaVessel.CYCLE_STANDARD);

        // Custom timer
        var timer = OyaConf.createVesselConfig(0, {name: 'test1b'});
        timer.startCycle = 'fan';
        var oc2 = new OyaCycle({
            name: 'test1c',
            timer,
        });
        should(oc2.cycle).equal('fan');
    });
    it ("isActive property is initially false", function() {
        var timer = OyaConf.createVesselConfig({name: 'test2a'});
        var oc = new OyaCycle({
            name: 'test2b',
            maxCycles: 1,
            timer: testTimer,
        });
        should(oc.isActive).equal(false);
        oc.activate();
        should(oc.isActive).equal(true);
        var oc2 = new OyaCycle({
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
                var timer = JSON.parse(JSON.stringify(testTimer));
                timer.name = 'test3a';
                timer.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test3a',
                    timer,
                });
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(oc.cycleNumber).equal(3);
                should(oc.cycle).equal(OyaVessel.CYCLE_STANDARD);
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
                var timer = JSON.parse(JSON.stringify(testTimer));
                timer.maxCycles = 2;
                var oc = new OyaCycle({
                    name: 'test4a',
                    timer,
                });
                should(oc.isOn).equal(false);
                oc.activate();
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                // changing the cycle re-activates
                var to = oc._phaseTimeout;
                oc.cycle = OyaVessel.CYCLE_FAN;

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(oc.cycleNumber).equal(1);
                should(oc.cycle).equal(OyaVessel.CYCLE_FAN);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaVessel.CYCLE_FAN);
                should(oc.isOn).equal(true);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(oc.cycleNumber).equal(2);
                should(oc.cycle).equal(OyaVessel.CYCLE_FAN);
                should(oc.isOn).equal(false);
                should(oc.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(oc.cycleNumber).equal(3);
                should(oc.cycle).equal(OyaVessel.CYCLE_FAN);
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
    it ("state property provides cycle state", function(done) {
        var async = function*() {
            try {
                var timer = JSON.parse(JSON.stringify(testTimer));
                timer.maxCycles = 1;
                var oc = new OyaCycle({
                    name: 'test5a',
                    timer,
                });
                should.deepEqual(oc.state, {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    isActive: false,
                    isOn: false,
                    nextCycle: OyaVessel.CYCLE_STANDARD,
                    type: "OyaCycle",
                    cycleNumber: 0,
                });

                // activation turns stuff on
                oc.activate();
                should.deepEqual(oc.state, {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    isActive: true,
                    isOn: true,
                    nextCycle: OyaVessel.CYCLE_STANDARD,
                    type: "OyaCycle",
                    cycleNumber: 1,
                });

                // setting nextCycle has no immediate effect
                oc.nextCycle = OyaVessel.CYCLE_FAN;
                should.deepEqual(oc.state, {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    isActive: true,
                    isOn: true,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaCycle",
                    cycleNumber: 1,
                });

                // nextCycle has no effect during off phase
                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should.deepEqual(oc.state, {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    isActive: true,
                    isOn: false,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaCycle",
                    cycleNumber: 1,
                });

                // nextCycle takes effect after off phase
                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should.deepEqual(oc.state, {
                    cycle: OyaVessel.CYCLE_FAN,
                    isActive: true,
                    isOn: true,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaCycle",
                    cycleNumber: 1, // first iteration of new cycle
                });

                // off phase of new cycle
                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should.deepEqual(oc.state, {
                    cycle: OyaVessel.CYCLE_FAN,
                    isActive: true,
                    isOn: false,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaCycle",
                    cycleNumber: 1, 
                });

                // all done
                yield setTimeout(() => async.next(true), FAN_ON*1000+SETTLE_MS);
                should.deepEqual(oc.state, {
                    cycle: OyaVessel.CYCLE_FAN,
                    isActive: false,
                    isOn: false,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaCycle",
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
        var oc = new OyaCycle({
            name: "test6a",
        });
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
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
    });
})
