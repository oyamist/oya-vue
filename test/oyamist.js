
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
    it("localDate(date) returns 00:00 of local date", function() {
        var now = new Date();
        var date = OyaMist.localDate(now);
        should(date.getHours()).equal(0);
        should(date.getMinutes()).equal(0);
        should(date.getSeconds()).equal(0);
        should(date.getMilliseconds()).equal(0);
        should(date.getFullYear()).equal(now.getFullYear());
        should(date.getMonth()).equal(now.getMonth());
        should(date.getDate()).equal(now.getDate());

        var date2 = OyaMist.localDate();
        should.deepEqual(date2, date);

        var date3 = OyaMist.localDate(new Date(2017,10,05)); // local
        var date4 = OyaMist.localDate("2017-11-05"); // local (but Date would parse it as gmt)
        should.deepEqual(date4, date3);
    });
})
