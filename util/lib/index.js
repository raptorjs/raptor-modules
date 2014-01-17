require('raptor-ecma/es6');

var fs = require('fs');

var DIR = 1;
var FILE = 2;

function removeExt(path) {
    var lastDot = path.lastIndexOf('.');
    if (lastDot !== -1) {
        return path.substring(0, lastDot);
    }
    else {
        return path;
    }
}

var fileInfoCache = {};

function fileInfoCached(path) {
    var fileInfo = fileInfoCache[path];
    if (fileInfo === undefined) {
        try {
            var stat = fs.statSync(path);
            fileInfo = stat.isDirectory() ? DIR : FILE;
        }
        catch(e) {
            fileInfo = null;
        }

        fileInfoCache[path] = fileInfo;
    }

    return fileInfo;
}

function existsCached(path) {
    var fileInfo = fileInfoCached(path);
    return fileInfo != null;
}

function isDirCached(path) {
    var fileInfo = fileInfoCached(path);
    return fileInfo === DIR;
}

function isFileCached(path) {
    var fileInfo = fileInfoCached(path);
    return fileInfo === FILE;
}

exports.existsCached = existsCached;
exports.isDirCached = isDirCached;
exports.isFileCached = isFileCached;

exports.removeExt = removeExt;
exports.tryPackage = require('./package-reader').tryPackage;
exports.findMain = require('./findMain');
exports.getProjectRootDir = require('./getProjectRootDir');
exports.getModuleRootPackage = require('./getModuleRootPackage');
exports.getPathInfo = require('./getPathInfo');