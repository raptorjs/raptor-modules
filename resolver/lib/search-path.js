var nodePath = require('path');
var Module = require('module').Module;

function find(path, from, callback, thisObj) {
    

    if (process.platform === 'win32') {
        path = path.replace(/\//g, '\\'); // Replace forward slashes with back slashes
    }

    if (path.startsWith('./') || path.startsWith('../')) {
        // Don't go through the search paths for relative paths
        return callback.call(thisObj, nodePath.join(from, path));
    }
    else {
        var paths = Module._nodeModulePaths(from);

        for (var i=0, len=paths.length; i<len; i++) {
            var searchPath = paths[i];

            var result = callback.call(thisObj, nodePath.join(searchPath, path));
            if (result) {
                return result;
            }
        }
    }
}

exports.find = find;