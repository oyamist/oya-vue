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
                var type = Sensor.TYPE_AM2315.type;
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
            this.tempScale = opts.tempScale || sensorDefault.tempScale;
            this.humidityScale = opts.humidityScale || sensorDefault.humidityScale;
            this.readTemp = opts.readTemp == null ? sensorDefault.readTemp : opts.readTemp;
            this.readHumidity = opts.readHumidity == null ? sensorDefault.readHumidity : opts.readHumidity;
            this.crc = opts.crc || sensorDefault.crc;
            this.data = {
                temp: null,
                humidity: null,
            };
            this.serializableKeys = Object.keys(this);

            // other properties
            this.emitter = opts.emitter;
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
                humidityScale: 0.1,
                address: 0x5C,
                readTemp: true,
                readHumidity: true,
            }
        }
        static get TYPE_CUSTOM() {
            return {
                type: "Custom sensor",
                name: "Custom",
                desc: "Custom sensor",
                loc: Sensor.LOC_INTERNAL,
                vesselIndex: 0,
                readTemp: false,
                readHumidity: false,
            }
        }
        static get LOC_INTERNAL() { return "Vessel Internal"; }
        static get LOC_EXTERNAL() { return "Vessel External"; }
        static get LOC_AMBIENT() { return "Ambient"; }
        static get COMM_I2C() { return "I\u00B2C"; }
        static get BYTE_IGNORE() { return "Ignored byte"; }
        static get BYTE_CRC_HIGH() { return "CRC high byte"; }
        static get BYTE_CRC_LOW() { return "CRC low byte"; }
        static get BYTE_TEMP_HIGH() { return "Temperature high byte"; }
        static get BYTE_TEMP_LOW() { return "Temperature low byte"; }
        static get BYTE_RH_HIGH() { return "Relative Humidity high byte"; }
        static get BYTE_RH_LOW() { return "Relative Humidity low byte"; }
        static get CRC_MODBUS() { return "Modbus CRC"; }
        static get TYPE_LIST() { 
            return [
                Sensor.TYPE_AM2315, 
                Sensor.TYPE_CUSTOM, 
            ];
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

        toJSON() {
            var result = {};
            this.serializableKeys.forEach(key => (result[key] = this[key]));
            return result;
        }

        parseData(buf) {
            var temp = null;
            var humidity = null;
            var crc = null;
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
                }
            }
            if (temp != null) {
                if (this.readTemp) {
                    temp = temp * this.tempScale;
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
                    humidity = humidity * this.humidityScale;
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

    it("default sensor is AM2315", function() {
        var sensor = new Sensor();
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
        should(sensor.humidityScale).equal(0.1);
        should(sensor.pin).equal(null);
        should(sensor.loc).equal(Sensor.LOC_INTERNAL);
        should(sensor.comm).equal(Sensor.COMM_I2C);
        should(sensor.crc).equal(Sensor.CRC_MODBUS);
        should(sensor.vesselIndex).equal(0);
    });
    it("ctor defaults can be overridden", function() {
        var sensor = new Sensor({
            loc: Sensor.LOC_EXTERNAL,
        });
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
        should(sensor.humidityScale).equal(0.1);
        should(sensor.pin).equal(null);
        should(sensor.loc).equal(Sensor.LOC_EXTERNAL);
        should(sensor.comm).equal(Sensor.COMM_I2C);
        should(sensor.crc).equal(Sensor.CRC_MODBUS);
        should(sensor.vesselIndex).equal(0);
    });
    it("crcModbus() computes Modbus CRC value", function() {
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
    it("parseData() parses data buffer", function() {
        var buf = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        var emitter = new EventEmitter();
        var sensor = new Sensor({
            emitter,
        });
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
        var sensor = new Sensor({
            emitter,
            readTemp: false,
        });
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
        var sensor = new Sensor({
            emitter,
            readHumidity: false,
        });
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
        var sensor = new Sensor();
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
})
