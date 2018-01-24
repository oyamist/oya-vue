(function(exports) {
    const winston = require("winston");
    const DbFacade = require("./db-facade");
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
        constructor(opts={}) {
            this.dbfacade = opts.dbfacade || new DbFacade();
            this.dbfacade.open();
        }

        static fieldOfEvent(event) {
            return EVENT_FIELD_MAP[event];
        }

        static get SQL_EVENTS() { 
            return {
                tempInternal: OyaVessel.SENSE_TEMP_INTERNAL,
                humidityInternal: OyaVessel.SENSE_HUMIDITY_INTERNAL,
                ecInternal: [ OyaVessel.SENSE_EC_INTERNAL, OyaVessel.SENSE_TEMP_INTERNAL],
                tempCanopy: OyaVessel.SENSE_TEMP_CANOPY,
                humidityCanopy: OyaVessel.SENSE_HUMIDITY_CANOPY,
                ecCanopy: [OyaVessel.SENSE_EC_CANOPY, OyaVessel.SENSE_TEMP_CANOPY],
                tempAmbient: OyaVessel.SENSE_TEMP_AMBIENT,
                humidityAmbient: OyaVessel.SENSE_HUMIDITY_AMBIENT,
                ecAmbient: [OyaVessel.SENSE_EC_AMBIENT, OyaVessel.SENSE_TEMP_AMBIENT],
            }
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

        static normalizeDataByHour(data, evt) {
            var dateMap = {};
            data.forEach(d=>{
                var date = d.hr.substr(0,10);
                var hr = d.hr.substr(-4);
                dateMap[date] || (dateMap[date] = {});
                dateMap[date][hr] = true;
            });
            Object.keys(dateMap).forEach(date=>{
                var d = dateMap[date];
                for (var i = 0; i<24; i+=1) {
                    var hr = ('0' + i + '00').substr(-4);
                    if (!d.hasOwnProperty(hr)) {
                        data.push({
                            hr:`${date} ${hr}`,
                            vavg:null,
                            vmin:null,
                            vmax:null,
                            evt,
                        });
                    }
                }
            });

            return data.sort((a,b) => a.hr > b.hr ? -1 : (a.hr === b.hr ? 0 : 1));
        }

        sensorDataByHour(opts={}) {
            return new Promise((resolve, reject) => {
                try {
                    var field = opts.field || 'ecInternal';
                    var evt = DbReport.SQL_EVENTS[field];
                    var primaryEvt = evt instanceof Array && evt[0] || evt;
                    var resolveNormalize = r => {
                        DbReport.normalizeDataByHour(r.data, primaryEvt);
                        resolve(r);
                    };
                    var dbf = this.dbfacade;
                    var days = Number(opts.days) || 7;
                    var endDate = opts.endDate || new Date().toISOString().substr(0,10);
                    var yyyy = Number(endDate.substr(0,4));
                    var mo = Number(endDate.substr(5,2))-1;
                    var dd = Number(endDate.substr(8,2));
                    var date = new Date(yyyy,mo,dd,23,59,59,999);
                    if (evt) {
                        dbf.sensorDataByHour(primaryEvt, date, days)
                        .then(r => resolveNormalize(r, primaryEvt))
                        .catch(e => reject(e));
                    } else {
                        throw new Error(`unknown field:${field}`);
                    }
                } catch(e) {
                    winston.error(e.stack);
                    reject(e);
                }
            });
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

        sensorAvgByHour(fields, startdate, enddate) {
            return new Promise((resolve,reject) => {
                try {
                    var field = fields instanceof Array && fields[0] || fields;
                    var evt = DbReport.SQL_EVENTS[field];
                    var d1 = DbFacade.utcstr(startdate);
                    var d2 = DbFacade.utcstr(enddate);
                    var hours = Math.round((enddate-startdate)/(1000*3600)+.5);
                    if (typeof evt === 'string') {
                        var rowLimit = hours;
                        var evtStr = `'${evt}'`;
                    } else if (evt instanceof Array) {
                        var rowLimit = fields.length * hours;
                        var evtStr = `'${evt.join("','")}'`;
                    } else {
                        throw new Error(`unknown fields:${fields}`);
                    }
                    var sql = 'select strftime("%Y-%m-%d %H00",utc,"localtime") hr, '+
                        `avg(v) vavg, evt\n`+
                        `from sensordata\n`+
                        `where utc between ${d1} and ${d2}\n`+
                        `and evt in (${evtStr})\n`+
                        `group by evt, hr\n`+
                        `order by evt, hr desc\n`+
                        `limit ${rowLimit};`;
                    this.dbfacade.sqlAll(sql).then(data=>{
                        var summary = DbReport.hourlySummary(data, fields);
                        resolve( { sql, summary, });
                    }).catch(e=>reject(e));
                } catch (e) {
                    winston.error(e.stack);
                    return Promise.reject(e);
                }
            });
        }

    } //// class DbReport

    module.exports = exports.DbReport = DbReport;
})(typeof exports === "object" ? exports : (exports = {}));
