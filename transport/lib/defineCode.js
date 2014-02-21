var resumer = require('resumer');

function defineCode(path, code, options) {
    var isObject = options && options.object === true;
    var additionalVars = options && options.additionalVars;

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
    out.queue('$rmod.def(' + JSON.stringify(path) + ', ');

    if (!isObject) {
        out.queue('function(require, exports, module, __filename, __dirname) { ');
    }

    if (additionalVars) {
        out.queue('var ' + additionalVars.join(', ') + '; ');
    }
    
    stream.pipe(out, { end: false });

    stream.on('end', function() {
        if (!isObject) {
            out.queue(' }'); // End the function wrapper
        }

        out.queue(');'); // End the function call
        
        out.end();
    });

    return out;
}

module.exports = defineCode;