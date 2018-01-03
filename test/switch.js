(typeof describe === 'function') && describe("Sensor", function() {
    const winston = require('winston');
    const should = require("should");
    const Switch = require("../index").Switch;
    const EventEmitter = require("events");
    
    it("Constructor creates a switch", function() {
        var emitter = new EventEmitter();
        var evt = "test event";

        // default property
        var swDefault = new Switch();
        should(swDefault).properties({
            name: 'Switch',
            type: Switch.ACTIVE_HIGH,
            pin: -1,
            event: Switch.EVENT_SWITCH,
            desc: '(Switch description)',
        });

        // specify each property
        var customProps = {
            name: 'TestSwitch',
            type: Switch.ACTIVE_LOW,
            pin: 123,
            event: evt,
            desc: 'This is a test switch',
        }
        var swCustom = new Switch(customProps);
        should(swCustom).properties(customProps);

        // default description
        var sw = new Switch({
            type: Switch.ACTIVE_LOW,
        });
        should(sw).properties({
            name: 'Switch',
            type: Switch.ACTIVE_LOW,
            pin: -1,
            event: Switch.EVENT_SWITCH,
            desc: '(Switch description)',
        });
    })
    it("emitTo(emitter, rawInput) emits event with mapped value", function(done) {
        var emitter = new EventEmitter();
        var evt = "test event";
        var eCount = 0;
        var eValue = null;
        emitter.on(evt,(value) => {
            eValue = value;
            eCount++;
        });

        // Active high switch
        var swHigh = new Switch({
            event: evt,
            type: Switch.ACTIVE_HIGH,
        });
        var active = swHigh.emitTo(emitter, true);
        should(active).equal(true);
        should(eCount).equal(1);
        should(eValue).equal(true);
        var active = swHigh.emitTo(emitter, false);
        should(active).equal(false);
        should(eCount).equal(2);
        should(eValue).equal(false);
        eCount = 0;
        eValue = null;

        // Active low switch
        var swLow = new Switch({
            event: evt,
            type: Switch.ACTIVE_LOW,
        });
        var active = swLow.emitTo(emitter, true);
        should(active).equal(false);
        should(eCount).equal(1);
        should(eValue).equal(false);
        var active = swLow.emitTo(emitter, false);
        should(active).equal(true);
        should(eCount).equal(2);
        should(eValue).equal(true);

        done();
    })
})
