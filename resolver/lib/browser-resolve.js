var ok = require('assert').ok;
var nodePath = require('path');
var tryPackage = require('../../util').tryPackage;
var findMain = require('../../util').findMain;
var browserOverridesByDir = {};

function BrowserOverrides(dirname) {
    this.overrides = {};
    this.dirname = dirname;
    this.parent = null;
    this.resolveCache = {};
    this.targetCache = {};
}

BrowserOverrides.prototype = {
    load: function(pkg) {
        this.dirname = pkg.__dirname;

        if (pkg.browser) {
            if (typeof pkg.browser === 'string') {
                var defaultMain = findMain(this.dirname);
                this.overrides[defaultMain] = pkg.browser;
            }
            else {
                for (var source in pkg.browser) {
                    var resolvedSource = source;

                    if (source.startsWith('./')) {
                        resolvedSource = nodePath.join(this.dirname, source);
                    }

                    this.overrides[resolvedSource] = pkg.browser[source];
                }    
            }
        }
    },

    getRemappedModuleInfo: function(requested) {
        var target = this.targetCache[requested];
        if (target === undefined) {
            ok(requested.charAt(0) !== '.' && requested.charAt(0) !== '/', 'Non-relative and non-absolute module path expected. Provided: ' + requested);

            var current = this;
        
            while (current) {
                target = current.overrides[requested];
                if (target) {
                    target = {
                        name: target,
                        from: current.dirname
                    };

                    break;
                }

                current = current.parent;
            }

            if (!target) {
                target = null;
            }

            this.targetCache[requested] = target;
        }

        return target;
    },

    _resolve: function(target) {
        ok(target, '"target" is required');

        var resolved = this.resolveCache[target];

        if (resolved === undefined) {
            var resolveRequire = require('./resolveRequire');

            resolved = resolveRequire(
                target,
                this.dirname);

            while (resolved && resolved.isDir) {
                var main = findMain(resolved.filePath);
                resolved = resolveRequire(main, nodePath.dirname(main));
            }

            this.resolveCache[target] = resolved || null;
        }

        return resolved;
    },

    resolve: function(target) {
        var override = this.overrides[target];
        if (override) {
            return this._resolve(override);
        }
        else {
            if (this.parent) {
                return this.parent.resolve(target);
            }
            else {
                return null;
            }
        }
    }
};

var getBrowserOverrides;

function loadBrowserOverridesHelper(dirname) {
    var packagePath = nodePath.join(dirname, 'package.json');
    var pkg = tryPackage(packagePath);
    var browserOverrides = new BrowserOverrides(dirname);

    if (pkg) {
        browserOverrides.load(pkg);
        if (pkg.name) {
            return browserOverrides;
        }
    }
    
    // We are not the root package so try moving up a directory
    // to attach a parent to these browser overrides
    var parentDirname = nodePath.dirname(dirname);
    if (parentDirname && parentDirname !== dirname) {
        browserOverrides.parent = getBrowserOverrides(parentDirname);
    }

    return browserOverrides;

}

getBrowserOverrides = function(dirname) {
    ok(dirname, '"dirname" is required');
    
    var browserOverrides = browserOverridesByDir[dirname];

    if (browserOverrides === undefined) {
        browserOverrides = loadBrowserOverridesHelper(dirname);
        browserOverridesByDir[dirname] = browserOverrides;
    }

    return browserOverrides;
};

exports.getBrowserOverrides = getBrowserOverrides;