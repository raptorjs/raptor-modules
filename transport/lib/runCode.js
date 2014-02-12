var resumer = require('resumer');

var part0 = '$rmod.run(';
var part1 = ', function(require, exports, module, __filename, __dirname) { ';
var part2 = ' });';

function runCode(logicalPath, code) {
    if (!code) {
        throw new Error('"code" argument is required');
    }

    var stream;

    if (typeof code === 'string') {
        // Create a stream with buffered data that will be resumed on process.nextTick()
        stream = resumer().queue(code).end();
    }
    else {
        // Assume the code is a Stream
        stream = code;
    }

    var out = resumer();
    out.write(part0);
    out.write(JSON.stringify(logicalPath));
    out.write(part1);
    stream.pipe(out, { end: false });

    stream.on('end', function() {
        out.write(part2);
        out.end();
    });

    return out;
}

module.exports = exports = runCode;

exports.sync = function(logicalPath, code) {
    return part0 + JSON.stringify(logicalPath) + part1 + code + part2;
};