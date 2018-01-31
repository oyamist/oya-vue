(typeof describe === 'function') && describe("Sensor", function() {
    const winston = require('winston');
    const should = require("should");
    const EventEmitter = require("events");
    const path = require('path');
    const fs = require('fs');
    const {
        OyaAnn,
        OyaMist,
        OyaVessel,
        Sensor,
        SystemFacade,
        Calibration,
    } = require("../index");

    it("TESTTESTdefault calibration is for ec/internal", function() {
        var startDate = OyaMist.localDate();
        var cal = new Calibration();
        should.deepEqual(cal.toJSON(), {
            ann: null,
            startDate,
            data: [],
            desc: '',
            domain: {
                field: 'tempInternal',
            },
            hours: 24,
            name: `Calibration ${startDate.toISOString().substr(0,10)}`,
            nominal: 100,
            range: {
                field: 'ecInternal',
            },
            unit: OyaMist.NUTRIENT_UNIT.PERCENT,

        });
    });
    it("TESTTESTcalibrations can be serialized", function() {
        var props = {
            ann: [],
            data: [{
                ecAmbient: 100,
                tempAmbient: 17,
            },{
                ecAmbient: 110,
                tempAmbient: 18,
            }],
            startDate: "2017-01-02T10:20:30.123Z",
            desc: 'KCl 2930 microSiemens@25C',
            domain: {
                field: 'tempAmbient',
            },
            hours: 12,
            name: "General Hydroponics PPM Reference Solution",
            nominal: 1500,
            range: {
                field: 'ecAmbient',
            },
            unit: OyaMist.NUTRIENT_UNIT.PPM,

        };
        var cal = new Calibration(props);
        var json = JSON.parse(JSON.stringify(cal));

        var cal2 = new Calibration(json);
        should.deepEqual(cal2, cal);
        should.deepEqual(props, json);
    });
    it("TESTTESTmonotonic(seq,key) finds longest monotonic contiguous subsequence", function() {
        var seq = [];
        var phase = 135;
        for (var degree=phase; degree<360+phase; degree += 10) {
            seq.push({
                value: Math.sin(degree*Math.PI/180)
            });
        }
        should.deepEqual(Calibration.monotonic(seq,'value'), {
            start: 13, // inclusive
            end: 33, // exclusive
        });

        //
        seq = [];
        for (var t=17; t < 25; t++) {
            seq.push({
                upvalue: t,
                downvalue: -t,
                updown: t < 20 ? t : -t,
                downup: t < 20 ? -t : t,
            });
        }
        should.deepEqual(Calibration.monotonic(seq,'upvalue'), {
            start: 0, // inclusive
            end: seq.length, // exclusive
        });
        should.deepEqual(Calibration.monotonic(seq,'downvalue'), {
            start: 0, // inclusive
            end: seq.length, // exclusive
        });
        should.deepEqual(Calibration.monotonic(seq,'updown'), {
            start: 2, // inclusive
            end: seq.length, // exclusive
        });
        should.deepEqual(Calibration.monotonic(seq,'downup'), {
            start: 2, // inclusive
            end: seq.length, // exclusive
        });
    });
    it("TESTTESTcreateNetwork(seq) creates calibration ANN for given data", function() {
        // create sample data for diurnal temperature cycle
        // For testing, we use a linear relationship, but non-linear relationships can
        // also be handled
        var seq = [];
        for (var degree=0; degree<360; degree += 10) {
            var v = Math.sin(degree*Math.PI/180);
            var temp = 2*v + 18; // centigrade
            var ec = 20*v + 400; // microsiemens
            seq.push({
                tempInternal: temp,
                ecInternal: ec,
            });
        }

        // create artificial neural network for calibration from sample data
        // Calibration is based on the longest monotonic subsequence
        // of sampled temperatures to avoid hysteresis effects which
        // affect EC probes.
        var cal = new Calibration({
            range: {
                field: 'ecInternal',
            },
            domain: {
                field: 'tempInternal',
            },
        });
        var ann = cal.createNetwork(seq);

        // fractional readings should correspond with fractions of nominal value independent of temperature
        // over all measured values
        var e = 0.01;
        var percent = 100; // arbitrary nominal value conversion
        seq.forEach(s => {
            [1,1/2,1/4,1/10,1/100].forEach(fraction => {
                var fractionalReading = s.ecInternal * fraction;
                var cv = cal.calibratedValue(fractionalReading, s.tempInternal, ann);
                should(cv).approximately(percent * fraction, e);
            });
        });

        // min/max values are calculated for range and domain
        should.deepEqual(cal.range, {
            field: 'ecInternal',
            max: 420,
            min: 380,
        });
        should.deepEqual(cal.domain, {
            field: 'tempInternal',
            max: 20,
            min: 16,
        });
    });
})
