(typeof describe === 'function') && describe("OyaReactor", function() {
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
    const {
        OyaConf,
        DbReport,
        DbSqlite3,
        OyaMist,
        OyaReactor,
        Actuator,
        Light,
        Sensor,
        Switch,
        OyaVessel,
    } = require('../index');
    const STANDARD_ON = 0.005;
    const STANDARD_OFF = 0.01;
    const FAN_ON = 2*STANDARD_ON;
    const FAN_OFF = 2*STANDARD_OFF;
    const DEFAULT_CONF = new OyaConf().toJSON();
    const DEFAULT_APIMODEL = Object.assign({}, DEFAULT_CONF );

    var testTimer = OyaConf.createVesselConfig();
    testTimer.cycles[OyaMist.CYCLE_STANDARD].on = STANDARD_ON;
    testTimer.cycles[OyaMist.CYCLE_STANDARD].off = STANDARD_OFF;
    testTimer.cycles[OyaMist.CYCLE_COOL].on = FAN_ON;
    testTimer.cycles[OyaMist.CYCLE_COOL].off = FAN_OFF;
    var level = winston.level;
    winston.level = 'warn';

    var testdb = new DbSqlite3({
        dbname: path.join(__dirname, '../unit-test-v1.0.db'),
    });

    function testInit() { 
        return app;
    }
    function testReactor() {
        return app.locals.restBundles.filter(rb => rb.name==='test')[0];
    }

    it("TESTTESTInitialize TEST suite", function(done) { // THIS TEST MUST BE FIRST
        var async = function*() {
            if (null == testReactor()) {
                yield app.locals.asyncOnReady.push(async);
            }
            winston.info("test suite initialized");
            testReactor().vessels[0].dbfacade = testdb;
            var result = yield testdb.open().then(r=>async.next(null)).catch(e=>async.next(e));
            done(result);
        }();
        async.next();
    });
    it("TESTTESTEVENT_RELAY notifies client to change a relay actuator", function() {
        var reactor = new OyaReactor('test', {
            actuators: [
                new Actuator({
                    usage: Actuator.USAGE_MIST,
                    pin: 2,
                    vesselIndex: 0,
                }),
                new Actuator({
                    usage: Actuator.USAGE_COOL,
                    pin: 3,
                }),
                new Actuator({
                    usage: Actuator.USAGE_PRIME,
                    pin: 4,
                }),
            ],
        });
        should(reactor.oyaConf.actuators[0].pin).equal(2);
        should(reactor.oyaConf.actuators[1].pin).equal(3);
        var relayValue = null;
        var relayPin = null;

        // Clients can listen to EVENT_RELAY
        var clientListener = (value, pin) => {
            // example of a client relay listener
            relayValue = value;
            relayPin = pin;
        }
        reactor.emitter.on(OyaReactor.EVENT_RELAY, clientListener);

        // test MIST
        relayValue = null;
        relayPin = null;
        should(reactor.vessels[0].state.Mist).equal(false);
        reactor.vessels[0].emitter.emit(OyaMist.EVENT_MIST, true);
        should(reactor.vessels[0].state.Mist).equal(true);
        should(relayValue).equal(true);
        should(relayPin).equal(2);

        // test COOL
        relayValue = null;
        relayPin = null;
        should(reactor.vessels[0].state.Cool).equal(false);
        reactor.vessels[0].emitter.emit(OyaMist.EVENT_COOL, true);
        should(reactor.vessels[0].state.Cool).equal(true);
        should(relayValue).equal(true);
        should(relayPin).equal(3);

        // test PRIME
        relayValue = null;
        relayPin = null;
        should(reactor.vessels[0].state.Prime).equal(false);
        reactor.vessels[0].emitter.emit(OyaMist.EVENT_PRIME, true);
        should(reactor.vessels[0].state.Prime).equal(true);
        should(relayValue).equal(true);
        should(relayPin).equal(4);
    });
    it("TESTTESTEVENT_CYCLE_MIST sets next cycle to standard", function() {
        var reactor = new OyaReactor();
        reactor.activate(true);
        should(reactor.vessel.isActive).equal(true);
        reactor.vessel.setCycle(OyaMist.CYCLE_COOL);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_COOL);

        // do nothing on false
        reactor.emitter.emit(OyaConf.EVENT_CYCLE_MIST, false);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_COOL);

        // set cycle on true
        reactor.emitter.emit(OyaConf.EVENT_CYCLE_MIST, true);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
    });
    it("TESTTESTEVENT_CYCLE_COOL sets next cycle to cool", function() {
        var reactor = new OyaReactor();
        reactor.activate(true);
        should(reactor.vessel.isActive).equal(true);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_STANDARD);

        // do nothing on false
        reactor.emitter.emit(OyaConf.EVENT_CYCLE_COOL, false);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_STANDARD);

        // set cycle on true
        reactor.emitter.emit(OyaConf.EVENT_CYCLE_COOL, true);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_COOL);
    });
    it("TESTTESTEVENT_CYCLE_PRIME sets next cycle to prime", function() {
        var reactor = new OyaReactor();
        reactor.activate(true);
        should(reactor.vessel.isActive).equal(true);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_STANDARD);

        // do nothing on false
        reactor.emitter.emit(OyaConf.EVENT_CYCLE_PRIME, false);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_STANDARD);

        // set cycle on true
        reactor.emitter.emit(OyaConf.EVENT_CYCLE_PRIME, true);
        should(reactor.vessel.cycle).equal(OyaMist.CYCLE_PRIME);
    });
    it("TESTTESTGET /state returns push state", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var response = yield supertest(app).get("/test/state").expect((res) => {
                    res.statusCode.should.equal(200);
                    var keys = Object.keys(res.body).sort();
                    should.deepEqual(keys, [
                        "Cool",
                        "Mist",
                        "Prime",
                        "active",
                        "api",
                        "countdown",
                        "countstart",
                        "cycle",
                        "cycleNumber",
                        "ecAmbient",
                        "ecCanopy",
                        "ecInternal",
                        "health",
                        "humidityAmbient",
                        "humidityCanopy",
                        "humidityInternal",
                        "lights",
                        "nextCycle",
                        "tempAmbient",
                        "tempCanopy",
                        "tempInternal",
                        "type",
                    ]);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch (e) {
                done(e);
            }
        }();
        async.next();
    });
    it("TESTTESTGET /mcu/hats returns supported MCU extension boards (hats)", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var response = yield supertest(app).get("/test/mcu/hats").expect((res) => {
                    res.statusCode.should.equal(200);
                    should.deepEqual(res.body, [{
                        text: '(none)',
                        value: 'mcu-hat:none',
                    }]);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch (e) {
                done(e);
            }
        }();
        async.next();
    });
    it("TESTTESThealth() returns reactor health", function(done) {
        // an inactive reactor is not healthy
        var reactor = new OyaReactor('test', {
            autoActivate: false
        });
        should.deepEqual(reactor.health(), {
            active: false,
        });
        reactor.activate();
        should.deepEqual(reactor.health(), {
            active: true,
        });

        // sensor health is reported
        var reactor = new OyaReactor('test', {
            autoActivate: false,
            sensors: [{
                type: Sensor.TYPE_AM2315,
                loc: OyaMist.LOC_INTERNAL,
            }],
        });
        reactor.oyaConf.sensors.length.should.equal(1);
        var sensor0 = reactor.oyaConf.sensors[0];
        sensor0.type.should.equal(Sensor.TYPE_AM2315.type);
        sensor0.loc.should.equal(OyaMist.LOC_INTERNAL);
        should(sensor0.lastRead == null).equal(true);
        should.deepEqual(sensor0.health(), {
            "AM2315@internal": 'Sensor is completely unresponsive',
        });

        should.deepEqual(reactor.health(), {
            active: false,
            "AM2315@internal": 'Sensor is completely unresponsive',
        });
        done();
    });
    it("TESTTESTGET /identity returns reactor identity", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var response = yield supertest(app).get("/test/identity").expect((res) => {
                    res.statusCode.should.equal(200);
                    should(res.body).properties({
                        name: 'test',
                        package: srcPkg.name,
                    });

                    // health is part of identity
                    should(res.body.health).properties({
                        active: true,
                    });
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("TESTTESTGET /net/hosts/:service returns local network OyaMist hosts with given service", function(done) {
        var async = function* () {
            try {
                var app = testInit();

                // default service
                var response = yield supertest(app).get("/test/net/hosts").expect((res) => {
                    res.statusCode.should.equal(200);
                    var hosts = res.body;
                    should(hosts).instanceOf(Array);
                    should(hosts.length).above(0);

                    // we're running the test service, and the last host will be localhost
                    var lastHost = hosts[hosts.length-1];
                    should(lastHost).properties({
                        ip: '127.0.0.1',
                        package: 'oya-vue',
                        name: 'test',
                    });
                    should(lastHost).properties([
                        'freemem',
                        'totalmem',
                        'loadavg',
                        'uptime',
                        'version',
                    ]);
                }).end((e,r) => e ? async.throw(e) : async.next(r));

                // custom service
                var response = yield supertest(app).get("/test/net/hosts/test").expect((res) => {
                    res.statusCode.should.equal(200);
                    var hosts = res.body;
                    should(hosts).instanceOf(Array);
                    should(hosts.length).above(0);

                    // we're running the test service, and the last host will be localhost
                    var lastHost = hosts[hosts.length-1];
                    should(lastHost).properties({
                        ip: '127.0.0.1',
                        package: 'oya-vue',
                        name: 'test',
                    });
                    should(lastHost).properties([
                        'freemem',
                        'totalmem',
                        'loadavg',
                        'uptime',
                        'version',
                    ]);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("TESTTESTGET /sensor/data-by-hour returns sensor data summary", function(done) {
        var async = function* () {
            try {
                var app = testInit();

                // one day 
                var url = "/test/sensor/data-by-hour/tempInternal/1/2017-03-10T08:10:20Z";
                var response = yield supertest(app).get(url).expect((res) => {
                    res.statusCode.should.equal(200);
                    var sql = res.body.sql;
                    should(sql).match(/select strftime\("%Y-%m-%d %H00",utc,"localtime"\) hr, avg\(v\) vavg, .*evt/m);
                    should(sql).match(/from sensordata/m);
                    should(sql).match(/where utc between '2017-03-09 08:10:20.000' and '2017-03-10 08:10:20.000'/m);
                    should(sql).match(/and evt in \('sense: temp-internal'\)/m);
                    should(sql).match(/group by evt, hr/m);
                    should(sql).match(/order by evt, hr desc/m);
                    should(sql).match(/limit 24;/m);
                    should(res.body.data).instanceOf(Array);
                }).end((e,r) => e ? async.throw(e) : async.next(r));

                // seven days
                var url = "/test/sensor/data-by-hour/tempInternal/7/2017-03-10T08:10:20Z";
                var response = yield supertest(app).get(url).expect((res) => {
                    res.statusCode.should.equal(200);
                    var sql = res.body.sql;
                    should(sql).match(/select strftime\("%Y-%m-%d %H00",utc,"localtime"\) hr, avg\(v\) vavg, .*evt/m);
                    should(sql).match(/from sensordata/m);
                    should(sql).match(/where utc between '2017-03-03 08:10:20.000' and '2017-03-10 08:10:20.000'/m);
                    should(sql).match(/and evt in \('sense: temp-internal'\)/m);
                    should(sql).match(/group by evt, hr/m);
                    should(sql).match(/order by evt, hr desc/m);
                    should(sql).match(/limit 168;/m);
                    should(res.body.data).instanceOf(Array);
                }).end((e,r) => e ? async.throw(e) : async.next(r));

                // default is 7 days ending today
                var response = yield supertest(app).get("/test/sensor/data-by-hour/tempInternal").expect((res) => {
                    res.statusCode.should.equal(200);
                    should(res.body.sql).match(/select strftime\("%Y-%m-%d %H00",utc,"localtime"\) hr, .*/m);
                    should(res.body.sql).match(/limit 168/m); // 7 days
                    should(res.body.data).instanceOf(Array);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.stack);
                done(err);
            }
        }();
        async.next();
    });
    it("TESTTESTGET /sensor/types returns sensor types", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var response = yield supertest(app).get("/test/sensor/types").expect((res) => {
                    res.statusCode.should.equal(200);
                    should(res.body[0]).properties({ type: 'AM2315' });
                    should(res.body[1]).properties({ type: 'SHT31-DIS' });
                    should(res.body[2]).properties({ type: 'DS18B20' });
                    should(res.body[2].addresses.length).above(0);
                    should(res.body[3]).properties({ type: 'EZO-EC-K1' });
                    should(res.body[4]).properties({ type: 'none' });
                    should(res.body.length).equal(5);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("TESTTESTGET /sensor/locations returns sensor locations", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var response = yield supertest(app).get("/test/sensor/locations").expect((res) => {
                    res.statusCode.should.equal(200);
                    should(res.body[0]).properties({ id: 'internal' });
                    should(res.body[1]).properties({ id: 'canopy' });
                    should(res.body[2]).properties({ id: 'ambient' });
                    should(res.body[3]).properties({ id: 'none' });
                    should(res.body.length).equal(4);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("TESTTESTGET /oya-conf returns OyaMist apiModel", function(done) {
        var async = function* () {
            try {
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }
                var app = testInit();
                var response = yield supertest(app).get("/test/oya-conf").expect((res) => {
                    res.statusCode.should.equal(200);
                    var apiModel = res.body.apiModel;
                    should(apiModel).properties({
                        type: 'OyaConf',
                        tempUnit: 'F',
                    });
                    should(apiModel.vessels[0].cycles).properties([
                        OyaMist.CYCLE_COOL,
                        OyaMist.CYCLE_STANDARD,
                        OyaMist.CYCLE_PRIME,
                    ]);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("TESTTESTPUT /oya-conf updates OyaConf apiModel", function(done) {
        var async = function* () {
            try {
                if (fs.existsSync(APIMODEL_PATH)) {
                    fs.unlinkSync(APIMODEL_PATH);
                }
                var app = testInit();

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
                newConf.vessels[0].cycles[OyaMist.CYCLE_STANDARD].on = 3;
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
                    should(testReactor().vessels[0].cycles[OyaMist.CYCLE_STANDARD].on).equal(3);
                    should(testReactor().vessels[0].coolThreshold).equal(81);
                    should.ok(apiModel);
                }).end((e,r) => e ? async.throw(e) : async.next(r));
                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("TESTTESTPOST /actuator changes actuator state", function(done) {
        var async = function* () {
            try {
                var app = testInit();

                var vessel = testReactor().vessels[0];
                vessel.activate(false);
                should(vessel.state.Mist).equal(false);

                // turn on Mist
                var command = {
                    name: "Mist",
                    value: true,
                }
                var res = yield supertest(app).post("/test/actuator").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(200);
                should(vessel.state.Mist).equal(true);
                should.deepEqual(res.body, {
                    name: 'Mist',
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
                    name: "Mist",
                }
                winston.warn("The following warning is expected");
                var res = yield supertest(app).post("/test/actuator").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(500);
                should(res.body.error).match(/no value provided/);
                should(vessel.state.Mist).equal(true);

                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });

    // TODO
    it("TESTTESTPOST /sensor changes sensor state", function(done) {
        var async = function* () {
            try {
                var app = testInit();
                var vessel = testReactor().vessels[0];
                vessel.activate(false);
                should(vessel.state.tempInternal.value).equal(null);
                should(vessel.state.humidityInternal.value).equal(null);
                should(vessel.state.ecInternal.value).equal(null);

                var command = {
                    tempInternal: 72,
                    humidityInternal: 0.64,
                    ecInternal: 300,
                }
                var res = yield supertest(app).post("/test/sensor").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(200);
                should.deepEqual(vessel.state.tempInternal, {
                    value: 72,
                    avg1: 72,
                    avg2: 72,
                    unit: "C",
                });
                should.deepEqual(vessel.state.humidityInternal, {
                    value: 0.64,
                    avg1: 0.64,
                    avg2: 0.64,
                    unit: "%RH",
                });
                should.deepEqual(vessel.state.ecInternal, {
                    value: 300,
                    avg1: 300,
                    avg2: 300,
                    unit: "\u00b5S",
                });
                should.deepEqual(res.body, {
                    ecInternal: 300,
                    tempInternal: 72,
                    humidityInternal: 0.64,
                });

                var command = {
                    ecInternal: 299,
                    tempInternal: 73,
                    humidityInternal: 0.74,
                }
                var res = yield supertest(app).post("/test/sensor").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(200);
                var avg1 = 73*EAVG + (1-EAVG)*72;
                should.deepEqual(vessel.state.tempInternal, {
                    value: 73,
                    avg1,
                    avg2: avg1*EAVG + (1-EAVG)*72,
                    unit: "C",
                });
                var avg1 = 0.74*EAVG + (1-EAVG)*0.64;
                should.deepEqual(vessel.state.humidityInternal, {
                    value: 0.74,
                    avg1,
                    avg2: avg1*EAVG + (1-EAVG)*0.64,
                    unit: "%RH",
                });
                var avg1 = 299*EAVG + (1-EAVG)*300;
                should.deepEqual(vessel.state.ecInternal, {
                    value: 299,
                    avg1,
                    avg2: avg1*EAVG + (1-EAVG)*300,
                    unit: "\u00b5S",
                });
                should.deepEqual(res.body, {
                    ecInternal: 299,
                    tempInternal: 73,
                    humidityInternal: 0.74,
                });

                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("TESTTESTDeactivating reactor turns off everything", function(done) {
        (async function() {
            try {
                var emitter = new EventEmitter();
                emitter.on(OyaReactor.EVENT_RELAY, (v,pin) => (pinstate[pin] = v));
                var reactor = new OyaReactor('test', {
                    apiFile: '(non-existent file)',
                    emitter,
                    autoActivate: false,
                    lights: [{
                        spectrum: Light.SPECTRUM_FULL,
                        cycleOn: 24,
                        cycleOff: 0,
                        pin: 3,
                    }],
                    actuators: [{
                        usage: Actuator.USAGE_MIST,
                        pin: 2,
                        vesselIndex: 0,
                    }],
                });
                var pinstate = {};
                var EVENT_WAIT = 1;
                
                // wait till reactor is initialized
                await new Promise((resolve,reject) => setTimeout(()=>resolve(1),EVENT_WAIT));

                // activate turns things on
                reactor.activate();
                await new Promise((resolve,reject) => setTimeout(()=>resolve(1),EVENT_WAIT));
                should.deepEqual(pinstate, {
                    2: true,
                    3: true,
                });
                should(reactor.getState().Mist).equal(true);
                should(reactor.getState().lights.white.active).equal(true);

                // deactivate turns things off
                reactor.activate(false);
                await new Promise((resolve,reject) => setTimeout(()=>resolve(1),EVENT_WAIT));
                should.deepEqual(pinstate, {
                    2: false,
                    3: false,
                });
                should(reactor.getState().Mist).equal(false);
                should(reactor.getState().lights.white.active).equal(false);

                done();
            } catch(err) {
                winston.error(err.stack);
                done(err);
            }
        })();
    });
    it("TESTTESTPOST /reactor changes vessel state", function(done) {
        var async = function* () {
            try {
                if (fs.existsSync(APIMODEL_PATH)) {
                    //fs.unlinkSync(APIMODEL_PATH);
                }
                var app = testInit();

                var vessel = testReactor().vessels[0];
                vessel.activate(false);
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

                // change cycle
                var command = {
                    cycle: OyaMist.CYCLE_COOL,
                }
                winston.level="warn";
                should(vessel.cycle).equal(OyaMist.CYCLE_STANDARD);
                var res = yield supertest(app).post("/test/reactor").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                should(res.statusCode).equal(200);
                should(vessel.cycle).equal(OyaMist.CYCLE_COOL);
                should.deepEqual(res.body, {
                    cycle: OyaMist.CYCLE_COOL,
                });

                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it("TESTTESTPOST /sensor/calibrate calibrates sensor", function(done) {
        var async = function* () {
            try {
                var app = testInit();

                var vessel = testReactor().vessels[0];
                vessel.activate(false);
                should(vessel.state.active).equal(false);

                // activate vessel
                var command = {
                    startDate: new Date('2018-01-21T10:20:30Z'),
                    hours: 24,
                    field: 'ecInternal',
                }
                var res = yield supertest(app).post("/test/sensor/calibrate").send(command)
                    .end((e,r) => e ? async.throw(e) : async.next(r));
                var sql = res.body.sql;
                should(sql).match(/select strftime.*evt/m);
                should(sql).match(/from sensordata/m);
                should(sql).match(/where utc between '2018-01-21 10:20:30.000' and '2018-01-22 10:20:30.000'/m);
                should(sql).match(/and evt in \('sense: ec-internal','sense: temp-internal'\)/m);
                should(sql).match(/group by evt, hr/m);
                should(sql).match(/order by evt, hr desc/m);
                should(sql).match(/limit 48;/m);
                var data = res.body.data;
                should(data).instanceOf(Array);
                should(data.length).equal(23);
                var e = 0.1;
                should(data[0].hr).equal('2018-01-22 0200');
                should(data[0].ecInternal).approximately(479.4,e);
                should(data[0].tempInternal).approximately(17.1,e);
                should(data[22].hr).equal('2018-01-21 0400');
                should(data[22].ecInternal).approximately(461,e);
                should(data[22].tempInternal).approximately(15.4,e);
                should(res.body).properties({
                    hours: 24,
                    startDate: '2018-01-21T10:20:30.000Z',
                    field: 'ecInternal',
                });

                done();
            } catch(err) {
                winston.error(err.stack);
                throw(err);
            }
        }();
        async.next();
    });
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
        testReactor().vessels[0].activate(false);
        testReactor().vessels[1].activate(false);
        app.locals.rbServer.close();
        winston.info("end test suite");
    });
})

