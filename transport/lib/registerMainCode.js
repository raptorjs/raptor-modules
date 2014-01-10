var resumer = require('resumer');

function registerMainCode(realPath, main) {
    var out = resumer();
    out.write('$rmod.main(' + JSON.stringify(realPath) + ', ' +
        JSON.stringify(main));
    return out;
}

module.exports = registerMainCode;