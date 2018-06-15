
(typeof describe === 'function') && describe("PsssFail", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        PassFail,
    } = require('../index');

    it("TESTTESTPassFail(opts) creates a pass/fail tracker", () => {
        var pf = new PassFail();
        should(pf).properties({
            nTrials: 100,
            trials: [],
        });

        // custom
        var pf50 = new PassFail({
            nTrials: 50,
        });
        should(pf50).properties({
            nTrials: 50,
            trials: [],
            name: 'pass/fail',
        });
    });
    it("TESTTESTadd(result) adds a trial result", () => {
        var pf = new PassFail();

        pf.add(true);
        should(pf).properties({
            trials: [true],
        });

        pf.add(false);
        should(pf).properties({
            trials: [true, false],
        });
    });
    it("TESTTESTpassRate(n) property returns trial passing rate", () => {
        var pf = new PassFail({
            nTrials: 5,
        });

        should(pf.passRate()).NaN();

        pf.add(false);
        should(pf.passRate()).equal(0);   // f
        pf.add(true);
        should(pf.passRate()).equal(1/2); // f,t
        pf.add(true);
        should(pf.passRate()).equal(2/3); // f,t,t
        pf.add(false);
        should(pf.passRate()).equal(2/4); // f,t,t,f
        pf.add(false);
        should(pf.passRate()).equal(2/5); // f,t,t,f,f
        pf.add(false);
        should(pf.passRate()).equal(2/5); // t,t,f,f,f
        pf.add(false);
        should(pf.passRate()).equal(1/5); // t,f,f,f,f
        pf.add(false);
        should(pf.passRate()).equal(0/5); // f,f,f,f,f
        pf.add(true);
        should(pf.passRate()).equal(1/5); // f,f,f,f,t
        pf.add(true);
        should(pf.passRate()).equal(2/5); // f,f,f,t,t

        // out of range uses nTrials
        should(pf.passRate(100)).equal(2/5); // f,f,f,t,t
        should(pf.passRate(-100)).equal(2/5); // f,f,f,t,t

        // most recent
        should(pf.passRate(1)).equal(1/1); // f,f,f,t,t

        // most recent 3
        should(pf.passRate(3)).equal(2/3); // f,f,f,t,t
    });
    it("TESTTESTclear() removes all trial results", () => {
        var pf = new PassFail();

        // clear() with no trials
        pf.clear();
        should(pf.passRate()).NaN();
        should(pf.trials.length).equal(0);

        // clear() with trials
        pf.add(true);
        pf.add(false);
        should(pf.passRate()).equal(1/2);
        pf.clear();
        should(pf.passRate()).NaN();
        should(pf.trials.length).equal(0);
    });
    it("TESTTESTtoString() returns string summary", () => {
        var pf = new PassFail({
            name: 'passRate',
        });
        should(pf.toString()).equal(`passRate:0/0`);
        pf.add(true);
        should(pf.toString()).equal(`passRate:1/1`);
        pf.add(true);
        should(pf.toString()).equal(`passRate:2/2`);
        pf.add(false);
        should(pf.toString()).equal(`passRate:2/3`);
    });
})
