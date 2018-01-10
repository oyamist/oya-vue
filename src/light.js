(function(exports) {
    const OyaVessel = require('./oya-vessel');
    const EventEmitter = require('events');
    const winston = require('winston');

    class Light {
        constructor(opts = {}) {
            if (opts.hasOwnProperty('spectrum')) {
                if (0>Light.SPECTRUM_DEFAULTS.findIndex(lt => (lt.spectrum === opts.spectrum))) {
                    throw new Error(`Unknown spectrum:${opts.spectrum}`);
                }
                var spectrum = opts.spectrum;
            } else {
                var spectrum = Light.SPECTRUM_FULL;
            }
            var actDefault = Light.SPECTRUM_DEFAULTS.filter(
                lt => (lt.spectrum===spectrum))[0] || {};

            // serializable toJSON() properties
            this.name = opts.name || actDefault.name || `${spectrum} light`;
            this.type = opts.type || actDefault.type || Light.Light_SPST_NO;
            this.cycleStartDay = Number(opts.cycleStartDay) || 0; // Sunday
            this.cycleStartTime = ("0" +(opts.cycleStartTime || '06:00')).substr(-5);
            this.cycleDays = Number(opts.cycleDays) || 1;
            this.cycleOn = opts.cycleOn == null ?  12 : Number(opts.cycleOn);
            this.cycleOff = opts.cycleOff == null ? 12 : Number(opts.cycleOff);
            this.spectrum = spectrum;
            this.desc = opts.desc || actDefault.desc || 'generic Light';
            this.pin = Number(opts.pin) || Light.NOPIN;
            this.event = opts.event || actDefault.event;

            this.jsonKeys = Object.keys(this).sort();
        }

        static get NOPIN() { return -1; }
        static get Light_SPST_NO() { return "Light:spst:no"; }
        static get EVENT_LIGHT_FULL() { return "event:Full light"; }
        static get EVENT_LIGHT_BLUE() { return "event:Blue light"; }
        static get EVENT_LIGHT_RED() { return "event:Red light"; }
        static get SPECTRUM_FULL() { return "Full spectrum"; }
        static get SPECTRUM_BLUE() { return "Blue spectrum"; }
        static get SPECTRUM_RED() { return "Red spectrum"; }
        static get LIGHT_FULL() {
            return {
                name: "White light",
                spectrum: Light.SPECTRUM_FULL,
                event: Light.EVENT_LIGHT_FULL,
                desc: 'Turn on full spectrum lights',
                type: Light.Light_SPST_NO,
            }
        }
        static get LIGHT_BLUE() {
            return {
                name: "Blue light",
                spectrum: Light.SPECTRUM_BLUE,
                event: Light.EVENT_LIGHT_BLUE,
                desc: 'Turn on blue lights',
                type: Light.Light_SPST_NO,
            }
        }
        static get LIGHT_RED() {
            return {
                name: "Red light",
                spectrum: Light.SPECTRUM_RED,
                event: Light.EVENT_LIGHT_RED,
                desc: 'Turn on red lights',
                type: Light.Light_SPST_NO,
            }
        }
        static get SPECTRUM_DEFAULTS() { 
            return [
                Light.LIGHT_FULL, 
                Light.LIGHT_BLUE, 
                Light.LIGHT_RED,
            ];
        }

        countdown(date=new Date()) {
            var cycleStartTime = ('0000' + this.cycleStartTime.replace(/:/,'')).substr(-4);
            var startSec = Number(cycleStartTime.substr(0,2)) * 60 * 60 +
                Number(cycleStartTime.substr(-2)) * 60;
            var cycleDay = (7 + date.getDay() - Number(this.cycleStartDay)) % 7;
            var dateSec = 
                cycleDay * 60 * 60 * 24 +
                date.getHours() * 60 * 60 + 
                date.getMinutes() * 60 + 
                date.getSeconds();
            var cycleOn = Number(this.cycleOn);
            var cycleOff = Number(this.cycleOff);
            var cycleOnSec = Math.round(cycleOn * 3600);
            var cycleOffSec = Math.round(cycleOff * 3600);
            var periodSec = cycleOnSec + cycleOffSec;
            var cycleSec = (dateSec + periodSec - startSec) % periodSec;

            return cycleSec < cycleOnSec
                ? cycleOnSec - cycleSec 
                : periodSec - cycleSec;
        }

        static isLightOnAt(light, date = new Date()) {
            var cycleStartTime = ('0000' + light.cycleStartTime.replace(/:/,'')).substr(-4);
            var startSec = Number(cycleStartTime.substr(0,2)) * 60 * 60 +
                Number(cycleStartTime.substr(-2)) * 60;
            var cycleDay = (7 + date.getDay() - Number(light.cycleStartDay)) % 7;
            var dateSec = 
                cycleDay * 60 * 60 * 24 +
                date.getHours() * 60 * 60 + 
                date.getMinutes() * 60 + 
                date.getSeconds();
            var cycleOn = Number(light.cycleOn);
            var cycleOff = Number(light.cycleOff);
            var cycleOnSec = Math.round(cycleOn * 3600);
            var cycleOffSec = Math.round(cycleOff * 3600);
            var periodSec = cycleOnSec + cycleOffSec;
            var cycleSec = (dateSec + periodSec - startSec) % periodSec;
            return cycleSec < cycleOnSec;
        }

        toJSON() {
            return this.jsonKeys.reduce((acc,k) => ((acc[k] = this[k]),acc), {});
        }

    } //// class Light

    module.exports = exports.Light = Light;
})(typeof exports === "object" ? exports : (exports = {}));

