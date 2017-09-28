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
            OyaConf.createVesselConfig(0),
            OyaConf.createVesselConfig(1),
        ],
        pinMap: {
            Pump1: 1,
            Fan1: 2,
            Valve1: 3,
        },
        actuators: [
            OyaConf.createActuator(0, 'Pump', {
                vesselIndex: 0,
                activationSink: OyaVessel.EVENT_PUMP1}),
            OyaConf.createActuator(1, 'Fan',{
                vesselIndex: 0,
                activationSink: OyaVessel.EVENT_FAN1}),
            OyaConf.createActuator(2, 'Valve',{
                vesselIndex: 0,
                activationSink: OyaVessel.EVENT_VALVE1}),
            OyaConf.createActuator(3, 'Pump', {
                vesselIndex: 1,
                activationSink: OyaVessel.EVENT_PUMP1}),
            OyaConf.createActuator(4, 'Fan', {
                vesselIndex: 1,
                activationSink: OyaVessel.EVENT_FAN1}),
            OyaConf.createActuator(5, 'Valve',{
                vesselIndex: 1,
                activationSink: OyaVessel.EVENT_VALVE1}),
        ],
    };
    winston.level = 'error';

    it("toJSON() serializes configuration", function() {
        should.deepEqual(new OyaConf().toJSON(), defaultConf);
    });
    it("ctor takes configuration options", function() {
        var opts = {
            name: 'foo',
            tempUnit: 'C',
            vessels: [
                OyaConf.createVesselConfig(0, {
                    name: 'test1',
                    type: 'new-type',
                    startCycle: OyaVessel.CYCLE_FAN,
                    hotCycle: OyaVessel.CYCLE_FAN,
                    enabled: false,
                    fanThreshold: 72,
                    cycles: {
                        [OyaVessel.CYCLE_FAN]: {
                            desc: 'fans are cool',
                            activationSource: OyaVessel.EVENT_FAN1,
                            on: 10,
                            off: 23,
                        }
                    },
            })],
            actuators: [
                OyaConf.createActuator(0, {
                    vesselIndex: 0,
                    activationSink: OyaVessel.EVENT_PUMP1,
                }),
                OyaConf.createActuator(1, {
                    vesselIndex: 0,
                    activationSink: OyaVessel.EVENT_FAN1,
                }),
            ],
        }
        var updatedVessel = OyaConf.createVesselConfig();
        updatedVessel.name = 'test1';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaVessel.CYCLE_FAN;
        updatedVessel.fanThreshold = 72;
        updatedVessel.cycles = {
            [OyaVessel.CYCLE_FAN]: {
                name: "Cool",
                desc: 'fans are cool',
                activationSource: OyaVessel.EVENT_FAN1,
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
            pinMap: defaultConf.pinMap,
            actuators: [
                OyaConf.createActuator(0),
                OyaConf.createActuator(1, {
                    vesselIndex: 0,
                    activationSink: OyaVessel.EVENT_FAN1,
                }),
            ],
        });
    });
    it("createVesselConfig(index,opts) creates a custom timer", function() {
        should.deepEqual(OyaConf.createVesselConfig(), {
            name: "vessel1",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 80,
            maxCycles: 0,
            cycles: defaultCycles,
        });
        should.deepEqual(OyaConf.createVesselConfig(1), {
            name: "vessel2",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 80,
            maxCycles: 0,
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
            cycles: defaultCycles,
        }
        should.deepEqual(OyaConf.createVesselConfig(1, opts), {
            name: "dubba",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_FAN,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 81,
            maxCycles: 2,
            cycles: defaultCycles,
        });
        var opts = { 
            type: 'some-type',
        };
        should.deepEqual(OyaConf.createVesselConfig(2,opts), {
            name: "vessel3",
            type: "OyaVessel",
            enabled: true,
            startCycle: OyaVessel.CYCLE_STANDARD,
            hotCycle: OyaVessel.CYCLE_FAN,
            fanThreshold: 80,
            maxCycles: 0,
            cycles: defaultCycles,
        });
    });
    it("update(opts) updates configuration ", function() {
        var oc = new OyaConf();
        var vessel0 = oc.vessels[0];
        oc.update({
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
        should.equal(vessel0, oc.vessels[0]);

        var updatedVessel = OyaConf.createVesselConfig(1);
        updatedVessel.name = 'test2';
        updatedVessel.enabled = false;
        updatedVessel.startCycle = OyaVessel.CYCLE_FAN;
        updatedVessel.hotCycle = OyaVessel.CYCLE_STANDARD;
        updatedVessel.fanThreshold = 72;
        updatedVessel.cycles = {
            [OyaVessel.CYCLE_FAN]: {
                name: "Cool",
                desc: defaultCycles[OyaVessel.CYCLE_FAN].desc,
                activationSource: OyaVessel.EVENT_PUMP1,
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
            pinMap: defaultConf.pinMap,
            actuators: defaultConf.actuators,
        });
        oc.actuators[0].name.should.equal('Pump1');
        oc.actuators[1].name.should.equal('Fan1');
        oc.actuators[2].name.should.equal('Valve1');
        oc.actuators[3].name.should.equal('Pump2');
        oc.actuators[4].name.should.equal('Fan2');
        oc.actuators[5].name.should.equal('Valve2');

    });
});
