
(typeof describe === 'function') && describe("Actuator", function() {
    const winston = require('winston');
    const should = require("should");
    const Actuator = exports.Actuator || require("../index").Actuator;

    const defaultProps = {
        name: 'Mist',
        type: 'actuator:spst:no',
        usage: 'Mist',
        desc: 'Mist roots',
        pin: -1,
        activate: 'event:mist',
    }

    it("Default Actuator is Mist", ()=>{
        var act = new Actuator();
        should(act).properties(defaultProps);
        var act = new Actuator({
            pin: "-1",
        });
        should(act).properties(defaultProps);
        var act = new Actuator({
            pin: 2,
        });
        should(act).properties(Object.assign({}, defaultProps, {
            pin: 2,
        }));
    });

})
