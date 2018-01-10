(typeof describe === 'function') && describe("Light", function() {
    const winston = require('winston');
    const should = require("should");
    const Light = exports.Light || require("../index").Light;
    const EventEmitter = require("events");
    const defaultProps = {
            event: 'event:Full light',
            cycleStartTime: '06:00',
            cycleDays: 1,
            cycleOn: 12,
            cycleOff: 12,
            desc: 'Turn on full spectrum lights',
            name: 'White light',
            pin: -1,
            spectrum: 'Full spectrum',
            type: 'Light:spst:no'
        }
    it("Default light is full spectrum", ()=>{
        var light = new Light();
        should(light).properties(defaultProps);

        // Strings are converted to numbers
        var light = new Light({
            cycleDays: "1",
            cycleOn: "12",
            cycleOff: "12",
            pin: "-1",
        });
        should(light).properties(defaultProps);

        var light = new Light({
            cycleDays: "2",
            cycleOn: "13",
            cycleOff: "11",
            pin: "1",
        });
        should(light).properties({
            cycleDays: 2,
            cycleOn: 13,
            cycleOff: 11,
            pin: 1,
        });
    });
    it("Light can be blue", ()=>{
        var light = new Light(Light.LIGHT_BLUE);
        should(light).properties( {
            event: 'event:Blue light',
            cycleStartTime: '06:00',
            cycleDays: 1,
            cycleOn: 12,
            cycleOff: 12,
            desc: 'Turn on blue lights',
            name: 'Blue light',
            pin: -1,
            spectrum: 'Blue spectrum',
            type: 'Light:spst:no'
        });
    });
    it("Light is serializable", ()=>{
        var light = new Light(Light.LIGHT_RED);
        should.deepEqual(JSON.parse(JSON.stringify(light)), {
            spectrum: Light.SPECTRUM_RED,
            cycleDays: 1,
            cycleOff: 12,
            cycleOn: 12,
            cycleStartDay: 0,
            cycleStartTime: '06:00',
            desc: 'Turn on red lights',
            event: 'event:Red light',
            name: 'Red light',
            pin: -1,
            type: 'Light:spst:no',
        });
        should.deepEqual(new Light(JSON.parse(JSON.stringify(light))), light);
    });
    it("Light can be red", ()=>{
        var light = new Light(Light.LIGHT_RED);
        should(light).properties( {
            event: 'event:Red light',
            cycleStartTime: '06:00',
            cycleDays: 1,
            cycleOn: 12,
            cycleOff: 12,
            desc: 'Turn on red lights',
            name: 'Red light',
            pin: -1,
            spectrum: 'Red spectrum',
            type: 'Light:spst:no'
        });
    });
    it("Light cycle can be specified", ()=>{
        var light = new Light({
            spectrum: Light.SPECTRUM_FULL,
            cycleStartTime: '01:30',
            cycleDays: 3,
            cycleOn: 14,
            cycleOff: 4,
        });
        should(light).properties( {
            event: 'event:Full light',
            cycleStartTime: '01:30',
            cycleDays: 3,
            cycleOn: 14,
            cycleOff: 4,
            desc: 'Turn on full spectrum lights',
            name: 'White light',
            pin: -1,
            spectrum: 'Full spectrum',
            type: 'Light:spst:no'
        });
    });
    it("createCycle returns an array of cycle events", ()=>{
        var light = new Light({
            spectrum: Light.SPECTRUM_FULL,
            cycleStartTime: '01:30',
            cycleDays: 3,
            cycleOn: 14,
            cycleOff: 4,
        });
        var onSec = 60*60 * 14;
        var offSec = 60*60 * 4;
        var evt = Light.EVENT_LIGHT_FULL;

        // date greater than startTime
        var date = new Date(2017,0,1,02,30); // Sunday Jan 1, 2017
        var cycle = light.createCycle(date);
        should.deepEqual(cycle.map(c=>c.value?1:0),[1,0,1,0,1,0,1,0]);
        should.deepEqual(cycle.map(c=>c.event),[evt,evt,evt,evt,evt,evt,evt,evt,]);
        var tStart = 3600 * 13;
        should.deepEqual(cycle.map(c=>c.t), [
            0, tStart + 0*offSec + 0*onSec,
            tStart + 1*offSec + 0*onSec, tStart + 1*offSec + 1*onSec,
            tStart + 2*offSec + 1*onSec, tStart + 2*offSec + 2*onSec,
            tStart + 3*offSec + 2*onSec, tStart + 3*offSec + 3*onSec,
        ]);

        // date earlier than startTime
        var date = new Date(2017,0,1,00,30);
        var cycle = light.createCycle(date);
        should.deepEqual(cycle.map(c=>c.value?1:0),[0,1,0,1,0,1,0,1]);
        should.deepEqual(cycle.map(c=>c.event),[evt,evt,evt,evt,evt,evt,evt,evt,]);
        var tStart = 3600;
        should.deepEqual(cycle.map(c=>c.t), [
            0, tStart + 0*offSec + 0*onSec,
            tStart + 0*offSec + 1*onSec, tStart + 1*offSec + 1*onSec,
            tStart + 1*offSec + 2*onSec, tStart + 2*offSec + 2*onSec,
            tStart + 2*offSec + 3*onSec, tStart + 3*offSec + 3*onSec,
        ]);

        // date on second day 
        var date = new Date(2017,0,2,1,30);
        var cycle = light.createCycle(date);
        should.deepEqual(cycle.map(c=>c.value?1:0),[1,0,1,0,1,0,1,0]);
        should.deepEqual(cycle.map(c=>c.event),[evt,evt,evt,evt,evt,evt,evt,evt,]);
        var tStart = 3600 * 8;
        should.deepEqual(cycle.map(c=>c.t), [
            0, tStart + 0*offSec + 0*onSec,
            tStart + 1*offSec + 0*onSec, tStart + 1*offSec + 1*onSec,
            tStart + 2*offSec + 1*onSec, tStart + 2*offSec + 2*onSec,
            tStart + 3*offSec + 2*onSec, tStart + 3*offSec + 3*onSec,
        ]);

        // cycleStartDay and seconds
        var light = new Light({
            spectrum: Light.SPECTRUM_FULL,
            cycleStartDay: 1,
            cycleStartTime: '01:30',
            cycleDays: 3,
            cycleOn: 14,
            cycleOff: 4,
        });
        var date = new Date(2017,0,2,1,30,15);
        var cycle = light.createCycle(date);
        should.deepEqual(cycle.map(c=>c.value===true?1:0),[1,0,1,0,1,0,1,0]);
        should.deepEqual(cycle.map(c=>c.event),[evt,evt,evt,evt,evt,evt,evt,evt,]);
        var tStart = 3600 * 14 - 15;
        should.deepEqual(cycle.map(c=>c.t), [
            0, tStart + 0*offSec + 0*onSec,
            tStart + 1*offSec + 0*onSec, tStart + 1*offSec + 1*onSec,
            tStart + 2*offSec + 1*onSec, tStart + 2*offSec + 2*onSec,
            tStart + 3*offSec + 2*onSec, tStart + 3*offSec + 3*onSec,
        ]);

        var light = new Light({
            spectrum: Light.SPECTRUM_FULL,
            cycleOn: 24,
            cycleOff: 0,
        });
        light.cycleOff.should.equal(0);
        var cycle = light.createCycle(date);
        should.deepEqual(cycle[0], {
            event: Light.EVENT_LIGHT_FULL,
            t: 0,
            value: true,
        });
    });
    it("cycle parameters can be expressed in different ways", ()=>{
        var lightExpected = new Light({
            spectrum: Light.SPECTRUM_FULL,
            cycleStartTime: '01:30',
            cycleDays: 3,
            cycleOn: 14,
            cycleOff: 4,
        });
        var date = new Date(2017,0,1,02,30); // Sunday Jan 1, 2017

        var cycleExpected = lightExpected.createCycle(date);

        var light = new Light({
            spectrum: Light.SPECTRUM_FULL,
            cycleStartTime: '1:30',
            cycleDays: "3.0",
            cycleOn: "14.0",
            cycleOff: "4.0",
        });
        var cycle = light.createCycle(date);
        should.deepEqual(cycle, cycleExpected);

    });
    it("runCycle(emitter,cycle) starts event emitter daemon", function(done) {
        (async function() {
            try {
                var evt = Light.EVENT_LIGHT_BLUE;
                var light = new Light({
                    event: evt,
                });
                var active;
                var emitter = new EventEmitter();
                emitter.on(evt, value => {
                    active = value;
                });
                var periodMs = 50;
                var countOn = 0;
                var countOff = 0;
                emitter.on(evt, v=>(v?countOn++:countOff++));
                emitter.emit(evt, false);
                await new Promise((res,rej) => setTimeout(() => res(true), 1));
                should(countOn).equal(0);
                should(countOff).equal(1);

                // empty cycle
                var cycle = [];
                should(active).equal(false);
                var stop = light.runCycle(emitter, cycle, periodMs/1000);
                await new Promise((res,rej) => setTimeout(() => res(true), 1));
                should(active).equal(false);
                stop();
                should(countOn).equal(0);
                should(countOff).equal(1);

                // cycle events are repeated until stopped
                var cycle = [{
                    t:0,
                    event: evt,
                    value: true,
                }];
                var stop = light.runCycle(emitter, cycle, periodMs/1000);
                await new Promise((res,rej) => setTimeout(() => res(true), 5)); // avoid race
                should(active).equal(true);
                should(countOn).equal(1);
                should(countOff).equal(1);
                await new Promise((res,rej) => setTimeout(() => res(true), periodMs));
                should(countOn).equal(2);
                should(countOff).equal(1);
                await new Promise((res,rej) => setTimeout(() => res(true), periodMs));
                stop();
                should(countOn).equal(3);
                should(countOff).equal(1);
                await new Promise((res,rej) => setTimeout(() => res(true), periodMs));
                should(countOn).equal(3);
                should(countOff).equal(1);

                // stop() can be called more than once, but only the first call stops the cycle
                stop();

                done();
            } catch(e) {
                stop && stop();
                done(e);
            }
        })();
    });
    it("isLightOnAt(light,date) returns true if light is on at given time", function() {
        var cycleOn = 13;
        var cycleOff = 11;
        var cycleStartTime = "06:00";
        var light = new Light({
            cycleOn,
            cycleOff,
            cycleStartTime,
        });
        var startDate = new Date(2017,0,1,06,30); // Sunday Jan 1, 2017
        var secOffset = 30 * 60;

        // first second of on cycle
        var date = startDate;
        should(Light.isLightOnAt(light, date)).equal(true);
        should(light.countdown(date)).equal(cycleOn * 3600 - secOffset);

        // last second of on cycle
        var date = new Date(startDate.getTime() + (cycleOn*3600 - 1 - secOffset) * 1000);
        should(Light.isLightOnAt(light, date)).equal(true);
        should(light.countdown(date)).equal(1);

        // first second of off cycle
        var date = new Date(startDate.getTime() + (cycleOn*3600 - secOffset)*1000);
        should(Light.isLightOnAt(light, date)).equal(false);
        should(light.countdown(date)).equal(cycleOff * 3600);

        // last second of off cycle
        var date = new Date(startDate.getTime() + ((cycleOn+cycleOff)*3600 - 1 - secOffset) * 1000);
        should(Light.isLightOnAt(light, date)).equal(false);
        should(light.countdown(date)).equal(1);

        // first second of on cycle
        var date = new Date(startDate.getTime() + ((cycleOn+cycleOff)*3600 - 0 - secOffset) * 1000);
        should(Light.isLightOnAt(light, date)).equal(true);
        should(light.countdown(date)).equal(cycleOn * 3600);
    });
    it("isLightOnAt(light,date) handles fractional hours", function() {
        var cycleOn = 0.003;
        var cycleOff = 0.002;
        var cycleOnSec = Math.round(cycleOn * 3600);
        var cycleOffSec = Math.round(cycleOff * 3600);
        var cycleStartTime = "06:00";
        var light = new Light({
            cycleOn,
            cycleOff,
            cycleStartTime,
        });
        var startDate = new Date(2017,0,1,06,00); // Sunday Jan 1, 2017
        var secOffset = 1;

        // first second of on cycle
        var date = startDate;
        should(Light.isLightOnAt(light, date)).equal(true);
        should(light.countdown(date)).equal(cycleOnSec );

        // last second of on cycle
        var date = new Date(startDate.getTime() + (cycleOnSec - secOffset) * 1000);
        should(Light.isLightOnAt(light, date)).equal(true);
        should(light.countdown(date)).equal(1);

        // first second of off cycle
        var date = new Date(startDate.getTime() + (cycleOnSec)*1000);
        should(Light.isLightOnAt(light, date)).equal(false);
        should(light.countdown(date)).equal(cycleOffSec);

        // last second of off cycle
        var date = new Date(startDate.getTime() + (cycleOnSec + cycleOffSec - secOffset) * 1000);
        should(Light.isLightOnAt(light, date)).equal(false);
        should(light.countdown(date)).equal(1);

        // first second of on cycle
        var date = new Date(startDate.getTime() + (cycleOnSec + cycleOffSec ) * 1000);
        should(Light.isLightOnAt(light, date)).equal(true);
        should(light.countdown(date)).equal(cycleOnSec);
    });
    it("countdown(date) returns seconds till next light transition", function() {
        var light = new Light({
        });
        var date = new Date(2017,0,1,06,30); // Sunday Jan 1, 2017
        var c = light.countdown(date);
        should(c).equal(60*60*12 - 1800);
        var c = light.countdown();
        should(c).below(60*60*12+1);
        should(c).above(-1);
    });

})
