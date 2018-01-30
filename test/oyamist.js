
(typeof describe === 'function') && describe("Sensor", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        OyaMist,
    } = require("../index");

    it("locationField(loc,fieldPrefix) returns field for location", function() {
        should(OyaMist.locationField(OyaMist.LOC_INTERNAL,'temp')).equal('tempInternal');
        should(OyaMist.locationField(OyaMist.LOC_INTERNAL,'ec')).equal('ecInternal');
        should(OyaMist.locationField(OyaMist.LOC_AMBIENT,'abc')).equal('abcAmbient');
        should(OyaMist.locationField(OyaMist.LOC_CANOPY,'abc')).equal('abcCanopy');
    });
})
