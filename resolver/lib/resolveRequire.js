require('raptor-ecma/es6');
var ok = require('assert').ok;
var fs = require('fs');
var nodePath = require('path');
var resolver = require('../../resolver');
var findMain = require('../../util').findMain;
var getPathInfo = require('../../util').getPathInfo;
var browserResolve = require('./browser-resolve');

function resolveRequire(target, from) {
    ok(target, '"target" is required');
    ok(from, '"from" is required');

    var resolvedPath;
    var stat;

    try {
        stat = fs.statSync(target);
        resolvedPath = target;
        // We need "from" to be accurate for looking up browser overrides:
        from = stat.isDirectory() ? resolvedPath : nodePath.dirname(resolvedPath);
    }
    catch(e) {
        stat = null;
    }

    var browserOverrides = browserResolve.getBrowserOverrides(from);
    var browserOverride;
    var isBrowserOverride = false;

    if (!resolvedPath) {

        if (browserOverrides && (target.charAt(0) !== '.' && target.charAt(0) !== '/')) {
            // This top-level module might be mapped to a completely different module
            // based on the module metadata in package.json
            
            browserOverride = browserOverrides.resolve(target, from);

            if (browserOverride) {
                browserOverride.isBrowserOverride = true;
                return browserOverride;
            }
        }

        resolvedPath = resolver.find(target, from, function(path) {
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
        stat = stat || fs.statSync(resolvedPath);
        if (stat.isDirectory()) {
            var main = findMain(resolvedPath);

            browserOverrides = browserResolve.getBrowserOverrides(resolvedPath);
            if (browserOverrides) {
                browserOverride = browserOverrides.resolve(main);
                if (browserOverride) {
                    browserOverride.isBrowserOverride = true;
                    return browserOverride;
                }
            }
        }
        else {
            browserOverrides = browserResolve.getBrowserOverrides(nodePath.dirname(resolvedPath));
            if (browserOverrides) {
                browserOverride = browserOverrides.resolve(resolvedPath);
                if (browserOverride) {
                    browserOverride.isBrowserOverride = true;
                    return browserOverride;
                }
            }
        }

        var pathInfo = getPathInfo(resolvedPath);
        if (isBrowserOverride) {
            pathInfo.browserOverride = true;
        }

        return pathInfo;
    }
    else {
        throw new Error('Module not found: ' + target + ' (from: ' + from + ')');
    }
}

module.exports = resolveRequire;