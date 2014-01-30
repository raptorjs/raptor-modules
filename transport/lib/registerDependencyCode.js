var resumer = require('resumer');

function registerDependencyCode(logicalParentPath, childName, childVersion, overrideName) {
    var out = resumer();
    out.write('$rmod.dep(' + JSON.stringify(logicalParentPath) + ', ' +
        JSON.stringify(childName) + ', ' +
        JSON.stringify(childVersion));

    if (overrideName) {
        out.write(', ' + JSON.stringify(overrideName));
    }

    out.write(');');

    out.end();

    return out;
}

module.exports = registerDependencyCode;