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
    //var testTimer = OyaConf.createTimer(0, {name: 'test0a'});
    //testTimer.cycles[OyaConf.CYCLE_STANDARD].on = STANDARD_ON;
    //testTimer.cycles[OyaConf.CYCLE_STANDARD].off = STANDARD_OFF;
    //testTimer.cycles[OyaConf.CYCLE_FAN].on = FAN_ON;
    //testTimer.cycles[OyaConf.CYCLE_FAN].off = FAN_OFF;
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
