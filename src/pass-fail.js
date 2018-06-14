(function(exports) {
    const winston = require("winston");

    class PassFail {
        constructor(opts={}) {
            this.nTrials = opts.nTrials || 100;
            this.trials = [];
        }

        add(result) {
            if (result !== true && result !== false) {
                throw new Error("PassFail.add() expected boolean");
            }
            this.trials.push(result);
            if (this.trials.length > this.nTrials) {
                this.trials = this.trials.slice(this.trials.length - this.nTrials);
            }

            return this;
        }

        passRate(n) {
            n = Number(n) || 0;
            n <= 0 && (n = this.nTrials);
            var start = this.trials.length - Math.min(this.trials.length, n);
            var acc = this.trials.slice(start).reduce((acc, trial) => {
                if (trial) {
                    acc.pass++;
                } else {
                    acc.fail++;
                }
                return acc;
            }, {
                pass: 0,
                fail: 0,
            });
            return acc.pass / (acc.pass + acc.fail);
        }


    } //// class PassFail

    module.exports = exports.PassFail = PassFail;
})(typeof exports === "object" ? exports : (exports = {}));
