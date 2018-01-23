(typeof describe === 'function') && describe("DbReport", function() {
    const winston = require('winston');
    const should = require("should");
    const DbReport = require("../index").DbReport;
    const SystemFacade = require("../index").SystemFacade;
    const OyaVessel = require('../index').OyaVessel;
    const EventEmitter = require("events");
    const OyaAnn = require('oya-ann');
    const path = require('path');
    const fs = require('fs');

    class MockSystem extends SystemFacade {
        constructor(opts={}) {
            super(opts);
            this.w1Addresses = [ "28-MOCK1", "28-MOCK2" ];
        }
        oneWireRead(address, type) {
            if (type === 'DS18B20') {
                return Promise.resolve({
                    temp: 12345,
                    timestamp: new Date(1999,12,31),
                });
            } 
            return Promise.reject(new Error(`unknown type:${type}`));
        }
    }
    SystemFacade.facade = new MockSystem();

    it("default DbReport is none", function() {
        var dbr = new DbReport();
        should(dbr).properties(DbReport.TYPE_NONE);
    });
    it("ctor defaults can be overridden", function() {
        var dbr = new DbReport(Object.assign(DbReport.TYPE_AM2315, {
            loc: DbReport.LOC_CANOPY,
        }));
        should(dbr.name).equal("AM2315");
        should(dbr.type).equal(DbReport.TYPE_AM2315.type);
        should(dbr.address).equal(0x5c);
        should.deepEqual(dbr.cmdWakeup, [ 3, 0, 4 ]);
        should.deepEqual(dbr.cmdRead, [ 3, 0, 4 ]);
        should.deepEqual(dbr.dataRead, [
            DbReport.BYTE_IGNORE,
            DbReport.BYTE_IGNORE,
            DbReport.BYTE_RH_HIGH,
            DbReport.BYTE_RH_LOW,
            DbReport.BYTE_TEMP_HIGH,
            DbReport.BYTE_TEMP_LOW,
            DbReport.BYTE_CRC_LOW,
            DbReport.BYTE_CRC_HIGH,
        ]);
        should(dbr.tempScale).equal(0.1);
        should(dbr.tempOffset).equal(0);
        should(dbr.humidityScale).equal(0.001);
        should(dbr.humidityOffset).equal(0);
        should(dbr.loc).equal(DbReport.LOC_CANOPY);
        should(dbr.comm).equal(DbReport.COMM_I2C);
        should(dbr.crc).equal(DbReport.CRC_MODBUS);
        should(dbr.vesselIndex).equal(0);
    });
    it("toJSON() only serializes some properties", function() {
        var dbr = new DbReport();
        var json = dbr.toJSON();
        var serializableKeys = [
            'address',
            'addresses',
            'comm',
            'desc',
            'healthTimeout',
            'loc',
            'maxReadErrors',
            'name',
            'readEC',
            'readHumidity',
            'readTemp',
            'type',
            'vesselIndex',
        ];
        should.deepEqual(dbr.serializableKeys, serializableKeys);
        should.deepEqual(Object.keys(json).sort(), [
            'address',
            'addresses',
            'comm',
            'desc',
            'healthTimeout',
            'loc',
            'maxReadErrors',
            'name',
            'readEC',
            'readHumidity',
            'readTemp',
            'type',
            'vesselIndex',

        ]);
    });
    it("monotonic(seq,key) finds longest monotonic contiguous subsequence", function() {
        var seq = [];
        var phase = 135;
        for (var degree=phase; degree<360+phase; degree += 10) {
            seq.push({
                value: Math.sin(degree*Math.PI/180)
            });
        }
        should.deepEqual(DbReport.monotonic(seq,'value'), {
            start: 13, // inclusive
            end: 33, // exclusive
        });
    });
    it("strings are equal", function() {
        var a = 'test';
        var b = 'test';
        var c = 'te';
        c += 'st';
        should(a === 'test').equal(true);
        should(a === 'TEst').equal(false);
        should(a !== 'test').equal(false);
        should(a !== 'TEst').equal(true);
        should(c !== 'test').equal(false);
        should(c !== 'TEst').equal(true);
        should(a === b).equal(true);
        should(a === c).equal(true);
        should(b === c).equal(true);
        should(['a','b']+"").equal("a,b");
        should([a,b,c]+"").equal("test,test,test");
    });
    it("calibrationANN(seq,yKey,xKey) creates calibration ANN for sampled data", function() {
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
        var ann = DbReport.calibrationANN(seq, 'ecInternal', 'tempInternal');

        // fractional readings should correspond with fractions of nominal value independent of temperature
        // over all measured values
        var e = 0.01;
        var percent = 100; // arbitrary nominal value conversion
        seq.forEach(s => {
            [1,1/2,1/4,1/10,1/100].forEach(fraction => {
                var fractionalReading = s.ecInternal * fraction;
                var cv = DbReport.calibratedValue(ann, s.tempInternal, fractionalReading, percent);
                should(cv).approximately(percent * fraction, e);
            });
        });
    });
    it("TESTTESThourlySummary(data,fields) summarizes data by hour for given fields", function() {
        var sqlDataPath = path.join(__dirname, 'ecInternal.json');
        var sqlData = JSON.parse(fs.readFileSync(sqlDataPath));

        // default allows null values 
        var result = DbReport.hourlySummary(sqlData.data);
        should(result.length).equal(71);
        result.forEach(r => {
            should(r).properties(['hr','tempInternal']);
        });
        should(result[result.length-1].hasOwnProperty('ecInternal')).equal(false); // no value

        // only return data having all specified fields
        var result = DbReport.hourlySummary(sqlData.data, ['ecInternal', 'tempInternal']);
        should(result.length).equal(64);
        result.forEach(r => {
            should(r).properties(['hr','ecInternal', 'tempInternal']);
        });
    });
})
