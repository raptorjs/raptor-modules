require('raptor-ecma/es6');
var ok = require('assert').ok;
var fs = require('fs');
var nodePath = require('path');
var searchPath = require('./search-path');
var moduleUtil = require('../../util');

function resolveRequire(target, from) {
    ok(target, '"target" is required');
    ok(from, '"from" is required');

    var resolvedPath;
    var stat;

    if (target.charAt(0) === '/' || target.indexOf(':/') !== -1) {
        try {
            stat = fs.statSync(target);
            resolvedPath = target;
            // We need "from" to be accurate for looking up browser overrides:
            from = stat.isDirectory() ? resolvedPath : nodePath.dirname(resolvedPath);
        }
        catch(e) {
            stat = null;
        }
    }
    
    var browserOverrides = moduleUtil.getBrowserOverrides(from);
    var browserOverride;

    if (!resolvedPath) {

        if (browserOverrides && (target.charAt(0) !== '.' && target.charAt(0) !== '/')) {
            // This top-level module might be mapped to a completely different module
            // based on the module metadata in package.json
            
            var remappedModule = browserOverrides.getRemappedModuleInfo(target, from);

            if (remappedModule) {
                // console.log('BROWSER OVERRIDE: ', remappedModule);
                browserOverride = resolveRequire(remappedModule.name, remappedModule.from);
                browserOverride.dep.childName = target;
                browserOverride.dep.remap = remappedModule.name;
                browserOverride.isBrowserOverride = true;
                return browserOverride;
            }
        }

        resolvedPath = searchPath.find(target, from, function(path) {
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

            if (fs.existsSync(path)) {
                return path;
            }

            return null;
        });
    }
    
    if (resolvedPath) {
        var pathInfo = moduleUtil.getPathInfo(resolvedPath);
        return pathInfo;
    }
    else {
        throw new Error('Module not found: ' + target + ' (from: ' + from + ')');
    }
}

module.exports = resolveRequire;