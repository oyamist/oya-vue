(typeof describe === 'function') && describe("DbSqlite3", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(2017,2,8,1,2,3);
    const testDate2 = new Date(2017,2,8,1,3,4);
    const testDate3 = new Date(2017,2,7,11,22,33);
    const DbFacade = require('../index').DbFacade;
    const DbSqlite3 = exports.DbSqlite3 || require('../index').DbSqlite3;
    const TESTDATESTR = "'2017-03-08'";
    const stmtDel = `delete from sensordata where sensordata.vessel='test'`;

    it("logSensor(vname,evt,value,date) logs sensor data", function(done) {
        var async = function*() {
            try {
                var dbl = new DbSqlite3();
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
    it("sqlAll(sql) returns result array of tuples ", function(done) {
        (async function () {
            try {
                var dbl = await new DbSqlite3().open();
                var r = await dbl.sqlExec(stmtDel);
                var r = await dbl.sqlGet("select count(*) c from sensordata as sd where sd.vessel='test'");
                should.deepEqual(r, { c: 0 }); 
                await dbl.logSensor("test", "testevt", 12, testDate3);
                await dbl.logSensor("test", "testevt", 13, testDate2);

                var r = await dbl.sqlAll("select d,t,v from sensordata as sd where sd.vessel='test'");
                should.deepEqual(r, [{ 
                    d: '2017-03-07',
                    t: '11:22:33.000',
                    v: 12,
                },{
                    d: '2017-03-08',
                    t: '01:03:04.000',
                    v: 13,
                }]); 
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("sensorDataByHour(vname,evt,date) summarizes sensor data by hour", function(done) {
        (async function () {
            try {
                var dbl = await new DbSqlite3().open();
                var r = await dbl.sqlExec(stmtDel); // cleanup
                var r = await dbl.sqlGet("select count(*) c from sensordata as sd where sd.vessel='test'");
                should.deepEqual(r, { c: 0 }); 
                await dbl.logSensor("test", "testevt", 12, testDate3);
                await dbl.logSensor("test", "testevt", 13, testDate2);
                await dbl.logSensor("test", "testevt", 14, testDate);

                var r = await dbl.sensorDataByHour('test','testevt', testDate2);
                var sql = 'select d, printf("%s00",substr(t,1,2)) hr,avg(v) vavg, min(v) vmin, max(v) vmax\n'+
                    "from sensordata\n"+
                    "where '2017-03-07'<=d and (d<'2017-03-08' or d='2017-03-08' and t<='01:03:04.000')\n"+
                    "group by d,hr\n"+
                    "order by d desc, hr desc\n"+
                    "limit 24;";
                should.deepEqual(r, {
                    sql,
                    data: [{ 
                        d: '2017-03-08',
                        hr: '0100',
                        vavg: 13.5,
                        vmax: 14,
                        vmin: 13,
                    },{
                        d: '2017-03-07',
                        hr: '1100',
                        vavg: 12,
                        vmax: 12,
                        vmin: 12,
                    }],
                }); 
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("TESTTESTfinalize test suite", function(done) {
        (async function() {
            try {
                var dbl = await new DbSqlite3().open();
                var r = await dbl.sqlExec(stmtDel); // cleanup
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
})
