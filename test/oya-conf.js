(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const {
        OyaConf,
        OyaMist,
        Actuator,
        Light,
        Sensor,
        Switch,
        OyaVessel,
    } = require('../index');
    const defaultCycles = OyaVessel.DEFAULT_CYCLES;
    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        tempUnit: 'F',
        hostTimeout: 200,
        healthPoll: 60,
        mcuHat: 'mcu-hat:none',
        vessels: [
            OyaConf.createVesselConfig(0,{
                guid: 'testguid0',
            }),
            OyaConf.createVesselConfig(1, {
                guid: 'testguid1',
            }),
        ],
        lights: [
            new Light(Light.LIGHT_FULL),
            new Light(Light.LIGHT_BLUE),
            new Light(Light.LIGHT_RED),
        ],
        switches: [
            new Switch({
                name: 'Prime',
                event: OyaConf.EVENT_CYCLE_PRIME,
            }),
            new Switch({
                name: 'Cool',
                event: OyaConf.EVENT_CYCLE_COOL,
            }),
            new Switch({
                name: 'Mist',
                event: OyaConf.EVENT_CYCLE_MIST,
            }),
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
        chart: {
            ecStepSize: 10,
            tempStepSize: 2,
            humidityStepSize: 5,
            showRaw: false,
        },
    };
    winston.level = 'error';

    it("toJSON() serializes configuration", function() {
        var conf = new OyaConf({
            vessels: [{
                guid: 'testguid0',
            },{
                guid: 'testguid1',
            }],
        });
        should.deepEqual(conf.toJSON(), defaultConf);
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
                    guid: 'test1guid',
                    type: 'new-type',
                    startCycle: OyaMist.CYCLE_COOL,
                    hotCycle: OyaMist.CYCLE_COOL,
                    enabled: false,
                    coolThreshold: 72,
                    cycles: {
                        [OyaMist.CYCLE_COOL]: {
                            desc: 'fans are cool',
                            emits: OyaMist.EVENT_COOL,
                            on: 10,
                            off: 23,
                            nextCycle: OyaMist.CYCLE_COOL,
                        }
                    },
            })],
            actuators,
        }
        var updatedVessel = OyaConf.createVesselConfig();
        updatedVessel.name = 'test1';
        updatedVessel.guid= 'test1guid';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaMist.CYCLE_COOL;
        updatedVessel.coolThreshold = 72;
        updatedVessel.cycles = {
            [OyaMist.CYCLE_COOL]: {
                name: "Cool",
                key: OyaMist.CYCLE_COOL,
                desc: 'fans are cool',
                emits: OyaMist.EVENT_COOL,
                on: 10,
                off: 23,
                nextCycle: OyaMist.CYCLE_COOL,
            }
        };
        should.deepEqual(new OyaConf(opts).toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            tempUnit: 'C',
            hostTimeout: 200,
            healthPoll: 60,
            mcuHat: 'mcu-hat:none',
            vessels: [
                updatedVessel,
            ],
            actuators,
            lights: defaultConf.lights,
            switches: defaultConf.switches,
            sensors: [
                defaultConf.sensors[0],
                defaultConf.sensors[1],
                defaultConf.sensors[2],
            ],
            chart: defaultConf.chart,
        });
    });
    it("createVesselConfig(index,opts) creates a custom vessel", function() {
        var opts = {
            guid: 'vessel1guid',
        };
        should.deepEqual(OyaConf.createVesselConfig(0, opts), {
            name: "vessel1",
            guid: 'vessel1guid',
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaMist.CYCLE_STANDARD,
            hotCycle: OyaMist.CYCLE_COOL,
            coolThreshold: (70-32)/1.8,
            maxCycles: 0,
            cycles: defaultCycles,
        });
        should.deepEqual(OyaConf.createVesselConfig(1, opts), {
            name: "vessel2",
            guid: 'vessel1guid',
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaMist.CYCLE_STANDARD,
            hotCycle: OyaMist.CYCLE_COOL,
            coolThreshold: (70-32)/1.8,
            maxCycles: 0,
            cycles: defaultCycles,
        });
        var opts = {
            name: "dubba",
            guid: 'dubbaguid',
            type: "testtype",
            enabled: true,
            startCycle: OyaMist.CYCLE_COOL,
            hotCycle: OyaMist.CYCLE_COOL,
            coolThreshold: 81,
            maxCycles: 2,
            cycles: defaultCycles,
        }
        should.deepEqual(OyaConf.createVesselConfig(1, opts), {
            name: "dubba",
            guid: 'dubbaguid',
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaMist.CYCLE_COOL,
            hotCycle: OyaMist.CYCLE_COOL,
            coolThreshold: 81,
            maxCycles: 2,
            cycles: defaultCycles,
        });
        var opts = { 
            type: 'some-type',
            guid: 'vessel3guid',
        };
        should.deepEqual(OyaConf.createVesselConfig(2,opts), {
            name: "vessel3",
            guid: 'vessel3guid',
            sensorExpRate: 0.01,
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaMist.CYCLE_STANDARD,
            hotCycle: OyaMist.CYCLE_COOL,
            coolThreshold: (70-32)/1.8,
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
            startCycle: OyaMist.CYCLE_COOL,
            hotCycle: OyaMist.CYCLE_STANDARD,
            tempUnit: 'C',
            vessels: [{
            },{
                name: 'test2',
                guid: 'test2guid',
                type: 'new-type',
                startCycle: OyaMist.CYCLE_COOL,
                hotCycle: OyaMist.CYCLE_STANDARD,
                enabled: false,
                coolThreshold: 72,
                cycles: {
                    [OyaMist.CYCLE_COOL]: {
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
        updatedVessel.guid = 'test2guid';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaMist.CYCLE_COOL;
        updatedVessel.hotCycle = OyaMist.CYCLE_STANDARD;
        updatedVessel.coolThreshold = 72;
        updatedVessel.cycles = {
            [OyaMist.CYCLE_COOL]: {
                name: "Cool",
                key: OyaMist.CYCLE_COOL,
                desc: defaultCycles[OyaMist.CYCLE_COOL].desc,
                emits: OyaMist.EVENT_MIST,
                on: 10,
                off: 23,
                nextCycle: OyaMist.CYCLE_COOL,
            }
        };

        // vessels are not changed by update
        should.equal(vessel0, oc.vessels[0]);
        should(vessel0.guid).match(/.*-.*-.*-.*-.*/);
        ocv0 = oc.vessels[0];
        should.deepEqual(oc.toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            tempUnit: 'C',
            hostTimeout: 200,
            healthPoll: 60,
            mcuHat: 'mcu-hat:none',
            vessels: [
                OyaConf.createVesselConfig(0, {
                    guid: ocv0.guid,
                }),
                updatedVessel,
            ],
            actuators,
            lights: defaultConf.lights,
            sensors: defaultConf.sensors,
            switches: defaultConf.switches,
            chart: defaultConf.chart,
        });

    });
    it("update(opts) retains sensor instances", function() {
        var oc = new OyaConf();
        var sensor0 = oc.sensors[0];
        var sensor1 = oc.sensors[1];

        oc.update({});
        should(oc.sensors[0]).equal(sensor0);
        should(oc.sensors[1]).equal(sensor1);

        oc.update({
            sensors: [{
            }]
        });
        //should(oc.sensors[0]).equal(sensor0);
        //should(oc.sensors[1]).equal(sensor1);
    });
    it("sensorOfField(field) returns source sensor for field", function() {
        var oc = new OyaConf({
            sensors: [{
                type: Sensor.TYPE_AM2315.type,
                loc: OyaMist.LOC_AMBIENT,
            },{
                type: Sensor.TYPE_EZO_EC_K1.type,
                loc: OyaMist.LOC_AMBIENT,
            }],
        });
        var tempSensor = oc.sensorOfField('tempAmbient');
        should(tempSensor).equal(oc.sensors[0]);
        var ecSensor = oc.sensorOfField('ecAmbient');
        should(ecSensor).equal(oc.sensors[1]);
    });

});
