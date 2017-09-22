(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaConf = require("../index").OyaConf;
    const OyaVessel = require("../index").OyaVessel;

    const defaultCycles = OyaVessel.DEFAULT_CYCLES;

    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        tempUnit: 'F',
        vessels: [
            OyaConf.createTimer(0),
            OyaConf.createTimer(1),
        ],
    };

    it("toJSON() serializes configuration", function() {
        should.deepEqual(new OyaConf().toJSON(), defaultConf);
    });
    it("ctor takes configuration options", function() {
        var opts = {
            name: 'foo',
            tempUnit: 'C',
            vessels: [
                OyaConf.createTimer(0, {
                    name: 'test1',
                    type: 'new-type',
                    startCycle: OyaVessel.CYCLE_FAN,
                    hotCycle: OyaVessel.CYCLE_FAN,
                    enabled: false,
                    cycleDelay: 2,
                    fanThreshold: 72,
                    cycles: {
                        [OyaVessel.CYCLE_FAN]: {
                            desc: 'fans are cool',
                            on: 10,
                            off: 23,
                        }
                    },
            })],
        }
        var updatedVessel = OyaConf.createTimer();
        updatedVessel.name = 'test1';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaVessel.CYCLE_FAN;
        updatedVessel.cycleDelay = 2;
        updatedVessel.fanThreshold = 72;
        updatedVessel.cycles = {
            [OyaVessel.CYCLE_FAN]: {
                name: "Cool",
                desc: 'fans are cool',
                on: 10,
                off: 23,
            }
        };
        should.deepEqual(new OyaConf(opts).toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            tempUnit: 'C',
            vessels: [
                updatedVessel,
            ],
        });
    });
    it("createTimer(index,opts) creates a custom timer", function() {
        should.deepEqual(OyaConf.createTimer(), {
            name: "vessel1",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 80,
            cycleDelay: 0,
            maxCycles: 0,
            cycles: defaultCycles,
        });
        should.deepEqual(OyaConf.createTimer(1), {
            name: "vessel2",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 80,
            maxCycles: 0,
            cycleDelay: 0,
            cycles: defaultCycles,
        });
        var opts = {
            name: "dubba",
            type: "testtype",
            enabled: true,
            startCycle: OyaVessel.CYCLE_FAN,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 81,
            maxCycles: 2,
            cycleDelay: 3,
            cycles: defaultCycles,
        }
        should.deepEqual(OyaConf.createTimer(1, opts), {
            name: "dubba",
            type: "testtype",
            enabled: true,
            startCycle: OyaVessel.CYCLE_FAN,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 81,
            maxCycles: 2,
            cycleDelay: 3,
            cycles: defaultCycles,
        });
        var opts = { 
            type: 'some-type',
        };
        should.deepEqual(OyaConf.createTimer(2,opts), {
            name: "vessel3",
            type: "some-type",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 80,
            cycleDelay: 0,
            maxCycles: 0,
            cycles: defaultCycles,
        });
    });
    it("update(opts) updates configuration ", function() {
        var ov = new OyaConf();
        var vessel0 = ov.vessels[0];
        ov.update({
            name: 'foo',
            type: 'bad-type', // ignored
            startCycle: OyaVessel.CYCLE_FAN,
            hotCycle: OyaVessel.CYCLE_STANDARD,
            tempUnit: 'C',
            vessels: [{
            },{
                name: 'test2',
                type: 'new-type',
                startCycle: OyaVessel.CYCLE_FAN,
                hotCycle: OyaVessel.CYCLE_STANDARD,
                enabled: false,
                cycleDelay: 2,
                fanThreshold: 72,
                cycles: {
                    [OyaVessel.CYCLE_FAN]: {
                        on: 10,
                        off: 23,
                    }
                },
            }],
        });

        // vessels are not changed by update
        should.equal(vessel0, ov.vessels[0]);

        var updatedVessel = OyaConf.createTimer(1);
        updatedVessel.name = 'test2';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaVessel.CYCLE_FAN;
        updatedVessel.hotCycle = OyaVessel.CYCLE_STANDARD;
        updatedVessel.cycleDelay = 2;
        updatedVessel.fanThreshold = 72;
        updatedVessel.cycles = {
            [OyaVessel.CYCLE_FAN]: {
                name: "Cool",
                desc: defaultCycles[OyaVessel.CYCLE_FAN].desc,
                on: 10,
                off: 23,
            }
        };

        // vessels are not changed by update
        should.equal(vessel0, ov.vessels[0]);

        should.deepEqual(ov.toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            tempUnit: 'C',
            vessels: [
                OyaConf.createTimer(0),
                updatedVessel,
            ],
        });
    });
});
