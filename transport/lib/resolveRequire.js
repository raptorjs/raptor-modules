var resolver = require('../../resolver');
var fs = require('fs');
var getPathInfo = require('./getPathInfo');

function resolveRequire(path, from) {
    var resolvedPath = resolver.find(path, from, function(path) {
        if (fs.existsSync(path)) {
            return path;
        }
        // Try with the extensions
        var extensions = require.extensions;
        for (var ext in extensions) {
            if (extensions.hasOwnProperty(ext)) {
                var pathWithExt = path + ext;
                if (fs.existsSync(pathWithExt)) {
                    return pathWithExt;
                }
            }
        }

        return null;
    });

    if (resolvedPath) {
        return getPathInfo(resolvedPath);
    }
    else {
        throw new Error('Module not found: ' + path + ' (from: ' + from + ')');
    }
}

module.exports = resolveRequire;