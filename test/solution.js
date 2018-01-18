(typeof describe === 'function') && describe("Solution", function() {
    const winston = require('winston');
    const should = require("should");
    const Solution = exports.Solution || require('../index').Solution;
    const { 
        Example, 
        Variable, 
        Factory, 
        Network 
    } = require('oya-ann');

    it("Default solution is Atlas Scientific 1413 Calibration Solution",function() {
        var sol = new Solution();
        should(sol).properties({
            name: "Atlas Scientific 1413\u00b5s",
            desc: "Atlas Scientific Calibration Solution "+
                "for K0.1 probe 1,413 microsiemens (20% KCl). Similar to KCl-1800 by MyronL",
            refTemp: 25,
            refTDS: 707.756,
        });
    });
    it("Solution is customizable",function() {
        var opts = {
            name: "Test Solution",
            desc: "Test Description",
            refTemp: 20,
            refTDS: 1278,
        };
        var sol = new Solution(opts);
        should(sol).properties(opts);
    });
    it("calibrateANN(temps, ec) returns ANN for calibration", function() {
        var temps = [10, 15, 20, 25, 30, 35];
        var ec = [ 1020, 1147, 1278, 1413, 1548, 1711]; 
        var examples = temps.map((tc,i) => {
            return new Example([tc], [ec[i]]);
        });

        var maxMSE = 1;
        var refTemp = 25;

        var network = Solution.calibrateANN(temps, ec, { refTemp, maxMSE, });
        should(network.mse(examples)).below(maxMSE);
        should(network.activate([10])[0]).approximately(1020, 1);
        should(network.activate([35])[0]).approximately(1711, 1);
    });
    it("Solution is serializable", function() {
        var temps = [15, 20, 25];
        var ec = [ 100, 200, 300]; 
        var examples = temps.map((tc,i) => {
            return new Example([tc], [ec[i]]);
        });
        var refTemp = 20;
        var refTDS = 1278;
        var ecANN = Solution.calibrateANN(temps, ec, { refTemp });
        var opts = {
            name: "Test Solution",
            desc: "Test Description",
            refTemp,
            refTDS,
            ecANN,
        };
        var sol = new Solution(opts);
        should.deepEqual(sol.ecANN.toJSON(), ecANN.toJSON());
        var json = JSON.parse(JSON.stringify(sol));
        var sol2 = new Solution(json);
        should(sol2).properties({
            name: sol.name,
            desc: sol.desc,
            refTemp: sol.refTemp,
            refTDS: sol.refTDS,
        });
        should.deepEqual(sol2.ecANN.toJSON(), ecANN.toJSON());
        should(sol2.ecANN.activate([20])[0]).approximately(200, .1);
    });
    it("ecCompensated(reading, temp) returns temperature compensated EC", function() {
        var sol = new Solution();
        var e = 0.5;

        // readings of the calibration solution should return the temperature
        // compensated reference value
        should(sol.ecCompensated(1413, 25)).approximately(1413,e);
        should(sol.ecCompensated(1020, 10)).approximately(1413,e);
        should(sol.ecCompensated(1711, 35)).approximately(1413,e);

        // readings of diluted or concentrated solutions should return
        // temperature compensated values at the reference temperature
        should(sol.ecCompensated(1020/2, 10)).approximately(1413/2,e);
        should(sol.ecCompensated(1711*2, 35)).approximately(1413*2,e);
    });
    it("ecCompensated(reading, temp) returns temperature compensated EC", function() {
        var temps = [10, 15, 20, 25, 30, 35];
        var ec = [ 1010, 1137, 1268, 1403, 1538, 1701]; 
        var refEC = 1413;
        var ecANN = Solution.calibrateANN(temps, ec);
        var sol = new Solution({ ecANN, refEC });
        should(sol.refEC).equal(refEC);
        var e = 1;

        // readings of the calibration solution should return the temperature
        // compensated reference value
        should(sol.ecCompensated(1403, 25)).approximately(1413,e);
        should(sol.ecCompensated(1010, 10)).approximately(1413,e);
        should(sol.ecCompensated(1701, 35)).approximately(1413,e);

        // readings of diluted or concentrated solutions should return
        // temperature compensated values at the reference temperature
        should(sol.ecCompensated(1010/2, 10)).approximately(1413/2,e);
        should(sol.ecCompensated(1701*2, 35)).approximately(1413*2,e);
    });
    it("tdsompensated(reading, temp) returns temperature compensated PPM", function() {
        var sol = new Solution();
        var e = 1;
        var tdsExpected = 1413 * Solution.KCL_1800.ppm / Solution.KCL_1800.ec;

        // readings of the calibration solution should return the temperature
        // compensated reference value
        should(sol.tdsCompensated(1413, 25)).approximately(tdsExpected,e);
        should(sol.tdsCompensated(1020, 10)).approximately(tdsExpected,e);
        should(sol.tdsCompensated(1711, 35)).approximately(tdsExpected,e);

        // readings of diluted or concentrated solutions should return
        // temperature compensated values at the reference temperature
        should(sol.tdsCompensated(1020/2, 10)).approximately(tdsExpected/2,e);
        should(sol.tdsCompensated(1711*2, 35)).approximately(tdsExpected*2,e);
    });
    it("tdsompensated(reading, temp) handles custom PPM calibration", function() {
        var refTDS = 1413 * Solution.GH_SRS.ppm / Solution.GH_SRS.ec;
        var sol = new Solution({
            refTDS,
        });
        var e = 1;
        var tdsExpected = refTDS;

        // readings of the calibration solution should return the temperature
        // compensated reference value
        should(sol.tdsCompensated(1413, 25)).approximately(tdsExpected,e);
        should(sol.tdsCompensated(1020, 10)).approximately(tdsExpected,e);
        should(sol.tdsCompensated(1711, 35)).approximately(tdsExpected,e);

        // readings of diluted or concentrated solutions should return
        // temperature compensated values at the reference temperature
        should(sol.tdsCompensated(1020/2, 10)).approximately(tdsExpected/2,e);
        should(sol.tdsCompensated(1711*2, 35)).approximately(tdsExpected*2,e);
    });
})
