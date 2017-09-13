(typeof describe === 'function') && describe("OyaConf", function() {
    const should = require("should");
    const winston = require('winston');
    const OyaConf = require('../src/oya-conf');

    const defaultConf = {
        name: 'test',
        type: 'OyaConf',
        cycle: 'standard',
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

    it("has a default configuration", function() {
        should.deepEqual(new OyaConf().toJSON(), defaultConf);
    });
    it("contructor takes configuration options", function() {
        var opts = {
            name: 'foo',
            tempUnit: 'C',
            cycle: 'fan',
            mist: {
                fan: {
                    on: 30,
                },
            },
        }
        should.deepEqual(new OyaConf(opts).toJSON(), {
            name: 'foo',
            type: 'OyaConf',
            cycle: OyaConf.CYCLE_FAN,
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
