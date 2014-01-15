var resumer = require('resumer');

function registerDependencyCode(logicalParentPath, childName, childVersion) {
    var out = resumer();
    out.write('$rmod.dep(' + JSON.stringify(logicalParentPath) + ', ' +
        JSON.stringify(childName) + ', ' +
        JSON.stringify(childVersion) + ');');

    out.end();

    return out;
}

module.exports = registerDependencyCode;