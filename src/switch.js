(function(exports) {
    const OyaVessel = require('./oya-vessel');
    const EventEmitter = require('events');
    const winston = require('winston');

    class Switch {
        constructor(opts = {}) {
            // serializable toJSON() properties
            this.name = opts.name || 'Switch';
            this.type = opts.type || Switch.ACTIVE_HIGH;
            this.desc = opts.desc || `Switch active:${this.type === Switch.ACTIVE_HIGH ? 'high' : 'low'}`;
            this.pin = opts.pin || Switch.NOPIN;
            this.event = opts.event || Switch.EVENT_SWITCH;
        }

        static get NOPIN() { return -1; }
        static get EVENT_SWITCH() { return 'event:switch'; }
        static get ACTIVE_HIGH() { return 'active:high'; }
        static get ACTIVE_LOW() { return 'active:low'; }

        emitTo(emitter, rawInput) {
            var evtValue = this.type === Switch.ACTIVE_HIGH ? rawInput : !rawInput;
            emitter.emit(this.event, evtValue);
        }

        toJSON() {
            return this;
        }

    } //// class Switch

    module.exports = exports.Switch = Switch;
})(typeof exports === "object" ? exports : (exports = {}));
