(function(exports) {
    const DbFacade = require('./db-facade');
    const Sqlite3 = require('sqlite3').verbose();

    class DbSqlite3 extends DbFacade {
        constructor(opts = {}) {
            super(opts);
            var self = this;
            this.dbname = opts.dbname || './oyamist.db';
            Object.defineProperty(this, 'isOpen', {
                get: () => this.db ? true : false,
            });
        }

        open() {
            return new Promise((resolve, reject) => {
                var db = new Sqlite3.Database(this.dbname, Sqlite3.OPEN_READWRITE, e=>{
                    if (e) {
                        winston.error(e);
                        reject(e);
                    } else {
                        this.db = db;
                        resolve(this);
                    }
                });
            });
        }

        sqlGet(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            return new Promise((resolve, reject) => {
                this.db.get(sql, [], (e,r) => {
                    if (e) {
                        reject(e);
                    } else {
                        resolve(r);
                    }
                });
            });
        }

        sqlExec(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            return new Promise((resolve, reject) => {
                this.db.run(sql, [], (e) => {
                    if (e) {
                        reject(e);
                    } else {
                        resolve(sql);
                    }
                });
            });
        }

    } //// class DbSqlite3

    module.exports = exports.DbSqlite3 = DbSqlite3;
})(typeof exports === "object" ? exports : (exports = {}));

(typeof describe === 'function') && describe("DbSqlite3", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(2017,2,9,1,2,3);
    const DbFacade = require('./db-facade');
    const DbSqlite3 = exports.DbSqlite3 || require('./index').DbSqlite3;
    const TESTDATESTR = "'2017-03-09'";

    it("logSensor(vname,evt,value,date) logs sensor data", function(done) {
        var async = function*() {
            try {
                var dbl = new DbSqlite3();
                const stmtDel = `delete from sensordata where sensordata.vessel='test'`;
                const stmtCount = `select count(*) c from sensordata as sd where sd.d=${TESTDATESTR}`;

                // open() must be called before use
                var r = yield dbl.logSensor("test", "testevt", 12.34, testDate)
                    .then(r=>async.throw(new Error("expected catch()"))).catch(e=>async.next(e));
                should.deepEqual(r, DbFacade.ERROR_NOT_OPEN);
                should(dbl.db).equal(undefined);
                var r = yield dbl.open().then(r=>async.next(r)).catch(e=>async.throw(e));
                dbl.should.properties(["db"]);
                should(dbl.isOpen).equal(true);

                // remove test data
                yield dbl.sqlExec(stmtDel).then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbl.sqlGet(stmtCount).then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r.c).equal(0);

                // insert sensordata row
                yield dbl.logSensor("test", "testevt", 12.34, testDate)
                    .then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbl.sqlGet(stmtCount).then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r.c).equal(1);

                // remove test data
                yield dbl.sqlExec(stmtDel).then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbl.sqlGet(stmtCount).then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r.c).equal(0);

                done();
            } catch (e) {
                done(e);
            }
        }();
        async.next();
    });
    it("sqlGet(sql) returns JSON object for single tuple query", function(done) {
        (async function () {
            try {
                var dbl = await new DbSqlite3().open();
                var r = await dbl.sqlGet("select count(*) c from sensordata as sd where sd.vessel='test'");
                should.deepEqual(r, { c: 0 }); 
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
})
