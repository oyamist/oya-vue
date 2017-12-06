(function(exports) {

    class DbFacade {
        constructor(opts = {}) {
            this.isOpen = false;
            this.logPeriod = opts.logPeriod || 1;
            this.logCount = {};
            this.logSum = {};
        }

        static get ERROR_NOT_OPEN() { return new Error("open() database before use"); }
        static get ERROR_ABSTRACT() { return new Error("abstract method must be implemented by subclass"); }

        datestr(date) {
            var yyyy = date.getUTCFullYear();
            var mo = ('0'+(date.getUTCMonth()+1)).slice(-2);
            var dd = ('0'+date.getUTCDate()).slice(-2);
            return `'${yyyy}-${mo}-${dd}'`;
        }

        timestr(date) {
            var hh = ('0'+date.getUTCHours()).slice(-2);
            var mm = ('0'+date.getUTCMinutes()).slice(-2);
            var ss = ('0'+date.getUTCSeconds()).slice(-2);
            var ms = ('00'+date.getUTCMilliseconds()).slice(-3);
            return `'${hh}:${mm}:${ss}.${ms}'`;
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
            return Promise.resolve([{
                error: DbFacade.ERROR_ABSTRACT,
            }])
        }

        logSensor(vname, evt, value, date=new Date()) {
            try {
                this.logCount[evt] = this.logCount[evt] || 0;
                this.logSum[evt] = this.logSum[evt] || 0;
                if (this.logCount[evt] >= this.logPeriod) {
                    this.logCount[evt] = 0;
                    this.logSum[evt] = 0;
                } 
                this.logCount[evt]++;
                this.logSum[evt] += value;
                var stmt = `insert into sensordata(vessel,evt,d,t,v) values(` +
                    `'${vname}',` +
                    `'${evt}',` +
                    `${this.datestr(date)},` +
                    `${this.timestr(date)},` +
                    `${this.logSum[evt] / this.logCount[evt]}` +
                    ');';
                if (!this.isOpen) {
                    return Promise.reject(DbFacade.ERROR_NOT_OPEN);
                }
                return this.logCount[evt] == this.logPeriod 
                    ? this.sqlExec(stmt) : Promise.resolve(null);
            } catch(e) {
                return Promise.reject(e);
            }
        }

        sensorDataByHour(vname, evt, enddate=new Date()) {
            return new Promise((resolve,reject) => {
                try {
                    var d1 = this.datestr(new Date(enddate.getTime() - 24*3600*1000));
                    var d2 = this.datestr(enddate);
                    var t2 = this.timestr(enddate);
                    var sql = `select strftime("%Y-%m-%d %H00", printf("%s %s",d,t),"localtime") hr, `+
                        `avg(v) vavg, min(v) vmin, max(v) vmax\n`+
                        `from sensordata\n`+
                        `where ${d1}<=d and (d<${d2} or d=${d2} and t<=${t2})\n`+
                        `group by hr\n`+
                        `order by hr desc\n`+
                        `limit 24;`;
                    this.sqlAll(sql).then(data=>{
                        resolve( { sql, data, });
                    }).catch(e=>reject(e));
                } catch (e) {
                    return Promise.reject(e);
                }
            });
        }

    } //// class DbFacade

    module.exports = exports.DbFacade = DbFacade;
})(typeof exports === "object" ? exports : (exports = {}));

