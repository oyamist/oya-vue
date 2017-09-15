(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaConf = require("../index").OyaConf;

    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        startCycle: 'standard',
        tempUnit: 'F',
        fanThreshold: 80,
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
    it("update(opts) updates configuration ", function() {
        var oc = new OyaConf();
        oc.update({
            name: 'foo',
            type: 'bad-type', // ignored
            startCycle: 'fan',
            tempUnit: 'C',
            mist: {
                fan: {
                    on: 30,
                },
            },
        });
        should.deepEqual(oc.toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            startCycle: OyaConf.CYCLE_FAN,
            tempUnit: 'C',
            fanThreshold: 80,
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
