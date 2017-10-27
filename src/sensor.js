(function(exports) {
    const OyaVessel = require('./oya-vessel');

    class Sensor {
        constructor(opts = {}) {
            if (opts.hasOwnProperty('type')) {
                if (0>Sensor.TYPE_LIST.findIndex(ud => (ud.type === opts.type))) {
                    throw new Error(`Unknown type:${opts.type}`);
                }
                var type = opts.type;
            } else {
                var type = Sensor.TYPE_NONE.type;
            }
            var sensorDefault = Sensor.TYPE_LIST.filter(
                ud => (ud.type===type))[0] || {};

            // serializable toJSON() properties
            this.type = type;
            this.name = opts.name || sensorDefault.name;
            this.vesselIndex = opts.vesselIndex == null ? sensorDefault.vesselIndex : opts.vesselIndex;
            this.desc = opts.desc || sensorDefault.desc || 'generic sensor';
            this.pin = opts.pin == null ? sensorDefault.pin : opts.pin;
            this.comm = opts.comm || sensorDefault.comm;
            this.loc = opts.loc || sensorDefault.loc;
            this.cmdWakeup = opts.cmdWakeup || sensorDefault.cmdWakeup;
            this.cmdRead = opts.cmdRead || sensorDefault.cmdRead;
            this.dataRead = opts.dataRead || sensorDefault.dataRead;
            this.address = opts.address || sensorDefault.address;
            this.tempScale = opts.tempScale == null ? sensorDefault.tempScale : opts.tempScale;
            this.tempOffset = opts.tempOffset == null ? sensorDefault.tempOffset : opts.tempOffset;
            this.humidityScale = opts.humidityScale == null ? sensorDefault.humidityScale : opts.humidityScale;
            this.humidityOffset = opts.humidityOffset == null ? sensorDefault.humidityOffset : opts.humidityOffset;
            this.readTemp = opts.readTemp == null ? sensorDefault.readTemp : opts.readTemp;
            this.readHumidity = opts.readHumidity == null ? sensorDefault.readHumidity : opts.readHumidity;
            this.readDelay = opts.readDelay || sensorDefault.readDelay;
            this.addresses = opts.addresses || [];
            this.crc = opts.crc || sensorDefault.crc;
            this.crcInit = opts.crcInit || sensorDefault.crcInit;
            this.crcPoly = opts.crcPoly || sensorDefault.crcPoly;
            this.data = {
                temp: null,
                humidity: null,
            };
            this.serializableKeys = Object.keys(this);

            // other properties
            this.emitter = opts.emitter;
            this.i2cRead = opts.i2cRead || ((i2cAddr, dataBuf) => { 
                throw new Error("no I2C driver");
            });
            this.i2cWrite = opts.i2cWrite || ((i2cAddr, dataBuf) => {
                throw new Error("no I2C driver");
            });
        }

        static get TYPE_SHT31_DIS() {
            return {
                type: "SHT31-DIS",
                name: "SHT31-DIS",
                desc: "SHT31-DIS Temperature/Humidity I2C sensor",
                comm: Sensor.COMM_I2C,
                loc: Sensor.LOC_INTERNAL,
                cmdWakeup: null, 
                cmdRead: [0x24, 0x00],
                crc: Sensor.CRC_8_FF_31,
                crcInit: 0xff,
                crcPoly: 0x31,
                vesselIndex: 0,
                pin: null,
                dataRead: [
                    Sensor.BYTE_TEMP_HIGH,
                    Sensor.BYTE_TEMP_LOW,
                    Sensor.BYTE_CRC2,
                    Sensor.BYTE_RH_HIGH,
                    Sensor.BYTE_RH_LOW,
                    Sensor.BYTE_CRC2,
                ],
                readDelay: 15, // 15ms high precision sensing delay
                tempScale: 175.0/65535,
                tempOffset: -45,
                humidityScale: 100.0/65535,
                humidityOffset: 0,
                address: 0x44,
                addresses: [0x44,0x45],
                readTemp: true,
                readHumidity: true,
                heater: {
                    on: [0x30, 0x6d],
                    off: [0x30, 0x66],
                },
            }
        }
        static get TYPE_AM2315() {
            return {
                type: "AM2315",
                name: "AM2315",
                desc: "AM2315 Temperature/Humidity I2C sensor",
                comm: Sensor.COMM_I2C,
                loc: Sensor.LOC_INTERNAL,
                cmdWakeup: [0x03, 0x00, 0x04], 
                cmdRead: [0x03, 0x00, 0x04],
                crc: Sensor.CRC_MODBUS,
                vesselIndex: 0,
                pin: null,
                dataRead: [
                    Sensor.BYTE_IGNORE,
                    Sensor.BYTE_IGNORE,
                    Sensor.BYTE_RH_HIGH,
                    Sensor.BYTE_RH_LOW,
                    Sensor.BYTE_TEMP_HIGH,
                    Sensor.BYTE_TEMP_LOW,
                    Sensor.BYTE_CRC_LOW,
                    Sensor.BYTE_CRC_HIGH,
                ],
                tempScale: 0.1,
                tempOffset: 0,
                humidityScale: 0.1,
                humidityOffset: 0,
                address: 0x5C,
                addresses: [0x5C],
                readTemp: true,
                readHumidity: true,
            }
        }
        static get TYPE_NONE() {
            return {
                type: "none",
                name: "No sensor",
                desc: "No sensor",
                loc: Sensor.LOC_NONE,
                vesselIndex: 0,
                readTemp: null,
                readHumidity: null,
                addresses: [],
                address: null,
            }
        }
        static get LOC_INTERNAL() { return "internal"; }
        static get LOC_EXTERNAL() { return "external"; }
        static get LOC_AMBIENT() { return "ambient"; }
        static get LOC_NONE() { return "none"; }
        static get COMM_I2C() { return "I\u00B2C"; }
        static get BYTE_IGNORE() { return "Ignored byte"; }
        static get BYTE_CRC_HIGH() { return "CRC high byte"; }
        static get BYTE_CRC_LOW() { return "CRC low byte"; }
        static get BYTE_CRC2() { return "CRC-8 of previous 2 bytes"; }
        static get BYTE_TEMP_HIGH() { return "Temperature high byte"; }
        static get BYTE_TEMP_LOW() { return "Temperature low byte"; }
        static get BYTE_RH_HIGH() { return "Relative Humidity high byte"; }
        static get BYTE_RH_LOW() { return "Relative Humidity low byte"; }
        static get CRC_MODBUS() { return "Modbus CRC"; }
        static get CRC_8_FF_31() { return "CRC bits:8 initial:0xFF polynomial:0x31"; }
        static get TYPE_LIST() { 
            return [
                Sensor.TYPE_AM2315, 
                Sensor.TYPE_SHT31_DIS, 
                Sensor.TYPE_NONE, 
            ];
        }
        static get LOCATION_LIST() {
            return [{
                id: Sensor.LOC_INTERNAL,
                desc: "Vessel internal (at plant roots)",
            }, {
                id: Sensor.LOC_EXTERNAL,
                desc: "Vessel external (at plant stem)",
            }, {
                id: Sensor.LOC_AMBIENT,
                desc: "Ambient (shaded, 5' above earth)",
            }, {
                id: Sensor.LOC_NONE,
                desc: "No sensor",
            }];
        }
        static crcModbus(buf, length=buf.length) {
            var crc = 0xffff;
            for (var i=0; i<length; i++) {
                crc ^= buf[i];
                for (var j=0; j<8; j++) {
                    if (crc & 0x01) {
                        crc >>= 1;
                        crc ^= 0xa001;
                    } else {
                        crc >>= 1;
                    }
                }
            }

            return crc;
        }

        static crc8(init, poly, buf, offset=0, length=buf.length) {
            var crc = init;
            for (var i=0; i<length; i++) {
                crc ^= buf[i+offset];
                for (var j=0; j<8; j++) {
                    if (crc & 0x80) {
                        crc = 0xff & ((crc <<= 1) ^ poly);
                    } else {
                        crc <<= 1;
                    }
                }
            }

            return crc;
        }

        toJSON() {
            var result = {};
            this.serializableKeys.forEach(key => (result[key] = this[key]));
            return result;
        }

        heat(enable) {
            if (this.heater == null) {
                return Promise.reject(new Error("Sensor has no heater"));
            }
            return new Promise((resolve, reject) => {
                try {
                    this.write(enable ? this.heater.on : this.heater.off);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            });
        }

        write(cmd) {
            if (this.comm === Sensor.COMM_I2C) {
                if (this.cmdWakeup) {
                    this.i2cWrite(this.address, Buffer.from(this.cmdWakeup));
                }
                this.i2cWrite(this.address, Buffer.from(cmd));
            } else {
                throw new Error("Could not . Unknown communication protocol");
            }
        }

        read() {
            return new Promise((resolve, reject) => {
                try {
                    this.write(this.cmdRead);
                    var buf = Buffer.alloc(this.dataRead.length);
                    setTimeout(() => {
                        this.i2cRead(this.address, buf);
                        var data = this.parseData(buf);
                        resolve(data);
                    }, this.readDelay || 0);
                } catch (err) {
                    reject(err);
                }
            });
        }

        parseData(buf) {
            if (this.dataRead == null) {
                return {};
            }
            var temp = null;
            var humidity = null;
            var crc = null;
            var crc1 = null;
            var crc2 = null;
            var hexData = "";
            for (var i=0; i<buf.length; i++) {
                hexData = hexData + buf[i].toString(16) + ' ';
                var action = this.dataRead[i];
                if (action === Sensor.BYTE_TEMP_HIGH) {
                    temp = temp == null ? 0 : temp;
                    temp |= (buf[i] << 8);
                } else if (action === Sensor.BYTE_TEMP_LOW) {
                    temp = temp == null ? 0 : temp;
                    temp |= buf[i];
                } else if (action === Sensor.BYTE_RH_HIGH) {
                    humidity = humidity == null ? 0 : humidity;
                    humidity |= (buf[i] << 8);
                } else if (action === Sensor.BYTE_RH_LOW) {
                    humidity = humidity == null ? 0 : humidity;
                    humidity |= buf[i];
                } else if (action === Sensor.BYTE_CRC_HIGH) {
                    crc = crc == null ? 0 : crc;
                    crc |= (buf[i] << 8);
                } else if (action === Sensor.BYTE_CRC_LOW) {
                    crc = crc == null ? 0 : crc;
                    crc |= buf[i];
                } else if (action === Sensor.BYTE_CRC2) {
                    if (crc == null) {
                        crc = buf[i];
                        crc1 = Sensor.crc8(this.crcInit, this.crcPoly, buf, i-2, 2);
                    } else {
                        crc = (crc << 8) | buf[i];
                        crc2 = Sensor.crc8(this.crcInit, this.crcPoly, buf, i-2, 2);
                    }
                } else if (action === Sensor.BYTE_IGNORE) {
                    // do nothing
                } else {
                    throw new Error(`Invalid dataRead[${i}] specification`);
                }
            }
            if (crc != null) {
                if (this.crc === Sensor.CRC_MODBUS) {
                    if (Sensor.crcModbus(buf) !== 0) {
                        var err = new Error(`Sensor ${this.name} bad CRC ${hexData}`);
                        throw err;
                    }
                } else if (this.crc === Sensor.CRC_8_FF_31) {
                    if (crc2 != null) {
                        if (crc !== ((crc1 << 8) | crc2)) {
                            var err = new Error(`Sensor ${this.name} bad CRC ${hexData}`);
                            throw err;
                        }
                    } else if (crc1 != null) {
                        if (crc !== crc1) {
                            var err = new Error(`Sensor ${this.name} bad CRC ${hexData}`);
                            throw err;
                        }
                    }
                }
            }
            if (temp != null) {
                if (this.readTemp) {
                    temp = temp * this.tempScale + this.tempOffset;
                    this.emit({
                        [Sensor.LOC_INTERNAL]: OyaVessel.SENSE_TEMP_INTERNAL,
                        [Sensor.LOC_EXTERNAL]: OyaVessel.SENSE_TEMP_EXTERNAL,
                        [Sensor.LOC_AMBIENT]: OyaVessel.SENSE_TEMP_AMBIENT,
                    }, temp);
                } else {
                    temp = null;
                }
            }
            if (humidity != null) {
                if (this.readHumidity) {
                    humidity = humidity * this.humidityScale + this.humidityOffset;
                    this.emit({
                        [Sensor.LOC_INTERNAL]: OyaVessel.SENSE_HUMIDITY_INTERNAL,
                        [Sensor.LOC_EXTERNAL]: OyaVessel.SENSE_HUMIDITY_EXTERNAL,
                        [Sensor.LOC_AMBIENT]: OyaVessel.SENSE_HUMIDITY_AMBIENT,
                    }, humidity);
                } else {
                    humidity = null;
                }
            }
            return this.data = {
                temp,
                humidity,
                timestamp: new Date(),
            }
        }

        emit(eventMap, value) {
            var event = eventMap[this.loc];
            if (event && this.emitter) {
                this.emitter.emit(event, value);
            }
        }

    } //// class Sensor

    module.exports = exports.Sensor = Sensor;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("Sensor", function() {
    const should = require("should");
    const Sensor = exports.Sensor || require("../index")/Sensor;
    const OyaVessel = require('./oya-vessel');
    const EventEmitter = require("events");

    it("default sensor is none", function() {
        var sensor = new Sensor();
        should(sensor).properties(Sensor.TYPE_NONE);
        /*
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
        should(sensor.loc).equal(Sensor.LOC_INTERNAL);
        should(sensor.comm).equal(Sensor.COMM_I2C);
        should(sensor.crc).equal(Sensor.CRC_MODBUS);
        should(sensor.vesselIndex).equal(0);
        */
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
    it("TESTTESTparseData() parses SHT31-DIS", function() {
        var sensor = new Sensor(Sensor.TYPE_SHT31_DIS);

        var buf = Buffer.from([0x65, 0x44, 0x5a, 0x84, 0x3e, 0xfb]);
        var data = sensor.parseData(buf);
        data.temp.should.approximately(24.2, 0.1); // Centigrade
        data.humidity.should.approximately(51.7, 0.1); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 1);
    });
    it("parseData() parses data buffer", function() {
        var buf = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        var emitter = new EventEmitter();
        var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
            emitter,
        }));
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
        should(data.timestamp - new Date()).approximately(0, 1);
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
                var opts = Sensor.TYPE_AM2315;
                var testData = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
                var i2cOut = [];
                var msRead = null;
                var readDelay = 15;
                var sensor = new Sensor(Object.assign(Sensor.TYPE_AM2315, {
                    readDelay, // some sensors such as SHT31-DIS have a read delay
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
                should(data.timestamp - Date.now()).approximately(0,1);
                should.deepEqual(data, sensor.data);

                done();
            } catch(err) {
                done(err);
            }
        }();
        async.next();
    });
})
