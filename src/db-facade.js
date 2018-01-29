(function(exports) {
    const winston = require('winston');
    const OyaMist = require('./oyamist');

    class DbFacade {
        constructor(opts = {}) {
            this.isOpen = false;
            this.logPeriod = opts.logPeriod || 1;
            this.logCount = {};
            this.logSum = {};
        }

        static get ERROR_NOT_OPEN() { return new Error("open() database before use"); }
        static get ERROR_ABSTRACT() { return new Error("abstract method must be implemented by subclass"); }

        static utcstr(date) {
            var yyyy = date.getUTCFullYear();
            var mo = ('0'+(date.getUTCMonth()+1)).slice(-2);
            var dd = ('0'+date.getUTCDate()).slice(-2);
            var hh = ('0'+date.getUTCHours()).slice(-2);
            var mm = ('0'+date.getUTCMinutes()).slice(-2);
            var ss = ('0'+date.getUTCSeconds()).slice(-2);
            var ms = ('00'+date.getUTCMilliseconds()).slice(-3);
            return `'${yyyy}-${mo}-${dd} ${hh}:${mm}:${ss}.${ms}'`;
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

        static hourlySummary(data, fields=[]) {
            var hrSummaryMap = {};
            var result = [];
            data.forEach(d => {
                var field = OyaMist.fieldOfEvent(d.evt);
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

        sensorAvgByHour(fields, startDate, hours) {
            return new Promise((resolve,reject) => {
                try {
                    var d1 = DbFacade.utcstr(startDate);
                    var endDate = new Date(startDate.getTime()+hours*3600*1000);
                    var d2 = DbFacade.utcstr(endDate);
                    var rowLimit = fields.length * hours;
                    var evt = fields.map(f => OyaMist.eventOfField(f));
                    var evtStr = `'${evt.join("','")}'`;
                    var sql = 'select strftime("%Y-%m-%d %H00",utc,"localtime") hr, '+
                        `avg(v) vavg, evt\n`+
                        `from sensordata\n`+
                        `where utc between ${d1} and ${d2}\n`+
                        `and evt in (${evtStr})\n`+
                        `group by evt, hr\n`+
                        `order by evt, hr desc\n`+
                        `limit ${rowLimit};`;
                    this.sqlAll(sql).then(data=>{
                        var data = DbFacade.hourlySummary(data, fields);
                        resolve( { sql, data, });
                    }).catch(e=>reject(e));
                } catch (e) {
                    winston.error(e.stack);
                    return Promise.reject(e);
                }
            });
        }

        open() {
            return Promise.resolve((this.isOpen = true));
        }

        close() {
            return Promise.resolve((this.isOpen = false));
        }

        sqlExec(sql) {
            // subclass should override with method that executes sql
            return this.isOpen 
                ? Promise.resolve(sql)
                : Promise.reject(DbFacade.ERROR_NOT_OPEN);
        }

        sqlGet(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            return Promise.resolve({
                error: DbFacade.ERROR_ABSTRACT,
            })
        }

        sqlAll(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            if (sql.indexOf('evt in (') >= 0) {
                return Promise.resolve(mockData.map(d=>{
                    var iStart = sql.indexOf("evt in ('")+9;
                    var iEnd = sql.indexOf("'", iStart);
                    d.evt = sql.substring(iStart,iEnd);
                    return d;
                }));
            } else {
                return Promise.resolve([]);
            }
        }

        logSensor(ctx, evt, value, date=new Date()) {
            try {
                this.logCount[evt] = this.logCount[evt] || 0;
                this.logSum[evt] = this.logSum[evt] || 0;
                if (this.logCount[evt] >= this.logPeriod) {
                    this.logCount[evt] = 0;
                    this.logSum[evt] = 0;
                } 
                this.logCount[evt]++;
                this.logSum[evt] += value;
                var stmt = `insert into sensordata(utc,evt,ctx,v) values(` +
                    `${DbFacade.utcstr(date)},` +
                    `'${evt}',` +
                    `'${ctx}',` +
                    `${this.logSum[evt] / this.logCount[evt]}` +
                    ');';
                if (!this.isOpen) {
                    throw DbFacade.ERROR_NOT_OPEN;
                }
                return this.logCount[evt] == this.logPeriod 
                    ? this.sqlExec(stmt) : Promise.resolve(null);
            } catch(e) {
                winston.warn(e.stack);
                return Promise.reject(e);
            }
        }

        sensorDataByHour(evt, enddate=new Date(), days=1) {
            return new Promise((resolve,reject) => {
                try {
                    var d1 = DbFacade.utcstr(new Date(enddate.getTime() - days*24*3600*1000));
                    var d2 = DbFacade.utcstr(enddate);
                    var rowLimit = days * 24;
                    var evtStr = `'${evt}'`;
                    var sql = 'select strftime("%Y-%m-%d %H00",utc,"localtime") hr, '+
                        `avg(v) vavg, min(v) vmin, max(v) vmax, evt\n`+
                        `from sensordata\n`+
                        `where utc between ${d1} and ${d2}\n`+
                        `and evt in (${evtStr})\n`+
                        `group by evt, hr\n`+
                        `order by evt, hr desc\n`+
                        `limit ${rowLimit};`;
                    this.sqlAll(sql).then(data=>{
                        DbFacade.normalizeDataByHour(data, evt);
                        resolve( { sql, data, });
                    }).catch(e=>reject(e));
                } catch (e) {
                    return Promise.reject(e);
                }
            });
        }

    } //// class DbFacade

    const mockData = [
        {"hr":"1999-12-08 2300","vavg":17.57570134387154,"vmin":17.430819409475856,"vmax":17.951177487856373},
        {"hr":"1999-12-08 2200","vavg":18.074496982104563,"vmin":17.99795274789553,"vmax":18.104765901172403},
        {"hr":"1999-12-08 2100","vavg":18.046810122665583,"vmin":17.889626408280566,"vmax":18.294492764680456},
        {"hr":"1999-12-08 2000","vavg":18.233284905335875,"vmin":18.170589506879264,"vmax":18.26574222425677},
        {"hr":"1999-12-08 1900","vavg":17.951575070149122,"vmin":17.69429185422547,"vmax":18.167607639683627},
        {"hr":"1999-12-08 1800","vavg":17.998155989589954,"vmin":17.647383077744703,"vmax":18.26965870654359},
        {"hr":"1999-12-08 1700","vavg":18.311335122029796,"vmin":18.269347168179863,"vmax":18.33704000406908},
        {"hr":"1999-12-08 1600","vavg":18.32903731520527,"vmin":18.29622847842121,"vmax":18.344961979603788},
        {"hr":"1999-12-08 1500","vavg":18.202546667175298,"vmin":18.07561481142393,"vmax":18.293558149589284},
        {"hr":"1999-12-08 1400","vavg":17.941329166772633,"vmin":17.820731924416986,"vmax":18.067692835889215},
        {"hr":"1999-12-08 1300","vavg":17.721687617648566,"vmin":17.63447648839041,"vmax":17.81596983800005},
        //{"hr":"1999-12-08 1200","vavg":17.524715588786314,"vmin":17.411904580249743,"vmax":17.632206708883285},
        //{"hr":"1999-12-08 1100","vavg":17.301133406237547,"vmin":17.170462348363476,"vmax":17.410213371989528},
        //{"hr":"1999-12-08 1000","vavg":16.985471169716096,"vmin":16.86835914651204,"vmax":17.159380483711},
        {"hr":"1999-12-08 0900","vavg":16.585187834320934,"vmin":16.247329671168085,"vmax":16.893148699168396},
        {"hr":"1999-12-08 0800","vavg":16.961387468952132,"vmin":16.2511126370133,"vmax":17.168682129142198},
        {"hr":"1999-12-08 0700","vavg":16.80251625509694,"vmin":16.506574095267172,"vmax":17.048294804303044},
        {"hr":"1999-12-08 0600","vavg":15.852391808577723,"vmin":15.383834337885611,"vmax":16.488682892093287},
        {"hr":"1999-12-08 0500","vavg":15.500926031891359,"vmin":15.426426082754752,"vmax":15.578234276849516},
        {"hr":"1999-12-08 0400","vavg":15.695764349838507,"vmin":15.583663945474422,"vmax":15.796533658859138},
        {"hr":"1999-12-08 0300","vavg":15.922902822013858,"vmin":15.80067266854862,"vmax":16.054932478828103},
        {"hr":"1999-12-08 0200","vavg":16.191324716224575,"vmin":16.058759950153856,"vmax":16.342126344701295},
        {"hr":"1999-12-08 0100","vavg":16.56332451700958,"vmin":16.348535133897908,"vmax":16.88998881005062},
        {"hr":"1999-12-08 0000","vavg":17.621862579145397,"vmin":16.903251443249165,"vmax":18.170055441112883},
        {"hr":"1999-12-07 2300","vavg":18.212470647575934,"vmin":18.169521375346505,"vmax":18.266320795503685},
        {"hr":"1999-12-07 2200","vavg":18.331628879394383,"vmin":18.26810101472497,"vmax":18.394051524630605},
        {"hr":"1999-12-07 2100","vavg":18.4533984514248,"vmin":18.39810152335902,"vmax":18.50282291905088},
        {"hr":"1999-12-07 2000","vavg":18.539847770063503,"vmin":18.505137204038544,"vmax":18.55845476971592},
        {"hr":"1999-12-07 1900","vavg":18.49345377364089,"vmin":18.411364156557568,"vmax":18.553336639454734},
        {"hr":"1999-12-07 1800","vavg":18.260343709468227,"vmin":18.155413138017856,"vmax":18.410340530505337},
        {"hr":"1999-12-07 1700","vavg":18.374200571652963,"vmin":18.160620279240103,"vmax":18.433216347498792},
        {"hr":"1999-12-07 1600","vavg":18.408438662970593,"vmin":18.356399888100523,"vmax":18.42716360214644},
        {"hr":"1999-12-07 1500","vavg":18.184228953146324,"vmin":18.02590218966965,"vmax":18.357200986750097},
        {"hr":"1999-12-07 1400","vavg":17.865331608216135,"vmin":17.722419317921712,"vmax":18.01918186210931},
        {"hr":"1999-12-07 1300","vavg":17.56605798686948,"vmin":17.458368301925177,"vmax":17.71739019862159},
        {"hr":"1999-12-07 1200","vavg":17.40458936276629,"vmin":17.368867780575272,"vmax":17.454852368963145},
        {"hr":"1999-12-07 1100","vavg":17.33248974254639,"vmin":17.27896670990057,"vmax":17.407587548638137},
        {"hr":"1999-12-07 1000","vavg":17.190492831923596,"vmin":17.04019480684622,"vmax":17.27246890974288},
        {"hr":"1999-12-07 0900","vavg":17.049391122640156,"vmin":16.686376236616564,"vmax":17.39913150733705},
        {"hr":"1999-12-07 0800","vavg":17.382844726736344,"vmin":17.35021998423235,"vmax":17.39881996897332},
        {"hr":"1999-12-07 0700","vavg":17.22438593033409,"vmin":16.969253070878157,"vmax":17.350843060959797},
        {"hr":"1999-12-07 0600","vavg":16.220778003214743,"vmin":15.7107715978739,"vmax":16.950649780015777},
    ];
        

    module.exports = exports.DbFacade = DbFacade;
})(typeof exports === "object" ? exports : (exports = {}));

