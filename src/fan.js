(function(exports) {
    const winston = require('winston');
    const OyaMist = require('./oyamist');
    var JSONKEYS = null;

    class Fan {
        constructor(options = {}) {
            var opts = Object.assign(Fan.FAN_DEFAULT, options);

            this.update(opts);
            JSONKEYS = JSONKEYS || Object.keys(this).sort();

            // unserialized options
            opts.emitter && (this.emitter = opts.emitter);
            this.onActivate(false);
        }

        get emitter() {
            return this._emitter;
        }
        set emitter(value){
            this._emitter = value;
            winston.info(`Fan.emitter on:${this.rhEvent}`);
            this._emitter.on(this.rhEvent, value => {
                this.onRelativeHumidity(value, this.pinPWM);
            });
            winston.info(`Fan.emitter on:${OyaMist.EVENT_ACTIVATE}`);
            this._emitter.on(OyaMist.EVENT_ACTIVATE, value => this.onActivate(value));
        }

        onActivate(value) {
            var pwm = (value ? this.pwmDefault : 0);
            winston.info(`Fan.onActivate(${value}) emitPwm:${pwm}`);
            this.emitPwm(pwm);
            this._isActive = !!value;
            return this;
        }

        get isActive() {
            return this._isActive;
        }

        update(opts = {}) {
            // serializable toJSON() properties
            this.type = opts.type || this.type;
            this.name = opts.name || this.name;
            this.pinPwm = Number(opts.pinPwm) || this.pinPwm || -1;
            this.pinPwm = opts.pinPwm != null
                ? Number(opts.pinPwm)
                : (this.pinPwm != null ? this.pinPwm : -1);
            this.pwmDefault = opts.pwmDefault != null 
                ? Number(opts.pwmDefault)
                : this.pwmDefault || 0;
            this.rhMax = opts.rhMax || this.rhMax;
            this.rhMin = opts.rhMin || this.rhMin;
            this.rhEvent = opts.rhEvent || this.rhEvent;
            return this;
        }

        static get TYPE_NONE() { return "fan:none"; }
        static get TYPE_PWM() { return "fan:pwm"; }

        static get FAN_RASPBERRY_PI() {
            return Object.assign(Fan.FAN_DEFAULT, {
                name: "Raspberry Pi PWM Fan",
                type: Fan.TYPE_PWM,
                pinPwm: 12,
                pwmDefault: 0.8,
            });
        }
        static get FAN_NONE() {
            return {
                name: "(no fan)",
                type: Fan.TYPE_NONE,
                pinPwm: -1,
                pwmDefault: 0,
                rhMin: 0.5,
                rhMax: 0.7,
                rhEvent: OyaMist.SENSE_HUMIDITY_CANOPY,
            }
        }
        static get FAN_DEFAULT() {
            return Fan.FAN_NONE;
        }

        emitPwm(pwm) {
            if (this.emitter) {
                this.emitter.emit(OyaMist.EVENT_FAN_PWM, pwm, this.pinPwm)
            } else {
                winston.info(`Fan.emitPwm(${pwm}) ignored (no emitter)`);
            }
            this.pwm = pwm;
        }

        onRelativeHumidity(value) {
            if (this.isActive && this.type === Fan.TYPE_PWM) {
                var pwm = (value - this.rhMin)/(this.rhMax-this.rhMin);
                pwm =  Math.max(0, Math.min(pwm, 1));
                this.emitPwm(pwm);
            }
        }

        toJSON() {
            return JSONKEYS.reduce((acc,k) => ((acc[k] = this[k]),acc), {});
        }

    } //// class Fan

    module.exports = exports.Fan = Fan;
})(typeof exports === "object" ? exports : (exports = {}));

