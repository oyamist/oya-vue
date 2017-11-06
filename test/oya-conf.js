(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaConf = require("../index").OyaConf;
    const Actuator = require("../index").Actuator;
    const Sensor = require("../index").Sensor;
    const OyaVessel = require("../index").OyaVessel;
    const defaultCycles = OyaVessel.DEFAULT_CYCLES;
    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        tempUnit: 'F',
        vessels: [
            OyaConf.createVesselConfig(0),
            OyaConf.createVesselConfig(1),
        ],
        actuators: [
            new Actuator({usage:Actuator.USAGE_MIST}),
            new Actuator({usage:Actuator.USAGE_COOL}),
            new Actuator({usage:Actuator.USAGE_PRIME}),
            new Actuator({
                name: "Mist2",
                usage:Actuator.USAGE_MIST,
                vesselIndex: 1
            }),
            new Actuator({
                name: "Cool2",
                usage:Actuator.USAGE_COOL,
                vesselIndex: 1
            }),
            new Actuator({
                name: "Prime2",
                usage:Actuator.USAGE_PRIME,
                vesselIndex: 1
            }),
        ],
        sensors: [
            new Sensor(Object.assign(Sensor.TYPE_NONE, {
                vesselIndex: 0,
            })),
            new Sensor(Object.assign(Sensor.TYPE_NONE, {
                vesselIndex: 0,
            })),
            new Sensor(Object.assign(Sensor.TYPE_NONE, {
                vesselIndex: 0,
            })),
            new Sensor(Object.assign(Sensor.TYPE_NONE, {
                vesselIndex: 1,
            })),
            new Sensor(Object.assign(Sensor.TYPE_NONE, {
                vesselIndex: 1,
            })),
            new Sensor(Object.assign(Sensor.TYPE_NONE, {
                vesselIndex: 1,
            })),
        ],
    };
    winston.level = 'error';

    it("toJSON() serializes configuration", function() {
        should.deepEqual(new OyaConf().toJSON(), defaultConf);
    });
    it("ctor creates default configuration", function() {
        var oc = new OyaConf();
        should.deepEqual(oc.actuators, defaultConf.actuators);
    });
    it("ctor takes configuration options", function() {
        var actuators = [
            new Actuator({
                vesselIndex: 0,
                usage: Actuator.USAGE_MIST,
            }),
            new Actuator({
                vesselIndex: 0,
                usage: Actuator.USAGE_COOL,
                pin:3, 
            }),
        ];
        should(actuators[0].pin).equal(Actuator.NOPIN);
        should(actuators[0].usage).equal(Actuator.USAGE_MIST);
        should(actuators[1].pin).equal(3);
        should(actuators[1].usage).equal(Actuator.USAGE_COOL);
        var opts = {
            name: 'foo',
            tempUnit: 'C',
            vessels: [
                OyaConf.createVesselConfig(0, {
                    name: 'test1',
                    type: 'new-type',
                    startCycle: OyaVessel.CYCLE_COOL,
                    hotCycle: OyaVessel.CYCLE_COOL,
                    enabled: false,
                    coolThreshold: 72,
                    cycles: {
                        [OyaVessel.CYCLE_COOL]: {
                            desc: 'fans are cool',
                            emits: OyaVessel.EVENT_COOL,
                            on: 10,
                            off: 23,
                        }
                    },
            })],
            actuators,
        }
        var updatedVessel = OyaConf.createVesselConfig();
        updatedVessel.name = 'test1';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaVessel.CYCLE_COOL;
        updatedVessel.coolThreshold = 72;
        updatedVessel.cycles = {
            [OyaVessel.CYCLE_COOL]: {
                name: "Cool",
                key: OyaVessel.CYCLE_COOL,
                desc: 'fans are cool',
                emits: OyaVessel.EVENT_COOL,
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
            actuators,
            sensors: [
                defaultConf.sensors[0],
                defaultConf.sensors[1],
                defaultConf.sensors[2],
            ],
        });
    });
    it("createVesselConfig(index,opts) creates a custom vessel", function() {
        should.deepEqual(OyaConf.createVesselConfig(), {
            name: "vessel1",
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_COOL,
            coolThreshold: 80,
            maxCycles: 0,
            cycles: defaultCycles,
        });
        should.deepEqual(OyaConf.createVesselConfig(1), {
            name: "vessel2",
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_COOL,
            coolThreshold: 80,
            maxCycles: 0,
            cycles: defaultCycles,
        });
        var opts = {
            name: "dubba",
            type: "testtype",
            enabled: true,
            startCycle: OyaVessel.CYCLE_COOL,
            hotCycle: OyaVessel.CYCLE_COOL,
            coolThreshold: 81,
            maxCycles: 2,
            cycles: defaultCycles,
        }
        should.deepEqual(OyaConf.createVesselConfig(1, opts), {
            name: "dubba",
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_COOL,
            hotCycle: OyaVessel.CYCLE_COOL,
            coolThreshold: 81,
            maxCycles: 2,
            cycles: defaultCycles,
        });
        var opts = { 
            type: 'some-type',
        };
        should.deepEqual(OyaConf.createVesselConfig(2,opts), {
            name: "vessel3",
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_COOL,
            coolThreshold: 80,
            maxCycles: 0,
            cycles: defaultCycles,
        });
    });
    it("update(opts) updates configuration ", function() {
        var oc = new OyaConf();
        var vessel0 = oc.vessels[0];
        var actuators = [
            new Actuator({
                usage: Actuator.USAGE_MIST,
                pin: 2
            }),
            new Actuator({
                usage: Actuator.USAGE_COOL,
                pin: 3
            }),
        ];
        oc.update({
            name: 'foo',
            type: 'bad-type', // ignored
            startCycle: OyaVessel.CYCLE_COOL,
            hotCycle: OyaVessel.CYCLE_STANDARD,
            tempUnit: 'C',
            vessels: [{
            },{
                name: 'test2',
                type: 'new-type',
                startCycle: OyaVessel.CYCLE_COOL,
                hotCycle: OyaVessel.CYCLE_STANDARD,
                enabled: false,
                coolThreshold: 72,
                cycles: {
                    [OyaVessel.CYCLE_COOL]: {
                        on: 10,
                        off: 23,
                    }
                },
            }],
            actuators,
        });

        // vessels are not changed by update
        should.equal(vessel0, oc.vessels[0]);

        var updatedVessel = OyaConf.createVesselConfig(1);
        updatedVessel.name = 'test2';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaVessel.CYCLE_COOL;
        updatedVessel.hotCycle = OyaVessel.CYCLE_STANDARD;
        updatedVessel.coolThreshold = 72;
        updatedVessel.cycles = {
            [OyaVessel.CYCLE_COOL]: {
                name: "Cool",
                key: OyaVessel.CYCLE_COOL,
                desc: defaultCycles[OyaVessel.CYCLE_COOL].desc,
                emits: OyaVessel.EVENT_MIST,
                on: 10,
                off: 23,
            }
        };

        // vessels are not changed by update
        should.equal(vessel0, oc.vessels[0]);

        should.deepEqual(oc.toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            tempUnit: 'C',
            vessels: [
                OyaConf.createVesselConfig(0),
                updatedVessel,
            ],
            actuators,
            sensors: defaultConf.sensors,
        });

    });
});
