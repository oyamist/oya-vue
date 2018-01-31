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
        var startDate = OyaMist.localDate().toISOString();
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
            name: `Calibration ${startDate.substr(0,10)}`,
            nominal: 100,
            range: {
                field: 'ecInternal',
            },
            unit: OyaMist.NUTRIENT_UNIT.PERCENT,

        });
    });
    it("TESTTESTcalibrations can be serialized", function() {
        var data = [{
            ecAmbient: 1500,
            tempAmbient: 25,
        },{
            ecAmbient: 1510,
            tempAmbient: 26,
        }];
        var startDate = "2017-01-02T10:20:30.123Z";
        var desc = 'KCl 2930 microSiemens@25C';
        var domainField = 'tempAmbient';
        var hours = 12;
        var name = "General Hydroponics PPM Reference Solution";
        var nominal = 1500;
        var rangeField = 'ecAmbient';
        var unit = OyaMist.NUTRIENT_UNIT.PPM;
        var props = { 
            data, startDate, desc, hours, name, nominal, unit,
            domainField,
            rangeField,
        };
        var cal = new Calibration(props);
        var json = JSON.parse(JSON.stringify(cal));

        var cal2 = new Calibration(json);
        should.deepEqual(cal2, cal);
        should.deepEqual(json, {
            data, startDate, desc, hours, name, nominal, unit,
            ann: null,
            domain: {
                field: 'tempAmbient',
            },
            range: {
                field: 'ecAmbient',
            },
        });
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
    it("TESTTESTcalibrate(seq) creates calibration ANN for given data", function() {
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
        var ann = cal.calibrate(seq);

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
    it("TESTTESTcalibrations are serialized", function() {
        var cal = new Calibration({
            rangeField: 'ecInternal',
            domainField: 'tempInternal',
            data: [{
                ecInternal: 1500,
                tempInternal: 25,
            },{
                ecInternal: 1510,
                tempInternal: 26,
            }],
        });
        cal.calibrate();
        var e = 0.1;
        should(cal.isCalibrated).equal(true);
        should(cal.calibratedValue(1500, 25)).equal(100);
        should(cal.calibratedValue(1500, 26)).approximately(99.3,e);

        // (de)serialize
        var cal2 = new Calibration(JSON.parse(JSON.stringify(cal)));
        should(cal2.isCalibrated).equal(true);
        should(cal2.calibratedValue(1500, 25)).equal(100);
        should(cal2.calibratedValue(1500, 26)).approximately(99.3,e);
    });
    it("TESTTESTcalibrate([]) clears the calibration", function() {
        var cal = new Calibration({
            rangeField: 'ecInternal',
            domainField: 'tempInternal',
            data: [{
                ecInternal: 1500,
                tempInternal: 25,
            },{
                ecInternal: 1510,
                tempInternal: 26,
            }],
        });
        cal.calibrate();
        var e = 0.1;
        should(cal.isCalibrated).equal(true);
        should(cal.calibratedValue(1500, 25)).equal(100);
        should(cal.calibratedValue(1500, 26)).approximately(99.3,e);
        should(cal.calibratedValue(1510, 26)).approximately(100,e);

        // clear calibration
        cal.calibrate([]);
        should(cal.isCalibrated).equal(false);
        should(cal.calibratedValue(1500, 25)).equal(1500);
        should(cal.calibratedValue(1500, 26)).equal(1500);
        should(cal.calibratedValue(1510, 26)).equal(1510);
    });
})
