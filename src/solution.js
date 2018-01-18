(function(exports) {
    const winston = require("winston");
    const { 
        Example, 
        Variable, 
        Factory, 
        Network 
    } = require('oya-ann');
    const fs = require('fs');
    const path = require('path');
    var ecAnnPath = path.join(__dirname, 'atlas-ec-1413.json');
    var ecJSON = fs.readFileSync(ecAnnPath).toString();
    var DEFAULT_EC_ANN = Network.fromJSON(ecJSON);

    var SERIALIZABLE_KEYS;

    class Solution {
        constructor(opts={}) {
            this.name = opts.name || "Atlas Scientific 1413\u00b5s";
            this.desc = opts.desc || "Atlas Scientific Calibration Solution "+
                "for K0.1 probe 1,413 microsiemens (20% KCl). Similar to KCl-1800 by MyronL";
            this.refTemp = opts.refTemp || 25; // Centigrade reference temperature
            if (opts.ecANN instanceof Network) {
                this.ecANN = opts.ecANN;
            } else if (opts.ecANN) {
                this.ecANN = Network.fromJSON(opts.ecANN);
            }
            if (this.ecANN == null) {
                this.ecANN = DEFAULT_EC_ANN;
            }
            this.refEC = opts.refEC || this.ecANN.activate([this.refTemp])[0]; // reference EC microsiemens
            this.refTDS = opts.refTDS || this.refEC * Solution.KCL_1800.ppm / Solution.KCL_1800.ec;

            SERIALIZABLE_KEYS == null && (SERIALIZABLE_KEYS = Object.keys(this).sort());

        }

        ecCompensated(reading, temp = this.refTemp) {
            var ec = this.ecANN.activate([temp])[0];
            return reading * this.refEC/ec;
        }

        tdsCompensated(reading, temp = this.refTemp) {
            return this.ecCompensated(reading, temp) * this.refTDS/this.refEC;
        }

        static get KCL_1800() { 
            // http://www.myronl.com/PDF/application_bulletins/ssb_ab.pdf
            return {
                ppm: 901.6,
                ec: 1800,
            }
        }

        static get GH_SRS() {
            // https://www.1000bulbs.com/pdf/gh-1500ppm-standard-reference-solution-msds.pdf
            return {    
                ppm: 1500,
                ec: 2930,
            }
        }

        static calibrateANN(temps, readings, opts={}) {
            if (! temps instanceof Array) {
                throw new Error(`Expected array of Celsius temperatures`);
            }
            if (! readings instanceof Array) {
                throw new Error(`Expected array of readings in microsiemens`);
            }
            if (temps.length !== readings.length) {
                throw new Error(`Temperatures and readings must be arrays of same length`);
            }

            var refTemp = opts.refTemp || 25;
            var refExample = null;
            var examples = temps.map((tc,i) => {
                var example = new Example([tc], [readings[i]]);
                tc === refTemp && (refExample = example);
                return example;
            });

            var v = Variable.variables(examples);
            var maxMSE = opts.maxMSE || 1;
            var power = opts.power || 5;
            var trainingReps = opts.trainingReps || 50;
            var factory = new Factory(v, { power, maxMSE, trainingReps, });
            var network = factory.createNetwork();
            network.train(examples);

            // IMPORTANT: by re-training the network once more on the
            // reference example, we minimize the error 
            // at the reference temperature
            refExample && network.train([refExample]);
            return network;
        }

        toJSON() {
            return SERIALIZABLE_KEYS.reduce((a,k) => {
                a[k] = this[k];
                return a;
            }, {});
        }

    } //// class Solution

    module.exports = exports.Solution = Solution;
})(typeof exports === "object" ? exports : (exports = {}));

