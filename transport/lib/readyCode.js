var resumer = require('resumer');

var code = '$rmod.ready();';

function readyCode() {
    var stream = resumer();
    stream.queue(code);
    stream.end();
    return stream;
}

module.exports = exports = readyCode;

exports.sync = function(logicalPath, code) {
    return code;
};