var resumer = require('resumer');

function registerMainCode(path, main) {
    var out = resumer();
    out.queue('$rmod.main(' + JSON.stringify(path) + ', ' +
        JSON.stringify(main) + ');');
    out.end(); 
    return out;
}

module.exports = registerMainCode;