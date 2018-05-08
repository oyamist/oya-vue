(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const path = require('path');
    const fs = require('fs');
    const {
        OyaConf,
        OyaMist,
        Actuator,
        Fan,
        Light,
        Sensor,
        Switch,
        OyaVessel,
    } = require('../index');
    const defaultCycles = OyaVessel.DEFAULT_CYCLES;
    const defaultConf = {
        name: 'test',
        camera: "none",
        type: 'OyaConf',
        tempUnit: 'F',
        hostTimeout: 200,
        healthPoll: 60,
        heapReboot: 60*1000*1000,
        mcuHat: 'mcu-hat:none',
        vessel: OyaConf.createVesselConfig(0,{
            guid: 'testguid0',
        }),
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
        ],
        sensors: [
            new Sensor(Object.assign(Sensor.TYPE_NONE)),
            new Sensor(Object.assign(Sensor.TYPE_NONE)),
            new Sensor(Object.assign(Sensor.TYPE_NONE)),
        ],
        chart: {
            ecStepSize: 10,
            tempStepSize: 2,
            humidityStepSize: 5,
            showRaw: false,
        },
        fan: new Fan(),
    };
    winston.level = 'warn';

    it("TESTTESTtoJSON() serializes configuration", function() {
        var conf = new OyaConf({
            vessel: {
                guid: 'testguid0',
            },
        });
        var json = JSON.parse(JSON.stringify(conf));

        var conf2 = new OyaConf(json);
        should.deepEqual(conf2, conf);
        should(conf2.vessel.guid).equal('testguid0');
    });
    it("ctor creates default configuration", function() {
        var oc = new OyaConf();
        should.deepEqual(oc.actuators, defaultConf.actuators);
    });
    it("ctor takes configuration options", function() {
        var actuators = [
            new Actuator({
                usage: Actuator.USAGE_MIST,
            }),
            new Actuator({
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
            vessel: OyaConf.createVesselConfig(0, {
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
            }),
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
            heapReboot: 60*1000*1000,
            mcuHat: 'mcu-hat:none',
            vessel: updatedVessel,
            actuators,
            lights: defaultConf.lights,
            switches: defaultConf.switches,
            sensors: [
                defaultConf.sensors[0],
                defaultConf.sensors[1],
                defaultConf.sensors[2],
            ],
            chart: defaultConf.chart,
            camera: defaultConf.camera,
            fan: defaultConf.fan,
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
            thresholdHysteresis: 0.99,
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
            thresholdHysteresis: 0.99,
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
            thresholdHysteresis: 0.99,
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
            thresholdHysteresis: 0.99,
            maxCycles: 0,
            cycles: defaultCycles,
        });
    });
    it("TESTTESTupdate(opts) updates configuration ", function() {
        var oc = new OyaConf();
        var vessel0 = oc.vessel;
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
            vessel: {
                name: 'test1',
                guid: 'test1guid',
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
            },
            actuators,
        });


        // vessels are not changed by update
        should.equal(vessel0, oc.vessel);

        var updatedVessel = OyaConf.createVesselConfig(1);
        updatedVessel.name = 'test1';
        updatedVessel.guid = 'test1guid';
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
        should.equal(vessel0, oc.vessel);
        should(vessel0.guid).equal('test1guid');
        ocv0 = oc.vessel;
        should(oc.toJSON()).properties( {
            name: 'foo',
            type: 'OyaConf',
            tempUnit: 'C',
            hostTimeout: 200,
            healthPoll: 60,
            heapReboot: 60*1000*1000,
            mcuHat: 'mcu-hat:none',
            actuators,
        });
        should.deepEqual(oc.toJSON().lights, defaultConf.lights);
        should.deepEqual(oc.toJSON().sensors, defaultConf.sensors);
        should.deepEqual(oc.toJSON().switches, defaultConf.switches);
        should.deepEqual(oc.toJSON().chart, defaultConf.chart);
        should.deepEqual(oc.toJSON().camera, defaultConf.camera);
        should.deepEqual(oc.toJSON().fan, defaultConf.fan);
        should.deepEqual(oc.toJSON().vessel, updatedVessel);

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
    it("TESTTESTupdate(conf) read legacy multi-vessel configuration", function() {
        var confPath = path.join(__dirname, 'multi-vessel-conf.json');
        var confJson = JSON.parse(fs.readFileSync(confPath));
        var conf = new OyaConf(confJson);
        var vessel = conf.vessel;
        should(vessel).properties({
            "name": "Garage02 seedlings and clones",
            "guid": "6fb75b96-c318-4760-8c97-a6e835eeb665",
        });
        should(vessel.cycles).properties({
            "Cycle #1": {
                "name": "Standard",
                "key": "Cycle #1",
                "desc": "Standard cycle for all phases of plant growth",
                "emits": "event:mist",
                "on": "20",
                "off": "60",
                "nextCycle": "Cycle #1"
            },
        });
        should(conf.actuators[0]).properties( {
            "name": "Mist",
            "type": "actuator:spst:no",
            "usage": "Mist",
            "desc": "Mist roots",
            "pin": 33,
            "activate": "event:mist"
        });
        should(conf.sensors[1]).properties({
            "address": 100,
            "desc": "Atlas Scientific EZO™ EC with K1 conductivity probe",
            "name": "EZO-EC-K1",
            "type": "EZO-EC-K1",
        });
        should(conf.lights[0]).properties({
            "cycleDays": 1,
            "cycleOff": 11,
            "cycleOn": 13,
            "cycleStartDay": 0,
            "cycleStartTime": "07:00",
            "desc": "Turn on full spectrum lights",
            "event": "event:Full light",
            "name": "White light",
            "pin": 32,
            "spectrum": "Full spectrum",
            "type": "Light:spst:no"
        });
        should(conf.switches[0]).properties({
            "name": "Prime",
            "type": "active:high",
            "desc": "(Prime description)",
            "pin": 37,
            "event": "event:cycle-prime"
        });
        should(conf).properties({
            "mcuHat": "mcu-hat:pmi-auto-hat",
            "hostTimeout": 200,
            "healthPoll": 60,
            "chart": {
                "ecStepSize": "10",
                "tempStepSize": "5",
                "humidityStepSize": 5,
                "showRaw": false
            },
            "camera": "when-lit",
            "heapReboot": 50000000,
        });
    });

});
