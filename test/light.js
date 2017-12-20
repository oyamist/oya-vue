(typeof describe === 'function') && describe("Sensor", function() {
    const winston = require('winston');
    const should = require("should");
    const Light = exports.Light || require("../index").Light;
    const EventEmitter = require("events");

    it("Default light is full spectrum", ()=>{
        var light = new Light();
        should(light).properties( {
            event: 'event:Full light',
            cycleStartTime: '00:00',
            cycleDays: 1,
            cycleOn: 12,
            cycleOff: 12,
            desc: 'Turn on full spectrum lights',
            name: 'Full spectrum',
            pin: -1,
            spectrum: 'Full spectrum',
            type: 'Light:spst:no'
        });
    });
    it("Light can be blue", ()=>{
        var light = new Light(Light.LIGHT_BLUE);
        should(light).properties( {
            event: 'event:Blue light',
            cycleStartTime: '00:00',
            cycleDays: 1,
            cycleOn: 12,
            cycleOff: 12,
            desc: 'Turn on blue lights',
            name: 'Blue spectrum',
            pin: -1,
            spectrum: 'Blue spectrum',
            type: 'Light:spst:no'
        });
    });
    it("Light can be red", ()=>{
        var light = new Light(Light.LIGHT_RED);
        should(light).properties( {
            event: 'event:Red light',
            cycleStartTime: '00:00',
            cycleDays: 1,
            cycleOn: 12,
            cycleOff: 12,
            desc: 'Turn on red lights',
            name: 'Red spectrum',
            pin: -1,
            spectrum: 'Red spectrum',
            type: 'Light:spst:no'
        });
    });
    it("DLight cycle can be specified", ()=>{
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
            name: 'Full spectrum',
            pin: -1,
            spectrum: 'Full spectrum',
            type: 'Light:spst:no'
        });
    });
    it("DCreate cycle returns an array of cycle events", ()=>{
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
        should.deepEqual(cycle.map(c=>c.value?1:0),[1,0,1,0,1,0,1,0]);
        should.deepEqual(cycle.map(c=>c.event),[evt,evt,evt,evt,evt,evt,evt,evt,]);
        var tStart = 3600 * 14 - 15;
        should.deepEqual(cycle.map(c=>c.t), [
            0, tStart + 0*offSec + 0*onSec,
            tStart + 1*offSec + 0*onSec, tStart + 1*offSec + 1*onSec,
            tStart + 2*offSec + 1*onSec, tStart + 2*offSec + 2*onSec,
            tStart + 3*offSec + 2*onSec, tStart + 3*offSec + 3*onSec,
        ]);
    });
    it("TESTTESTrunCycle(emitter,cycle) starts event emitter daemon", function(done) {
        (async function() {
            try {
                var emitter = new EventEmitter();
                var evt = Light.EVENT_LIGHT_BLUE;
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
                var stop = Light.runCycle(emitter, cycle, periodMs/1000);
                await new Promise((res,rej) => setTimeout(() => res(true), 1));
                stop();
                should(countOn).equal(0);
                should(countOff).equal(1);

                // cycle events are repeated until stopped
                var cycle = [{
                    t:0,
                    event: evt,
                    value: 1,
                }];
                var stop = Light.runCycle(emitter, cycle, periodMs/1000);
                await new Promise((res,rej) => setTimeout(() => res(true), 5)); // avoid race
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

})
