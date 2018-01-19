(function(exports) {
    const winston = require("winston");

    var sfSingleton;

    class SystemFacade {
        constructor(opts = {}) {
            this.w1Addresses = opts.w1Addresses || [];
            this.w1Addresses.indexOf(SystemFacade.NO_DEVICE) < 0 &&
                this.w1Addresses.push(SystemFacade.NO_DEVICE);
        }

        static get NO_DEVICE() { return '(NO DEVICE)' }
        static get facade() {
            return sfSingleton;
        }

        static set facade(value) {
            sfSingleton = value;
        }

        oneWireAddresses() {
            return this.w1Addresses;
        }
        static oneWireAddresses() {
            return sfSingleton.oneWireAddresses();
        }

        oneWireRead(address, type) {
            var temp = null;
            var humidity = null;
            return Promise.resolve({
                temp,
                humidity,
            });
        }
        static oneWireRead(address, type) {
            return new Promise((resolve, reject) => {
                sfSingleton.oneWireRead(address, type).then(r=>{
                    !r.timestamp && (r.timestamp = new Date());
                    resolve(r);
                }).catch(e=>reject(e));
            });
        }

    } //// class SystemFacade

    sfSingleton = new SystemFacade();

    module.exports = exports.SystemFacade = SystemFacade;
})(typeof exports === "object" ? exports : (exports = {}));
