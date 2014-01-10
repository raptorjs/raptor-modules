var resumer = require('resumer');

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
    out.write('$rmod.run(' + JSON.stringify(logicalPath) + ', ');
    out.write('function(require, exports, module, __filename, __dirname) { ');
    
    stream.pipe(out, { end: false });

    stream.on('end', function() {
        out.write(' }'); // End the function wrapper
        out.write(');'); // End the function call
        out.end();
    });

    return out;
}

module.exports = runCode;