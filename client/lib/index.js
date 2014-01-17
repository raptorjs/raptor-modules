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
var instanceCache = {};

// this object maps dependency logical path to a specific version (for example, "/$/foo/$/baz" --> "3.0.0")
var dependencies = {};

// temporary variable for referencing a prototype
var proto;

function Module(logicalPath, parent) {
    this.id = logicalPath;
    this.parent = parent;
    this.loaded = false;

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

Module.cache = instanceCache;

var proto = Module.prototype;

proto.load = function(realPath) {
    this.realPath = realPath;

    var factoryOrObject = definitions[realPath];
    if (factoryOrObject && factoryOrObject.constructor === Function) {

        var pos = realPath.lastIndexOf('/');
        var dirname = realPath.substring(0, pos);
        var filename = realPath;

        // this is the require used by the module
        var instanceRequire = function(target) {
            return require(target, dirname);
        };

        // NodeJS provides access to the cache as a property of the "require" function
        instanceRequire.cache = instanceCache;

        // $rmod.def("/foo@1.0.0/lib/index", function(require, exports, module, __filename, __dirname) {
        this.exports = {};

        // call the factory function
        factoryOrObject.call(this, instanceRequire, this.exports, this, filename, dirname);

        this.loaded = true;
    } else {
        this.exports = factoryOrObject;
    }
};

/**
 * Defines a packages whose metadata is used by raptor-loader to load the package.
 */
function define(realPath, factoryOrObject) {
    /*
    $rmod.def('/baz@3.0.0/lib/index', function(require, exports, module, __filename, __dirname) {
        // module source code goes here
    });
    */

    // Apparently, the override for making an assignment and returning a value at the same time is "boss"
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

/**
 * This function will take an array of path parts and normalize them by handling handle ".." and "."
 * and then joining the resultant string.
 *
 * @param {Array} parts an array of parts that presumedly was split on the "/" character.
 */
function normalizePathParts(parts) {
    var i;
    var len = 0;

    var numParts = parts.length;

    var leadingSlash = (parts.length > 1) && (parts[0].length === 0);

    for (i = 0; i < numParts; i++) {
        var part = parts[i];
        // ignore parts with just "."
        if (part === '.') {
            // if the "." is at end of parts (e.g. ["a", "b", "."]) then trim it off
            if (i === numParts - 1) {
                //len--;
            }
        } else if (part === '..') {
            // overwrite the previous item by decrementing length
            len--;
        } else {
            // add this part to result and increment length
            parts[len] = part;
            len++;
        }
    }

    if ((len === 1) && (parts[0] === '') && leadingSlash) {
        return '/';
    }

    // truncate parts to remove unused
    parts.length = len;
    return parts.join('/');
}

function normalize(path) {
    return normalizePathParts(path.split('/'));
}

function join(first, second) {
    return normalizePathParts(first.split('/').concat(second.split('/')));
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

    // "start" is currently pointing to the last "$". We want to find the dependencyId
    // which will start after after the substring "$/" (so we increment by two)
    start += 2;

    // the "end" needs to point to the slash that follows the "$" (if there is one)
    var end = target.indexOf('/', start + 3);
    var logicalPath;
    var subpath;
    var dependencyId;

    if (end === -1) {
        // target is something like "/$/foo/$/baz" so there is no subpath after the dependencyId
        logicalPath = target;
        subpath = '';
        dependencyId = target.substring(start);
    } else {
        // target is something like "/$/foo/$/baz/lib/index" so we need to separate subpath
        // from the dependencyId

        // logical path should not include the subpath
        logicalPath = target.substring(0, end);

        // subpath will be something like "/lib/index"
        subpath = target.substring(end);

        // dependencyId will be something like "baz" (will not contain slashes)
        dependencyId = target.substring(start, end);
    }

    // lookup the version
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

            // check to see if the substring from [start:end] is '/$/'
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

function require(target, from) {
    var resolved = resolve(target, from);
    if (resolved === null) {
        throw new Error('Not found: ' + target);
    }

    var module = instanceCache[resolved.logicalPath];
    if (module !== undefined) {
        return module.exports;
    }

    var logicalPath = resolved.logicalPath;
    module = new Module(logicalPath);
    instanceCache[logicalPath] = module;
    module.load(resolved.realPath);

    return module.exports;
}

/*
$rmod.run('/src/ui-pages/login/login-page', function(require, exports, module, __filename, __dirname) {
    // module source code goes here
});
*/
function run(logicalPath, factory) {
    define(logicalPath, factory);

    var module = new Module(logicalPath);
    module = new Module(logicalPath);
    instanceCache[logicalPath] = module;
    module.load(logicalPath);
}

/*
 * $rmod is the short-hand version that that the transport layer expects
 * to be in the browser window object
 */
var $rmod = {
    def: define,
    dep: registerDependency,
    run: run
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
        require: require,
        run: run,

        // expose normalize for unit testing
        normalize: normalize,

        // expose join for unit testing
        join: join
    };
} else {
    window.$rmod = $rmod;
}