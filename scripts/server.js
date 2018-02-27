#!/usr/bin/env node

const path = require("path");
const winston = require("winston");
const compression = require("compression");
const express = require('express');
const app = module.exports = express();
const rb = require("rest-bundle");
const { VmcBundle } = require("vue-motion-cam");
const OyaReactor = require("../index").OyaReactor;
const DbSqlite3 = require('../index').DbSqlite3;
const DbFacade = require('../index').DbFacade;
const memwatch = require('memwatch-next');
const EventEmitter = require('events');
const oyaEmitter = new EventEmitter();

memwatch.on('leak', (info) => {
    winston.warn(`memwatch leak:${info}`);
});

global.__appdir = path.dirname(__dirname);

app.use(compression());

// ensure argv is actually for script instead of mocha
var argv = process.argv[1].match(__filename) && process.argv || [];
argv.filter(a => a==='--log-debug').length && (winston.level = 'debug');

// set up application
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Access-Control-Allow-Headers");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS, PUT, POST");
    next();
});
app.use("/", express.static(path.join(__dirname, "../src/ui")));
app.use("/dist", express.static(path.join(__dirname, "../dist")));

app.locals.asyncOnReady = []; // list of async blocks waiting on app setup completion
let async = function*() { 
    try {
        // define RestBundles
        var restBundles = app.locals.restBundles = [];
        winston.info('argv:', argv);
        var serviceName = argv.reduce((acc, arg, i) =>  {
            return acc==null && i>1 && arg[0]!=='-' ? arg : acc;
        }, null) || 'test';
        winston.info(`server.js setting up ${serviceName}`);

        // for unit tests, do not disturb real database
        //var dbfacade = serviceName === 'test' ? new DbFacade() : new DbSqlite3();
        if (serviceName === 'test') {
            var dbname = './test/test-v1.0.db';
            var dbfacade = new DbSqlite3({ dbname });
        } else {
            var dbfacade = new DbSqlite3({ dbname: `oyamist-v1.0.db` });
        }

        var oya = new OyaReactor(serviceName, {
            dbfacade,
            emitter: oyaEmitter,
        });
        restBundles.push(oya);
        var vmc = new VmcBundle("vmc", {
            emitter: oyaEmitter,
        });
        restBundles.push(vmc);

        // declare ports
        var isTesting = module.parent != null && false;
        var testports = new Array(100).fill(null).map((a,i) => 3000 + i); // lots of ports for mocha -w
        var ports = isTesting ? testports : [80,8080];

        // create http and socket servers
        var rbServer = app.locals.rbServer = new rb.RbServer();
        rbServer.listen(app, restBundles, ports);

        winston.debug("firing asyncOnReady event");
        app.locals.asyncOnReady.forEach(async => async.next(app)); // notify waiting async blocks
        winston.info('memoryUsage()', process.memoryUsage());
    } catch (err) {
        winston.error("server.js:", err.stack);
        async.throw(err);
    }
}();
async.next();
