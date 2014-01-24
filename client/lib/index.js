'use strict';

/*
GOAL: This module should mirror the NodeJS module system according the documented behavior.
The module transport will generate code that is used for resolving
real paths for a given logical path. This information is used to
resolve dependencies on client-side (in the browser).

Inspired by:
https://github.com/joyent/node/blob/master/lib/module.js
*/
(function() {

    // this object stores the module factories with the keys being real paths of module (e.g. "/baz@3.0.0/lib/index" --> Function)
    var definitions = {};

    // this object stores the Module instance cache with the keys being logical paths of modules (e.g., "/$/foo/$/baz" --> Module)
    var instanceCache = {};

    // this object maps dependency logical path to a specific version (for example, "/$/foo/$/baz" --> "3.0.0")
    var dependencies = {};

    // this object maps relative paths to a specific real path
    var mains = {};

    // used to remap a real path to a new path (keys are real paths and values are relative paths)
    var remapped = {};

    // used to remap a module ID (e.g. "streams" --> "streams-browser")
    var remappedModules = {};

    var cacheByDirname = {};

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

    proto = Module.prototype;

    proto.load = function(factoryOrObject) {
        var realPath = this.filename;

        if (factoryOrObject && factoryOrObject.constructor === Function) {
            // factoryOrObject is definitely a function
            var pos = realPath.lastIndexOf('/');

            // find the value for the __dirname parameter to factory
            var dirname = realPath.substring(0, pos);

            // find the value for the __filename paramter to factory
            var filename = realPath;

            // local cache for requires initiated from this module/dirname
            var localCache = cacheByDirname[dirname] || (cacheByDirname[dirname] = {});

            // this is the require used by the module
            var instanceRequire = function(target) {
                return localCache[target] || (localCache[target] = require(target, dirname));
            };

            // The require method should have a resolve method that will return logical
            // path but not actually instantiate the module.
            // This resolve function will make sure a definition exists for the corresponding
            // real path of the target but it will not instantiate a new instance of the target.
            instanceRequire.resolve = function(target) {
                var resolved = resolve(target, dirname);

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
        } else {
            // factoryOrObject is not a function so have exports reference factoryOrObject
            this.exports = factoryOrObject;
        }

        this.loaded = true;
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
        definitions[realPath] = factoryOrObject;
    }

    function registerMain(realPath, relativePath) {
        mains[realPath] = relativePath;
    }

    function remap(oldRealPath, relativePath) {
        remapped[oldRealPath] = relativePath;
    }

    function registerDependency(logicalParentPath, dependencyId, dependencyVersion, dependencyAlsoKnownAs) {
        dependencies[logicalParentPath + '/$/' + dependencyId] =  [dependencyVersion];
        if (dependencyAlsoKnownAs !== undefined) {
            dependencies[logicalParentPath + '/$/' + dependencyAlsoKnownAs] =  [dependencyVersion, dependencyId];
        }
    }

    /**
     * This function will take an array of path parts and normalize them by handling handle ".." and "."
     * and then joining the resultant string.
     *
     * @param {Array} parts an array of parts that presumedly was split on the "/" character.
     */
    function normalizePathParts(parts) {

        // IMPORTANT: It is assumed that parts[0] === "" because this method is used to
        // join an absolute path to a relative path
        var i;
        var len = 0;

        var numParts = parts.length;

        for (i = 0; i < numParts; i++) {
            var part = parts[i];

            if (part === '.') {
                // ignore parts with just "."
                /*
                // if the "." is at end of parts (e.g. ["a", "b", "."]) then trim it off
                if (i === numParts - 1) {
                    //len--;
                }
                */
            } else if (part === '..') {
                // overwrite the previous item by decrementing length
                len--;
            } else {
                // add this part to result and increment length
                parts[len] = part;
                len++;
            }
        }

        if (len === 1) {
            // if we end up with just one part that is empty string
            // (which can happen if input is ["", "."]) then return
            // string with just the leading slash
            return '/';
        } else if (len > 2) {
            // parts i s
            // ["", "a", ""]
            // ["", "a", "b", ""]
            if (parts[len - 1].length === 0) {
                // last part is an empty string which would result in trailing slash
                len--;
            }
        }

        // truncate parts to remove unused
        parts.length = len;
        return parts.join('/');
    }

    function join(from, target) {
        return normalizePathParts(from.split('/').concat(target.split('/')));
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

    /**
     * @param {String} logicalParentPath the path from which given dependencyId is required
     * @param {String} dependencyId the name of the module (e.g. "async") (NOTE: should not contain slashes)
     * @param {String} full version of the dependency that is required from given logical parent path
     */
    function versionedDependencyInfo(logicalPath, dependencyId, subpath, dependencyVersion) {
        // Our internal module resolver will return an array with the following properties:
        // - logicalPath: The logical path of the module (used for caching instances)
        // - realPath: The real path of the module (used for instantiating new instances via factory)
        // return [logicalPath, realPath, factoryOrObject]
        var realPath = '/' + dependencyId + '@' + dependencyVersion + subpath;
        logicalPath = logicalPath + subpath;
        return [logicalPath, realPath, undefined];
    }

    function resolveAbsolute(target) {
        var start = target.lastIndexOf('$');
        if (start === -1) {
            // return [logicalPath, realPath, factoryOrObject]
            return [target, target, undefined];
        }

        // TODO: Should we handle absolute paths with "$"???
        // target is something like "/$/foo/$/baz/lib/index"
        // In this example we need to find what version of "baz" foo requires

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
        var dependencyInfo = dependencies[logicalPath];
        if (dependencyInfo === undefined) {
            return null;
        }

        return versionedDependencyInfo(
            logicalPath,

            // dependencyInfo[1] is the optional remapped dependency ID
            // (use the actual dependencyID from target if remapped dependency ID is undefined)
            dependencyInfo[1] || dependencyId,

            subpath,

            // first item
            dependencyInfo[0]);
    }

    function resolveModule(target, from) {
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

        var remappedDependencyId = remappedModules[dependencyId];
        if (remappedDependencyId !== undefined) {
            dependencyId = remappedDependencyId;
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
        var dependencyInfo = dependencies[logicalPath];
        if (dependencyInfo !== undefined) {
            return versionedDependencyInfo(
                logicalPath,

                // dependencyInfo[1] is the optional remapped dependency ID
                // (use the actual dependencyID from target if remapped dependency ID is undefined)
                dependencyInfo[1] || dependencyId,

                subpath,

                // dependencyVersion
                dependencyInfo[0]);
        }

        var end = from.lastIndexOf('/');

        // if there is no "/" in the from path then this path is technically invalid (right?)
        while(end !== -1) {

            var start = -1;

            // make sure we don't check a logical path that would end with "/$/$/dependencyId"
            if (end > 0) {
                start = from.lastIndexOf('/', end - 1);
                if ((start !== -1) && (end - start === 2) && (from.charAt(start + 1) === '$')) {
                    // check to see if the substring from [start:end] is '/$/'
                    // skip look at this subpath because it ends with "/$/"
                    end = start;
                    continue;
                }
            }

            logicalPath = from.substring(0, end) + '/$/' + dependencyId;
            dependencyInfo = dependencies[logicalPath];
            if (dependencyInfo !== undefined) {
                return versionedDependencyInfo(
                    logicalPath,

                    // dependencyInfo[1] is the optional remapped dependency ID
                    // (use the actual dependencyID from target if remapped dependency ID is undefined)
                    dependencyInfo[1] || dependencyId,

                    subpath,

                    dependencyInfo[0]);
            } else if (start === -1) {
                break;
            }

            end = from.lastIndexOf('/', start - 1);
        }

        throw moduleNotFoundError(target);
    }

    function resolve(target, from) {
        
        if (!target) {
            throw moduleNotFoundError('');
        }

        var resolved;
        if (target.charAt(0) === '.') {
            // turn relative path into absolute path
            resolved = resolveAbsolute(join(from, target));
        } else if (target.charAt(0) === '/') {
            // handle targets such as "/my/file" or "/$/foo/$/baz"
            resolved = resolveAbsolute(normalizePathParts(target.split('/')));
        } else {
            // handle targets such as "foo/lib/index"
            resolved = resolveModule(target, from);
        }

        var logicalPath = resolved[0];
        var realPath = resolved[1];

        // target is something like "/foo/baz"
        // There is no installed module in the path
        var relativePath;

        // check to see if "target" is a "directory" which has a registered main file
        if ((relativePath = mains[realPath]) !== undefined) {
            // TODO: Will relative path not have leading slash?
            // NOTE: I would prefer that relativePath always have leading slash
            //       so might want to change that in transport layer
            
            // there is a main file corresponding to the given target to add the relative path
            resolved[0] = logicalPath = logicalPath + '/' + relativePath;
            resolved[1] = realPath = realPath + '/' + relativePath;
        }

        var newRelativePath = remapped[realPath];
        if (newRelativePath !== undefined) {
            resolved[0] = logicalPath = join(logicalPath + '/..', newRelativePath);
            resolved[1] = realPath = join(realPath + '/..', newRelativePath);
        }

        var factoryOrObject = definitions[realPath];
        if (factoryOrObject === undefined) {
            // check for definition for given realPath but without extension
            var realPathWithoutExtension;
            if (((realPathWithoutExtension = withoutExtension(realPath)) === null) ||
                ((factoryOrObject = definitions[realPathWithoutExtension]) === undefined)) {
                throw moduleNotFoundError(target);
            }

            // we found the definition based on real path without extension so
            // update logical path and real path
            resolved[0] = logicalPath = truncate(logicalPath, realPath.length - realPathWithoutExtension.length);
            resolved[1] = realPath = realPathWithoutExtension;
        }

        // since we had to make sure a definition existed don't throw this away
        resolved[2] = factoryOrObject;

        return resolved;
    }

    function require(target, from) {
        var resolved = resolve(target, from);
    
        var logicalPath = resolved[0];
        
        var module = instanceCache[logicalPath];

        if (module !== undefined) {
            // found cached entry based on the logical path
            return module.exports;
        }

        var factoryOrObject = resolved[2];

        module = new Module(resolved);

        // cache the instance before loading (allows support for circular dependency with partial loading)
        instanceCache[logicalPath] = module;

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
        // "def" is used to define a module
        def: define,

        // "dep" is used to register a dependency (e.g. "/$/foo" depends on "baz")
        dep: registerDependency,
        run: run,
        main: registerMain,
        remap: remap,
        require: require,
        resolve: resolve,
        join: join
    };

    if (typeof window === 'undefined') {
        module.exports = $rmod;
    } else {
        window.$rmod = $rmod;
    }
})();



