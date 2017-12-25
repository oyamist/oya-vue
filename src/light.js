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
            this.cycleStartDay = opts.cycleStartDay || 0; // Sunday
            this.cycleStartTime = opts.cycleStartTime || '06:00';
            this.cycleDays = opts.cycleDays || 1;
            this.cycleOn = opts.cycleOn || 12;
            this.cycleOff = opts.cycleOff || 12;
            this.spectrum = spectrum;
            this.desc = opts.desc || actDefault.desc || 'generic Light';
            this.pin = opts.pin || Light.NOPIN;
            this.event = opts.event || actDefault.event;
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
            var cycle = this.createCycle(date);
            return cycle[1].t;
        }

        createCycle(date = new Date()) {
            var cycle = [];
            var startSec = Number(this.cycleStartTime.substr(0,2)) * 60 * 60 +
                Number(this.cycleStartTime.substr(3)) * 60;
            var cycleDay = (7 + date.getDay() - this.cycleStartDay) % 7;
            var dateSec = 
                cycleDay * 60 * 60 * 24 +
                date.getHours() * 60 * 60 + 
                date.getMinutes() * 60 + 
                date.getSeconds();
            var cycleOn = Number(this.cycleOn);
            var cycleOff = Number(this.cycleOff);
            var periodSec = (cycleOn + cycleOff) * 60 * 60;
            var daysSec = 60*60*24 * this.cycleDays;
            var nPeriods = Math.round(daysSec / periodSec);
            var cycleSec = (dateSec + periodSec - startSec) % periodSec;
            var onSec = cycleOn * 60 * 60;
            var offSec = cycleOff * 60 * 60;
            var t = 0;
            var value = cycleSec < onSec;
            cycle.push({
                t,
                event: this.event,
                value,
            });
            t = value ? onSec - cycleSec : periodSec - cycleSec;
            while (cycle.length < 2*nPeriods) {
                value = !value;
                cycle.push({
                    t,
                    event: this.event,
                    value,
                });
                if (value) {
                    t += onSec;
                } else {
                    t += offSec;
                }
            }

            return cycle;
        }

        runCycle(emitter, cycle, period=this.cycleDays*60*60*24) { 
            if (! emitter instanceof EventEmitter) {
                throw new Error("expected EventEmitter");
            }
            if (! cycle instanceof Array) {
                throw new Error("expected cycle Array");
            }
            if (typeof period !== 'number') {
                throw new Error("expected number of seconds for period");
            }

            emitter.on(this.event, value => {
                this.pin >= 0 && winston.info(`${this.name} ${value ? 'on':'off'}`);
            });

            var timers = [];
            var context = {};
            var periodMs = period * 1000;
            var createTimers = () => {
                cycle.forEach(c => {
                    var timer = setTimeout(() => {
                        emitter.emit(c.event, c.value);
                    }, 1000*c.t);
                    timers.push(timer);
                });
            };
            createTimers();
            context.interval = setInterval(() => createTimers(), periodMs);

            var stopTimers = () => {
                context.interval && clearInterval(context.interval);
                context.interval = null;
                var timer;
                while ((timer = timers.pop())) {
                    clearTimeout(timer);
                }
            };

            return stopTimers;
        }

        toJSON() {
            return this;
        }

    } //// class Light

    module.exports = exports.Light = Light;
})(typeof exports === "object" ? exports : (exports = {}));
