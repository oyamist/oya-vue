(typeof describe === 'function') && describe("OyaNet", function() {
    const should = require("should");
    const OyaNet = exports.OyaNet || require('../index').OyaNet;
    const supertest = require('supertest');
    const app = require("../scripts/server.js");
    const winston = require('winston');

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
    it("ipv4Candidates() returns list of ipv4 host candidates", function(done) {
        (async function() {
            try {
                var onet = new OyaNet();
                var addrs = onet.ipv4Candidates();
                should(addrs.length).above(1);
                addrs.forEach(addr => {
                    should(addr).properties(["host","port"]);
                    should(addr.host).match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/);
                    should(addr.port+"").match(/80|8080/);
                });
                should(addrs[0]).not.equal(addrs[addrs.length-1]);
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("probeHost(host) returns promise resolved if given host supports OyaMist", function(done) {
        (async function() {
            try {
                var onet = new OyaNet();

                // should fail on non-OyaMist host
                var ms = Date.now();
                try {
                    var r = await onet.probeHost('216.58.217.206'); // google host
                } catch (e) {
                    var r = e;
                }
                should(Date.now()-ms).below(1.2*onet.timeout);
                should(r).instanceOf(Error);

                // should succeed on OyaMist host
                var ms = Date.now();
                try {
                    var r = await onet.probeHost({
                        host: '127.0.0.1',
                        path: '/test/identity',
                        port: 8080,
                    });
                } catch (e) {
                    var r = e;
                }
                should(Date.now()-ms).below(1.2*onet.timeout);
                should(r).not.instanceOf(Error);
                should(r).properties({
                    name: 'test',
                    package: 'oya-vue',
                    ip: '127.0.0.1',
                });
                should(r).properties(["version"]);
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
    it("identifyHosts() returns ipv4 array of local OyaMist host identities", function(done) {
        (async function() {
            try {
                var onet = new OyaNet();
                var hosts = await onet.identifyHosts();
                should(hosts).instanceOf(Array);
                should(hosts.length).above(0);
                done();
            } catch (e) {
                done(e);
            }
        })();
    });
})

