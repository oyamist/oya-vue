(function(exports) {
    const winston = require("winston");
    const OyaMist = require("./oyamist");
    const {
        Network,
        Example,
        Variable,
        Factory,
    } = require('oya-ann');

    var SERIALIZABLE_KEYS;

    class Calibration {
        constructor(opts={}) {
            // add serializable properties
            var startDate  = opts.startDate || OyaMist.localDate();
            if (typeof startDate === 'string') {
                startDate = new Date(startDate);
            }
            this.startDate = startDate.toISOString();
            this.hours = opts.hours || 24;
            this.data = opts.data || [];
            this.name = opts.name || `Calibration ${this.startDate.substr(0,10)}`;
            this.desc = opts.desc || '';
            this.ann = opts.ann || null;
            if (this.ann && !(this.ann instanceof Network)) {
                this.ann = Factory.fromJSON(this.ann);
            }
            this.range = opts.range || {};
            this.domain = opts.domain || {};
            this.range.field = opts.rangeField || this.range.field;
            this.domain.field = opts.domainField || this.domain.field;
            var rangeDomain = this.rangeDomain(this.data, this.range.field, this.domain.field);
            Object.assign(this, rangeDomain);

            this.nominal = opts.nominal || 100;
            this.unit = opts.unit || OyaMist.NUTRIENT_UNIT.PERCENT;
            SERIALIZABLE_KEYS = SERIALIZABLE_KEYS || Object.keys(this).sort();

            // add non-serializable properties
        }

        static monotonic(list, key) {
            var start = 0;
            var end = 0;
            var descStart = 0;
            var ascStart = 0;
            var iprev = 0;
            for (var i = 0; i < list.length; i++) {
                if (list[i][key] < list[iprev][key]) { // decreasing
                    if ((i - ascStart) > (end - start)) {
                        start = ascStart;
                        end = i;
                    }
                    ascStart = i;
                    if ((i - descStart) >= (end -start)) {
                        start = descStart;
                    }
                    if (descStart === start) {
                        end = i+1;
                    }
                } else { //  increasing
                    if ((i - descStart) > (end - start)) {
                        start = descStart;
                        end = i;
                    }
                    descStart = i;
                    if ((i - ascStart) >= (end - start)) {
                        start = ascStart;
                    }
                    if (ascStart === start) {
                        end = i+1;
                    }
                }
                iprev = i;
            }
            return { start, end };
        }

        get isCalibrated() {
            return this.ann != null;
        }

        calibratedValue(rangeValue, domainValue, ann=this.ann) {
            if (!this.isCalibrated) {
                return rangeValue;
            }
            var annValue = ann.activate([domainValue])[0];
            return rangeValue * (this.nominal/annValue);
        }

        rangeDomain(seq=[], rangeField='ecInternal', domainField='tempInternal') {
            var range = {
                field: rangeField,
                max: null,
                min: null,
            };
            var domain = {
                field: domainField,
                max: null,
                min: null,
            };
            var rangeDomain = { range, domain, };
            seq.forEach(s => {
                var sd = s[domainField];
                var sr = s[rangeField];
                domain.min = domain.min == null ? sd : Math.min(domain.min,sd);
                domain.max = domain.max == null ? sd : Math.max(domain.max,sd);
                range.min = range.min == null ? sr : Math.min(range.min,sr);
                range.max = range.max == null ? sr : Math.max(range.max,sr);
            });
            return rangeDomain;
        }

        calibrate(rawData=this.data, opts={}) {
            if (rawData == null || rawData.length == 0) {
                this.data = [];
                return (this.ann = null);
            }
            var usableData = rawData.reduce((a,s) => {
                if (s.hasOwnProperty(this.range.field) && s.hasOwnProperty(this.domain.field)) {
                    a.push(s);
                }
                return a;
            },[]);
            var mono = Calibration.monotonic(usableData,this.domain.field);
            var monoSeq = usableData.slice(mono.start, mono.end);
            this.data = monoSeq;
            var rangeField = this.range.field;
            var domainField = this.domain.field;
            Object.assign(this, this.rangeDomain(this.data, rangeField, domainField));
            var examples = this.data.map(s => {
                return new Example([s[domainField]], [s[rangeField]]);
            });
            if (examples.length === 1) {
                examples.push(new Example([examples[0].input[0]*2], examples[0].target));
            }
            var v = Variable.variables(examples);
            switch (examples.length) {
                case 0:
                case 1:
                case 2:
                    var power = 1;
                    break;
                case 3:
                    var power = 2;
                    break;
                case 4:
                    var power = 3;
                    break;
                case 5:
                    var power = 4;
                    break;
                default:
                    var power = 5;
                    break;
            }
            var maxMSE = opts.maxMSE || this.range.max * 0.0065;
            var annopts = Object.assign({
                maxMSE,
                preTrain: true,
                trainingReps: 10, // max reps to reach maxMSE
            }, opts);
            this.ann = null;
            this.mse = null;
            for (var i= 0; i< 3; i++) { // keep looking if not good enough
                do { // pick best polynomial model
                    annopts.power = power--;
                    var factory = new Factory(v, annopts);
                    var network = factory.createNetwork();
                    network.train(examples);
                    var mse = network.mse(examples);
                    if (this.ann == null || mse < this.mse) {
                        this.ann = network;
                        this.mse = mse;
                    }
                } while (power > 0 && this.mse > maxMSE);
                if (this.mse <= maxMSE) {
                    break;
                }
            }
            return null; // TBD
        }

        toJSON() {
            var result = {};
            SERIALIZABLE_KEYS.forEach(key => (result[key] = this[key]));
            return result;
        }

    } //// class Calibration

    module.exports = exports.Calibration = Calibration;
})(typeof exports === "object" ? exports : (exports = {}));
