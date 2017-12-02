(typeof describe === 'function') && describe("DbFacade", function() {
    const winston = require('winston');
    const should = require("should");
    const testDate = new Date(2017,2,10,1,2,3,456);
    const DbFacade = exports.DbFacade || require('../index').DbFacade;
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
        dbl.datestr(testDate).should.equal("'2017-03-10'");
    });
    it("timestr(date) returns SQL time string", function() {
        var dbl = new DbFacade();
        dbl.timestr(testDate).should.equal("'01:02:03.456'");
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
                var stmt = "insert into sensordata(vessel,evt,d,t,v) values" +
                    "('test','testevt','2017-03-10','01:02:03.456',10.5);"
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
                var stmt = "insert into sensordata(vessel,evt,d,t,v) values" +
                    "('test','testevt','2017-03-10','01:02:03.456',12.5);"
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
})
