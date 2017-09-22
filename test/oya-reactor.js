
(typeof describe === 'function') && describe("OyaReactor", function() {
    const should = require("should");
    const srcPkg = require("../package.json");
    const rb = require('rest-bundle');
    const rbh = new rb.RbHash();
    const supertest = require('supertest');
    const fs = require('fs');
    const APIMODEL_PATH = `api-model/${srcPkg.name}.test.oya-conf.json`;
    const app = require("../scripts/server.js");
    const EventEmitter = require("events");
    const winston = require('winston');
    const OyaReactor = exports.OyaReactor || require("../index").OyaReactor;
    const OyaCycle = exports.OyaCycle || require("../index").OyaCycle;
    const OyaConf = require("../index").OyaConf;
    const STANDARD_ON = 0.005;
    const STANDARD_OFF = 0.01;
    const FAN_ON = 2*STANDARD_ON;
    const FAN_OFF = 2*STANDARD_OFF;
    const DEFAULT_CONF = new OyaConf().toJSON();
    const DEFAULT_APIMODEL = Object.assign({}, DEFAULT_CONF );
    var testTimer = OyaConf.createTimer();
    testTimer.cycles[OyaConf.CYCLE_STANDARD].on = STANDARD_ON;
    testTimer.cycles[OyaConf.CYCLE_STANDARD].off = STANDARD_OFF;
    testTimer.cycles[OyaConf.CYCLE_FAN].on = FAN_ON;
    testTimer.cycles[OyaConf.CYCLE_FAN].off = FAN_OFF;
    var level = winston.level;
    winston.level = 'warn';

    function testInit() { 
        return app;
    }

    it("Initialize TEST suite", function(done) { // THIS TEST MUST BE FIRST
        var async = function*() {
            if (null == app.locals.restBundles.filter(rb => rb.name==='test')[0]) {
                yield app.locals.asyncOnReady.push(async);
            }
            winston.info("test suite initialized");
            done();
        }();
        async.next();
    });
    it("GET /identity returns reactor identity", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var response = yield supertest(app).get("/test/identity").expect((res) => {
                    res.statusCode.should.equal(200);
                    should(res.body).properties({
                        name: 'test',
                        package: srcPkg.name,
                    });
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("GET /oya-conf returns OyaMist apiModel", function(done) {
        var async = function* () {
            try {
                var app = testInit();

                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }
                var response = yield supertest(app).get("/test/oya-conf").expect((res) => {
                    console.log("res", res.body);
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should(apiModel).properties({
                        type: 'OyaConf',
                        name: 'test',
                        tempUnit: 'F',
                        startCycle: OyaConf.CYCLE_STANDARD,
                        hotCycle: OyaConf.CYCLE_FAN,
                        fanThreshold: 80,
                    });
                    should(apiModel.timers[0].cycles).properties([
                        OyaConf.CYCLE_FAN,
                        OyaConf.CYCLE_STANDARD,
                        OyaConf.CYCLE_DRAIN,
                    ]);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("PUT /oya-conf updates OyaConf apiModel", function(done) {
        var async = function* () {
            try {
                winston.level = 'warn';
                var app = testInit();
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }

                // request without rbHash should be rejected and current model returned
                var badData = {
                    apiModel: {
                        test: "bad-data",
                    }
                }
                var response = yield supertest(app).put("/test/oya-conf").send(badData).expect((res) => {
                    res.statusCode.should.equal(400); // BAD REQUEST (no rbHash)
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                var curConf = response.body.data.apiModel;
                should(curConf).properties({
                    type: "OyaConf",
                });

                // change name
                var newConf = JSON.parse(JSON.stringify(curConf));
                var putData = {
                    apiModel: newConf,
                };
                newConf.name = 'OyaMist01';
                newConf.fanThreshold = 81;
                var response = yield supertest(app).put("/test/oya-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should.ok(apiModel);
                    apiModel.type.should.equal("OyaConf");
                    apiModel.name.should.equal("OyaMist01");
                    apiModel.fanThreshold.should.equal(81);
                    should.deepEqual(apiModel, Object.assign({},newConf,{
                        rbHash: rbh.hash(newConf),
                    }));
                    should.ok(apiModel);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it ("reactor response to senseEmitter events", function() {
        winston.level = 'debug';
        var senseEmitter = new EventEmitter();
        var reactor = new OyaReactor("test", {
            senseEmitter,
        });
        should(reactor.vessel.nextCycle).equal(OyaConf.CYCLE_STANDARD);
        const fanThreshold = reactor.oyaConf.fanThreshold;
        should(typeof fanThreshold).equal("number");

        // just right
        senseEmitter.emit(OyaReactor.SENSE_TEMP_INTERNAL, reactor.oyaConf.fanThreshold-1);
        should(reactor.vessel.nextCycle).equal(OyaConf.CYCLE_STANDARD);

        // too hot
        senseEmitter.emit(OyaReactor.SENSE_TEMP_INTERNAL, reactor.oyaConf.fanThreshold+1);
        should(reactor.vessel.nextCycle).equal(OyaConf.CYCLE_FAN);
    });
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})

