require('raptor-ecma/es6');
var fs = require('fs');
var nodePath = require('path');

var cachedRoots = {};

function findRootDir(dirname) {
    if (dirname === '' || dirname === '/') {
        return null;
    }

    var packagePath = nodePath.join(dirname, 'package.json');
    if (dirname.indexOf('node_modules') === -1 && fs.existsSync(packagePath)) {
        return dirname;
    }

    var parentDirname = nodePath.dirname(dirname);
    if (parentDirname !== dirname) {
        return findRootDir(parentDirname);
    }
    else {
        return null;
    }
}

function getProjectRootDir(path) {
    var rootDir;
    for (rootDir in cachedRoots) {
        if (cachedRoots.hasOwnProperty(rootDir)) {
            if (path.startsWith(rootDir)) {
                return rootDir;
            }
        }
    }

    var stat = fs.statSync(path);

    var dirname;

    if (stat.isDirectory()) {
        dirname = path;
    }
    else {
        dirname = nodePath.dirname(path);
    }

    rootDir = findRootDir(path);
    if (!rootDir) {
        throw new Error('Unable to determine project root for path "' + path + '"');
    }

    return rootDir;
}

exports.getProjectRootDir = getProjectRootDir;