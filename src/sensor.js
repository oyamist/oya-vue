(function(exports) {
    const winston = require("winston");
    const OyaVessel = require('./oya-vessel');
    const SystemFacade = require("./system-facade");

    class Sensor {
        constructor(opts = {}) {
            var type = opts.type;
            if (typeof type === "object") {
                type = type.type;
            }
            if (type) {
                if (0>Sensor.TYPE_LIST.findIndex(ud => (ud.type === type))) {
                    throw new Error(`Unknown type:${type}`);
                }
            } else {
                var type = Sensor.TYPE_NONE.type;
            }
            var sensorDefault = Sensor.TYPE_LIST.filter(
                ud => (ud.type===type))[0] || {};

            // serializable toJSON() properties
            this.type = type;
            this.name = opts.name || sensorDefault.name;
            this.vesselIndex = opts.vesselIndex == null ? sensorDefault.vesselIndex : Number(opts.vesselIndex);
            this.desc = opts.desc || sensorDefault.desc || 'generic sensor';
            this.comm = opts.comm || sensorDefault.comm;
            this.loc = opts.loc || sensorDefault.loc;
            this.tempRegExp = opts.tempRegExp;
            this.cmdWakeup = opts.cmdWakeup || sensorDefault.cmdWakeup;
            this.cmdRead = opts.cmdRead || sensorDefault.cmdRead;
            this.dataRead = opts.dataRead || sensorDefault.dataRead;
            this.address = opts.address || sensorDefault.address;
            this.tempScale = opts.tempScale == null ? sensorDefault.tempScale : Number(opts.tempScale);
            this.tempOffset = opts.tempOffset == null ? sensorDefault.tempOffset : Number(opts.tempOffset);
            this.heater = opts.heater || sensorDefault.heater;
            this.humidityScale = opts.humidityScale == null ? sensorDefault.humidityScale : Number(opts.humidityScale);
            this.humidityOffset = opts.humidityOffset == null ? sensorDefault.humidityOffset : Number(opts.humidityOffset);
            this.readTemp = opts.readTemp == null ? sensorDefault.readTemp : opts.readTemp;
            this.readHumidity = opts.readHumidity == null ? sensorDefault.readHumidity : opts.readHumidity;
            this.readDelay = Number(opts.readDelay) || sensorDefault.readDelay;
            this.clear();
            this.maxReadErrors = opts.maxReadErrors == null ? 5 : Number(opts.maxReadErrors);
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

        static get EVENT_HUMIDITY_MAP() {
            return {
                [Sensor.LOC_INTERNAL]: OyaVessel.SENSE_HUMIDITY_INTERNAL,
                [Sensor.LOC_EXTERNAL]: OyaVessel.SENSE_HUMIDITY_EXTERNAL,
                [Sensor.LOC_AMBIENT]: OyaVessel.SENSE_HUMIDITY_AMBIENT,
            };
        }

        static get EVENT_TEMP_MAP() {
            return {
                [Sensor.LOC_INTERNAL]: OyaVessel.SENSE_TEMP_INTERNAL,
                [Sensor.LOC_EXTERNAL]: OyaVessel.SENSE_TEMP_EXTERNAL,
                [Sensor.LOC_AMBIENT]: OyaVessel.SENSE_TEMP_AMBIENT,
            };
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
                humidityScale: 1.0/65535,
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
                humidityScale: 0.001,
                humidityOffset: 0,
                address: 0x5C,
                addresses: [0x5C],
                readTemp: true,
                readHumidity: true,
            }
        }
        static get TYPE_DS18B20() {
            return {
                type: "DS18B20",
                name: "DS18B20",
                desc: "DS18B20 Temperature 1-Wire sensor",
                comm: Sensor.COMM_W1,
                loc: Sensor.LOC_INTERNAL,
                tempRegExp: ".*\n.*t=([0-9-]+)\n.*",
                tempScale: 0.001,
                tempOffset: 0,
                address: null,
                addresses: SystemFacade.oneWireAddresses(),
                readTemp: true,
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
        static get COMM_W1() { return "1-wire"; }
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
                Sensor.TYPE_DS18B20, 
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
                throw new Error("Could not write sensor. Unknown communication protocol ${this.comm}");
            }
        }

        read() {
            if (this.fault) {
                return Promise.reject(this.fault);
            }
            return new Promise((resolve, reject) => {
                try {
                    if (this.comm === Sensor.COMM_I2C) {
                        this.write(this.cmdRead);
                        var buf = Buffer.alloc(this.dataRead.length);
                        setTimeout(() => {
                            try {
                                this.i2cRead(this.address, buf);
                                var data = this.parseData(buf);
                                this.readErrors = 0;
                                resolve(data);
                            } catch(e) {
                                if (++this.readErrors >= this.maxReadErrors) {
                                    this.fault = new Error(`disabled sensor ${this.name}/${this.loc} (too many errors) [E1]`);
                                }
                                reject(e);
                            }
                        }, this.readDelay || 0);
                    } else if (this.comm === Sensor.COMM_W1) {
                        SystemFacade.oneWireRead(this.address, this.type).then(r => {
                            if (r.temp && this.readTemp) {
                                r.temp = r.temp * this.tempScale + this.tempOffset;
                                this.data.temp = r.temp;
                                this.emit(r.temp, Sensor.EVENT_TEMP_MAP);
                            }
                            if (r.humidity && this.readHumidity) {
                                r.humidity = r.humidity * this.humidityScale + this.humidityOffset;
                                this.data.humidity = r.humidity;
                                this.emit(r.humidity, Sensor.EVENT_HUMIDITY_MAP);
                            }
                            resolve(r);
                        }).catch(e=>reject(e));
                    } else {
                        reject(new Error(`read() not supported for sensor:${this.name} comm:${this.comm}`));
                    }
                } catch (e) {
                    if (++this.readErrors >= this.maxReadErrors) {
                        this.fault = new Error(`disabled sensor ${this.name}/${this.loc} (too many errors) [E2]`);
                    }
                    reject(e);
                }
            });
        }

        clear() {
            this.readErrors = null;
            this.fault = null;
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
                    this.emit(temp, Sensor.EVENT_TEMP_MAP);
                } else {
                    temp = null;
                }
            }
            if (humidity != null) {
                if (this.readHumidity) {
                    humidity = humidity * this.humidityScale + this.humidityOffset;
                    this.emit(humidity, Sensor.EVENT_HUMIDITY_MAP);
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

        emit(value, eventMap) {
            var event = eventMap[this.loc];
            if (event == null) {
                winston.warn(`no event for sensor ${this.name} location ${this.loc}`);
            } else if (this.emitter == null) {
                winston.info(`no event emitter for sensor ${this.name}`);
            } else {
                winston.debug(`emit ${event} ${value}`);
                this.emitter.emit(event, value);
            }
        }

    } //// class Sensor

    module.exports = exports.Sensor = Sensor;
})(typeof exports === "object" ? exports : (exports = {}));
