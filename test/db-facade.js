(typeof describe === 'function') && describe("DbFacade", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(Date.UTC(2017,2,10,1,2,3,456));
    const DbFacade = exports.DbFacade || require('../index').DbFacade;
    const path = require('path');
    const fs = require('fs');
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

    it("utcstr(date) returns SQL utc date string", function() {
        DbFacade.utcstr(testDate).should.equal("'2017-03-10 01:02:03.456'");
    });
    it("logSensor(vname,evt,value,date) logs sensor data via sqlExec(sql) method", function(done) {
        var async = function*() {
            try {
                var dbl = new TestLogger({
                    logPeriod: 2, // log every 2 events
                });
                dbl.stmts.length.should.equal(0);
                var r = yield dbl.logSensor("test", "testevt", 10, testDate)
                    .then(r=>async.throw(new Error("expected catch()"))).catch(e=>async.next(e));
                should.deepEqual(r, DbFacade.ERROR_NOT_OPEN);
                var r = yield dbl.open().then(r=>async.next(r)).catch(e=>async.throw(e));

                var r = yield dbl.logSensor("test", "testevt", 11, testDate)
                    .then(r=>async.next(r)).catch(e=>async.throw(e));
                var stmt = "insert into sensordata(utc,evt,ctx,v) values" +
                    "('2017-03-10 01:02:03.456','testevt','test',10.5);"
                should.deepEqual(r, stmt);
                dbl.stmts.length.should.equal(1);
                dbl.stmts[0].should.equal(stmt);

                // odd event is not logged
                var r = yield dbl.logSensor("test", "testevt", 12, testDate)
                    .then(r=>async.next(r)).catch(e=>async.throw(e));
                should(r).equal(null);
                dbl.stmts.length.should.equal(1);

                // even event is logged
                var r = yield dbl.logSensor("test", "testevt", 13, testDate)
                    .then(r=>async.next(r)).catch(e=>async.throw(e));
                var stmt = "insert into sensordata(utc,evt,ctx,v) values" +
                    "('2017-03-10 01:02:03.456','testevt','test',12.5);"
                should.deepEqual(r, stmt);
                dbl.stmts.length.should.equal(2);

                done();
            } catch (e) {
                done(e);
            }
        }();
        async.next();
    });
    it("sqlGet(sql) returns JSON object for single tuple query", function(done) {
        (async function() {
            try {
                var dbl = new TestLogger();
                var r = await dbl.open();
                var r = await dbl.sqlGet("select count(*) c from sensordata");
                var resultObject = {
                    error: DbFacade.ERROR_ABSTRACT,
                }; // subclass result JSON should match returned tuple
                should.deepEqual(r, resultObject);
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("sensorDataByHour(evt,date) summarizes sensor data by hour", function(done) {
        (async function () {
            try {
                var dbl = new TestLogger();
                var r = await dbl.open();

                // single events
                var enddate = new Date('2017-03-10T01:02:03.456Z'); 
                var r = await dbl.sensorDataByHour('testevt', enddate);
                should(r).properties(["sql","data"]);
                should(r.sql).match(/select strftime\("%Y-%m-%d %H00",utc,"localtime"\) hr, avg\(v\) vavg, .*evt/m);
                should(r.sql).match(/from sensordata/m);
                var pat = new RegExp(`where utc between '2017-03-09 01:02:03.456' and '2017-03-10 01:02:03.456'`,'m');
                should(r.sql).match(pat);
                should(r.sql).match(/and evt in \('testevt'\)/m);
                should(r.sql).match(/group by evt, hr/m);
                should(r.sql).match(/order by evt, hr desc/m);
                should(r.sql).match(/limit 24/m);
                should(r.data).instanceOf(Array);
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("sensorAvgByHour(fields,startdate,hours) summarizes sensor data by hour", function(done) {
        (async function () {
            try {
                var dbl = new TestLogger();
                var r = await dbl.open();

                // single field
                var startdate = new Date('2017-03-09T01:02:03.456Z'); 
                var r = await dbl.sensorAvgByHour(['ecInternal'], startdate, 24);
                should(r).properties(["sql","data"]);
                should(r.sql).match(/select strftime\("%Y-%m-%d %H00",utc,"localtime"\) hr, avg\(v\) vavg, .*evt/m);
                should(r.sql).match(/from sensordata/m);
                var pat = new RegExp(`where utc between '2017-03-09 01:02:03.456' and '2017-03-10 01:02:03.456'`,'m');
                should(r.sql).match(pat);
                should(r.sql).match(/and evt in \('sense: ec-internal'\)/m);
                should(r.sql).match(/group by evt, hr/m);
                should(r.sql).match(/order by evt, hr desc/m);
                should(r.sql).match(/limit 24/m);
                should(r.data).instanceOf(Array);

                // multiple fields 
                var startdate = new Date('2017-03-09T01:02:03.456Z'); 
                var r = await dbl.sensorAvgByHour(['ecInternal','tempInternal'], startdate, 24);
                should(r).properties(["sql","data"]);
                should(r.sql).match(/select strftime\("%Y-%m-%d %H00",utc,"localtime"\) hr, avg\(v\) vavg, .*evt/m);
                should(r.sql).match(/from sensordata/m);
                var pat = new RegExp(`where utc between '2017-03-09 01:02:03.456' and '2017-03-10 01:02:03.456'`,'m');
                should(r.sql).match(pat);
                should(r.sql).match(/and evt in \('sense: ec-internal','sense: temp-internal'\)/m);
                should(r.sql).match(/group by evt, hr/m);
                should(r.sql).match(/order by evt, hr desc/m);
                should(r.sql).match(/limit 48/m);
                should(r.data).instanceOf(Array);

                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("hourlySummary(data,fields) summarizes data by hour for given fields", function() {
        var sqlDataPath = path.join(__dirname, 'ecInternal.json');
        var sqlData = JSON.parse(fs.readFileSync(sqlDataPath));

        // default allows null values 
        var result = DbFacade.hourlySummary(sqlData.data);
        should(result.length).equal(71);
        result.forEach(r => {
            should(r).properties(['hr','tempInternal']);
        });
        should(result[result.length-1].hasOwnProperty('ecInternal')).equal(false); // no value

        // only return data having all specified fields
        var result = DbFacade.hourlySummary(sqlData.data, ['ecInternal', 'tempInternal']);
        should(result.length).equal(64);
        result.forEach(r => {
            should(r).properties(['hr','ecInternal', 'tempInternal']);
        });
    });
    it ("normalizeDataByHour fills in missing data", function() {
        var data = [
            {"hr":"1999-12-08 1300","vavg":17.57570134387154,"vmin":17.430819409475856,"vmax":17.951177487856373},
            {"hr":"1999-12-08 1200","vavg":18.074496982104563,"vmin":17.99795274789553,"vmax":18.104765901172403},
        ];
        var normData = DbFacade.normalizeDataByHour(data);
        normData.length.should.equal(24);
        should(data[0].hr).equal("1999-12-08 2300");
        should(data[23].hr).equal("1999-12-08 0000");
    });
})
