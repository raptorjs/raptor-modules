var resumer = require('resumer');

function registerRemapCode(from, to) {
    var out = resumer();
    out.queue('$rmod.remap(' + JSON.stringify(from) + ', ' +
        JSON.stringify(to) + ');');
    out.end();  
    return out;
}

module.exports = registerRemapCode;