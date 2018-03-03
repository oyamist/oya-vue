(typeof describe === 'function') && describe("DbSqlite3", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(2017,2,8,1,2,3); // local time
    const testDate2 = new Date(2017,2,8,1,3,4); // local time
    const testDate3 = new Date(2017,2,7,11,22,33); // local time
    const DbFacade = require('../index').DbFacade;
    const DbSqlite3 = exports.DbSqlite3 || require('../index').DbSqlite3;
    const TESTDATESTR = "'2017-03-08'";
    const stmtDel = `delete from sensordata where sensordata.ctx='test'`;
    const fs = require('fs');
    const path = require('path');
    const exec = require('child_process').exec;

    var dbopts = {
        dbname: 'unit-test-v1.0.db',
    };

    it("TESTTESTinitialize unit test database", function(done) {
        (async function(){
            var r = await new Promise((resolve, reject) => {
                var script = exec(`scripts/unit-test.sh`, (error, stdout, stderr) => {
                    resolve({ error, stdout, stderr });
                });
            });
            should(r.error).equal(null);
            should(r.stderr).equal('');
            done();
        })();
    });
    it("logSensor(vname,evt,value,date) logs sensor data", function(done) {
        var async = function*() {
            try {
                var dbfacade = new DbSqlite3(dbopts);
                const stmtCount = `select count(*) c from sensordata as sd where sd.evt='testevt'`;

                // open() must be called before use
                var r = yield dbfacade.logSensor("test", "testevt", 12.34, testDate)
                    .then(r=>async.throw(new Error("expected catch()"))).catch(e=>async.next(e));
                should.deepEqual(r, DbFacade.ERROR_NOT_OPEN);
                should(dbfacade.db).equal(undefined);
                var r = yield dbfacade.open().then(r=>async.next(r)).catch(e=>async.throw(e));
                dbfacade.should.properties(["db"]);
                should(dbfacade.isOpen).equal(true);

                // remove test data
                yield dbfacade.sqlExec(stmtDel).then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbfacade.sqlGet(stmtCount).then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r.c).equal(0);

                // insert sensordata row
                yield dbfacade.logSensor("test", "testevt", 12.34, testDate)
                    .then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbfacade.sqlGet(stmtCount).then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r.c).equal(1);

                // remove test data
                yield dbfacade.sqlExec(stmtDel).then(r=>async.next(r)).catch(e=>async.throw(e));
                var r = yield dbfacade.sqlGet(stmtCount).then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r.c).equal(0);

                done();
            } catch (e) {
                winston.error(e.stack);
                done(e);
            }
        }();
        async.next();
    });
    it("sqlGet(sql) returns JSON object for single tuple query", function(done) {
        (async function () {
            try {
                var dbfacade = await new DbSqlite3(dbopts).open();
                var r = await dbfacade.sqlGet("select count(*) c from sensordata as sd where sd.ctx='test'");
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
                var dbfacade = await new DbSqlite3(dbopts).open();
                var r = await dbfacade.sqlExec(stmtDel);
                var r = await dbfacade.sqlGet("select count(*) c from sensordata as sd where sd.ctx='test'");
                should.deepEqual(r, { c: 0 }); 
                await dbfacade.logSensor("test", "testevt", 12, testDate3);
                await dbfacade.logSensor("test", "testevt", 13, testDate2);

                var r = await dbfacade.sqlAll("select utc,v from sensordata as sd where sd.ctx='test'");
                should(r).instanceof(Array);
                should(r.length).equal(2);
                should(r[0]).properties(["utc","v"]);
                should(r[1]).properties(["utc","v"]);

                // database date and time are stored in UTC
                should(Number(r[0].utc.slice(0,4))).equal(testDate3.getUTCFullYear());
                should(Number(r[0].utc.slice(5,7))).equal(testDate3.getUTCMonth()+1);
                should(Number(r[0].utc.slice(8,10))).equal(testDate3.getUTCDate());
                should(Number(r[0].utc.slice(11,13))).equal(testDate3.getUTCHours());
                should(Number(r[0].utc.slice(14,16))).equal(testDate3.getUTCMinutes());
                should(Number(r[0].utc.slice(17,19))).equal(testDate3.getUTCSeconds());
                should(Number(r[1].utc.slice(0,4))).equal(testDate2.getUTCFullYear());
                should(Number(r[1].utc.slice(5,7))).equal(testDate2.getUTCMonth()+1);
                should(Number(r[1].utc.slice(8,10))).equal(testDate2.getUTCDate());
                should(Number(r[1].utc.slice(11,13))).equal(testDate2.getUTCHours());
                should(Number(r[1].utc.slice(14,16))).equal(testDate2.getUTCMinutes());
                should(Number(r[1].utc.slice(17,19))).equal(testDate2.getUTCSeconds());

                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("sensorDataByHour(evt,date) summarizes sensor data by hour for charting", function(done) {
        (async function () {
            try {
                var dbfacade = await new DbSqlite3(dbopts).open();
                var r = await dbfacade.sqlExec(stmtDel); // cleanup
                var r = await dbfacade.sqlGet("select count(*) c from sensordata as sd where sd.ctx='test'");
                should.deepEqual(r, { c: 0 }); 
                await dbfacade.logSensor("test", "testevt", 12, testDate3);
                await dbfacade.logSensor("test", "testevt", 13, testDate2);
                await dbfacade.logSensor("test", "otherevt", 100, testDate2);
                await dbfacade.logSensor("test", "testevt", 14, testDate);

                // single event
                var r = await dbfacade.sensorDataByHour('testevt', testDate2);
                should(r).properties(["sql","data"]);
                should.deepEqual(r.data[22], {
                    evt: 'testevt',
                    hr: '2017-03-08 0100',
                    vavg: 13.5,
                    vmax: 14,
                    vmin: 13,
                });
                should.deepEqual(r.data[36], {
                    evt: 'testevt',
                    hr: '2017-03-07 1100',
                    vavg: 12,
                    vmax: 12,
                    vmin: 12,
                });
                should(r.data.length).equal(48);
                should(r.data.filter(d=>d.evt==='testevt').length).equal(48);

                // null is returned for hours with no data
                should(r.data.filter(d=>d.vavg==null).length).equal(46);

                var r = await dbfacade.sqlExec(stmtDel); // cleanup

                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("sensorAvgByHour(fields,startdate,hours) summarizes sensor data by hour", function(done) {
        (async function () {
            try {
                var dbfacade = await new DbSqlite3(dbopts).open();
                var r = await dbfacade.open();
                should(r).properties({
                    dbname: 'unit-test-v1.0.db',
                    isOpen: true,
                    logCount: {},
                    logPeriod: 1,
                    logSum: {},
                });
                var startdate = new Date(2018, 0, 21); // local time

                // single field
                var r = await dbfacade.sensorAvgByHour(['ecInternal'], startdate, 24);
                should(r).properties(["sql","data"]);
                var pat = new RegExp(`where utc between '2018-01-21 00:00:00.000' and '2018-01-22 00:00:00.000`,'m');
                should(r.data).instanceOf(Array);
                should(r.data.length).equal(24);
                should(r.data[0].hr).equal('2018-01-21 2300');
                should(r.data[23].hr).equal('2018-01-21 0000');
                should.deepEqual(Object.keys(r.data[0]).sort(), [
                    'ecInternal',
                    'hr',
                ]);
                should(r.data[23].hr).equal('2018-01-21 0000');

                // multiple fields 
                var r = await dbfacade.sensorAvgByHour(['ecInternal','tempInternal'], startdate, 24);
                should(r).properties(["sql","data"]);
                should(r.data).instanceOf(Array);
                should(r.data[0].hr).equal('2018-01-21 2300');
                should(r.data[23].hr).equal('2018-01-21 0000');
                should.deepEqual(Object.keys(r.data[0]).sort(), [
                    'ecInternal',
                    'hr',
                    'tempInternal',
                ]);
                should(r.data.length).equal(24);
                var sum = r.data.reduce((a,d) => {
                    a.ecInternal = a.ecInternal || 0;
                    a.ecInternal += d.ecInternal;
                    a.tempInternal = a.tempInternal || 0;
                    a.tempInternal += d.tempInternal;
                    return a;
                },{});
                var e = 0.5;
                should(sum.ecInternal/24).approximately(473.3,e);
                should(sum.tempInternal/24).approximately(16.5,e);

                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("TESTTESTsensorAvgBy10m(fields,startdate,hours) summarizes sensor data by 10-minute intervals", function(done) {
        (async function () {
            try {
                var dbfacade = await new DbSqlite3(dbopts).open();
                var r = await dbfacade.open();
                should(r).properties({
                    dbname: 'unit-test-v1.0.db',
                    isOpen: true,
                    logCount: {},
                    logPeriod: 1,
                    logSum: {},
                });
                var startdate = new Date(2018, 0, 21); // local time

                // single field
                var r = await dbfacade.sensorAvgBy10m(['ecInternal'], startdate, 24);
                should(r).properties(["sql","data"]);
                var pat = new RegExp(`where utc between '2018-01-21 00:00:00.000' and '2018-01-22 00:00:00.000`,'m');
                should(r.data).instanceOf(Array);
                should(r.data.length).equal(6*24);
                should(r.data[0].hr).equal('2018-01-21 2350');
                should(r.data[143].hr).equal('2018-01-21 0000');
                should.deepEqual(Object.keys(r.data[0]).sort(), [
                    'ecInternal',
                    'hr',
                ]);
                should(r.data[143].hr).equal('2018-01-21 0000');

                // multiple fields 
                var r = await dbfacade.sensorAvgBy10m(['ecInternal','tempInternal'], startdate, 24);
                should(r).properties(["sql","data"]);
                should(r.data).instanceOf(Array);
                should(r.data[0].hr).equal('2018-01-21 2350');
                should(r.data[143].hr).equal('2018-01-21 0000');
                should.deepEqual(Object.keys(r.data[0]).sort(), [
                    'ecInternal',
                    'hr',
                    'tempInternal',
                ]);
                should(r.data.length).equal(144);
                var sum = r.data.reduce((a,d) => {
                    a.ecInternal = a.ecInternal || 0;
                    a.ecInternal += d.ecInternal;
                    a.tempInternal = a.tempInternal || 0;
                    a.tempInternal += d.tempInternal;
                    return a;
                },{});
                var e = 0.5;
                should(sum.ecInternal/144).approximately(473.3,e);
                should(sum.tempInternal/144).approximately(16.5,e);

                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("TESTTESTfinalize test suite", function(done) {
        (async function() {
            try {
                var dbfacade = await new DbSqlite3(dbopts).open();
                var r = await dbfacade.sqlExec(stmtDel); // cleanup
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
})
