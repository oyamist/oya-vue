(function(exports) {

    class DbFacade {
        constructor(opts = {}) {
            this.isOpen = false;
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

        open() {
            this.isOpen = true;
        }

        exec(sql) {
            // subclass should override with method that executes sql
            return Promise.reject(new Error('not implemented'));
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
                return this.exec(stmt);
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
        exec(sql) {
            this.stmts.push(sql);
        }
    }

    it("TESTTESTdatestr(date) returns SQL date string", function() {
        var logger = new DbFacade();
        logger.datestr(testDate).should.equal("'2017-03-09'");
    });
    it("TESTTESTtimestr(date) returns SQL time string", function() {
        var logger = new DbFacade();
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
