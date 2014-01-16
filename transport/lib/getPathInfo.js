var nodePath = require('path');
var fs = require('fs');
var getProjectRootDir = require('./util').getProjectRootDir;
var findMain = require('./util').findMain;

function normalizeDepDirnames(path) {
    var parts = path.split('/');
    for (var i=0, len=parts.length; i<len; i++) {
        if (parts[i] === 'node_modules') {
            parts[i] = '$';
        }
    }

    return parts.join('/');
}

function removeRegisteredExt(path) {
    var basename = nodePath.basename(path);
    var ext = nodePath.extname(basename);

    if (require.extensions[ext]) {
        return path.slice(0, 0-ext.length);
    } else {
        return path;
    }
}

function getPathInfo(path, options) {
    var removeExt = true;
    if (options) {
        removeExt = options.removeExt !== false;
    }

    var root = getProjectRootDir(path);
    path = path.replace(/[\\]/g, '/');

    var lastNodeModules = path.lastIndexOf('node_modules/');
    var logicalPath = normalizeDepDirnames(path.substring(root.length));
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
        realPath = normalizeDepDirnames(basePath + path.substring(moduleNameEnd));

        dep = {
            parentPath: normalizeDepDirnames(nodePath.dirname(nodeModulesDir).substring(root.length)),
            childName: name,
            childVersion: version
        };
    } else {
        realPath = logicalPath;
    }

    var isDir = stat.isDirectory();
    var main;

    if (isDir) {
        var mainFilePath = findMain(path);
        if (mainFilePath) {
            var mainRelPath = removeRegisteredExt(nodePath.relative(path, mainFilePath));
            main = {
                filePath: mainFilePath,
                path: mainRelPath
            };    
        }
    } else {
        if (removeExt) {
            logicalPath = removeRegisteredExt(logicalPath);
            realPath = removeRegisteredExt(realPath);
        }
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

module.exports = getPathInfo;