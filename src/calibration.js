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
            this.range = Object.assign({
                field: opts.rangeField || 'ecInternal',
            }, opts.range);
            this.domain = Object.assign({
                field: opts.domainField || 'tempInternal',
            }, opts.domain);
            this.nominal = opts.nominal || 100;
            this.unit = opts.unit || OyaMist.NUTRIENT_UNIT.PERCENT;
            SERIALIZABLE_KEYS = SERIALIZABLE_KEYS || Object.keys(this).sort();

            // non-serializable
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

        calibrate(rawData=this.data) {
            if (rawData == null || rawData.length == 0) {
                this.data = [];
                this.range.min = null;
                this.range.max = null;
                this.domain.min = null;
                this.domain.max = null;
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
            this.range.min = null;
            this.range.max = null;
            this.domain.min = null;
            this.domain.max = null;
            var examples = this.data.map(s => {
                var sd = s[domainField];
                var sr = s[rangeField];
                this.domain.min = this.domain.min == null ? sd : Math.min(this.domain.min,sd);
                this.domain.max = this.domain.max == null ? sd : Math.max(this.domain.max,sd);
                this.range.min = this.range.min == null ? sr : Math.min(this.range.min,sr);
                this.range.max = this.range.max == null ? sr : Math.max(this.range.max,sr);
                return new Example([sd], [sr]);
            });
            if (examples.length === 1) {
                examples.push(new Example([examples[0].input[0]*2], examples[0].target));
            }
            var v = Variable.variables(examples);
            var opts = {
                maxMSE: 1,
                preTrain: true,
                trainingReps: 50, // max reps to reach maxMSE
            };
            switch (examples.length) {
                case 0:
                case 1:
                case 2:
                    break;
                case 3:
                    opts.power = 2;
                    break;
                case 4:
                    opts.power = 3;
                    break;
                case 5:
                    opts.power = 4;
                    break;
                default:
                    opts.power = 5;
                    break;
            }
            var factory = new Factory(v, opts);
            var network = factory.createNetwork();
            network.train(examples);
            this.ann = network;
            return network;
        }

        toJSON() {
            var result = {};
            SERIALIZABLE_KEYS.forEach(key => (result[key] = this[key]));
            return result;
        }

    } //// class Calibration

    module.exports = exports.Calibration = Calibration;
})(typeof exports === "object" ? exports : (exports = {}));
