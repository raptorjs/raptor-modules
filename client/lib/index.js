'use strict';


/*
https://github.com/joyent/node/blob/master/lib/module.js

GOAL: This module should exactly mirror the NodeJS module system.
The module transport will generate code that is used for resolving
real paths for a given logical path. This information is used to
resolve dependencies on client-side (in the browser).
*/

// this object stores the module factories with the keys being real paths of module (e.g. "/baz@3.0.0/lib/index" --> Function)
var definitions = {};

// this object stores the Module instance cache with the keys being logical paths of modules (e.g., "/$/foo/$/baz" --> Module)
var modules = {};

// this object maps dependency logical path to a specific version (for example, "/$/foo/$/baz" --> "3.0.0")
var dependencies = {};

// temporary variable for referencing a prototype
var proto;

function Module() {
    /*
    A Node module has these properties:
    - filename: The logical path of the module
    - id: (same as filename)
    - exports: The exports provided during instantiation
    - parent: parent Module
    - loaded: Has module been fully loaded (set to false until factory function returns)
    - children: The modules that were required by this module
    - paths: The search path used by this module (not documented in Node.js module system so we don't need support)
    */
}

var proto = Module.prototype;
/*
proto.createInstance = function(logicalPath) {
    
    var factoryOrObject = this.factoryOrObject;

    // check to see if we need to call a factory function to get the module instance
    if (!factoryOrObject || factoryOrObject.constructor !== Function) {
        // factoryObject is definitely not a function so use the factory object as the instance
        this.exports = exports = factoryOrObject;
    } else {

        // exports is an empty object
        this.exports = exports = {};

        // realPath is the __filename
        var realPath = this.realPath;

        //find the last slash position so that we can get the directory name substring
        var pos = realPath.lastIndexOf('/');

        // the require function is scoped to this module instance
        var require = function(logicalPath) {

        };

        // NOTE: We are using the scope of this Module instance but I don't know if we should do that
        factoryOrObject.call(this, require, exports, this, realPath, realPath.substring(0, pos));

        // The factory function may have changed the exports property to a new value so make sure
        // the local exports variable references the latest exports
        exports = this.exports;
    }
};
*/

/**
 * Defines a packages whose metadata is used by raptor-loader to load the package.
 */
function define(realPath, factoryOrObject) {
    /*
    $rmod.def('/baz@3.0.0/lib/index', function(require, exports, module, __filename, __dirname) {
        // module source code goes here
    });
    */

    /* jshint boss:true */
    return (definitions[realPath] = factoryOrObject);
}

function registerDependency(logicalParentPath, dependencyId, dependencyVersion) {
    var logicalPath = logicalParentPath + '/$/' + dependencyId;
    dependencies[logicalPath] =  dependencyVersion;
}

function resolvedInfo(logicalPath, dependencyId, subpath, dependencyVersion) {
    // Our internal module resolver will return an object with the following properties:
    // - logicalPath: The logical path of the module (used for caching instances)
    // - realPath: The real path of the module (used for instantiating new instances via factory)
    return {
        logicalPath: logicalPath + subpath,
        realPath: '/' + dependencyId + '@' + dependencyVersion + subpath,
    };
}

function normalizePathParts(parts) {
    var i;
    var len = 0;

    var numParts = parts.length;
    for (i = 0; i < numParts; i++) {
        var part = parts[i];
        // ignore parts with just "."
        if (part !== '.') {
            if (part === '..') {
                // overwrite the previous item by decrementing length
                len--;
            } else {
                // add this part to result and increment length
                parts[len] = part;
                len++;
            }
        }
    }

    // truncate parts to remove unused
    parts.length = len;
    return parts.join('/');
}

function normalize(path) {
    return normalizePathParts(path.split('/'));
}

function join(first, second) {
    var firstParts = first.split('/');
    var secondParts = second.split('/');
    return normalizePathParts(firstParts.concat(secondParts));
}

function resolveAbsolute(target, from) {
    var start = target.lastIndexOf('$');
    if (start === -1) {
        // target is something like "/foo/baz"
        return {
            logicalPath: target,
            realPath: target
        };
    }

    // target is something like "/$/foo/$/baz/lib/index"
    start += 2;
    var end = target.indexOf('/', start + 3);
    var logicalPath;
    var subpath;
    var dependencyId;

    if (end === -1) {
        // target is something like "/$/foo/$/baz"
        logicalPath = target;
        subpath = '';
        dependencyId = target.substring(start);
    } else {
        // target is something like "/$/foo/$/baz/lib/index"
        logicalPath = target.substring(0, end);
        subpath = target.substring(end);
        dependencyId = target.substring(start, end);
    }

    var dependencyVersion = dependencies[logicalPath];
    if (dependencyVersion) {
        return resolvedInfo(logicalPath, dependencyId, subpath, dependencyVersion);
    }

    return null;
}

function resolveRelative(target, from) {
    return resolveAbsolute(join(from, target));
}

function resolve(target, from) {
    
    if (!target) {
        return null;
    }

    if (target.charAt(0) === '.') {
        return resolveRelative(target, from);
    }

    if (target.charAt(0) === '/') {
        return resolveAbsolute(normalize(target), from);
    }

    var dependencyVersion;
    var pos;
    var dependencyId;
    var subpath;

    pos = target.indexOf('/');
    if (pos === -1) {
        dependencyId = target;
        subpath = '';
    } else {
        // When we're resolving a module, we don't care about the subpath at first
        dependencyId = target.substring(0, pos);
        subpath = target.substring(pos);
    }

    /*
    Consider when the module "baz" (which is required by "foo") requires module "async":
    resolve('async', '/$/foo/$/baz');

    // TRY
    /$/foo/$/baz/$/async
    /$/foo/$/async
    /$/async

    // SKIP
    /$/foo/$/$/async
    /$/$/async
    */

    // First check to see if there is a sibling "$" with the given target
    // by adding "/$/<target>" to the given from path.
    // If the given from is "/$/foo/$/baz" then we will try "/$/foo/$/baz/$/async"
    var logicalPath = from + '/$/' + dependencyId;
    dependencyVersion = dependencies[logicalPath];
    if (dependencyVersion) {
        return resolvedInfo(logicalPath, dependencyId, subpath, dependencyVersion);
    }

    var end = from.lastIndexOf('/');

    // if there is no "/" in the from path then this path is technically invalid (right?)
    if (end !== -1) {
        do {
            var start = from.lastIndexOf('/', end - 1);
            if (start === -1) {
                // reached the start so stop searching
                break;
            }

            // check to see if the substring from start:end is '/$/'
            if ((end - start === 2) && (from.charAt(start + 1) === '$')) {
                // skip look at this subpath because it ends with "/$/"
                end = start;
                continue;
            }

            logicalPath = from.substring(0, end) + '/$/' + dependencyId;
            dependencyVersion = dependencies[logicalPath];
            if (dependencyVersion) {
                return resolvedInfo(logicalPath, dependencyId, subpath, dependencyVersion);
            }

            end = from.lastIndexOf('/', start - 1);
        } while(end > 1);
    }

    return null;
}

/*
$rmod.run('/src/ui-pages/login/login-page', function(require, exports, module, __filename, __dirname) {
    // module source code goes here
});
*/
function runModule(logicalPath, factory) {
    
}

/*
 * $rmod is the short-hand version that that the transport layer expects
 * to be in the browser window object
 */
var $rmod = {
    def: define,
    dep: registerDependency,
    run: runModule,
    //main: registerMain
};

if (typeof window === 'undefined') {
    module.exports = {
        // expose the $rmod for testing the interface that would normally be exposed via the browser window object
        $rmod: $rmod,

        // expose the methods that we implement
        define: define,
        registerDependency: registerDependency,
        resolve: resolve,
        runModule: runModule,
        normalize: normalize,
        join: join
    };
} else {
    window.$rmod = $rmod;
}