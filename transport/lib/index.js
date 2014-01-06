var nodePath = require('path');
var fs = require('fs');

var getProjectRootDir = require('./util').getProjectRootDir;
var findMain = require('./util').findMain;

function defineCode(path, streamOrString, isObject) {

}

function runCode(logicalPath, streamOrString) {

}

function registerDependencyCode(logicalParentPath, targetId, targetVersion) {

}

function registerMainCode(realPath, main) {

}

function getPathInfo(path) {
    var root = getProjectRootDir(path);
    var lastNodeModules = path.lastIndexOf('node_modules/');
    var logicalPath = path.substring(root.length);
    var realPath;
    var moduleRootDir;
    var dep;
    var packagePath;

    var stat = fs.statSync(path);

    if (lastNodeModules !== -1) {
        var nodeModulesDir = path.substring(0, lastNodeModules + 'node_modules/'.length);

        var moduleNameEnd = path.indexOf('/', nodeModulesDir.length);
        if (moduleNameEnd === -1) {
            moduleNameEnd = path.length;
        }
        moduleRootDir = path.substring(0, moduleNameEnd);
        packagePath = nodePath.join(path.substring(0, moduleNameEnd), 'package.json');
        var pkg = require(packagePath);
        var name = pkg.name;
        var version = pkg.version;
        
        var basePath = '/' + name + '@' + version;
        realPath = basePath + path.substring(moduleNameEnd);

        dep = {
            parentPath: nodePath.dirname(nodeModulesDir).substring(root.length),
            childId: name,
            childVersion: version
        };
    }
    else {
        realPath = logicalPath;
    }

    var isDir = stat.isDirectory();
    var main;
    if (isDir) {
        main = findMain(path);
    }

    var result = {
        filePath: path,
        logicalPath: logicalPath,
        realPath: realPath,
        isDir: isDir
    };

    if (dep) {
        result.dep = dep;
    }

    if (main) {
        result.main = main;
    }

    return result;
}

function resolveRequire(path, from) {

}

exports.defineCode = defineCode;
exports.runCode = runCode;
exports.registerDependencyCode = registerDependencyCode;
exports.registerMainCode = registerMainCode;
exports.getPathInfo = getPathInfo;
exports.resolveRequire = resolveRequire;