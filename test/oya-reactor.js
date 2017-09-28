
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
    const OyaConf = require("../index").OyaConf;
    const OyaVessel = require("../index").OyaVessel;
    const STANDARD_ON = 0.005;
    const STANDARD_OFF = 0.01;
    const FAN_ON = 2*STANDARD_ON;
    const FAN_OFF = 2*STANDARD_OFF;
    const DEFAULT_CONF = new OyaConf().toJSON();
    const DEFAULT_APIMODEL = Object.assign({}, DEFAULT_CONF );
    var testTimer = OyaConf.createVesselConfig();
    testTimer.cycles[OyaVessel.CYCLE_STANDARD].on = STANDARD_ON;
    testTimer.cycles[OyaVessel.CYCLE_STANDARD].off = STANDARD_OFF;
    testTimer.cycles[OyaVessel.CYCLE_COOL].on = FAN_ON;
    testTimer.cycles[OyaVessel.CYCLE_COOL].off = FAN_OFF;
    var level = winston.level;
    winston.level = 'warn';

    function testInit() { 
        return app;
    }
    function testReactor() {
        return app.locals.restBundles.filter(rb => rb.name==='test')[0];
    }

    it("Initialize TEST suite", function(done) { // THIS TEST MUST BE FIRST
        var async = function*() {
            if (null == testReactor()) {
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
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should(apiModel).properties({
                        type: 'OyaConf',
                        name: 'test',
                        tempUnit: 'F',
                    });
                    should(apiModel.vessels[0].cycles).properties([
                        OyaVessel.CYCLE_COOL,
                        OyaVessel.CYCLE_STANDARD,
                        OyaVessel.CYCLE_DRAIN,
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
                newConf.vessels[0].coolThreshold = 81;
                newConf.vessels[0].cycles[OyaVessel.CYCLE_STANDARD].on = 3;
                var response = yield supertest(app).put("/test/oya-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should.ok(apiModel);
                    apiModel.type.should.equal("OyaConf");
                    apiModel.name.should.equal("OyaMist01");
                    apiModel.vessels[0].coolThreshold.should.equal(81);
                    should.deepEqual(apiModel, Object.assign({},newConf,{
                        rbHash: rbh.hash(newConf),
                    }));
                    should(testReactor().vessels[0].name).equal('vessel1');
                    should(testReactor().vessels[0].cycles[OyaVessel.CYCLE_STANDARD].on).equal(3);
                    should(testReactor().vessels[0].coolThreshold).equal(81);
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
    it("POST /actuator changes actuator state", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }

                var vessel = testReactor().vessels[0];
                should(vessel.state.Mist1).equal(false);

                // turn on Mist1
                var command = {
                    name: "Mist1",
                    value: true,
                }
                var res = yield supertest(app).post("/test/actuator").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(200);
                should(vessel.state.Mist1).equal(true);
                should.deepEqual(res.body, {
                    name: 'Mist1',
                    value: true,
                });

                // turn on non-existent actuator
                var command = {
                    name: "invalid-actuator",
                    value: true,
                }
                winston.warn("The following warning is expected");
                var res = yield supertest(app).post("/test/actuator").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(500);
                should(res.body.error).match(/unknown activator/);

                // omit value
                var command = {
                    name: "Mist1",
                }
                winston.warn("The following warning is expected");
                var res = yield supertest(app).post("/test/actuator").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(500);
                should(res.body.error).match(/no value provided/);
                should(vessel.state.Mist1).equal(true);

                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("POST /vessel changes vessel state", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }

                var vessel = testReactor().vessels[0];
                should(vessel.state.active).equal(false);

                // change cycle
                var command = {
                    cycle: OyaVessel.CYCLE_COOL,
                }
                winston.level="warn";
                should(vessel.cycle).equal(OyaVessel.CYCLE_STANDARD);
                var res = yield supertest(app).post("/test/vessel").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(200);
                should(vessel.cycle).equal(OyaVessel.CYCLE_COOL);
                should.deepEqual(res.body, {
                    cycle: OyaVessel.CYCLE_COOL,
                });

                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("POST /reactor changes vessel state", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }

                var vessel = testReactor().vessels[0];
                should(vessel.state.active).equal(false);

                // activate vessel
                var command = {
                    activate: true,
                }
                var res = yield supertest(app).post("/test/reactor").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(200);
                should(vessel.state.active).equal(true);
                should.deepEqual(res.body, {
                    activate: true,
                });

                done();
            } catch(err) {
                winston.error(err.message, err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})

