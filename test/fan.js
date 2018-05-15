(typeof describe === 'function') && describe("Fan", function() {
    const winston = require('winston');
    winston.level = 'warn';
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
    it("TESTTESTactivate(value) enables fan", () => {
        // New fans are inactive
        var fan = new Fan(Fan.FAN_RASPBERRY_PI);
        should(fan.isActive).equal(false);

        // Binding an EventEmitter does not affect activation
        var event = null;
        var emitter = new EventEmitter();
        emitter.on(OyaMist.EVENT_FAN_PWM, (pwm, pin) => {
            event = { pwm, pin };
        });
        fan.emitter = emitter;
        should.deepEqual(event, null);
        should(fan.isActive).equal(false);

        // Activation sets default fan speed
        emitter.emit(OyaMist.EVENT_ACTIVATE, true);
        should.deepEqual(event, {
            pwm: Fan.FAN_RASPBERRY_PI.pwmDefault,
            pin: 12,
        });
        should(fan.isActive).equal(true);

        // De-activation sets fan speed to 0
        emitter.emit(OyaMist.EVENT_ACTIVATE, false);
        should.deepEqual(event, {
            pwm: 0,
            pin: 12,
        });
        should(fan.isActive).equal(false);
        should(fan.pwm).equal(0);
    });
    it("TESTTESTonRelativeHumidity(value) should emit pwm fan event", () => {
        var fan = new Fan(Fan.FAN_RASPBERRY_PI);

        var event = null;
        var emitter = new EventEmitter();
        emitter.on(OyaMist.EVENT_FAN_PWM, (pwm, pin) => {
            event = { pwm, pin };
        });
        fan.emitter = emitter;
        should.deepEqual(event, null);

        // Activation sets default fan speed
        fan.onActivate(true);
        should.deepEqual(event, {
            pwm: Fan.FAN_RASPBERRY_PI.pwmDefault,
            pin: 12,
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

        // inactive fan ignores humidity events
        fan.onActivate(false);
        event = null;
        should(fan.isActive).equal(false);
        emitter.emit(fan.rhEvent, rh);
        should(event).equal(null);
        should(fan.pwm).equal(0);
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
        should(fan.pwm).equal(0);
    });
    it("TESTTESTFan is serializable", () => {
        var fan = new Fan(Fan.FAN_RASPBERRY_PI);
        var json = JSON.parse(JSON.stringify(fan));
        should.deepEqual(Object.keys(json).sort(), [
            'name',
            'pinPwm',
            'pwmDefault',
            'rhEvent',
            'rhMax',
            'rhMin',
            'type',
        ]);
        var fan2 = new Fan(json);
        should.deepEqual(fan2, fan);
        should(fan.pwmDefault).equal(0.8);

        var fanDefault = new Fan();
        var json = JSON.parse(JSON.stringify(fanDefault));
        should.deepEqual(json, {
            name: "(no fan)",
            type: Fan.TYPE_NONE,
            pinPwm: -1,
            pwmDefault: 0,
            rhMin: 0.5,
            rhMax: 0.7,
            rhEvent: OyaMist.SENSE_HUMIDITY_CANOPY,
        });
    });
    it("TESTTESTFan is serializable", () => {
    });

})
