(typeof describe === 'function') && describe("DbReport", function() {
    const winston = require('winston');
    const should = require("should");
    const DbReport = require("../index").DbReport;
    const SystemFacade = require("../index").SystemFacade;
    const OyaVessel = require('../index').OyaVessel;
    const EventEmitter = require("events");
    const OyaAnn = require('oya-ann');
    const path = require('path');
    const fs = require('fs');

    class MockSystem extends SystemFacade {
        constructor(opts={}) {
            super(opts);
            this.w1Addresses = [ "28-MOCK1", "28-MOCK2" ];
        }
        oneWireRead(address, type) {
            if (type === 'DS18B20') {
                return Promise.resolve({
                    temp: 12345,
                    timestamp: new Date(1999,12,31),
                });
            } 
            return Promise.reject(new Error(`unknown type:${type}`));
        }
    }
    SystemFacade.facade = new MockSystem();

    it("default DbReport is none", function() {
        var dbr = new DbReport();
    });
    it("TESTTESThourlySummary(data,fields) summarizes data by hour for given fields", function() {
        var sqlDataPath = path.join(__dirname, 'ecInternal.json');
        var sqlData = JSON.parse(fs.readFileSync(sqlDataPath));

        // default allows null values 
        var result = DbReport.hourlySummary(sqlData.data);
        should(result.length).equal(71);
        result.forEach(r => {
            should(r).properties(['hr','tempInternal']);
        });
        should(result[result.length-1].hasOwnProperty('ecInternal')).equal(false); // no value

        // only return data having all specified fields
        var result = DbReport.hourlySummary(sqlData.data, ['ecInternal', 'tempInternal']);
        should(result.length).equal(64);
        result.forEach(r => {
            should(r).properties(['hr','ecInternal', 'tempInternal']);
        });
    });
    it ("normalizeDataByHour fills in missing data", function() {
        var data = [
            {"hr":"1999-12-08 1300","vavg":17.57570134387154,"vmin":17.430819409475856,"vmax":17.951177487856373},
            {"hr":"1999-12-08 1200","vavg":18.074496982104563,"vmin":17.99795274789553,"vmax":18.104765901172403},
        ];
        var normData = DbReport.normalizeDataByHour(data);
        normData.length.should.equal(24);
        should(data[0].hr).equal("1999-12-08 2300");
        should(data[23].hr).equal("1999-12-08 0000");
    });
})
