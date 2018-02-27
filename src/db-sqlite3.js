(function(exports) {
    const DbFacade = require('./db-facade');
    const Sqlite3 = require('sqlite3').verbose();
    const winston = require('winston');
    const path = require('path');

    class DbSqlite3 extends DbFacade {
        constructor(opts = {}) {
            super(opts);
            var self = this;
            this.dbname = opts.dbname || path.join(__dirname,'../test/test-v1.0.db');
            winston.info(`DbSqlite3 dbname:${this.dbname}`);
            Object.defineProperty(this, 'isOpen', {
                get: () => this.db ? true : false,
            });
        }

        open() {
            return new Promise((resolve, reject) => {
                try {
                    var db = new Sqlite3.Database(this.dbname, Sqlite3.OPEN_READWRITE, e=>{
                        if (e) {
                            winston.error(`DbSqlite3.open(${this.dbname}):`, e.stack);
                            reject(e);
                        } else {
                            this.db = db;
                            winston.info(`DbSqlite3.open(${this.dbname}) => OK`);
                            resolve(this);
                        }
                    });
                } catch (e) {
                    winston.error(e.stack);
                    reject(e);
                }
            });
        }

        sqlGet(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            var context = new Error("");
            return new Promise((resolve, reject) => {
                try {
                    this.db.get(sql, [], (e,r) => {
                        if (e) {
                            winston.error(`${e.message}\n"${sql}"\n${context.stack}`);
                            reject(e);
                        } else {
                            resolve(r);
                        }
                    });
                } catch(e) {
                    winston.error(e.stack);
                    reject(e);
                }
            });
        }

        sqlAll(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            var context = new Error("");
            return new Promise((resolve, reject) => {
                try {
                    this.db.all(sql, [], (e,r) => {
                        if (e) {
                            winston.error(`${e.message}\n"${sql}"\n${context.stack}`);
                            reject(e);
                        } else {
                            resolve(r);
                        }
                    });
                } catch(e) {
                    winston.error(e.stack);
                    reject(e);
                }
            });
        }

        sqlExec(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            var context = new Error("");
            return new Promise((resolve, reject) => {
                try {
                    this.db.run(sql, [], (e) => {
                        if (e) {
                            winston.error(`${e.message}\n"${sql}"\n${context.stack}`);
                            reject(e);
                        } else {
                            resolve(sql);
                        }
                    });
                } catch(e) {
                    winston.error(e.stack);
                    reject(e);
                }
            });
        }

    } //// class DbSqlite3

    module.exports = exports.DbSqlite3 = DbSqlite3;
})(typeof exports === "object" ? exports : (exports = {}));
