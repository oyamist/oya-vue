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
    function sensorDefaults() {
        return {
            Pump1: false,
            Fan1: false,
            Valve1: false,
            tempInternal: null,
            tempExternal: null,
            tempAmbient: null,
            humidityInternal: null,
            humidityExternal: null,
            humidityAmbient: null,
        };
    }

    function createTestVessel(opts) {
        var vessel = new OyaVessel({
            name: opts.name || 'unknown',
            maxCycles: opts.maxCycles,
            startCycle: opts.startCycle,
        });

        // speed up testing
        vessel.cycles[OyaVessel.CYCLE_STANDARD].on = STANDARD_ON;
        vessel.cycles[OyaVessel.CYCLE_STANDARD].off = STANDARD_OFF;
        vessel.cycles[OyaVessel.CYCLE_FAN].on = FAN_ON;
        vessel.cycles[OyaVessel.CYCLE_FAN].off = FAN_OFF;

        return vessel;
    }
    var level = winston.level;
    winston.level = 'error';

    it ("ctor intializes cycle from provided timer", function() {
        // Default timer
        var vessel1 = new OyaVessel({
            name: 'test1a',
        });
        should.deepEqual(vessel1.toJSON(), {
            name: 'test1a',
            type: 'OyaVessel',
            enabled: true,
            fanThreshold: 80,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_FAN,
            maxCycles: 0,
            cycles: OyaVessel.DEFAULT_CYCLES,
        });
        should(vessel1.cycle).equal(OyaVessel.CYCLE_STANDARD);

        // Custom ctor
        var vessel2 = new OyaVessel({
            name: 'test1c',
            startCycle: 'fan',
        });
        should(vessel2.startCycle).equal('fan');
        should(vessel2.cycle).equal('fan');
    });
    it ("vessel responds to emitter sensor events", function() {
        var vessel = new OyaVessel();
        should(vessel.nextCycle).equal(OyaVessel.CYCLE_STANDARD);
        const fanThreshold = vessel.fanThreshold;
        should(typeof fanThreshold).equal("number");

        // just right
        vessel.emitter.emit(OyaVessel.SENSE_TEMP_INTERNAL, vessel.fanThreshold-1);
        should(vessel.nextCycle).equal(OyaVessel.CYCLE_STANDARD);

        // too hot
        vessel.emitter.emit(OyaVessel.SENSE_TEMP_INTERNAL, vessel.fanThreshold+1);
        should(vessel.nextCycle).equal(OyaVessel.CYCLE_FAN);
    });
    it ("isActive property is initially false", function() {
        var vessel = createTestVessel({name:'test2b', maxCycles:1});
        should(vessel.isActive).equal(false);
        vessel.activate();
        should(vessel.isActive).equal(true);
        var vessel2 = new OyaVessel({
            name: 'test2c',
            maxCycles: 1,
        });
        winston.warn("The following error is expected");
        should.throws(() => {
            vessel2.activate("should-be-a-boolean");  
        });
    });
    it ("state.Pump1 is true when cycle is active and the phase is on", function(done) {
        var async = function*() {
            try {
                var vessel = createTestVessel({name:'test3a', maxCycles:2});
                should(vessel.state.Pump1).equal(false);
                vessel.activate();
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(vessel.state.Pump1).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(vessel.state.Pump1).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(vessel.state.Pump1).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(vessel.state.Pump1).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(vessel.state.cycleNumber).equal(3);
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(vessel.state.Pump1).equal(false);
                should(vessel.isActive).equal(false);

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
                var vessel = createTestVessel({name:'test5a', maxCycles:2});
                should(vessel.state.Pump1).equal(false);
                vessel.activate();
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(vessel.state.Pump1).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                should(vessel.state.Pump1).equal(false);
                should(vessel.isActive).equal(true);

                // changing the cycle re-activates
                var to = vessel._phaseTimeout;
                vessel.cycle = OyaVessel.CYCLE_FAN;

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaVessel.CYCLE_FAN);
                should(vessel.state.Pump1).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaVessel.CYCLE_FAN);
                should(vessel.state.Pump1).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaVessel.CYCLE_FAN);
                should(vessel.state.Pump1).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(vessel.state.cycleNumber).equal(3);
                should(vessel.cycle).equal(OyaVessel.CYCLE_FAN);
                should(vessel.state.Pump1).equal(false);
                should(vessel.isActive).equal(false);

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
                var vessel = createTestVessel({name:'test6a', maxCycles:1});
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    countdown: 0,
                    countstart: 0,
                    active: false,
                    Pump1: false,
                    nextCycle: OyaVessel.CYCLE_STANDARD,
                    type: "OyaVessel",
                    cycleNumber: 0,
                }));

                // activation turns stuff on
                vessel.activate();
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    countdown: 0,
                    countstart: 0,
                    active: true,
                    Pump1: true,
                    nextCycle: OyaVessel.CYCLE_STANDARD,
                    type: "OyaVessel",
                    cycleNumber: 1,
                }));

                // setting nextCycle has no immediate effect
                vessel.nextCycle = OyaVessel.CYCLE_FAN;
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    countdown: 0,
                    countstart: 0,
                    active: true,
                    Pump1: true,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1,
                }));

                // nextCycle has no effect during off phase
                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), {
                    cycle: OyaVessel.CYCLE_STANDARD,
                    countdown: 0,
                    countstart: 0,
                    active: true,
                    Pump1: false,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1,
                }));

                // nextCycle takes effect after off phase
                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), {
                    cycle: OyaVessel.CYCLE_FAN,
                    countdown: 0,
                    countstart: 0,
                    active: true,
                    Pump1: true,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1, // first iteration of new cycle
                }));

                // off phase of new cycle
                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), {
                    cycle: OyaVessel.CYCLE_FAN,
                    countdown: 0,
                    countstart: 0,
                    active: true,
                    Pump1: false,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 1, 
                }));

                // all done
                yield setTimeout(() => async.next(true), FAN_ON*1000+SETTLE_MS);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), {
                    cycle: OyaVessel.CYCLE_FAN,
                    countdown: 0,
                    countstart: 0,
                    active: false,
                    nextCycle: OyaVessel.CYCLE_FAN,
                    type: "OyaVessel",
                    cycleNumber: 2,
                }));
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
