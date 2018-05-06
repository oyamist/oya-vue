(typeof describe === 'function') && describe("Fan", function() {
    const winston = require('winston');
    const should = require("should");
    const Fan = require("../index").Fan;
    const OyaMist = require("../index").OyaMist;
    const EventEmitter = require("events");

    it("constructor", () => {
        var fan = new Fan();
        should(fan).properties(Fan.FAN_DEFAULT);
        var fan = new Fan(Fan.FAN_DEFAULT);
        should(fan).properties(Fan.FAN_DEFAULT);
        var fan = new Fan(Fan.FAN_RASPBERRY_PI);
        should(fan).properties(Fan.FAN_RASPBERRY_PI);
        should(fan.rhEvent).equal(OyaMist.SENSE_HUMIDITY_CANOPY);
    });
    it("update(opts) applies serializable options", () => {
        var fan = new Fan();
        should(fan.update(Fan.FAN_RASPBERRY_PI)).properties(Fan.FAN_RASPBERRY_PI);
        should(fan.update()).properties(Fan.FAN_RASPBERRY_PI);
        should(fan.update(Fan.FAN_DEFAULT)).properties(Fan.FAN_DEFAULT);
    });
    it("some constructor options are not serializable", () => {
        var transientOpts = {
            emitter: new EventEmitter(),
        }

        var fan = new Fan(transientOpts);
        should(fan).properties(transientOpts);

        var json = JSON.parse(JSON.stringify(fan));
        var fan2 = new Fan(json);
        Object.keys(transientOpts).forEach(key => {
            should(fan2.hasOwnProperty(key)).equal(false);
        });
    });
    it("onRelativeHumidity(value) should emit pwm fan event", () => {
        var fan = new Fan(Fan.FAN_RASPBERRY_PI);
        var emitter = new EventEmitter();
        fan.emitter = emitter;
        var event = null;
        emitter.on(OyaMist.EVENT_FAN_PWM, (pwm, pin) => {
            event = { pwm, pin };
        });

        // bounds
        fan.onRelativeHumidity(0);
        should.deepEqual(event, {
            pwm: 0,
            pin: 12,
        });
        fan.onRelativeHumidity(1);
        should.deepEqual(event, {
            pwm: 1,
            pin: 12,
        });
        fan.onRelativeHumidity(fan.rhMin);
        should.deepEqual(event, {
            pwm: 0,
            pin: 12,
        });
        fan.onRelativeHumidity(fan.rhMax);
        should.deepEqual(event, {
            pwm: 1,
            pin: 12,
        });

        // fractional PWM
        var pwm = Math.random();
        fan.onRelativeHumidity(pwm*(fan.rhMax-fan.rhMin)+fan.rhMin);
        should(event.pwm).approximately(pwm, 0.0001);

        // event
        var pwm = Math.random();
        var rh = pwm*(fan.rhMax-fan.rhMin)+fan.rhMin;
        emitter.emit(fan.rhEvent, rh);
        should(event.pwm).approximately(pwm, 0.0001);
        should(fan.pwm).approximately(pwm, 0.0001);

        emitter.emit(fan.rhEvent, 0);
        should(event.pwm).approximately(0, 0.0001);
        should(fan.pwm).approximately(0, 0.0001);

        emitter.emit(fan.rhEvent, rh);
        should(event.pwm).approximately(pwm, 0.0001);
        should(fan.pwm).approximately(pwm, 0.0001);
    });
    it("default fan does not emit fan event", () => {
        var fan = new Fan(Fan.FAN_DEFAULT);
        var emitter = new EventEmitter();
        fan.emitter = emitter;
        var event = null;
        emitter.on(OyaMist.EVENT_FAN_PWM, (pwm, pin) => {
            event = { pwm, pin };
        });

        // Default fan does not emit PWM fan events
        emitter.emit(fan.rhEvent, 1);
        should(event).equal(null);
        should(fan.pwm).equal(undefined);
    });
    it("Fan is serializable", () => {
        var fan = new Fan(Fan.FAN_RASPBERRY_PI);
        var json = JSON.parse(JSON.stringify(fan));
        should.deepEqual(Object.keys(json).sort(), [
            'name',
            'pinPwm',
            'rhEvent',
            'rhMax',
            'rhMin',
            'type',
        ]);
        var fan2 = new Fan(json);
        should.deepEqual(fan2, fan);

        var fanDefault = new Fan();
        var json = JSON.parse(JSON.stringify(fanDefault));
        should.deepEqual(json, {
            name: "(no fan)",
            type: Fan.TYPE_NONE,
            pinPwm: -1,
            rhMin: 0.5,
            rhMax: 0.7,
            rhEvent: OyaMist.SENSE_HUMIDITY_CANOPY,
        });
    });

})
