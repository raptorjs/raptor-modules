require('raptor-ecma/es6');
var fs = require('fs');
var nodePath = require('path');
var cachedProjectRootDirs = {};
var packageReader = require('./package-reader');
var cwd = process.cwd();
var rootPackage = nodePath.join(cwd, 'package.json')
var projectRootDir = null;

if (fs.existsSync(rootPackage)) {
    projectRootDir = nodePath.dirname(rootPackage);
}

function findRootDir(dirname) {
    if (dirname === '' || dirname === '/') {
        return null;
    }

    var packagePath = nodePath.join(dirname, 'package.json');
    if (dirname.indexOf('node_modules') === -1) {
        var pkg = packageReader.tryPackage(packagePath);
        if (pkg && pkg.name) {
            // Only consider packages that have a name to avoid
            // intermediate packages that might only be used to
            // define a main script
            return dirname;    
        }
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

    if (projectRootDir) {
        // Use the CWD to avoid issues with linking in Node.js modules that are outside the project root
        return projectRootDir;
    }

    var rootDir;
    for (rootDir in cachedProjectRootDirs) {
        if (cachedProjectRootDirs.hasOwnProperty(rootDir)) {
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

    rootDir = findRootDir(path, true);

    if (!rootDir) {
        throw new Error('Unable to determine project root for path "' + path + '"');
    }

    cachedProjectRootDirs[rootDir] = true;

    return rootDir;
}

module.exports = getProjectRootDir;