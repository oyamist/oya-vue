(function(exports) {

    class DbFacade {
        constructor(opts = {}) {
            this.isOpen = false;
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
                var stmt = `insert into sensordata(vessel,evt,d,t,v) values(` +
                    `'${vname}',` +
                    `'${evt}',` +
                    `${this.datestr(date)},` +
                    `${this.timestr(date)},` +
                    `${value}` +
                    ');';
                return this.sqlExec(stmt);
            } catch(e) {
                return Promise.reject(e);
            }
        }

    } //// class DbFacade

    module.exports = exports.DbFacade = DbFacade;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("DbFacade", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(2017,2,9,1,2,3);
    const DbFacade = exports.DbFacade || require('./index').DbFacade;
    class TestLogger extends DbFacade {
        constructor(opts={}) {
            super(opts);
            this.stmts = [];
        }
        sqlExec(sql) {
            if (!this.isOpen) {
                return super.sqlExec(sql);
            }
            this.stmts.push(sql);
            return Promise.resolve(sql);
        }
    }

    it("datestr(date) returns SQL date string", function() {
        var dbl = new DbFacade();
        dbl.datestr(testDate).should.equal("'2017-03-09'");
    });
    it("timestr(date) returns SQL time string", function() {
        var dbl = new DbFacade();
        dbl.timestr(testDate).should.equal("'01:02:03'");
    });
    it("logSensor(vname,evt,value,date) logs sensor data via sqlExec(sql) method", function(done) {
        var async = function*() {
            try {
                var dbl = new TestLogger();
                dbl.stmts.length.should.equal(0);
                var stmt = "insert into sensordata(vessel,evt,d,t,v) values" +
                    "('test','testevt','2017-03-09','01:02:03',12.34);"
                var r = yield dbl.logSensor("test", "testevt", 12.34, testDate)
                    .then(r=>async.throw(new Error("expected catch()"))).catch(e=>async.next(e));
                should.deepEqual(r, DbFacade.ERROR_NOT_OPEN);
                var r = yield dbl.open().then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbl.logSensor("test", "testevt", 12.34, testDate)
                    .then(r=>async.next(r)).catch(e=>async.throw(e));
                should.deepEqual(r, stmt);
                dbl.stmts.length.should.equal(1);
                dbl.stmts[0].should.equal(stmt);
                done();
            } catch (e) {
                done(e);
            }
        }();
        async.next();
    });
    it("sqlGet(sql) returns JSON object for single tuple query", function(done) {
        var async = function*() {
            try {
                var dbl = new TestLogger();
                var r = yield dbl.open().then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbl.sqlGet("select count(*) c from sensordata")
                    .then(r=>async.next(r)).catch(e=>async.throw(e));
                var resultObject = {
                    error: DbFacade.ERROR_ABSTRACT,
                }; // subclass result JSON should match returned tuple
                should.deepEqual(r, resultObject);
                done();
            } catch (e) {
                done(e);
            }
        }();
        async.next();
    });
})
