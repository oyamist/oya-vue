(typeof describe === 'function') && describe("vue-motion-cam", function() {
    const should = require("should");
    const srcPkg = require("../package.json");
    const rb = require('rest-bundle');
    const v8 = require('v8');
    const rbh = new rb.RbHash();
    const EAVG = 0.01;
    const supertest = require('supertest');
    const fs = require('fs');
    const APIMODEL_PATH = `api-model/${srcPkg.name}.test.oya-conf.json`;
    if (fs.existsSync(APIMODEL_PATH)) {
        fs.unlinkSync(APIMODEL_PATH);
    }
    const app = require("../scripts/server.js"); // access cached instance 
    const EventEmitter = require("events");
    const winston = require('winston');
    const path = require('path');

    it("GET /identity returns VMC identity", function(done) {
        var async = function* () {
            try {
                var response = yield supertest(app).get("/vmc/identity").expect((res) => {
                    res.statusCode.should.equal(200);
                    should(res.body).properties({
                        name: 'vmc',
                        package: 'vue-motion-cam'
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
    it("finalize TEST suite", function() {
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})

