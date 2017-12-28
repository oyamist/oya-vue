(function(exports) {
    const winston = require('winston');
    const os = require('os');
    const http = require('http');
    const { Netmask } = require('netmask');

    class OyaNet {
        constructor(opts={}) {
            this.timeout = opts.timeout || 100;
        }

        ipv4Candidates() {
            var ifaces = os.networkInterfaces();
            var keys = Object.keys(ifaces).filter(k => !k.startsWith('br'));
            var ipv4 = keys.reduce( (a,k)=>{
                ifaces[k].forEach(i=>{
                    return 'IPv4' === i.family && i.internal === false && a.push(i);
                });
                return a;
            }, []);
            var addrs = ipv4.reduce( (a,iface) => {
                var block = new Netmask(iface.address, iface.netmask);
                block.forEach((ip,long,i) => {
                    a.push(ip);
                });
                return a;
            }, []);
            return addrs;
        }

        probeHost(opts={}) {
            if (typeof opts === 'string') {
                opts = {
                    host: opts,
                };
            }
            var request = Object.assign({
                host: '127.0.0.1',
                port: 80, 
                family: 4,
                path: '/oyapi/identity',
                timeout: this.timeout,
            }, opts);
            return new Promise((resolve, reject) => {
                var req = http.get(request, res => {
                    const { statusCode } = res;
                    const contentType = res.headers['content-type'];

                    let error;
                    if (statusCode !== 200) {
                        error = new Error('Request Failed.\n' +
                                          `Status Code: ${statusCode}`);
                    } else if (!/^application\/json/.test(contentType)) {
                        error = new Error('Invalid content-type.\n' +
                                          `Expected application/json but received ${contentType}`);
                    }
                    if (error) {
                        res.resume(); // consume response data to free up memory
                        reject(error);
                        return;
                    }

                    res.setEncoding('utf8');
                    let rawData = '';
                    res.on('data', (chunk) => { rawData += chunk; });
                    res.on('end', () => {
                        try {
                            var parsedData = JSON.parse(rawData);
                            parsedData.ip = opts.host;
                            resolve(parsedData);
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', (e) => {
                    reject(e);
                }).on('timeout', (e) => {
                    req.abort();
                });
            });
        }

        identifyHosts(candidates = this.ipv4Candidates()) {
            return new Promise((resolve,reject) => (async ()=>{
                try {
                    var hosts = [];
                    var promises = candidates.map(c => {
                        this.probeHost(c).then(r=>{
                            hosts.push(r);
                            (hosts.length === candidates.length) && resolve(hosts.filter(h=>!!h));
                        }).catch(e=>{
                            hosts.push(null);
                            (hosts.length === candidates.length) && resolve(hosts.filter(h=>!!h));
                        })
                    });
                } catch (e) {
                    reject(e);
                }
            })());
        }

    } //// class OyaNet

    module.exports = exports.OyaNet = OyaNet;
})(typeof exports === "object" ? exports : (exports = {}));
