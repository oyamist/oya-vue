(function(exports) {
    const DbFacade = require('./db-facade');
    const Sqlite3 = require('sqlite3').verbose();

    class DbSqlite3 extends DbFacade {
        constructor(opts = {}) {
            super(opts);
            var self = this;
            this.dbname = opts.dbname || './oyamist.db';
        }

        open() {
            return new Promise((resolve, reject) => {
                var db = new Sqlite3.Database(this.dbname, Sqlite3.OPEN_READWRITE, e=>{
                    if (e) {
                        winston.error(e);
                        reject(e);
                    } else {
                        self.db = db;
                        resolve(db);
                    }
                });
            });
        }

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

        exec(sql) {
            // default behavior is to do nothing
            // subclass should override with method that executes sql
        }

        logSensor(vname, evt, value, date=new Date()) {
            var stmt = `insert into sensordata(vessel,evt,d,t,v) values(` +
                `'${vname}',` +
                `'${evt}',` +
                `${this.datestr(date)},` +
                `${this.timestr(date)},` +
                `${value}` +
                ');';
            this.exec(stmt);
            return stmt;
        }

    } //// class DbSqlite3

    module.exports = exports.DbSqlite3 = DbSqlite3;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("DbSqlite3", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(2017,2,9,1,2,3);
    const DbSqlite3 = exports.DbSqlite3 || require('./index').DbSqlite3;
    class TestLogger extends DbSqlite3 {
        constructor(opts={}) {
            super(opts);
            this.stmts = [];
        }
        exec(sql) {
            this.stmts.push(sql);
        }
    }

    it("TESTTESTdatestr(date) returns SQL date string", function() {
        var logger = new DbSqlite3();
        logger.datestr(testDate).should.equal("'2017-03-09'");
    });
    it("TESTTESTtimestr(date) returns SQL time string", function() {
        var logger = new DbSqlite3();
        logger.timestr(testDate).should.equal("'01:02:03'");
    });
    it("TESTTESTlogSensor(vname,evt,value,date) logs sensor data via exec(sql) method", function() {
        var logger = new TestLogger();
        logger.stmts.length.should.equal(0);
        var stmt = "insert into sensordata(vessel,evt,d,t,v) values" +
            "('test','testevt','2017-03-09','01:02:03',12.34);"
        logger.logSensor("test", "testevt", 12.34, testDate).should.equal(stmt);
        logger.stmts.length.should.equal(1);
        logger.stmts[0].should.equal(stmt);
    });
})
