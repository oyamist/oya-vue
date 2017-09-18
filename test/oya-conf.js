(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaConf = require("../index").OyaConf;

    const defaultCycles = {
        "fan": {
            "desc": "Misting cycle for use with cooling fan air intake",
            "on": 15,
            "off": 15
        },
        "standard": {
            "desc": "Standard misting cycle for all phases of plant growth",
            "on": 30,
            "off": 60
        },
        "drain": {
            "desc": "Incremental drain cycle ",
            "on": 311,
            "off": -1
        }
    };

    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        startCycle: 'standard',
        tempUnit: 'F',
        fanThreshold: 80,
        actuators: [
            OyaConf.defaultActuator("timer-cycle", 0),
            OyaConf.defaultActuator("timer-cycle", 1),
            OyaConf.defaultActuator("timer-cycle", 2),
        ],
        mist: {
            drain: {
                desc: "Incremental drain cycle ",
                on: 311, // ~1 gallon assuming Aquatec CDP6800 pump operating with no load @0.73LPM
                off: -1,
            },
            fan: {
                desc: "Misting cycle for use with cooling fan air intake",
                on: 15,
                off: 15,
            },
            standard: {
                desc: "Standard misting cycle for all phases of plant growth",
                on: 30,
                off: 60,
            },
        },
    };

    it("toJSON() serializes configuration", function() {
        should.deepEqual(new OyaConf().toJSON(), defaultConf);
    });
    it("ctor takes configuration options", function() {
        var opts = {
            name: 'foo',
            tempUnit: 'C',
            startCycle: 'fan',
            mist: {
                fan: {
                    on: 30,
                },
            },
        }
        should.deepEqual(new OyaConf(opts).toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            startCycle: OyaConf.CYCLE_FAN,
            tempUnit: 'C',
            fanThreshold: 80,
            actuators: [
                OyaConf.defaultActuator("timer-cycle", 0),
                OyaConf.defaultActuator("timer-cycle", 1),
                OyaConf.defaultActuator("timer-cycle", 2),
            ],
            mist: {
                drain: {
                    desc: "Incremental drain cycle ",
                    on: 311, // ~1 gallon assuming Aquatec CDP6800 pump operating with no load @0.73LPM
                    off: -1,
                },
                fan: {
                    desc: "Misting cycle for use with cooling fan air intake",
                    on: 30,
                    off: 15,
                },
                standard: {
                    desc: "Standard misting cycle for all phases of plant growth",
                    on: 30,
                    off: 60,
                },
            },
        });
    });
    it("defaultActuator(type, index) returns default actuator configuration", function() {
        should.deepEqual(OyaConf.defaultActuator("timer-cycle", 0), {
            "name": "mist1",
            "type": "timer-cycle",
            "enabled": true,
            "startCycle": "standard",
            "fanThreshold": 80,
            "cycleDelay": 0,
            "pin": 33,
            "cycles": defaultCycles,
        });
        should.deepEqual(OyaConf.defaultActuator("timer-cycle", 1), {
            "name": "mist2",
            "type": "timer-cycle",
            "enabled": true,
            "startCycle": "standard",
            "fanThreshold": 80,
            "cycleDelay": 0,
            "pin": 35,
            "cycles": defaultCycles,
        });
        should.deepEqual(OyaConf.defaultActuator("timer-cycle", 2), {
            "name": "mist3",
            "type": "timer-cycle",
            "enabled": true,
            "startCycle": "standard",
            "fanThreshold": 80,
            "cycleDelay": 0,
            "pin": 36,
            "cycles": defaultCycles,
        });
    });
    it("update(opts) updates configuration ", function() {
        var oc = new OyaConf();
        oc.update({
            name: 'foo',
            type: 'bad-type', // ignored
            startCycle: 'fan',
            tempUnit: 'C',
            actuators: [{
            },{
                name: 'test2',
                type: 'new-type',
                startCycle: 'fan',
                enabled: false,
                cycleDelay: 2,
                pin: 27,
                fanThreshold: 72,
                cycles: {
                    fan: {
                        on: 10,
                        off: 23,
                    }
                },
            }],
            mist: {
                fan: {
                    on: 30,
                },
            },
        });
        var updatedCycle = OyaConf.defaultActuator("timer-cycle", 1);
        updatedCycle.name = 'test2';
        updatedCycle.type = 'new-type';
        updatedCycle.enabled = false;
        updatedCycle.startCycle = 'fan';
        updatedCycle.cycleDelay = 2;
        updatedCycle.pin = 27;
        updatedCycle.fanThreshold = 72;
        updatedCycle.cycles = {
            fan: {
                on: 10,
                off: 23,
            }
        };
        should.deepEqual(oc.toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            startCycle: OyaConf.CYCLE_FAN,
            tempUnit: 'C',
            fanThreshold: 80,
            actuators: [
                OyaConf.defaultActuator("timer-cycle", 0),
                updatedCycle,
                OyaConf.defaultActuator("timer-cycle", 2),
            ],
            mist: {
                drain: {
                    desc: "Incremental drain cycle ",
                    on: 311, // ~1 gallon assuming Aquatec CDP6800 pump operating with no load @0.73LPM
                    off: -1,
                },
                fan: {
                    desc: "Misting cycle for use with cooling fan air intake",
                    on: 30,
                    off: 15,
                },
                standard: {
                    desc: "Standard misting cycle for all phases of plant growth",
                    on: 30,
                    off: 60,
                },
            },
        });
    });
});
