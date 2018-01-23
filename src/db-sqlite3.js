(function(exports) {
    const DbFacade = require('./db-facade');
    const Sqlite3 = require('sqlite3').verbose();
    const winston = require('winston');

    class DbSqlite3 extends DbFacade {
        constructor(opts = {}) {
            super(opts);
            var self = this;
            this.dbname = opts.dbname || './oyamist-v1.0.db';
            Object.defineProperty(this, 'isOpen', {
                get: () => this.db ? true : false,
            });
        }

        open() {
            return new Promise((resolve, reject) => {
                var db = new Sqlite3.Database(this.dbname, Sqlite3.OPEN_READWRITE, e=>{
                    if (e) {
                        winston.error('db-sqlite3:', e.stack);
                        reject(e);
                    } else {
                        this.db = db;
                        resolve(this);
                    }
                });
            });
        }

        sqlGet(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            var context = new Error("");
            return new Promise((resolve, reject) => {
                this.db.get(sql, [], (e,r) => {
                    if (e) {
                        winston.error(`${e.message}\n"${sql}"\n${context.stack}`);
                        reject(e);
                    } else {
                        resolve(r);
                    }
                });
            });
        }

        sqlAll(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            var context = new Error("");
            return new Promise((resolve, reject) => {
                this.db.all(sql, [], (e,r) => {
                    if (e) {
                        winston.error(`${e.message}\n"${sql}"\n${context.stack}`);
                        reject(e);
                    } else {
                        resolve(r);
                    }
                });
            });
        }

        sqlExec(sql) {
            if (!this.isOpen) {
                return Promise.reject(DbFacade.ERROR_NOT_OPEN);
            }
            var context = new Error("");
            return new Promise((resolve, reject) => {
                this.db.run(sql, [], (e) => {
                    if (e) {
                        winston.error(`${e.message}\n"${sql}"\n${context.stack}`);
                        reject(e);
                    } else {
                        resolve(sql);
                    }
                });
            });
        }

    } //// class DbSqlite3

    module.exports = exports.DbSqlite3 = DbSqlite3;
})(typeof exports === "object" ? exports : (exports = {}));
