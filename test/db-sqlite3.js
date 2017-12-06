(typeof describe === 'function') && describe("DbSqlite3", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(2017,2,8,1,2,3); // local time
    const testDate2 = new Date(2017,2,8,1,3,4); // local time
    const testDate3 = new Date(2017,2,7,11,22,33); // local time
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
                should(r).instanceof(Array);
                should(r.length).equal(2);
                should(r[0]).properties(["d","t","v"]);
                should(r[1]).properties(["d","t","v"]);

                // database date and time are stored in UTC
                should(Number(r[0].d.slice(0,4))).equal(testDate3.getUTCFullYear());
                should(Number(r[0].d.slice(5,7))).equal(testDate3.getUTCMonth()+1);
                should(Number(r[0].d.slice(8,10))).equal(testDate3.getUTCDate());
                should(Number(r[0].t.slice(0,2))).equal(testDate3.getUTCHours());
                should(Number(r[0].t.slice(3,5))).equal(testDate3.getUTCMinutes());
                should(Number(r[0].t.slice(6,8))).equal(testDate3.getUTCSeconds());
                should(Number(r[1].d.slice(0,4))).equal(testDate2.getUTCFullYear());
                should(Number(r[1].d.slice(5,7))).equal(testDate2.getUTCMonth()+1);
                should(Number(r[1].d.slice(8,10))).equal(testDate2.getUTCDate());
                should(Number(r[1].t.slice(0,2))).equal(testDate2.getUTCHours());
                should(Number(r[1].t.slice(3,5))).equal(testDate2.getUTCMinutes());
                should(Number(r[1].t.slice(6,8))).equal(testDate2.getUTCSeconds());

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
                var sql = 'select strftime("%Y-%m-%d %H00", printf("%s %s",d,t),"localtime") hr,'+
                    'avg(v) vavg, min(v) vmin, max(v) vmax\n'+
                    "from sensordata\n"+
                    "where '2017-03-07'<=d and (d<'2017-03-08' or d='2017-03-08' and t<='01:03:04.000')\n"+
                    "group by hr\n"+
                    "order by hr desc\n"+
                    "limit 24;";
                should(r).properties(["sql","data"]);
                should.deepEqual(r.data, [{
                    hr: '2017-03-08 0100',
                    vavg: 13.5,
                    vmax: 14,
                    vmin: 13,
                },{
                    hr: '2017-03-07 1100',
                    vavg: 12,
                    vmax: 12,
                    vmin: 12,
                }]);
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
