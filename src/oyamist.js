(function(exports) {
    class OyaMist {
        constructor(opts = {}) {
        }

        static get LOC_INTERNAL() { return "internal"; }
        static get LOC_CANOPY() { return "canopy"; }
        static get LOC_AMBIENT() { return "ambient"; }
        static get LOC_NONE() { return "none"; }
        static get CYCLE_STANDARD() { return "Cycle #1"; }
        static get CYCLE_PRIME() { return "Cycle #2"; }
        static get CYCLE_COOL() { return "Cycle #3"; }
        static get CYCLE_CONSERVE() { return "Cycle #4"; }
        static get EVENT_MIST() { return "event:mist"; }
        static get EVENT_COOL() { return "event:Cool"; }
        static get EVENT_PRIME() { return "event:Prime"; }
        static get EVENT_ACTIVATE() { return "event:activate"; }
        static get SENSE_TEMP_INTERNAL() { return "sense: temp-internal"; }
        static get SENSE_TEMP_CANOPY() { return "sense: temp-canopy"; }
        static get SENSE_TEMP_AMBIENT() { return "sense: temp-ambient"; }
        static get SENSE_HUMIDITY_INTERNAL() { return "sense: humidity-internal"; }
        static get SENSE_HUMIDITY_CANOPY() { return "sense: humidity-canopy"; }
        static get SENSE_HUMIDITY_AMBIENT() { return "sense: humidity-ambient"; }
        static get SENSE_PH() { return "sense: pH"; }
        static get SENSE_PPM() { return "sense: ppm"; }
        static get SENSE_EC_INTERNAL() { return "sense: ec-internal"; }
        static get SENSE_EC_CANOPY() { return "sense: ec-canopy"; }
        static get SENSE_EC_AMBIENT() { return "sense: ec-ambient"; }

        static fieldOfEvent(event) {
            return {
                [OyaMist.SENSE_EC_INTERNAL]:'ecInternal',
                [OyaMist.SENSE_EC_CANOPY]:'ecCanopy',
                [OyaMist.SENSE_EC_AMBIENT]:'ecAmbient',
                [OyaMist.SENSE_TEMP_INTERNAL]:'tempInternal',
                [OyaMist.SENSE_TEMP_CANOPY]:'tempCanopy',
                [OyaMist.SENSE_TEMP_AMBIENT]:'tempAmbient',
            }[event];
        }

        static eventOfField(field) {
            return {
                tempInternal: OyaMist.SENSE_TEMP_INTERNAL,
                humidityInternal: OyaMist.SENSE_HUMIDITY_INTERNAL,
                ecInternal: OyaMist.SENSE_EC_INTERNAL, 
                tempCanopy: OyaMist.SENSE_TEMP_CANOPY,
                humidityCanopy: OyaMist.SENSE_HUMIDITY_CANOPY,
                ecCanopy: OyaMist.SENSE_EC_CANOPY,
                tempAmbient: OyaMist.SENSE_TEMP_AMBIENT,
                humidityAmbient: OyaMist.SENSE_HUMIDITY_AMBIENT,
                ecAmbient: OyaMist.SENSE_EC_AMBIENT, 
            }[field];
        }

    } // class OyaMist

    module.exports = exports.OyaMist = OyaMist;
})(typeof exports === "object" ? exports : (exports = {}));

