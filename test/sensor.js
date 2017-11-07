(typeof describe === 'function') && describe("Sensor", function() {
    const winston = require('winston');
    const should = require("should");
    const Sensor = exports.Sensor || require("../index").Sensor;
    const OyaVessel = require('../index').OyaVessel;
    const EventEmitter = require("events");

    it("default sensor is none", function() {
        var sensor = new Sensor();
        should(sensor).properties(Sensor.TYPE_NONE);
    });
    it("ctor defaults can be overridden", function() {
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
            loc: Sensor.LOC_EXTERNAL,
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
        should(sensor.humidityScale).equal(0.1);
        should(sensor.humidityOffset).equal(0);
        should(sensor.pin).equal(null);
        should(sensor.loc).equal(Sensor.LOC_EXTERNAL);
        should(sensor.comm).equal(Sensor.COMM_I2C);
        should(sensor.crc).equal(Sensor.CRC_MODBUS);
        should(sensor.vesselIndex).equal(0);
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
        var sensor = new Sensor(Sensor.TYPE_SHT31_DIS);

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
        }));
        should(sensor.emitter).equal(emitter);
        var temp_event = null;
        var temp_eventValue = null;
        emitter.on(OyaVessel.SENSE_TEMP_INTERNAL, (value) => {
            temp_event = OyaVessel.SENSE_TEMP_INTERNAL;
            temp_eventValue = value;
        });

        var humidity_event = null;
        var humidity_eventValue = null;
        emitter.on(OyaVessel.SENSE_HUMIDITY_INTERNAL, (value) => {
            humidity_event = OyaVessel.SENSE_HUMIDITY_INTERNAL;
            humidity_eventValue = value;
        });

        should.deepEqual(sensor.data, {
            temp: null,
            humidity: null,
        });

        // parse data, update sensor and fire events
        var data = sensor.parseData(buf);
        data.temp.should.approximately(19.5, 0.01); // Centigrade
        data.humidity.should.approximately(32.3, 0.0001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 1);
        should.deepEqual(sensor.data, data);
        should(temp_event).equal(OyaVessel.SENSE_TEMP_INTERNAL);
        should(temp_eventValue).equal(data.temp);
        should(humidity_event).equal(OyaVessel.SENSE_HUMIDITY_INTERNAL);
        should(humidity_eventValue).equal(data.humidity);

        // temp events are suppressed if readTemp is false
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315,{
            emitter,
            readTemp: false,
        }));
        temp_event = null;
        temp_eventValue = null;
        humidity_event = null;
        humidity_eventValue = null;
        var data = sensor.parseData(buf);
        should(data.temp).equal(null);
        data.humidity.should.approximately(32.3, 0.0001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 3);
        should.deepEqual(sensor.data, data);
        should(temp_event).equal(null); // no event
        should(temp_eventValue).equal(null); // no event
        should(humidity_event).equal(OyaVessel.SENSE_HUMIDITY_INTERNAL);
        should(humidity_eventValue).equal(data.humidity);

        // humidity events are suppressed if readHumidity is false
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315,{
            emitter,
            readHumidity: false,
        }));
        temp_event = null;
        temp_eventValue = null;
        humidity_event = null;
        humidity_eventValue = null;
        var data = sensor.parseData(buf);
        data.temp.should.approximately(19.5, 0.01); // Centigrade
        should(data.humidity).equal(null);
        should(data.timestamp - new Date()).approximately(0, 1);
        should.deepEqual(sensor.data, data);
        should(temp_event).equal(OyaVessel.SENSE_TEMP_INTERNAL);
        should(temp_eventValue).equal(data.temp);
        should(humidity_event).equal(null);
        should(humidity_eventValue).equal(null);

        // events are suppressed if emitter is not provided
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315,{}));
        var data = sensor.parseData(buf); 
        data.temp.should.approximately(19.5, 0.01); // Centigrade
        data.humidity.should.approximately(32.3, 0.0001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 1);
        should.deepEqual(sensor.data, data);

        var buf = Buffer.from([0xFF,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        should.throws(() => {
            var data = sensor.parseData(buf);
        });
        should.deepEqual(sensor.data, data); // last good data
    });
    it("read() returns a promise resolved with data read", function(done) {
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
                should(msRead - msNow).above(readDelay-1);
                should(data.temp).approximately(19.5, 0.01);
                should.deepEqual(i2cOut[0], Buffer.from([0x03, 0x00, 0x04])); // wakeup
                should.deepEqual(i2cOut[1], Buffer.from([0x03, 0x00, 0x04])); // read
                should(i2cOut.length).equal(2);
                should(data.humidity).approximately(32.3, 0.01);
                should(data.timestamp - Date.now()).approximately(0,5);
                should.deepEqual(data, sensor.data);

                // read() rejects bad data 5x then doesn't read anymore
                should(sensor.readErrors).equal(0);
                should(sensor.fault).equal(null);
                var testData = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x90]); // bad crc
                var data = yield sensor.read().then(r=>async.throw(new Error("never happen")))
                    .catch(e=>async.next(e));
                should(data).instanceOf(Error);
                should(data.message).match(/CRC/);
                should(sensor.readErrors).equal(1);
                should(sensor.fault.message).match(/too many errors/);

                // read is disabled if fault is not null
                var testData = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
                var data = yield sensor.read().then(r=>async.throw(new Error("never happen")))
                    .catch(e=>async.next(e));
                should(data).equal(sensor.fault);

                // readErrors is set to zero on success
                sensor.clear();  // clear fault and permit reading
                var data = yield sensor.read().then(r=>async.next(r)).catch(e=>async.throw(e));
                should(sensor.readErrors).equal(0);
                should(data.temp).approximately(19.5, 0.01);

                done();
            } catch(err) {
                console.log(err.stack);
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
})
