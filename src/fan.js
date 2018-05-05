(function(exports) {
    const OyaVessel = require('./oya-vessel');
    const EventEmitter = require('events');
    const winston = require('winston');
    const OyaMist = require('./oyamist');

    class Fan {
        constructor(options = {}) {
            var opts = Object.assign(Fan.FAN_DEFAULT, options);

            this.update(opts);
            this.jsonKeys = Object.keys(this).sort();

            opts.emitter && (this.emitter = opts.emitter);
        }

        get emitter() {
            return this._emitter;
        }
        set emitter(value){
            this._emitter = value;
            this._emitter.on(this.rhEvent, value => {
                this.onRelativeHumidity(value, this.pinPWM);
            });
        }

        update(opts = {}) {
            // serializable toJSON() properties
            this.type = opts.type;
            this.name = opts.name;
            this.pinPwm = Number(opts.pinPwm);
            this.rhMax = opts.rhMax;
            this.rhMin = opts.rhMin;
            this.rhEvent = opts.rhEvent;
            return this;
        }

        static get TYPE_NONE() { return "fan:none"; }
        static get TYPE_PWM() { return "fan:pwm"; }

        static get FAN_RASPBERRY_PI() {
            return Object.assign(Fan.FAN_DEFAULT, {
                name: "Raspberry Pi PWM Fan",
                type: Fan.TYPE_PWM,
                pinPwm: 12,
            });
        }
        static get FAN_NONE() {
            return {
                name: "(no fan)",
                type: Fan.TYPE_NONE,
                pinPwm: -1,
                rhMin: 0.5,
                rhMax: 0.7,
                rhEvent: OyaMist.SENSE_HUMIDITY_CANOPY,
            }
        }
        static get FAN_DEFAULT() {
            return Fan.FAN_NONE;
        }

        onRelativeHumidity(value) {
            if (this.type === Fan.TYPE_PWM) {
                var pwm = (value - this.rhMin)/(this.rhMax-this.rhMin);
                this.pwm =  Math.max(0, Math.min(pwm, 1));

                this.emitter && this.emitter.emit(OyaMist.EVENT_FAN_PWM, this.pwm, this.pinPwm)
            }
        }

        toJSON() {
            return this.jsonKeys.reduce((acc,k) => ((acc[k] = this[k]),acc), {});
        }

    } //// class Fan

    module.exports = exports.Fan = Fan;
})(typeof exports === "object" ? exports : (exports = {}));

