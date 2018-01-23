(function(exports) {
    const winston = require("winston");
    const Sensor = require('./sensor');
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

    class DbReport {
        constructor(opts) {
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

        static update(DbReport=new DbReport(), ...args) {
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
                var types = DbReport.TYPE_LIST.filter(t => t.type === opts.type);
                var newType = types && types[0] || DbReport.TYPE_NONE;
                Object.keys(newType).sort().forEach(k=> {
                    var newValue = newType[k];
                    var oldValue = DbReport[k];
                    if (oldValue+"" !== newValue+"") {
                        winston.info(`DbReport.update(${DbReport.name}) ${k}:${DbReport[k]}=>${newType[k]}.`);
                        DbReport[k] = newType[k];
                    }
                });
            }

            // serializable toJSON() properties
            DbReport.serializableKeys.forEach(propName => {
                if (opts.hasOwnProperty(propName)) {
                    DbReport[propName] = opts[propName];
                }
            });

            return DbReport;
        }

        static get EVENT_EC_MAP() {
            return {
                [DbReport.LOC_INTERNAL]: OyaVessel.SENSE_EC_INTERNAL,
                [DbReport.LOC_CANOPY]: OyaVessel.SENSE_EC_CANOPY,
                [DbReport.LOC_AMBIENT]: OyaVessel.SENSE_EC_AMBIENT,
            };
        }

        static get EVENT_HUMIDITY_MAP() {
            return {
                [DbReport.LOC_INTERNAL]: OyaVessel.SENSE_HUMIDITY_INTERNAL,
                [DbReport.LOC_CANOPY]: OyaVessel.SENSE_HUMIDITY_CANOPY,
                [DbReport.LOC_AMBIENT]: OyaVessel.SENSE_HUMIDITY_AMBIENT,
            };
        }

        static get EVENT_TEMP_MAP() {
            return {
                [DbReport.LOC_INTERNAL]: OyaVessel.SENSE_TEMP_INTERNAL,
                [DbReport.LOC_CANOPY]: OyaVessel.SENSE_TEMP_CANOPY,
                [DbReport.LOC_AMBIENT]: OyaVessel.SENSE_TEMP_AMBIENT,
            };
        }

        static hourlySummary(data, fields=[]) {
            var hrSummaryMap = {};
            var result = [];
            data.forEach(d => {
                var field = DbReport.fieldOfEvent(d.evt);
                if (d.vavg) {
                    var summary = hrSummaryMap[d.hr];
                    if (summary == null) {
                        hrSummaryMap[d.hr] = summary = {
                            hr: d.hr,
                        };
                        result.push(summary);
                    }
                    summary[field] = d.vavg;
                }
            });

            return result.filter(r => {
                if (fields.length == 0) {
                    return true;
                }
                return fields.reduce((a,f) => {
                    return a && (r[f] != null);
                }, true);
            });
        }


    } //// class DbReport

    module.exports = exports.DbReport = DbReport;
})(typeof exports === "object" ? exports : (exports = {}));
