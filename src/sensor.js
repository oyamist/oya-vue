(function(exports) {
    const OyaVessel = require('./oya-vessel');

    class Sensor {
        constructor(opts = {}) {
            if (opts.hasOwnProperty('usage')) {
                if (0>Sensor.USAGE_DEFAULTS.findIndex(ud => (ud.usage === opts.usage))) {
                    throw new Error(`Unknown usage:${opts.usage}`);
                }
                var usage = opts.usage;
            } else {
                var usage = Sensor.USAGE_I2C_TEMP_RH;
            }
            var sensorDefault = Sensor.USAGE_DEFAULTS.filter(
                ud => (ud.usage===usage))[0] || {};

            // serializable toJSON() properties
            this.name = opts.name || `${usage}`;
            this.usage = usage;
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
            this.crc = opts.crc || sensorDefault.crc;
            this.data = {
                temp: null,
                humidity: null,
            };
        }

        static get USAGE_I2C_TEMP_RH() { return "I\u00B2C Temperature/Humidity Sensor"; }
        static get USAGE_I2C_TEMP() { return "I\u00B2C Temperature Sensor"; }
        static get USAGE_I2C_RH() { return "I\u00B2C Humidity Sensor"; }
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
        static get USAGE_DEFAULTS() { 
            return [{
                usage: Sensor.USAGE_I2C_TEMP_RH,
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
                address: 0x54,
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

        toJSON() {
            return this;
        }

        parseBuffer(buf) {
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
            return this.data = {
                temp: temp*this.tempScale,
                humidity: humidity*this.humidityScale,
                timestamp: new Date(),
            }
        }

    } //// class Sensor

    module.exports = exports.Sensor = Sensor;
})(typeof exports === "object" ? exports : (exports = {}));

//var RH = (inBuf[2]<<8) | inBuf[3];
//var Temp = (inBuf[4]<<8) | inBuf[5];
//var CRC = (inBuf[7]<<8) | inBuf[6];

(typeof describe === 'function') && describe("Sensor", function() {
    const should = require("should");
    const Sensor = exports.Sensor || require("../index")/Sensor;

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
    it("parseBuffer() parses data buffer", function() {
        var buf = Buffer.from([0x03,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        var sensor = new Sensor();
        var data = sensor.parseBuffer(buf);
        data.temp.should.approximately(19.5, 0.01); // Centigrade
        data.humidity.should.approximately(32.3, 0.0001); // %relative humidity
        should(data.timestamp - new Date()).approximately(0, 0.1);

        var buf = Buffer.from([0xFF,0x04,0x01,0x43,0x00,0xc3,0x41,0x91]);
        should.throws(() => {
            var data = sensor.parseBuffer(buf);
        });
    });
})
