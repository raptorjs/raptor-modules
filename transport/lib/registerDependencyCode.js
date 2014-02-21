var resumer = require('resumer');

function registerDependencyCode(logicalParentPath, childName, childVersion, overrideName) {
    var out = resumer();
    out.queue('$rmod.dep(' + JSON.stringify(logicalParentPath) + ', ' +
        JSON.stringify(overrideName || childName) + ', ' +
        JSON.stringify(childVersion));

    if (overrideName) {
        out.queue(', ' + JSON.stringify(childName));
    }

    out.queue(');');

    out.end();

    return out;
}

module.exports = registerDependencyCode;