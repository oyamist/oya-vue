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
    } = require("../index");

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

    it("default sensor is none", function() {
        var sensor = new Sensor();
        should(sensor).properties(Sensor.TYPE_NONE);
    });
    it("supports 1-wire DS18B20", function(done) {
        (async function() {
            try {
                Sensor.TYPE_DS18B20.should.properties({
                    name: "DS18B20",
                    comm: "1-wire",
                    addresses: ["28-MOCK1", "28-MOCK2"],
                });
                var sensor = new Sensor(Object.assign(Sensor.TYPE_DS18B20, {
                    address: "28-MOCK2",
                    loc: OyaMist.LOC_INTERNAL,
                }));
                should(sensor).properties({
                    address: "28-MOCK2",
                    addresses: ["28-MOCK1", "28-MOCK2"],
                    type: "DS18B20",
                    comm: "1-wire",
                });
                var r = await sensor.read();
                should.deepEqual(r, {
                    temp: 12.345,
                    timestamp: new Date(1999,12,31),
                });
                should(sensor.data).properties({
                    temp: 12.345,
                });
                done();
            } catch(e) {
                done(e);
            }
        })();
    });
    it("isFieldSource(field) returns true if sensor provides data for field", function() {
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
            loc: OyaMist.LOC_CANOPY,
        }));
        should(sensor.isFieldSource('tempInternal')).equal(false);
        should(sensor.isFieldSource('tempAmbient')).equal(false);
        should(sensor.isFieldSource('tempCanopy')).equal(true);
        should(sensor.isFieldSource('humidityInternal')).equal(false);
        should(sensor.isFieldSource('humidityAmbient')).equal(false);
        should(sensor.isFieldSource('humidityCanopy')).equal(true);
        should(sensor.isFieldSource('ecInternal')).equal(false);
        should(sensor.isFieldSource('ecAmbient')).equal(false);
        should(sensor.isFieldSource('ecCanopy')).equal(false);

        var sensor = new Sensor(Object.assign(Sensor.TYPE_EZO_EC_K1, {
            loc: OyaMist.LOC_AMBIENT,
        }));
        should(sensor.isFieldSource('tempInternal')).equal(false);
        should(sensor.isFieldSource('tempAmbient')).equal(false);
        should(sensor.isFieldSource('tempCanopy')).equal(false);
        should(sensor.isFieldSource('humidityInternal')).equal(false);
        should(sensor.isFieldSource('humidityAmbient')).equal(false);
        should(sensor.isFieldSource('humidityCanopy')).equal(false);
        should(sensor.isFieldSource('ecInternal')).equal(false);
        should(sensor.isFieldSource('ecAmbient')).equal(true);
        should(sensor.isFieldSource('ecCanopy')).equal(false);

    });
    it("health() returns health object", function(done) {
        (async function() {
            try {
                var sensor = new Sensor();
                var healthTimeout = 1; // seconds

                // sensor with no location is null
                should.deepEqual(sensor.health(), {
                    "none@none": null,
                });

                // sensor with no data ever is dead
                var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
                    loc: OyaMist.LOC_CANOPY,
                    healthTimeout,
                }));
                should.deepEqual(sensor.health(), {
                    "AM2315@canopy": "Sensor is completely unresponsive",
                });

                // healthy sensor has recently read data
                var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
                    loc: OyaMist.LOC_CANOPY,
                    healthTimeout,
                    lastRead: new Date(Date.now() - healthTimeout/2 * 1000),
                }));
                should.deepEqual(sensor.health(), {
                    "AM2315@canopy": true,
                });

                // unhealthy sensor has stale data
                var lastRead = new Date(Date.now() - (healthTimeout * 1000 + 1));
                var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
                    loc: OyaMist.LOC_CANOPY,
                    healthTimeout,
                    lastRead,
                }));
                should(sensor.health(), {
                    "AM2315@canopy": `Sensor is failing. Last read:${lastRead.toISOString()}`,
                });

                // a read fault is fatal
                var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
                    loc: OyaMist.LOC_CANOPY,
                    healthTimeout,
                    maxReadErrors: 2,
                }));
                try { var promise = await sensor.read(); } catch(e) { /* ignore */ }
                should.deepEqual(sensor.health(), {
                    "AM2315@canopy": "Sensor is completely unresponsive",
                });
                try { var promise = await sensor.read(); } catch(e) { /* ignore */ }
                should.deepEqual(sensor.health(), {
                    "AM2315@canopy": "Sensor AM2315@canopy disabled (too many errors) [E2]",
                });
                done();
            } catch(e) {
                winston.error(e.stack);
                done(e);
            }
        })();
    });
    it("ctor defaults can be overridden", function() {
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
            loc: OyaMist.LOC_CANOPY,
        }));
        should(sensor.name).equal("AM2315");
        should(sensor.type).equal(Sensor.TYPE_AM2315.type);
        should(sensor.address).equal(0x5c);
        should.deepEqual(sensor.cmdWakeup, [ 3, 0, 4 ]);
        should.deepEqual(sensor.cmdRead, [ 3, 0, 4 ]);
        should.deepEqual(sensor.dataRead, [
            Sensor.BYTE_IGNORE,
            Sensor.BYTE_IGNORE,
            Sensor.BYTE_RH_HIGH,
            Sensor.BYTE_RH_LOW,
            Sensor.BYTE_TEMP_HIGH,
            Sensor.BYTE_TEMP_LOW,
            Sensor.BYTE_CRC_LOW,
            Sensor.BYTE_CRC_HIGH,
        ]);
        should(sensor.tempScale).equal(0.1);
        should(sensor.tempOffset).equal(0);
        should(sensor.humidityScale).equal(0.001);
        should(sensor.humidityOffset).equal(0);
        should(sensor.loc).equal(OyaMist.LOC_CANOPY);
        should(sensor.comm).equal(Sensor.COMM_I2C);
        should(sensor.crc).equal(Sensor.CRC_MODBUS);
    });
    it("crc8() computes 8-bit CRC", function() {
        var buf = Buffer.from([0xBE,0xEF]);
        should(Sensor.crc8(0xff, 0x31, buf, 0, 2)).equal(0x92);
        var buf = Buffer.from([0x01,0x02]);
        should(Sensor.crc8(0x00, 0x1d, buf, 0)).equal(0x76);
        var buf = Buffer.from([0x7e, 0x01,0x02]);
        should(Sensor.crc8(0x00, 0x1d, buf, 1, 2)).equal(0x76);
        var buf = Buffer.from([0x5c]);
        should(Sensor.crc8(0x00, 0x07, buf)).equal(0x93);
        var buf = Buffer.from([0x67, 0xde, 0x61, 0xbd, 0x98, 0xd0]);
        should(Sensor.crc8(0xff, 0x31, buf, 0, 2)).equal(buf[2]);
        should(Sensor.crc8(0xff, 0x31, buf, 3, 2)).equal(buf[5]);
    });
    it("crcModbus() computes Modbus CRC-16 value", function() {
        var buf = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3]);
        should(Sensor.crcModbus(buf)).equal(37185);
        var buf = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        should(Sensor.crcModbus(buf,buf.length-2)).equal(37185);
        should(Sensor.crcModbus(buf)).equal(0); // zero if CRC data is included

        var buf = Buffer.from([0x03,0x04,0x01,0x3f,0x00,0xc1]);
        should(Sensor.crcModbus(buf)).equal(34817);
        var buf = Buffer.from([0x03,0x04,0x01,0x3f,0x00,0xc1,0x01,0x88]);
        should(Sensor.crcModbus(buf,buf.length-2)).equal(34817);
        should(Sensor.crcModbus(buf)).equal(0); // zero if CRC data is included
    });
    it("parseData() parses SHT31-DIS", function() {
        var sensor = new Sensor(Sensor.TYPE_SHT31_DIS, {
            loc: OyaMist.LOC_INTERNAL,
        });

        var buf = Buffer.from([0x65, 0x44, 0x5a, 0x84, 0x3e, 0xfb]);
        var data = sensor.parseData(buf);
        data.temp.should.approximately(24.2, 0.1); // Centigrade
        data.humidity.should.approximately(0.517, 0.001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 1);
        should.throws(() => {
            var buf = Buffer.from([0x65, 0x44, 0x5a, 0x84, 0x3e, 0xf0]); // bad crc
            var data = sensor.parseData(buf);
        }, function(e) {
            should(e.message).match(/bad CRC/);
            return true;
        });
    });
    it("parseData() parses data buffer", function() {
        var buf = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        var emitter = new EventEmitter();
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
            emitter,
            loc: OyaMist.LOC_INTERNAL,
        }));
        should(sensor.emitter).equal(emitter);
        var temp_event = null;
        var temp_eventValue = null;
        emitter.on(OyaMist.SENSE_TEMP_INTERNAL, (value) => {
            temp_event = OyaMist.SENSE_TEMP_INTERNAL;
            temp_eventValue = value;
        });

        var humidity_event = null;
        var humidity_eventValue = null;
        emitter.on(OyaMist.SENSE_HUMIDITY_INTERNAL, (value) => {
            humidity_event = OyaMist.SENSE_HUMIDITY_INTERNAL;
            humidity_eventValue = value;
        });

        should.deepEqual(sensor.data, {
            temp: null,
            humidity: null,
        });

        // parse data, update sensor and fire events
        var data = sensor.parseData(buf);
        data.temp.should.approximately(19.5, 0.01); // Centigrade
        data.humidity.should.approximately(.323, 0.0001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 2);
        should.deepEqual(sensor.data, data);
        should(temp_event).equal(OyaMist.SENSE_TEMP_INTERNAL);
        should(temp_eventValue).equal(data.temp);
        should(humidity_event).equal(OyaMist.SENSE_HUMIDITY_INTERNAL);
        should(humidity_eventValue).equal(data.humidity);

        // temp events are suppressed if readTemp is false
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315,{
            emitter,
            loc: OyaMist.LOC_INTERNAL,
            readTemp: false,
        }));
        temp_event = null;
        temp_eventValue = null;
        humidity_event = null;
        humidity_eventValue = null;
        var data = sensor.parseData(buf);
        should(data.temp).equal(null);
        data.humidity.should.approximately(.323, 0.0001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 3);
        should.deepEqual(sensor.data, data);
        should(temp_event).equal(null); // no event
        should(temp_eventValue).equal(null); // no event
        should(humidity_event).equal(OyaMist.SENSE_HUMIDITY_INTERNAL);
        should(humidity_eventValue).equal(data.humidity);

        // humidity events are suppressed if readHumidity is false
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315,{
            emitter,
            loc: OyaMist.LOC_INTERNAL,
            readHumidity: false,
        }));
        temp_event = null;
        temp_eventValue = null;
        humidity_event = null;
        humidity_eventValue = null;
        var data = sensor.parseData(buf);
        data.temp.should.approximately(19.5, 0.01); // Centigrade
        should(data.humidity).equal(null);
        should(data.timestamp - new Date()).approximately(0, 3);
        should.deepEqual(sensor.data, data);
        should(temp_event).equal(OyaMist.SENSE_TEMP_INTERNAL);
        should(temp_eventValue).equal(data.temp);
        should(humidity_event).equal(null);
        should(humidity_eventValue).equal(null);

        // events are suppressed if emitter is not provided
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315,{
            loc: OyaMist.LOC_INTERNAL,
        }));
        var data = sensor.parseData(buf); 
        data.temp.should.approximately(19.5, 0.01); // Centigrade
        data.humidity.should.approximately(.323, 0.0001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 1);
        should.deepEqual(sensor.data, data);

        var buf = Buffer.from([0xFF,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        should.throws(() => {
            var data = sensor.parseData(buf);
        });
        should.deepEqual(sensor.data, data); // last good data
    });
    it("TESTTESTread() returns a promise resolved with data read", function(done) {
        var async = function*() {
            try {
                // The AM2315 sensor is an i2c sensor. 
                // Client provides i2c read/write implementations.
                var testData = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
                var i2cOut = [];
                var msRead = null;
                var readDelay = 15;
                var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
                    readDelay, // some sensors such as SHT31-DIS have a read delay
                    loc: OyaMist.LOC_INTERNAL,
                    maxReadErrors: 1,
                    i2cRead: (addr, buf) => {
                        msRead = Date.now();
                        testData.copy(buf);
                    },
                    i2cWrite: (addr, buf) => {
                        i2cOut.push(buf);
                        return 0; // success
                    },
                }));

                // read() returns a promise that resolves to the data read
                var msNow = Date.now();
                var data = yield sensor.read().then(r=>async.next(r)).catch(e=>async.throw(e));
                should(msRead == null).equal(false);
                should(msRead - msNow).above(readDelay-2);
                should(data.temp).approximately(19.5, 0.01);
                should.deepEqual(i2cOut[0], Buffer.from([0x03, 0x00, 0x04])); // wakeup
                should.deepEqual(i2cOut[1], Buffer.from([0x03, 0x00, 0x04])); // read
                should(i2cOut.length).equal(2);
                should(data.humidity).approximately(.323, 0.0001);
                should(data.timestamp - Date.now()).approximately(0,8);
                should.deepEqual(data, sensor.data);
                should(sensor.passFail.passRate()).equal(1);

                // read() rejects bad data 5x then doesn't read anymore
                should(sensor.readErrors).equal(0);
                should(sensor.fault).equal(null);
                var testData = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x90]); // bad crc
                var data = yield sensor.read().then(r=>async.throw(new Error("never happen")))
                    .catch(e=>async.next(e));
                should(data).instanceOf(Error);
                should(data.message).match(/CRC/);
                should(sensor.readErrors).equal(1);
                should(sensor.fault.message).match(/possible sensor outage/);
                should(sensor.passFail.passRate()).equal(1/2);

                // fault is cleared on successful read
                var testData = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
                var data = yield sensor.read().then(r=>async.next(r)).catch(e=>async.throw(e));
                should(sensor.fault).equal(null);
                should.deepEqual(data, sensor.data);
                should(sensor.passFail.passRate()).equal(2/3);

                // readErrors is set to zero on success
                sensor.clear();  // clear fault and permit reading
                var data = yield sensor.read().then(r=>async.next(r)).catch(e=>async.throw(e));
                should(sensor.readErrors).equal(0);
                should(data.temp).approximately(19.5, 0.01);
                should(sensor.passFail.passRate()).equal(1/1);

                done();
            } catch(err) {
                winston.error(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("calibrateDry() performs dry calibration", function(done) {
        var sensor = new Sensor();
        should.throws(()=>{
            sensor.calibrateDry();
        });

        var i2cOut = [];
        var sensor = new Sensor(Object.assign(Sensor.TYPE_EZO_EC_K1, {
            loc: OyaMist.LOC_INTERNAL,
            i2cWrite: (addr, buf) => {
                i2cOut.push(buf);
                return 0; // success
            },
        }));
        sensor.calibrateDry();
        should(i2cOut.join('')).equal("Cal,dry");

        done();
    });
    it("read() works for Altas Scientific EZO EC", function(done) {
        var async = function*() {
            try {
                var testData = Buffer.from([0x01,0x31,0x38,0x36,0x32,0x00,0x00]);
                var i2cOut = [];
                var msRead = null;
                var readDelay = 15;
                var sensor = new Sensor(Object.assign(Sensor.TYPE_EZO_EC_K1, {
                    readDelay, // some sensors such as SHT31-DIS have a read delay
                    loc: OyaMist.LOC_INTERNAL,
                    maxReadErrors: 1,
                    i2cRead: (addr, buf) => {
                        msRead = Date.now();
                        testData.copy(buf);
                    },
                    i2cWrite: (addr, buf) => {
                        i2cOut.push(buf);
                        return 0; // success
                    },
                }));

                // read() high magnitude ####
                var msNow = Date.now();
                var data = yield sensor.read().then(r=>async.next(r)).catch(e=>async.throw(e));
                should(msRead == null).equal(false);
                should(msRead - msNow).above(readDelay-2);
                should(data.ec).approximately(1862, 0.01);
                should(data.timestamp - Date.now()).approximately(0,8);
                should.deepEqual(data, sensor.data);

                // read() low magnitude ###.#
                var msNow = Date.now();
                testData = Buffer.from([0x01,0x31,0x38,0x36,0x2e,0x32,0x00]);
                var data = yield sensor.read().then(r=>async.next(r)).catch(e=>async.throw(e));
                should(msRead == null).equal(false);
                should(msRead - msNow).above(readDelay-2);
                should(data.ec).approximately(186.2, 0.01);
                should(data.timestamp - Date.now()).approximately(0,8);
                should.deepEqual(data, sensor.data);

                done();
            } catch(err) {
                winston.error(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("heat(enable) turns heater on/off", function(done) {
        var async = function*() {
            try {
                var i2cOut = [];
                var msRead = null;
                var testData = Buffer.from([0x65, 0x44, 0x5a, 0x84, 0x3e, 0xfb]);
                var sensor = new Sensor(Object.assign(Sensor.TYPE_SHT31_DIS, {
                    loc: OyaMist.LOC_AMBIENT,
                    i2cRead: (addr, buf) => {
                        msRead = Date.now();
                        testData.copy(buf);
                    },
                    i2cWrite: (addr, buf) => {
                        i2cOut.push(buf);
                        return 0; // success
                    },
                }));

                yield sensor.heat(true).then(r=>async.next(r)).catch(e=>async.throw(e));
                should.deepEqual(i2cOut[0], Buffer.from([0x30, 0x6D])); // heater on
                should(i2cOut.length).equal(1);

                yield sensor.heat(false).then(r=>async.next(r)).catch(e=>async.throw(e));
                should.deepEqual(i2cOut[1], Buffer.from([0x30, 0x66])); // heater off
                should(i2cOut.length).equal(2);

                done();
            } catch(err) {
                done(err);
            }
        }();
        async.next();
    });
    it("update(sensor, ...opts) updates sensor properties", function() {
        var a = {};
        should(a.x === null).equal(false);
        should(a.x == null).equal(true);
        should(a.x === undefined).equal(true);
        should(Object.hasOwnProperty("x")).equal(false);
        should(JSON.stringify(a)).equal('{}');

        var sensor = new Sensor();

        // update does not change sensor
        var sensorExpected = sensor.toJSON();
        should(Sensor.update(sensor)).equal(sensor);
        should.deepEqual(sensor.toJSON(), sensorExpected);

        // sensor can change type
        var sensor = new Sensor(Sensor.TYPE_SHT31_DIS);
        var sensorExpected = new Sensor(Sensor.TYPE_DS18B20);
        should(Sensor.update(sensor, {
            type: Sensor.TYPE_DS18B20.type
        })).equal(sensor);
        should.deepEqual(sensor, sensorExpected);
        should.deepEqual(sensor.addresses, ["28-MOCK1", "28-MOCK2"]);

        // changing sensor type does not affect critical properties
        var date = new Date();
        var sensor = new Sensor(Sensor.TYPE_SHT31_DIS, {
            loc: OyaMist.LOC_CANOPY,
            lastRead: date,
        });
        var sensorExpected = new Sensor(Sensor.TYPE_DS18B20, {
            loc: OyaMist.LOC_CANOPY,
            lastRead: date,
        });
        should(Sensor.update(sensor, {
            type: Sensor.TYPE_DS18B20.type,
        })).equal(sensor);
        should.deepEqual(sensor, sensorExpected);
        should(sensor).properties({
            addresses: ["28-MOCK1", "28-MOCK2"],
        });
        should(sensor.toJSON()).properties({
            addresses: ["28-MOCK1", "28-MOCK2"],
        });
    });
    it("toJSON() only serializes some properties", function() {
        var sensor = new Sensor();
        var json = sensor.toJSON();
        var serializableKeys = [
            'address',
            'addresses',
            'cmdCalDry',
            'comm',
            'desc',
            'healthTimeout',
            'loc',
            'maxReadErrors',
            'name',
            'readEC',
            'readHumidity',
            'readTemp',
            'tempCal',
            'type',
        ];
        should.deepEqual(sensor.serializableKeys, serializableKeys);
        should.deepEqual(Object.keys(json).sort(), [
            'address',
            'addresses',
            'cmdCalDry',
            'comm',
            'desc',
            'healthTimeout',
            'loc',
            'maxReadErrors',
            'name',
            'readEC',
            'readHumidity',
            'readTemp',
            'tempCal',
            'type',

        ]);
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
    it("calibrate(...) cannot calibrate some sensors", function() {
        var seq = [];
        var s = new Sensor(Sensor.TYPE_DS18B20);
        should.throws(() => s.calibrate(seq));
        var s = new Sensor(Sensor.TYPE_SHT31_DIS);
        should.throws(() => s.calibrate(seq));
        var s = new Sensor(Sensor.TYPE_AM2315);
        should.throws(() => s.calibrate(seq));
    });
    it("tempQuality(temps) returns quality of calibration temperature range", function() {
        // no data => no quality
        should(Sensor.tempQuality()).equal(0);
        should(Sensor.tempQuality([])).equal(0);

        should(Sensor.tempQuality([13])).equal(13); // A single data point is abysmal quality
        should(Sensor.tempQuality([13,12,13])).equal(63); // 1C is poor quality
        should(Sensor.tempQuality([1.5,3.5,2])).equal(83); // 2C is acceptable quality
        should(Sensor.tempQuality([-1.5,2.5,2])).equal(97); // 3C is good quality
        should(Sensor.tempQuality([28,24])).equal(97); // 4C is good quality
        should(Sensor.tempQuality([24,29])).equal(100); // 5C is top quality
        should(Sensor.tempQuality([24,30])).equal(100); // 6C is top excellent quality
        should(Sensor.tempQuality([31,24])).equal(100); // 7C is top quality

        should(Sensor.tempQuality([18.183,14.51])).equal(96); // actual data 
    });
    it("valueForTemp(value,temp) returns temperature compensated value", function() {
        var seq = [];
        var s = new Sensor(Object.assign(Sensor.TYPE_EZO_EC_K1,{
            loc: OyaMist.LOC_INTERNAL,
        }));

        // uncalibrated sensor 
        should(s.valueForTemp(123, 17)).equal(123);
        should(s.valueForTemp(400, 35)).equal(400);

        // empty data sequence -- no temp comp
        var opts = {
            nominal: 1000,
            startDate: new Date('2018-01-02T10:20:30.000Z'),
            hours: 22.5,
            tempMin: null,
            tempMax: null,
        };
        var r = s.calibrateTemp(seq, opts);
        should(r).properties({
            nominal: 1000,
            startDate: '2018-01-02T10:20:30.000Z',
            hours: 22.5,
            domain: {
                field: 'tempInternal',
                min: null,
                max: null,
            }
        });
        var e = 0.1;
        should(s.valueForTemp(400, 35)).approximately(400,e);

        // no data sequence -- no temp comp
        var r = s.calibrateTemp();
        should(r).properties({
            nominal: 100,
            hours: 24,
            domain: {
                field: 'tempInternal',
                min: null,
                max: null,
            }
        });
        should(s.valueForTemp(400, 35)).approximately(400,e);

        // single temperature calibration scales sensor value independent of temperature
        seq = [];
        seq.push({
            tempInternal: 17,
            ecInternal: 400,
        })
        var r = s.calibrateTemp(seq);
        should(r).properties({
            nominal: 100,
            hours: 24,
            domain: {
                field: 'tempInternal',
                min: 17,
                max: 17,
            }
        });
        var e = 0.1;
        should(s.valueForTemp(400, 17)).approximately(100,e);
        should(s.valueForTemp(400, 18)).approximately(100,e);
        should(s.valueForTemp(400, 23)).approximately(100,e);
        should(s.valueForTemp(200, 23)).approximately(50,e);

        // two temperature values provide a linear temperature dependency
        seq = [];
        seq.push({
            tempInternal: 17,
            ecInternal: 400,
        });
        seq.push({
            tempInternal: 18,
            ecInternal: 410,
        });
        var r = s.calibrateTemp(seq);
        should(r).properties({
            nominal: 100,
            hours: 24,
            domain: {
                field: 'tempInternal',
                min: 17,
                max: 18,
            },
        });
        var e = 0.1;
        should(s.valueForTemp(400, 17)).approximately(100,e);
        should(s.valueForTemp(410, 18)).approximately(100,e);
        should(s.valueForTemp(420, 19)).approximately(100,e);
    });
    it("calibrations are serializable", function() {
        var seq = [];
        var s = new Sensor(Object.assign(Sensor.TYPE_EZO_EC_K1,{
            loc: OyaMist.LOC_INTERNAL,
        }));

        // two temperature values provide a linear temperature dependency
        seq = [];
        seq.push({
            tempInternal: 17,
            ecInternal: 400,
        });
        seq.push({
            tempInternal: 18,
            ecInternal: 410,
        });
        var r = s.calibrateTemp(seq);
        should(r).properties({
            nominal: 100,
            hours: 24,
            domain: {
                field: 'tempInternal',
                min: 17,
                max: 18,
            },
        });
        should(s.tempCal.isCalibrated).equal(true);
        var json = JSON.parse(JSON.stringify(s));
        var s2 = new Sensor(json);
        var e = 0.1;
        should(s2.valueForTemp(400, 17)).approximately(100,e);
        should(s2.valueForTemp(410, 18)).approximately(100,e);
        should(s2.valueForTemp(420, 19)).approximately(100,e);

        var s3 = new Sensor();
        Sensor.update(s3,json); 
        s3.tempCal.isCalibrated.should.equal(true);
        should(s3.valueForTemp(400, 17)).approximately(100,e);
        should(s3.valueForTemp(410, 18)).approximately(100,e);
        should(s3.valueForTemp(420, 19)).approximately(100,e);
    });
})
