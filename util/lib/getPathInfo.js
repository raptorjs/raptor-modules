var nodePath = require('path');
var ok = require('assert').ok;

var fs = require('fs');
var raptorModulesUtil = require('../../util');
var raptorModulesResolver = require('../../resolver');
var getProjectRootDir = raptorModulesUtil.getProjectRootDir;
var findMain = raptorModulesUtil.findMain;
var getBrowserOverrides = require('./browser-overrides').getBrowserOverrides;

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
    ok(typeof path === 'string', 'path should be a string');
    options = options || {};

    var removeExt = options.removeExt !== false;

    var root = options.root || getProjectRootDir(path);
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
    var remap;

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

        var dirname = nodePath.dirname(path);

        var browserOverrides = getBrowserOverrides(dirname);
        if (browserOverrides) {
            var browserOverride = browserOverrides.getRemappedModuleInfo(path);

            if (browserOverride) {
                var overridePathInfo;
                var targetFile;

                if (browserOverride.filePath) {
                    targetFile = browserOverride.filePath;
                    
                } else if (browserOverride.name) {
                    ok(browserOverride.from, 'browserOverride.from expected');

                    var targetModule = raptorModulesResolver.resolveRequire(browserOverride.name, browserOverride.from);
                    ok(targetModule.main && targetModule.main.filePath, 'Invalid target module');
                    targetFile = targetModule.main.filePath;

                } else {
                    throw new Error('Invalid browser override for "' + path + '": ' + require('util').inspect(path));
                }

                var remapTo = normalizeDepDirnames(nodePath.relative(dirname, targetFile));

                remap = {
                    from: realPath,
                    to: removeExt ? removeRegisteredExt(remapTo) : remapTo
                };

                ok(targetFile, 'targetFile is null');

                overridePathInfo = getPathInfo(targetFile);
                overridePathInfo.isBrowserOverride = true;
                overridePathInfo.remap = remap;
                return overridePathInfo;
            }
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