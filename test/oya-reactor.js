
(typeof describe === 'function') && describe("OyaReactor", function() {
    const should = require("should");
    const EventEmitter = require("events");
    const winston = require('winston');
    const OyaReactor = exports.OyaReactor || require("../index").OyaReactor;
    const OyaCycle = exports.OyaCycle || require("../index").OyaCycle;
    const OyaConf = require("../index").OyaConf;
    const STANDARD_ON = 0.005;
    const STANDARD_OFF = 0.01;
    const FAN_ON = 2*STANDARD_ON;
    const FAN_OFF = 2*STANDARD_OFF;
    var testTimer = OyaConf.createTimer();
    testTimer.cycles[OyaConf.CYCLE_STANDARD].on = STANDARD_ON;
    testTimer.cycles[OyaConf.CYCLE_STANDARD].off = STANDARD_OFF;
    testTimer.cycles[OyaConf.CYCLE_FAN].on = FAN_ON;
    testTimer.cycles[OyaConf.CYCLE_FAN].off = FAN_OFF;
    var level = winston.level;
    winston.level = 'error';

    it ("", function() {
        winston.level = 'debug';
        var senseEmitter = new EventEmitter();
        var reactor = new OyaReactor("test", {
            senseEmitter,
        });
        should(reactor.oyaCycle.nextCycle).equal(OyaConf.CYCLE_STANDARD);
        const fanThreshold = reactor.oyaConf.fanThreshold;
        should(typeof fanThreshold).equal("number");

        // just right
        senseEmitter.emit(OyaReactor.SENSE_TEMP_INTERNAL, reactor.oyaConf.fanThreshold-1);
        should(reactor.oyaCycle.nextCycle).equal(OyaConf.CYCLE_STANDARD);

        // too hot
        senseEmitter.emit(OyaReactor.SENSE_TEMP_INTERNAL, reactor.oyaConf.fanThreshold+1);
        should(reactor.oyaCycle.nextCycle).equal(OyaConf.CYCLE_FAN);
    });
    it ("TESTTEST finalize test suite", function() {
        winston.level = level;
    });
})
