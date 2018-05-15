(typeof describe === 'function') && describe("OyaVessel", function() {
    const should = require("should");
    const winston = require('winston');
    winston.level = 'warn';
    const {
        DbFacade,
        OyaConf,
        OyaMist,
        OyaVessel,
    } = require("../index");
    const STANDARD_ON = 0.01;
    const STANDARD_OFF = 0.02;
    const FAN_ON = 2*STANDARD_ON;
    const FAN_OFF = 2*STANDARD_OFF;
    const PRIME_ON = 3*STANDARD_ON;
    class DbTest extends DbFacade {
        constructor(opts={}) {
            super(opts);
            this.stmts = [];
        }
        sqlExec(sql) {
            if (!this.isOpen) {
                return super.sqlExec(sql);
            }
            this.stmts.push(sql);
            return Promise.resolve(sql);
        }
    }
    function sensorDefaults() {
        return {
            Mist: false,
            Cool: false,
            Prime: false,
            tempInternal: {
                avg1: null,
                avg2: null,
                unit: "C",
                value: null,
            },
            tempCanopy: {
                avg1: null,
                avg2: null,
                unit: "C",
                value: null,
            },
            tempAmbient: {
                avg1: null,
                avg2: null,
                unit: "C",
                value: null,
            },
            humidityInternal: {
                avg1: null,
                avg2: null,
                unit: "%RH",
                value: null,
            },
            humidityCanopy: {
                avg1: null,
                avg2: null,
                unit: "%RH",
                value: null,
            },
            humidityAmbient: {
                avg1: null,
                avg2: null,
                unit: "%RH",
                value: null,
            },
            ecInternal: {
                avg1: null,
                avg2: null,
                unit: '\u00b5S', // microsiemens
                value: null,
            },
            ecCanopy: {
                avg1: null,
                avg2: null,
                unit: '\u00b5S', // microsiemens
                value: null,
            },
            ecAmbient: {
                avg1: null,
                avg2: null,
                unit: '\u00b5S', // microsiemens
                value: null,
            },
        };
    }

    function createTestVessel(opts) {
        var vessel = new OyaVessel({
            name: opts.name || 'unknown',
            guid: 'testguid',
            maxCycles: opts.maxCycles,
            startCycle: opts.startCycle,
        });

        // speed up testing
        vessel.cycles[OyaMist.CYCLE_STANDARD].on = STANDARD_ON;
        vessel.cycles[OyaMist.CYCLE_STANDARD].off = STANDARD_OFF;
        vessel.cycles[OyaMist.CYCLE_COOL].on = FAN_ON;
        vessel.cycles[OyaMist.CYCLE_COOL].off = FAN_OFF+"";
        vessel.cycles[OyaMist.CYCLE_PRIME].on = PRIME_ON;
        vessel.cycles[OyaMist.CYCLE_PRIME].off = OyaMist.CYCLE_STANDARD;

        return vessel;
    }
    var level = winston.level;
    winston.level = 'warn';

    it ("ctor intializes cycle from provided timer", function() {
        // Default timer
        var vessel1 = new OyaVessel({
            name: 'test1a',
        });
        should(vessel1.guid).match(/.*-.*-.*-.*-.*/);
        should.deepEqual(vessel1.toJSON(), {
            name: 'test1a',
            guid: vessel1.guid,
            sensorExpRate: 0.01,
            type: 'OyaVessel',
            enabled: true,
            coolThreshold: (70-32)/1.8,
            thresholdHysteresis: 0.99,
            startCycle: OyaMist.CYCLE_STANDARD,
            hotCycle: OyaMist.CYCLE_COOL,
            maxCycles: 0,
            cycles: OyaVessel.DEFAULT_CYCLES,
        });
        should(vessel1.cycle).equal(OyaMist.CYCLE_STANDARD);

        // Custom ctor
        var vessel2 = new OyaVessel({
            name: 'test1c',
            guid: 'testguid',
            startCycle: 'fan',
        });
        should(vessel2.startCycle).equal('fan');
        should(vessel2.guid).equal('testguid');
        should(vessel2.cycle).equal('fan');

        // guid is different
        var vessel3 = new OyaVessel({
            name: 'test1c',
        });
        should(vessel3.guid).match(/.*-.*-.*-.*-.*/);
        should(vessel1.guid).not.equal(vessel3.guid);
    });
    it ("vessel responds to emitter sensor events", function() {
        var dbfacade = new DbTest();
        var vessel = new OyaVessel({
            dbfacade,
        });
        should(vessel.nextCycle).equal(OyaMist.CYCLE_STANDARD);
        const coolThreshold = vessel.coolThreshold;
        should(typeof coolThreshold).equal("number");
        should(vessel.state.tempInternal.value).equal(null);
        should(vessel.state.humidityInternal.value).equal(null);
        should(vessel.state.ecInternal.value).equal(null);

        // just right
        dbfacade.stmts.length.should.equal(0);
        vessel.emitter.emit(OyaMist.SENSE_TEMP_INTERNAL, vessel.coolThreshold-1);
        dbfacade.stmts.length.should.equal(1); // temperature was logged
        should(vessel.nextCycle).equal(OyaMist.CYCLE_STANDARD);
        should(vessel.state.tempInternal.value).equal(vessel.coolThreshold-1);

        // too hot
        vessel.emitter.emit(OyaMist.SENSE_TEMP_INTERNAL, vessel.coolThreshold+1);
        dbfacade.stmts.length.should.equal(2); // temperature was logged
        should(vessel.nextCycle).equal(OyaMist.CYCLE_COOL);
        should(vessel.state.tempInternal.value).equal(vessel.coolThreshold+1);

        vessel.emitter.emit(OyaMist.SENSE_HUMIDITY_INTERNAL, 0.55);
        should(vessel.state.humidityInternal.value).equal(0.55);
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
        vessel.activate(false);
        should(vessel.isActive).equal(false);
    });
    it ("state.Mist is true when cycle is active and the phase is on", function(done) {
        var async = function*() {
            try {
                var vessel = createTestVessel({name:'test3a', maxCycles:2});
                should(vessel.state.Mist).equal(false);
                vessel.activate();
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                should(vessel.state.Mist).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                should(vessel.state.Mist).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                should(vessel.state.Mist).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                should(vessel.state.Mist).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should(vessel.state.cycleNumber).equal(3);
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                should(vessel.state.Mist).equal(false);
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
                should(vessel.state.Mist).equal(false);
                vessel.activate();
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                should(vessel.state.Mist).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                should(vessel.state.Mist).equal(false);
                should(vessel.isActive).equal(true);

                // changing the cycle re-activates
                var to = vessel._phaseTimeout;
                vessel.setCycle(OyaMist.CYCLE_COOL);

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(vessel.state.cycleNumber).equal(1);
                should(vessel.cycle).equal(OyaMist.CYCLE_COOL);
                should(vessel.state.Mist).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaMist.CYCLE_COOL);
                should(vessel.state.Mist).equal(true);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_ON*1000);
                should(vessel.state.cycleNumber).equal(2);
                should(vessel.cycle).equal(OyaMist.CYCLE_COOL);
                should(vessel.state.Mist).equal(false);
                should(vessel.isActive).equal(true);

                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should(vessel.state.cycleNumber).equal(3);
                should(vessel.cycle).equal(OyaMist.CYCLE_COOL);
                should(vessel.state.Mist).equal(false);
                should(vessel.isActive).equal(false);

                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it ("onTemp() controls temperature state", function(done) {
        var async = function*() {
            try {
                var vessel = new OyaVessel();
                var evt = OyaMist.SENSE_TEMP_INTERNAL;
                var field = OyaMist.fieldOfEvent(evt);
                should(vessel.nextCycle).equal(vessel.startCycle);

                // when temperature exceeds cooling threshold, switch to hot cycle
                vessel.onTemp(vessel.coolThreshold, field, evt);
                should(vessel.nextCycle).equal(vessel.hotCycle);

                // when temperature dips slightly below cooling threshold, keep cooling
                vessel.onTemp(vessel.coolThreshold-0.001, field, evt);
                should(vessel.nextCycle).equal(vessel.hotCycle);

                // when temperature dips below cooling threshold with hysteresis, turn off cooling
                vessel.onTemp(vessel.coolThreshold*vessel.thresholdHysteresis, field, evt);
                should(vessel.nextCycle).equal(vessel.startCycle);
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
                var testInvariant = {
                    countdown: 0,
                    countstart: 0,
                    active: true,
                    type: "OyaVessel",
                    cycleNumber: 1,
                };
                var vessel = createTestVessel({name:'test6a', maxCycles:2});
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    active: false,
                    Mist: false,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                    cycleNumber: 0,
                }));

                // activation turns stuff on
                vessel.activate();
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    Mist: true,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                }));

                // setting nextCycle has no immediate effect
                vessel.nextCycle = OyaMist.CYCLE_COOL;
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    Mist: true,
                    nextCycle: OyaMist.CYCLE_COOL,
                }));

                // nextCycle has no effect during off phase
                yield setTimeout(() => async.next(true), STANDARD_ON*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    Mist: false,
                    nextCycle: OyaMist.CYCLE_COOL,
                }));

                // nextCycle takes effect after off phase
                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_COOL,
                    Mist: true,
                    nextCycle: OyaMist.CYCLE_COOL,
                }));

                // off phase of new cycle
                yield setTimeout(() => async.next(true), FAN_ON*1000 );
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_COOL,
                    Mist: false,
                    nextCycle: OyaMist.CYCLE_COOL,
                }));

                // on phase of new cycle
                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_COOL,
                    Mist: true,
                    nextCycle: OyaMist.CYCLE_COOL,
                    cycleNumber: 2,
                }));

                // off phase of new cycle
                yield setTimeout(() => async.next(true), FAN_ON*1000 );
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_COOL,
                    Mist: false,
                    nextCycle: OyaMist.CYCLE_COOL,
                    cycleNumber: 2,
                }));

                // all done
                yield setTimeout(() => async.next(true), FAN_OFF*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_COOL,
                    active: false,
                    nextCycle: OyaMist.CYCLE_COOL,
                    cycleNumber: 3,
                }));
                done();
            } catch (err) {
                winston.log(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it ("CYCLE_PRIME reverts to CYCLE_STANDARD", function(done) {
        var async = function*() {
            try {
                var testInvariant = {
                    countdown: 0,
                    countstart: 0,
                    active: true,
                    type: "OyaVessel",
                    Mist: false,
                    Prime: false,
                    cycleNumber: 1,
                    cycle: OyaMist.CYCLE_PRIME,
                    nextCycle: OyaMist.CYCLE_PRIME,
                };
                var vessel = createTestVessel({name:'test6a', maxCycles:2});
                vessel.setCycle(OyaMist.CYCLE_PRIME);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    active: false,
                    cycleNumber: 0,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                }));

                // activation turns stuff on
                vessel.activate();
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    Mist: true,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                }));

                // nextCycle has no effect during off phase
                yield setTimeout(() => async.next(true), PRIME_ON*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                    Mist: true,
                }));

                // nextCycle takes effect after off phase
                yield setTimeout(() => async.next(true), 0*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                    Mist: true,
                }));

                // off phase of new cycle
                yield setTimeout(() => async.next(true), STANDARD_ON*1000 );
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                    Mist: false,
                }));

                // on phase of new cycle
                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                    Mist: true,
                    cycleNumber: 2,
                }));

                // off phase of new cycle
                yield setTimeout(() => async.next(true), STANDARD_ON*1000 );
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                    Mist: false,
                    cycleNumber: 2,
                }));

                // all done
                yield setTimeout(() => async.next(true), STANDARD_OFF*1000);
                should.deepEqual(vessel.state, Object.assign(sensorDefaults(), testInvariant, {
                    cycle: OyaMist.CYCLE_STANDARD,
                    nextCycle: OyaMist.CYCLE_STANDARD,
                    active: false,
                    cycleNumber: 3,
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
