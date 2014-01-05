var nodePath = require('path');
var Module = require('module').Module;
var raptorPackaging = require('raptor-packaging');

function readPackage(path) {
    try {
        return raptorPackaging.readPackage(path);
    }
    catch(e) {
        if (e.fileNotFound === true) {
            return null;
        }
        else {
            throw e;
        }
    }
}

function resolveRootPackage(dirname) {
    var rootPkg;
    var curDir = dirname;

    while (true) {
        if (curDir === '/' || curDir === '\\' || curDir === '.' || curDir === '') {
            break;
        }

        var packagePath = nodePath.join(curDir, 'package.json');
        var pkg = readPackage(packagePath);
        
        if (pkg && (pkg.version || pkg.dependencies || pkg.raptor.paths)) {
            rootPkg = pkg;
            // We have reached the top-level directory of a module
            break;
        }
    
        curDir = nodePath.dirname(curDir);
    }

    return rootPkg;
}

function find(path, from, callback, thisObj) {
    var paths = Module._nodeModulePaths(from);
    var rootPkg = resolveRootPackage(from);

    if (rootPkg && rootPkg.raptor.paths) {
        paths = rootPkg.raptor.paths.concat(paths);
    }

    if (process.platform === 'win32') {
        path = path.replace(/\//g, '\\'); // Replace forward slashes with back slashes
    }

    if (path.startsWith('./') || path.startsWith('../')) {
        // Don't go through the search paths for relative paths
        return callback.call(thisObj, nodePath.join(from, path));
    }
    else {
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