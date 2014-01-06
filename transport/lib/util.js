require('raptor-ecma/es6');
var fs = require('fs');
var nodePath = require('path');

var cachedRoots = {};
var existsCache = {};

function removeExt(path) {
    var lastDot = path.lastIndexOf('.');
    if (lastDot !== -1) {
        return path.substring(0, lastDot);
    }
    else {
        return path;
    }
}

function existsCached(path) {
    var exists = existsCached[path];
    if (exists !== undefined) {
        return exists;
    }

    exists = fs.existsSync(path);
    existsCache[path] = exists;
    return exists;
}

function tryPackage(path) {
    if (existsCached(path)) {
        var pkg = require(path);
        pkg.__filename = path;
        pkg.__dirname = nodePath.dirname(path);
        return pkg;
    }
}

function findMainForFilename(dir, main) {
    var filenames = fs.readdirSync(dir);
    for (var i=0, len=filenames.length; i<len; i++) {
        var curFilename = filenames[i];
        var lastDot = curFilename.lastIndexOf('.');
        if (lastDot === -1) {
            lastDot = curFilename.length;
        }

        if (curFilename.substring(0, lastDot) === main) {
            var ext = curFilename.substring(lastDot);
            var handler = require.extensions[ext];
            if (handler) {
                return nodePath.join(dir, curFilename);
            }
        }
    }

    return null;
}

function findMain(path) {
    var packagePath = nodePath.join(path, 'package.json');
    var main;
    var pkg = tryPackage(packagePath);
    if (pkg) {
        main = pkg.main;
    }

    if (!main) {
        main = findMainForFilename(path, 'index');
    }
    else {

        main = nodePath.resolve(path, main);

        if (!fs.existsSync(main)) {
            var dirname = nodePath.dirname(main);
            var filename = nodePath.basename(main);

            // The main file might be lacking a file extension
            main = findMainForFilename(dirname, filename);
        }
    }

    // if (!fs.existsSync(main)) {
    //     main = null;
    // }



    return main;
}

function findRootDir(dirname) {
    if (dirname === '' || dirname === '/') {
        return null;
    }

    var packagePath = nodePath.join(dirname, 'package.json');
    if (dirname.indexOf('node_modules') === -1 && existsCached(packagePath)) {
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

exports.tryPackage = tryPackage;
exports.findMain = findMain;
exports.getProjectRootDir = getProjectRootDir;