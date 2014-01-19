'use strict';


/*
https://github.com/joyent/node/blob/master/lib/module.js

GOAL: This module should mirror the NodeJS module system according the documented behavior.
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

function moduleNotFoundError(target) {
    var err = new Error('Cannot find module "' + target + '"');
    err.code = 'MODULE_NOT_FOUND';
    return err;
}

function Module(resolved) {
   /*
    A Node module has these properties:
    - filename: The real path of the module
    - id: The logical path of the module
    - exports: The exports provided during load
    - loaded: Has module been fully loaded (set to false until factory function returns)
    
    NOT SUPPORTED BY RAPTOR:
    - parent: parent Module
    - paths: The search path used by this module (NOTE: not documented in Node.js module system so we don't need support)
    - children: The modules that were required by this module
    */
    this.id = resolved[0];
    this.filename = resolved[1];
    this.loaded = false;
}

Module.cache = instanceCache;

var proto = Module.prototype;

proto.load = function(factoryOrObject) {
    var realPath = this.filename;

    if (factoryOrObject && factoryOrObject.constructor === Function) {
        // factoryOrObject is definitely a function
        var pos = realPath.lastIndexOf('/');

        // find the value for the __dirname parameter to factory
        var dirname = realPath.substring(0, pos);

        // find the value for the __filename paramter to factory
        var filename = realPath;

        // this is the require used by the module
        var instanceRequire = function(target) {
            return require(target, dirname);
        };

        // The require method should have a resolve method that will return logical
        // path but not actually instantiate the module.
        // This resolve function will make sure a definition exists for the corresponding
        // real path of the target but it will not instantiate a new instance of the target.
        instanceRequire.resolve = function(target) {
            var resolved = resolve(target, dirname);
            if (resolved === null) {
                throw moduleNotFoundError(target);
            }

            // Make sure the target exists and that there is a definition for it
            verifyResolve(target, resolved);

            // Return logical path
            // NOTE: resolved[0] is logical path
            return resolved[0];
        };

        // NodeJS provides access to the cache as a property of the "require" function
        instanceRequire.cache = instanceCache;

        // $rmod.def("/foo@1.0.0/lib/index", function(require, exports, module, __filename, __dirname) {
        this.exports = {};

        // call the factory function
        factoryOrObject.call(this, instanceRequire, this.exports, this, filename, dirname);

        this.loaded = true;
    } else {
        // factoryOrObject is not a function so have exports reference factoryOrObject
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
    dependencies[logicalParentPath + '/$/' + dependencyId] =  dependencyVersion;
}

/**
 * @param {String} logicalParentPath the path from which given dependencyId is required
 * @param {String} dependencyId the name of the module (e.g. "async") (NOTE: should not contain slashes)
 * @param {String} full version of the dependency that is required from given logical parent path
 */
function versionedDependencyInfo(logicalPath, dependencyId, subpath, dependencyVersion) {
    // Our internal module resolver will return an array with the following properties:
    // - logicalPath: The logical path of the module (used for caching instances)
    // - realPath: The real path of the module (used for instantiating new instances via factory)
    // return [logicalPath, realPath]
    return [
        // logical path:
        logicalPath + subpath,

        // real path:
        '/' + dependencyId + '@' + dependencyVersion + subpath
    ];
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

    // special handling is needed if input is ["", "."] */
    var leadingSlash = (numParts > 1) && (parts[0].length === 0);

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
        // if we end up with just one part that is empty string
        // (which can happen if input is ["", "."]) then return
        // string with just the leading slash
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

function resolveAbsolute(target) {
    var start = target.lastIndexOf('$');
    if (start === -1) {
        // target is something like "/foo/baz"
        // There is no installed module in the path

        // return [logicalPath, realPath, factoryOrObject]
        return [target, target];
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
    return dependencyVersion ? versionedDependencyInfo(logicalPath, dependencyId, subpath, dependencyVersion) : null;
}

function resolve(target, from) {
    
    if (!target) {
        return null;
    }

    if (target.charAt(0) === '.') {
        // turn relative path into absolute path
        return resolveAbsolute(join(from, target));
    }

    if (target.charAt(0) === '/') {
        return resolveAbsolute(normalize(target));
    }

    var dependencyId;
    var subpath;

    var pos = target.indexOf('/');
    if (pos === -1) {
        dependencyId = target;
        subpath = '';
    } else {
        // When we're resolving a module, we don't care about the subpath at first
        dependencyId = target.substring(0, pos);
        subpath = target.substring(pos);
    }

    /*
    Consider when the module "baz" (which is a dependency of "foo") requires module "async":
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
    // by adding "/$/<target>" to the given "from" path.
    // If the given from is "/$/foo/$/baz" then we will try "/$/foo/$/baz/$/async"
    var logicalPath = from + '/$/' + dependencyId;
    var dependencyVersion = dependencies[logicalPath];
    if (dependencyVersion) {
        return versionedDependencyInfo(logicalPath, dependencyId, subpath, dependencyVersion);
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
                return versionedDependencyInfo(logicalPath, dependencyId, subpath, dependencyVersion);
            }

            end = from.lastIndexOf('/', start - 1);
        } while(end > 1);
    }

    return null;
}

function withoutExtension(path) {
    var lastDotPos = path.lastIndexOf('.');
    var lastSlashPos;

    /* jshint laxbreak:true */
    return ((lastDotPos === -1) || ((lastSlashPos = path.lastIndexOf('/')) !== -1) && (lastSlashPos > lastDotPos))
        ? null // use null to indicate that returned path is same as given path
        : path.substring(0, lastDotPos);
}

function truncate(str, length) {
    return str.substring(0, str.length - length);
}

/*
 * When using the resolve function, we calculate the logical path and real path
 * using search path rules. The resolve function will detect missing module
 * symbolic links and return null. However, the resolve function will not do the
 * following:
 * - Check for definition with and without the given extension
 * - Apply remapping rules (used when transport layer decides to remap some logical paths)
 */
// NOTE: This function has side effects despite its name. The given resolved
// parameter (which is an array) will be updated to reflect the revised
// logical and real paths for the given target.
function verifyResolve(target, resolved, logicalPathWithoutExtension) {

    var realPath = resolved[1];

    // Retrieve the factory object
    var factoryOrObject = definitions[realPath];
    if (factoryOrObject !== undefined) {
        return factoryOrObject;
    }

    var logicalPath = resolved[0];

    // We will try without the extension
    if (logicalPathWithoutExtension === undefined) {
        logicalPathWithoutExtension = withoutExtension(logicalPath);
    }

    if ((logicalPathWithoutExtension === null) ||
        ((factoryOrObject = definitions[realPath = truncate(realPath, logicalPath.length - logicalPathWithoutExtension.length)]) === undefined)) {
        // An "undefined" factory means that there is no factory function or no value for the given definition
        throw moduleNotFoundError(target);
    }

    // remove extension from logical path
    resolved[0] = logicalPathWithoutExtension;

    // update real path since we removed the extension
    resolved[1] = realPath;

    return factoryOrObject;
}

function require(target, from) {
    var resolved = resolve(target, from);
    if (resolved === null) {
        throw moduleNotFoundError(target);
    }

    var logicalPath = resolved[0];
    var module = instanceCache[logicalPath];
    var logicalPathWithoutExtension;

    if (module === undefined) {
        logicalPathWithoutExtension = withoutExtension(logicalPath);

        // try to find cached instance without the extension
        if ((logicalPathWithoutExtension !== null) && (module = instanceCache[logicalPathWithoutExtension]) !== undefined) {
            // found cached entry based on the logical path without extension
            return module.exports;
        }
    } else {
        // found cached entry based on the logical path
        return module.exports;
    }

    // verifyResolve will throw error if module not found
    var factoryOrObject = verifyResolve(target, resolved, logicalPathWithoutExtension);

    module = new Module(resolved);

    // cache the instance before loading (allows support for circular dependency with partial loading)
    // NOTE: verifyResolve might change "resolved" array so make sure
    //       we retrieve logical path from resolved array and not local variable
    instanceCache[resolved[0]] = module;

    module.load(factoryOrObject);

    return module.exports;
}

/*
$rmod.run('/src/ui-pages/login/login-page', function(require, exports, module, __filename, __dirname) {
    // module source code goes here
});
*/
function run(logicalPath, factory) {
    define(logicalPath, factory);
    var module = new Module([logicalPath, logicalPath]);
    instanceCache[logicalPath] = module;
    module.load(factory);
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
    $rmod.join = join;
    $rmod.normalize = normalize;
    $rmod.require = require;
    $rmod.resolve = resolve;

    module.exports = $rmod;
} else {
    window.$rmod = $rmod;
}