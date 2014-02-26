var resumer = require('resumer');

var part0 = '$rmod.def(';
var part1a = ', function(require, exports, module, __filename, __dirname) { ';
var part1b = ' }';
var part2 = ');';

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
    out.queue(part0);
    out.queue(JSON.stringify(path));

    if (isObject) {
        out.queue(', ');
        
    } else {
        out.queue(part1a);
        if (additionalVars) {
            out.queue('var ' + additionalVars.join(', ') + '; ');
        }
    }

    
    
    stream.pipe(out, { end: false });

    stream.on('end', function() {
        if (!isObject) {
            out.queue(part1b); // End the function wrapper
        }

        out.queue(part2); // End the function call
        
        out.end();
    });

    return out;
}

module.exports = defineCode;

module.exports.sync = function(path, code, options) {
    var isObject = options && options.object === true;
    var additionalVars = options && options.additionalVars;

    if (!code) {
        throw new Error('"code" argument is required');
    }


    var out = [];
    out.push(part0);
    out.push(JSON.stringify(path));

    if (isObject) {
        out.queue(', ');
    } else {
        out.push(part1a);
        if (additionalVars) {
            out.push('var ' + additionalVars.join(', ') + '; ');
        }
    }

    
    out.push(code);
    
    if (!isObject) {
        out.push(part1b); // End the function wrapper
    }

    out.push(part2); // End the function call
    return out.join('');
};