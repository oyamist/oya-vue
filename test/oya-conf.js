(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaConf = require("../index").OyaConf;

    const defaultCycles = OyaConf.DEFAULT_CYCLES;

    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        startCycle: OyaConf.CYCLE_STANDARD,
        tempUnit: 'F',
        fanThreshold: 80,
        actuators: [
            OyaConf.createActuator(0),
            OyaConf.createActuator(1),
            OyaConf.createActuator(2),
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
            actuators: [
                OyaConf.createActuator(0, {
                    name: 'test1',
                    type: 'new-type',
                    startCycle: OyaConf.CYCLE_FAN,
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
            actuators: [{
                name: 'test1',
                type: 'new-type',
                startCycle: OyaConf.CYCLE_FAN,
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
        var updatedActuator = OyaConf.createActuator();
        updatedActuator.name = 'test1';
        updatedActuator.type = 'new-type';
        updatedActuator.enabled = false;
        updatedActuator.startCycle = OyaConf.CYCLE_FAN;
        updatedActuator.cycleDelay = 2;
        updatedActuator.pin = 27;
        updatedActuator.fanThreshold = 72;
        updatedActuator.cycles = {
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
            tempUnit: 'C',
            fanThreshold: 80,
            actuators: [
                updatedActuator,
            ],
        });
    });
    it("createActuator(index,opts) creates a custom actuator", function() {
        should.deepEqual(OyaConf.createActuator(), {
            name: "mist1",
            type: "timer-cycle",
            enabled: true,
            startCycle: OyaConf.CYCLE_STANDARD,
            fanThreshold: 80,
            cycleDelay: 0,
            maxCycles: 0,
            pin: 33,
            cycles: defaultCycles,
        });
        should.deepEqual(OyaConf.createActuator(1), {
            name: "mist2",
            type: "timer-cycle",
            enabled: true,
            startCycle: OyaConf.CYCLE_STANDARD,
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
            fanThreshold: 81,
            maxCycles: 2,
            cycleDelay: 3,
            pin: 39,
            cycles: defaultCycles,
        }
        should.deepEqual(OyaConf.createActuator(1, opts), {
            name: "dubba",
            type: "testtype",
            enabled: true,
            startCycle: OyaConf.CYCLE_FAN,
            fanThreshold: 81,
            maxCycles: 2,
            cycleDelay: 3,
            pin: 39,
            cycles: defaultCycles,
        });
        var opts = { 
            type: 'some-type',
        };
        should.deepEqual(OyaConf.createActuator(2,opts), {
            name: "mist3",
            type: "some-type",
            enabled: true,
            pin: 36,
            startCycle: OyaConf.CYCLE_STANDARD,
            fanThreshold: 80,
            cycleDelay: 0,
            maxCycles: 0,
            pin: 36,
            cycles: defaultCycles,
        });
    });
    it("update(opts) updates configuration ", function() {
        var oc = new OyaConf();
        var actuator0 = oc.actuators[0];
        oc.update({
            name: 'foo',
            type: 'bad-type', // ignored
            startCycle: OyaConf.CYCLE_FAN,
            tempUnit: 'C',
            actuators: [{
            },{
                name: 'test2',
                type: 'new-type',
                startCycle: OyaConf.CYCLE_FAN,
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

        // actuators are not changed by update
        should.equal(actuator0, oc.actuators[0]);

        var updatedActuator = OyaConf.createActuator(1);
        updatedActuator.name = 'test2';
        updatedActuator.type = 'new-type';
        updatedActuator.enabled = false;
        updatedActuator.startCycle = OyaConf.CYCLE_FAN;
        updatedActuator.cycleDelay = 2;
        updatedActuator.pin = 27;
        updatedActuator.fanThreshold = 72;
        updatedActuator.cycles = {
            [OyaConf.CYCLE_FAN]: {
                name: "Cool",
                desc: defaultCycles[OyaConf.CYCLE_FAN].desc,
                on: 10,
                off: 23,
            }
        };

        // actuators are not changed by update
        should.equal(actuator0, oc.actuators[0]);

        should.deepEqual(oc.toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            startCycle: OyaConf.CYCLE_FAN,
            tempUnit: 'C',
            fanThreshold: 80,
            actuators: [
                OyaConf.createActuator(0),
                updatedActuator,
                OyaConf.createActuator(2),
            ],
        });
    });
});
