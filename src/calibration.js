(function(exports) {
    const winston = require("winston");
    const OyaMist = require("./oyamist");
    const OyaAnn = require('oya-ann');

    var SERIALIZABLE_KEYS;

    class Calibration {
        constructor(opts={}) {
            var startDate = OyaMist.localDate();
            this.startDate = opts.startDate || startDate;
            if (typeof this.startDate === 'string') {
                this.startDate = new Date(this.startDate);
            }
            this.hours = opts.hours || 24;
            this.data = opts.data || [];
            this.name = opts.name || `Calibration ${this.startDate.toISOString().substr(0,10)}`;
            this.desc = opts.desc || '';
            this.ann = opts.ann || null;
            this.rangeField = opts.rangeField || 'ecInternal';
            this.domainField = opts.domainField || 'tempInternal';
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

        calibratedValue(rangeValue, domainValue, ann=this.ann) {
            if (typeof ann.activate !== 'function') {
                winston.warn('DEBUG', typeof ann, ann.constructor.name, ann);
            }
            var annValue = ann.activate([domainValue])[0];
            return rangeValue * (this.nominal/annValue);
        }

        createNetwork(seq=this.data) {
            var rangeField = this.rangeField;
            var domainField = this.domainField;
            var examples = seq.map(s => {
                return new OyaAnn.Example([s[domainField]], [s[rangeField]]);
            });
            var v = OyaAnn.Variable.variables(examples);
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
            var factory = new OyaAnn.Factory(v, opts);
            var network = factory.createNetwork();
            network.train(examples);
            return network;
        }

        calibrate(seq=[], opts={}) {
        /*
            var domainField = this.domainField;
            var seqAvail = seq.reduce((a,s) => {
                s.hasOwnProperty(domainField) && s.hasOwnProperty(rangeField) && a.push(s);
                return a;
            },[]);
            var mono = Calibration.monotonic(seqAvail,domainField);
            var monoSeq = seqAvail.slice(mono.start, mono.end);
            var domainVals = monoSeq.map(s=>s[domainField]);
            var quality = Sensor.tempQuality(domainVals);
            var tempMin = domainVals.length ? Math.min.apply(null, domainVals) : null;
            var tempMax = domainVals.length ? Math.max.apply(null, domainVals) : null;
            var nominal = opts.nominal || 100;
            var result = {
                rangeField,
                quality,
                tempMin,
                tempMax,
                nominal,
                data: monoSeq,
                startDate: (opts.startDate || new Date()).toISOString(),
                hours: opts.hours || 24,
            }

            if (monoSeq.length === 0 ) { 
                // no calibration data => generate temperature independent data
                monoSeq.push({
                    [domainField]: 18,
                    [rangeField]: nominal,
                });
                monoSeq.push({
                    [domainField]: 28,
                    [rangeField]: nominal,
                });
            } else if (monoSeq.length === 1 ) { 
                // single data point: generate temperature indepedent data
                monoSeq.push({
                    [domainField]: monoSeq[0][domainField] + 10,
                    [rangeField]: monoSeq[0][rangeField],
                });
            } else { 
                // calibrate to provided sequence
            }
            this.tempData = monoSeq;
            this.tempStartDate = result.startDate;
            this.tempNominal = nominal;
            this.ann = Sensor.calibrationANN(monoSeq, rangeField, domainField);

            return result;
        */
        }

        toJSON() {
            var result = {};
            SERIALIZABLE_KEYS.forEach(key => (result[key] = this[key]));
            return result;
        }

    } //// class Calibration

    module.exports = exports.Calibration = Calibration;
})(typeof exports === "object" ? exports : (exports = {}));
