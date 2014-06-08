var resumer = require('resumer');
var eventStream = require('event-stream');

function defineCode(path, code, options) {
    var isObject = false;
    var additionalVars = null;
    var run = false;
    var globals = null;

    if (options) {
        isObject = options.object === true;
        additionalVars = options.additionalVars;
        run = options.run === true;
        globals = options.globals;
    }
    
    if (code == null) {
        throw new Error('"code" argument is required');
    }


    var out = [];
    out.push('$rmod.' + (run ? 'run' : 'def') + '(');
    out.push(JSON.stringify(path));

    if (isObject) {
        out.push(', ');
    } else {
        out.push(', function(require, exports, module, __filename, __dirname) { ');
        if (additionalVars && additionalVars.length) {
            out.push('var ' + additionalVars.join(', ') + '; ');
        }
    }

    
    out.push(code);
    
    if (!isObject) {
        out.push('\n}'); // End the function wrapper
        
        if (globals) {
            if (!Array.isArray(globals)) {
                globals = [globals];
            }

            if (globals.length) {
                out.push(', ' + JSON.stringify(globals));
            }
        }
    }

    out.push(');'); // End the function call
    return out.join('');
}

module.exports = function(path, code, options) {
    var out = resumer();

    if (code.pipe) {
        var stream = code;
        code = '';
        stream.pipe(eventStream.through(
            function write(data) {
                code += data;
            },
            function end() {
                out.queue(defineCode(path, code, options));
                out.end();
            }));
    } else {
        out.queue(defineCode(path, code, options));
        out.end();
    }

    return out;
};

module.exports.sync = function(path, code, options) {
    return defineCode(path, code, options);
};