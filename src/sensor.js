(function(exports) {
    const winston = require("winston");
    const OyaVessel = require('./oya-vessel');
    const OyaAnn = require('oya-ann');
    const SystemFacade = require("./system-facade");

    const EVENT_FIELD_MAP = {
        [OyaVessel.SENSE_EC_INTERNAL]:'ecInternal',
        [OyaVessel.SENSE_EC_CANOPY]:'ecCanopy',
        [OyaVessel.SENSE_EC_AMBIENT]:'ecAmbient',
        [OyaVessel.SENSE_TEMP_INTERNAL]:'tempInternal',
        [OyaVessel.SENSE_TEMP_CANOPY]:'tempCanopy',
        [OyaVessel.SENSE_TEMP_AMBIENT]:'tempAmbient',
    };

    var SERIALIZABLE_KEYS;

    class Sensor {
        constructor(...optArgs) {
            var opts = optArgs.reduce((acc,a) => {
                Object.assign(acc, a);
                return acc;
            }, {});
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
            var typeProps = Sensor.TYPE_LIST.filter(
                ud => (ud.type===type))[0] || Sensor.TYPE_NONE;

            // BEGIN serializable toJSON() properties
            this.address = opts.address || typeProps.address;
            this.addresses = typeProps.addresses; // read-only and serializable
            this.comm = opts.comm || typeProps.comm;
            this.desc = opts.desc || typeProps.desc || 'generic sensor';
            this.healthTimeout = Number(opts.healthTimeout) || 5; 
            this.loc = opts.loc || Sensor.LOC_NONE;
            this.maxReadErrors = opts.maxReadErrors == null ? 5 : Number(opts.maxReadErrors);
            this.name = opts.name || typeProps.name;
            this.readHumidity = opts.readHumidity == null ? typeProps.readHumidity : opts.readHumidity;
            this.readTemp = opts.readTemp == null ? typeProps.readTemp : opts.readTemp;
            this.readEC = opts.readEC == null ? typeProps.readEC : opts.readEC;
            this.type = type;
            this.vesselIndex = opts.vesselIndex == null ? 0 : Number(opts.vesselIndex);
            // END serializable toJSON() properties
            SERIALIZABLE_KEYS = SERIALIZABLE_KEYS || Object.keys(this).sort();

            // sensor type properties
            this.tempRegExp = typeProps.tempRegExp;
            this.cmdWakeup = typeProps.cmdWakeup;
            this.cmdRead = typeProps.cmdRead;
            this.dataRead = typeProps.dataRead;
            this.tempScale = typeProps.tempScale;
            this.tempOffset = typeProps.tempOffset;
            this.heater = typeProps.heater;
            this.humidityScale = typeProps.humidityScale;
            this.humidityOffset = typeProps.humidityOffset;
            this.crc = typeProps.crc;
            this.crcInit = typeProps.crcInit;
            this.crcPoly = typeProps.crcPoly;

            // unserialized custom properties
            this.readDelay = Number(opts.readDelay) || typeProps.readDelay;
            this.lastRead = opts.lastRead;
            this.emitter = opts.emitter;
            this.i2cRead = opts.i2cRead || ((i2cAddr, dataBuf) => { 
                throw new Error("no I2C driver");
            });
            this.i2cWrite = opts.i2cWrite || ((i2cAddr, dataBuf) => {
                throw new Error("no I2C driver");
            });

            // internal properties
            this.clear();
            this.data = {
                temp: null,
                humidity: null,
            };
        }

        get serializableKeys() {
            return SERIALIZABLE_KEYS;
        }

        static fieldOfEvent(event) {
            return EVENT_FIELD_MAP[event];
        }

        static calibratedValue(ann, temp, reading, nominal) {
            var annValue = ann.activate([temp])[0];
            return reading * (nominal/annValue);
        }

        static calibrationANN(seq, valueKey='ecInternal', tempKey='tempInternal') {
            var mono = Sensor.monotonic(seq,tempKey);
            var examples = seq.slice(mono.start, mono.end).map(s => {
                return new OyaAnn.Example([s[tempKey]], [s[valueKey]]);
            });
            var v = OyaAnn.Variable.variables(examples);
            var factory = new OyaAnn.Factory(v, {
                power: 5,
                maxMSE: 1,
                preTrain: true,
                trainingReps: 50, // max reps to reach maxMSE
            });
            var network = factory.createNetwork();
            network.train(examples);
            return network;
        }

        static monotonic(list, key) {
            var start = 0;
            var end = 0;
            var descStart = 0;
            var ascStart = 0;
            var iprev = 0;
            for (var i = 0; i < list.length; i++) {
                var vi = list[i];
                if (list[i][key] < list[iprev][key]) { // decreasing
                    if ((i - ascStart) > (end - start)) {
                        start = ascStart;
                        end = i;
                    }
                    ascStart = i;
                } else { //  increasing
                    if ((i - descStart) > (end - start)) {
                        start = descStart;
                        end = i;
                    }
                    descStart = i;
                }
                iprev = i;
            }
            return { start, end };
        }

        static update(sensor=new Sensor(), ...args) {
            var opts = args.reduce((a,arg) => {
                Object.assign(a, arg);
                return a;
            }, {});

            if (opts.hasOwnProperty('type')) {
                if (typeof opts.type === 'object') {
                    opts.type = opts.type.type;
                }
                if (typeof opts.type !== 'string') {
                    throw new Error("expected type to be string");
                }
                var types = Sensor.TYPE_LIST.filter(t => t.type === opts.type);
                var newType = types && types[0] || Sensor.TYPE_NONE;
                Object.keys(newType).sort().forEach(k=> {
                    var newValue = newType[k];
                    var oldValue = sensor[k];
                    if (oldValue+"" !== newValue+"") {
                        winston.info(`Sensor.update(${sensor.name}) ${k}:${sensor[k]}=>${newType[k]}.`);
                        sensor[k] = newType[k];
                    }
                });
            }

            // serializable toJSON() properties
            sensor.serializableKeys.forEach(propName => {
                if (opts.hasOwnProperty(propName)) {
                    sensor[propName] = opts[propName];
                }
            });

            return sensor;
        }

        static get EVENT_EC_MAP() {
            return {
                [Sensor.LOC_INTERNAL]: OyaVessel.SENSE_EC_INTERNAL,
                [Sensor.LOC_CANOPY]: OyaVessel.SENSE_EC_CANOPY,
                [Sensor.LOC_AMBIENT]: OyaVessel.SENSE_EC_AMBIENT,
            };
        }

        static get EVENT_HUMIDITY_MAP() {
            return {
                [Sensor.LOC_INTERNAL]: OyaVessel.SENSE_HUMIDITY_INTERNAL,
                [Sensor.LOC_CANOPY]: OyaVessel.SENSE_HUMIDITY_CANOPY,
                [Sensor.LOC_AMBIENT]: OyaVessel.SENSE_HUMIDITY_AMBIENT,
            };
        }

        static get EVENT_TEMP_MAP() {
            return {
                [Sensor.LOC_INTERNAL]: OyaVessel.SENSE_TEMP_INTERNAL,
                [Sensor.LOC_CANOPY]: OyaVessel.SENSE_TEMP_CANOPY,
                [Sensor.LOC_AMBIENT]: OyaVessel.SENSE_TEMP_AMBIENT,
            };
        }

        static get TYPE_SHT31_DIS() {
            return Object.assign(Sensor.TYPE_NONE, {
                type: "SHT31-DIS",
                name: "SHT31-DIS",
                desc: "SHT31-DIS Temperature/Humidity I2C sensor",
                comm: Sensor.COMM_I2C,
                cmdRead: [0x24, 0x00],
                crc: Sensor.CRC_8_FF_31,
                crcInit: 0xff,
                crcPoly: 0x31,
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
                baud: 10000,
            });
        }
        static get TYPE_AM2315() {
            return Object.assign(Sensor.TYPE_NONE, {
                address: 0x5C,
                addresses: [0x5C],
                cmdRead: [0x03, 0x00, 0x04],
                cmdWakeup: [0x03, 0x00, 0x04], 
                comm: Sensor.COMM_I2C,
                crc: Sensor.CRC_MODBUS,
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
                desc: "AM2315 Temperature/Humidity I2C sensor",
                humidityOffset: 0,
                humidityScale: 0.001,
                name: "AM2315",
                readHumidity: true,
                readTemp: true,
                tempOffset: 0,
                tempScale: 0.1,
                type: "AM2315",
                baud: 10000,
            });
        }
        static get TYPE_EZO_EC_K1() {
            return Object.assign(Sensor.TYPE_NONE, {
                address: 0x64,
                addresses: [0x64],
                baud: 100000,
                cmdRead: [0x52],
                cmdInfo: [0x49],
                comm: Sensor.COMM_I2C,
                dataRead: [ 
                    Sensor.BYTE_RES_1,
                    Sensor.BYTE_EC_0,
                    Sensor.BYTE_EC_1,
                    Sensor.BYTE_EC_2,
                    Sensor.BYTE_EC_3,
                    Sensor.BYTE_EC_4,
                ],
                desc: "Atlas Scientific EZO\u2122 EC with K1 conductivity probe",
                name: "EZO-EC-K1",
                readDelay: 600,
                readEC: true,
                type: "EZO-EC-K1",
            });
        }
        static get TYPE_DS18B20() {
            return Object.assign(Sensor.TYPE_NONE, {
                addresses: SystemFacade.oneWireAddresses(),
                comm: Sensor.COMM_W1,
                desc: "DS18B20 Temperature 1-Wire sensor",
                name: "DS18B20",
                readTemp: true,
                tempOffset: 0,
                tempRegExp: ".*\n.*t=([0-9-]+)\n.*",
                tempScale: 0.001,
                type: "DS18B20",
            });
        }
        static get TYPE_NONE() {
            return {
                address: SystemFacade.NO_DEVICE,
                addresses: [SystemFacade.NO_DEVICE],
                cmdRead: null,
                cmdWakeup: null, 
                comm: null,
                crc: null,
                crcInit: null,
                crcPoly: null,
                dataRead: null,
                desc: "No sensor",
                heater: null,
                humidityOffset: null,
                humidityScale: null,
                name: "No sensor",
                readDelay: null,
                readEC: null,
                readHumidity: null,
                readTemp: null,
                tempOffset: null,
                tempRegExp: null,
                tempScale: null,
                type: "none",

            }
        }
        static get LOC_INTERNAL() { return "internal"; }
        static get LOC_CANOPY() { return "canopy"; }
        static get LOC_AMBIENT() { return "ambient"; }
        static get LOC_NONE() { return "none"; }
        static get COMM_I2C() { return "I\u00B2C"; }
        static get COMM_W1() { return "1-wire"; }
        static get BYTE_EC_0() { return "EC string[0]"; }
        static get BYTE_EC_1() { return "EC string[1]"; }
        static get BYTE_EC_2() { return "EC string[2]"; }
        static get BYTE_EC_3() { return "EC string[3]"; }
        static get BYTE_EC_4() { return "EC string[4]"; }
        static get BYTE_IGNORE() { return "Ignored byte"; }
        static get BYTE_RES_1() { return "Response code 1"; }
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
                Sensor.TYPE_EZO_EC_K1, 
                Sensor.TYPE_NONE, 
            ];
        }
        static get LOCATION_LIST() {
            return [{
                id: Sensor.LOC_INTERNAL,
                desc: "Vessel internal (at plant roots)",
            }, {
                id: Sensor.LOC_CANOPY,
                desc: "Plant canopy",
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
            SERIALIZABLE_KEYS.forEach(key => (result[key] = this[key]));
            return result;
        }

        heat(enable) {
            if (this.heater == null) {
                return Promise.reject(new Error("Sensor ${this.key}has no heater"));
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

        get key() {
            return `${this.type}@${this.loc}`;
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
                                this.lastRead = new Date();
                                resolve(data);
                            } catch(e) {
                                if (++this.readErrors >= this.maxReadErrors) {
                                    this.fault = new Error(`Sensor ${this.key} disabled (too many errors) [E1]`);
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
                            this.lastRead = new Date();
                            resolve(r);
                        }).catch(e=>reject(e));
                    } else {
                        reject(new Error(`read() not supported for sensor:${this.name} comm:${this.comm}`));
                    }
                } catch (e) {
                    if (++this.readErrors >= this.maxReadErrors) {
                        this.fault = new Error(`Sensor ${this.key} disabled (too many errors) [E2]`);
                    }
                    reject(e);
                }
            });
        }

        health() {
            var key = `${this.type}@${this.loc}`;
            if (this.loc === Sensor.LOC_NONE) {
                var value = null;
            } else if (this.fault instanceof Error) {
                var value = this.fault.message;
            } else if (this.fault) {
                var value = this.fault;
            } else if (this.lastRead == null) {
                var value = `Sensor is completely unresponsive`;
            } else if ((Date.now() - this.lastRead.getTime()) > this.healthTimeout * 1000) {
                var value = `Sensor is failing. Last read:${new Date(this.lastRead).toISOString()}`;
            } else {
                var value = true;
            }
            return {
                [key]: value,
            }
        }

        clear() {
            this.readErrors = null;
            this.fault = null;
        }

        parseData(buf) {
            if (this.dataRead == null) {
                return {};
            }
            var ec = null;
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
                } else if (action === Sensor.BYTE_EC_0) {
                    ec = `${buf.toString("utf8",i-0,i+1)}`;
                } else if (action === Sensor.BYTE_EC_1) {
                    ec = `${buf.toString("utf8",i-1,i+1)}`;
                } else if (action === Sensor.BYTE_EC_2) {
                    ec = `${buf.toString("utf8",i-2,i+1)}`;
                } else if (action === Sensor.BYTE_EC_3) {
                    ec = `${buf.toString("utf8",i-3,i+1)}`;
                } else if (action === Sensor.BYTE_EC_4) {
                    ec = `${buf.toString("utf8",i-4,i+1)}`;
                } else if (action === Sensor.BYTE_RES_1) {
                    if (buf[i] !== 1) {
                        var err = new Error(`Sensor ${this.name} invalid response. `+
                            `expected:0x01 actual:0x${buf[i].toString(16)}`);
                        throw err;
                    }
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
            if (ec != null) {
                if (this.readEC) {
                    ec = Number(ec);
                    this.emit(ec, Sensor.EVENT_EC_MAP);
                } else {
                    ec = null;
                }
            }
            return this.data = {
                temp,
                humidity,
                ec,
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
