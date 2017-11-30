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
            var yyyy = date.getFullYear();
            var mo = ('0'+(date.getMonth()+1)).slice(-2);
            var dd = ('0'+date.getDate()).slice(-2);
            return `'${yyyy}-${mo}-${dd}'`;
        }

        timestr(date) {
            var hh = ('0'+date.getHours()).slice(-2);
            var mm = ('0'+date.getMinutes()).slice(-2);
            var ss = ('0'+date.getSeconds()).slice(-2);
            return `'${hh}:${mm}:${ss}'`;
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

    } //// class DbFacade

    module.exports = exports.DbFacade = DbFacade;
})(typeof exports === "object" ? exports : (exports = {}));

