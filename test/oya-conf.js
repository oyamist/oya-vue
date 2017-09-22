(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaConf = require("../index").OyaConf;

    const defaultCycles = OyaConf.DEFAULT_CYCLES;

    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        startCycle: OyaConf.CYCLE_STANDARD,
        hotCycle: OyaConf.CYCLE_FAN,
        tempUnit: 'F',
        fanThreshold: 80,
        vessels: [
            OyaConf.createTimer(0),
            OyaConf.createTimer(1),
            OyaConf.createTimer(2),
        ],
    };

    it("toJSON() serializes configuration", function() {
        should.deepEqual(new OyaConf().toJSON(), defaultConf);
    });
    it("ctor takes configuration options", function() {
        var opts = {
            name: 'foo',
            tempUnit: 'C',
            startCycle: OyaConf.CYCLE_FAN,
            hotCycle: OyaConf.CYCLE_FAN,
            vessels: [
                OyaConf.createTimer(0, {
                    name: 'test1',
                    type: 'new-type',
                    startCycle: OyaConf.CYCLE_FAN,
                    hotCycle: OyaConf.CYCLE_FAN,
                    enabled: false,
                    cycleDelay: 2,
                    pin: 27,
                    fanThreshold: 72,
                    cycles: {
                        [OyaConf.CYCLE_FAN]: {
                            desc: 'fans are cool',
                            on: 10,
                            off: 23,
                        }
                    },
            })],
            /*
            vessels: [{
                name: 'test1',
                type: 'new-type',
                startCycle: OyaConf.CYCLE_FAN,
                hotCycle: OyaConf.CYCLE_FAN,
                enabled: false,
                cycleDelay: 2,
                pin: 27,
                fanThreshold: 72,
                cycles: {
                    [OyaConf.CYCLE_FAN]: {
                        desc: 'fans are cool',
                        on: 10,
                        off: 23,
                    }
                },
            }],
            */
        }
        var updatedTimer = OyaConf.createTimer();
        updatedTimer.name = 'test1';
        updatedTimer.type = 'new-type';
        updatedTimer.enabled = false;
        updatedTimer.startCycle = OyaConf.CYCLE_FAN;
        updatedTimer.cycleDelay = 2;
        updatedTimer.pin = 27;
        updatedTimer.fanThreshold = 72;
        updatedTimer.cycles = {
            [OyaConf.CYCLE_FAN]: {
                name: "Cool",
                desc: 'fans are cool',
                on: 10,
                off: 23,
            }
        };
        should.deepEqual(new OyaConf(opts).toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            startCycle: OyaConf.CYCLE_FAN,
            hotCycle: OyaConf.CYCLE_FAN,
            tempUnit: 'C',
            fanThreshold: 80,
            vessels: [
                updatedTimer,
            ],
        });
    });
    it("createTimer(index,opts) creates a custom timer", function() {
        should.deepEqual(OyaConf.createTimer(), {
            name: "vessel1",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaConf.CYCLE_STANDARD,
            hotCycle: OyaConf.CYCLE_FAN,
            fanThreshold: 80,
            cycleDelay: 0,
            maxCycles: 0,
            pin: 33,
            cycles: defaultCycles,
        });
        should.deepEqual(OyaConf.createTimer(1), {
            name: "vessel2",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaConf.CYCLE_STANDARD,
            hotCycle: OyaConf.CYCLE_FAN,
            fanThreshold: 80,
            maxCycles: 0,
            cycleDelay: 0,
            pin: 35,
            cycles: defaultCycles,
        });
        var opts = {
            name: "dubba",
            type: "testtype",
            enabled: true,
            startCycle: OyaConf.CYCLE_FAN,
            hotCycle: OyaConf.CYCLE_FAN,
            fanThreshold: 81,
            maxCycles: 2,
            cycleDelay: 3,
            pin: 39,
            cycles: defaultCycles,
        }
        should.deepEqual(OyaConf.createTimer(1, opts), {
            name: "dubba",
            type: "testtype",
            enabled: true,
            startCycle: OyaConf.CYCLE_FAN,
            hotCycle: OyaConf.CYCLE_FAN,
            fanThreshold: 81,
            maxCycles: 2,
            cycleDelay: 3,
            pin: 39,
            cycles: defaultCycles,
        });
        var opts = { 
            type: 'some-type',
        };
        should.deepEqual(OyaConf.createTimer(2,opts), {
            name: "vessel3",
            type: "some-type",
            enabled: true,
            pin: 36,
            startCycle: OyaConf.CYCLE_STANDARD,
            hotCycle: OyaConf.CYCLE_FAN,
            fanThreshold: 80,
            cycleDelay: 0,
            maxCycles: 0,
            pin: 36,
            cycles: defaultCycles,
        });
    });
    it("update(opts) updates configuration ", function() {
        var oc = new OyaConf();
        var timer0 = oc.vessels[0];
        oc.update({
            name: 'foo',
            type: 'bad-type', // ignored
            startCycle: OyaConf.CYCLE_FAN,
            hotCycle: OyaConf.CYCLE_STANDARD,
            tempUnit: 'C',
            vessels: [{
            },{
                name: 'test2',
                type: 'new-type',
                startCycle: OyaConf.CYCLE_FAN,
                hotCycle: OyaConf.CYCLE_STANDARD,
                enabled: false,
                cycleDelay: 2,
                pin: 27,
                fanThreshold: 72,
                cycles: {
                    [OyaConf.CYCLE_FAN]: {
                        on: 10,
                        off: 23,
                    }
                },
            }],
        });

        // vessels are not changed by update
        should.equal(timer0, oc.vessels[0]);

        var updatedTimer = OyaConf.createTimer(1);
        updatedTimer.name = 'test2';
        updatedTimer.type = 'new-type';
        updatedTimer.enabled = false;
        updatedTimer.startCycle = OyaConf.CYCLE_FAN;
        updatedTimer.hotCycle = OyaConf.CYCLE_STANDARD;
        updatedTimer.cycleDelay = 2;
        updatedTimer.pin = 27;
        updatedTimer.fanThreshold = 72;
        updatedTimer.cycles = {
            [OyaConf.CYCLE_FAN]: {
                name: "Cool",
                desc: defaultCycles[OyaConf.CYCLE_FAN].desc,
                on: 10,
                off: 23,
            }
        };

        // vessels are not changed by update
        should.equal(timer0, oc.vessels[0]);

        should.deepEqual(oc.toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            startCycle: OyaConf.CYCLE_FAN,
            hotCycle: OyaConf.CYCLE_STANDARD,
            tempUnit: 'C',
            fanThreshold: 80,
            vessels: [
                OyaConf.createTimer(0),
                updatedTimer,
                OyaConf.createTimer(2),
            ],
        });
    });
});
