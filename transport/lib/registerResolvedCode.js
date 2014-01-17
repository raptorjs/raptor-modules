var resumer = require('resumer');

function registerResolvedCode(target, from, resolved) {
    var out = resumer();
    out.write('$rmod.resolved(' + JSON.stringify(target) + ', ' +
        JSON.stringify(from) + ', ' +
        JSON.stringify(resolved) + ');');

    out.end();

    return out;
}

module.exports = registerResolvedCode;