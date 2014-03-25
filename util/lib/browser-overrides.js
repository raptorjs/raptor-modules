var ok = require('assert').ok;
var nodePath = require('path');
var tryPackage = require('../../util').tryPackage;
var findMain = require('../../util').findMain;
var resolver = require('../../resolver');

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
        var browser = pkg.browser || pkg.browserify;

        if (browser) {
            if (typeof browser === 'string') {
                var defaultMain = findMain(this.dirname);
                this.overrides[defaultMain] = browser;
            }
            else {
                for (var source in browser) {
                    var resolvedSource = source;
                    var target = browser[source];

                    if (source.startsWith('./')) {
                        resolvedSource = nodePath.join(this.dirname, source);
                    }

                    this.overrides[resolvedSource] = target;
                }    
            }
        }
    },

    getRemappedModuleInfo: function(requested, options) {
        var target = this.targetCache[requested];
        if (target === undefined) {

            var current = this;
            
            while (current) {
                target = current.overrides[requested];
                if (target) {

                    if (target.startsWith('.')) {
                        var resolved = resolver.resolveRequire(target, current.dirname, options);
                        target = {
                            filePath: resolved.filePath
                        };
                    } else {
                        target = {
                            name: target,
                            from: current.dirname
                        };    
                    }

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
    ok(typeof dirname === 'string', '"dirname" must be a string');
    
    var browserOverrides = browserOverridesByDir[dirname];

    if (browserOverrides === undefined) {
        browserOverrides = loadBrowserOverridesHelper(dirname);
        browserOverridesByDir[dirname] = browserOverrides;
    }

    return browserOverrides;
};

exports.getBrowserOverrides = getBrowserOverrides;