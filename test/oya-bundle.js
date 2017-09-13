(typeof describe === 'function') && describe("OyaBundle", function() {
    const should = require("should");
    const OyaBundle = require("../index").OyaBundle;
    const OyaConf = require("../index").OyaConf;
    const supertest = require('supertest');
    const winston = require('winston');
    const srcPkg = require("../package.json");
    const rb = require('rest-bundle');
    const rbh = new rb.RbHash();
    const fs = require('fs');
    const APIMODEL_PATH = `api-model/${srcPkg.name}.test.oya-conf.json`;
    const DEFAULT_CONF = new OyaConf().toJSON();
    const DEFAULT_APIMODEL = Object.assign({}, DEFAULT_CONF );
    const app = require("../scripts/server.js");

    winston.level = "warn";

    function testRestBundle(app) {
        return app.locals.restBundles.filter(rb => rb.name==='test')[0];
    }
    function testInit() { 
        return app;
    }
    var version = "UNKNOWN";

    it("Initialize TEST suite", function(done) { // THIS TEST MUST BE FIRST
        var async = function*() {
            if (testRestBundle(app) == null) {
                yield app.locals.asyncOnReady.push(async);
            }
            winston.info("test suite initialized");
            done();
        }();
        async.next();
    });
    it("GET /identity returns RestBundle identity", function(done) {
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
                        cycle: 'standard',
                        fanThreshold: 80,
                    });
                    should(apiModel.mist).properties([
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

                // change camera1 name
                var newConf = JSON.parse(JSON.stringify(curConf));
                var putData = {
                    apiModel: newConf,
                };
                newConf.name = 'OyaMist01';
                var response = yield supertest(app).put("/test/oya-conf").send(putData).expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should.ok(apiModel);
                    apiModel.type.should.equal("OyaConf");
                    apiModel.name.should.equal("OyaMist01");
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
    it("finalize TEST suite", function() {
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})
