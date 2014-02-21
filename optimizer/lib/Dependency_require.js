var nodePath = require('path');
var raptorModulesUtil = require('../../util');
var getPathInfo = raptorModulesUtil.getPathInfo;
var resolveRequire = require('../../resolver').resolveRequire;
var extend = require('raptor-util').extend;

var detective = require('detective');
var fs = require('fs');
var raptorPromises = require('raptor-promises');
var logger = require('raptor-logging').logger(module);
var raptorModulesOptimizer = require('./index');
var ok = require('assert').ok;
var thenFS = require('then-fs');
var VAR_REQUIRE_PROCESS = 'process=require("process")';
var processRegExp = /process\./;

function lastModified(path) {
    var promise = thenFS.stat(path).then(function(stat) {
            return stat.mtime.getTime();
        });

    return raptorPromises.resolved(promise);
}

function inspectSource(resolved, context) {
    if (resolved.isDir) {
        return raptorPromises.resolved();
    }

    var path = resolved.filePath;

    function doInspect() {
        var deferred = raptorPromises.defer();
        fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
            if (err) {
                return deferred.reject(err);
            }

            var process = processRegExp.test(src);
            var requires = detective(src);

            var result = {};

            if (requires && requires.length) {
                result.requires = requires;
            }

            if (process) {
                result.process = true;
            }

            deferred.resolve(result);
        });

        return deferred.promise;
    }
    
    if (context && context.cache) {
        var cacheKey = path;
        var projectRootDir = raptorModulesUtil.getProjectRootDir(path);
        if (path.startsWith(projectRootDir)) {
            cacheKey = "$APP_ROOT" + cacheKey.substring(projectRootDir.length);
        }

        var cache = context.cache.getCache('requires');

        return lastModified(path)
            .then(function(lastModified) {
                return cache.get(cacheKey, {
                    lastModified: lastModified,
                    builder: function() {
                        return doInspect();
                    }
                });
            });
        
        
    } else {
        return doInspect();
    }

    
}

module.exports = {
    properties: {
        path: 'string',
        resolvedPath: 'string',
        from: 'string',
        async: 'string',
        run: 'boolean'
    },

    init: function() {
        if (!this.resolvedPath) {
            this.from = this.from || this.getParentManifestDir();
        }
        
        this._resolved = this.resolvedPath ? 
            getPathInfo(this.resolvedPath) :
            resolveRequire(this.path, this.from);
    },
    
    getDir: function() {
        if (this._resolved.isDir) {
            // Use the directory of the main file as the directory (used for determining how
            // to recurse into modules when building bundles)
            return nodePath.dirname(this._resolved.main.filePath);
        }
        else {
            return nodePath.dirname(this._resolved.filePath);
        }
    },

    getAsyncPathInfo: function() {
        return {
            path: this._resolved.filePath,
            alias: this.path
        };
    },

    getDependencies: function(context) {
        ok(context, '"context" argument expected');

        var resolved = this._resolved;

        var path = this.path;

        return inspectSource(resolved, context)
            .then(function(inspect) {
                var requires;
                var processRequired = false;

                if (inspect) {
                    requires = inspect.requires;
                    processRequired = inspect.process;
                }

                if (path === 'process' || path === 'raptor-render-context') {
                    console.log('PROCESS PATH INFO: ', resolved);
                }

                var dependencies = [];
                var dep = resolved.dep;
                var main = resolved.main;
                var remap = resolved.remap;

                if (raptorModulesOptimizer.INCLUDE_CLIENT !== false) {
                    dependencies.push({
                        type: 'package',
                        path: nodePath.join(__dirname, '../../client/optimizer.json')
                    });    
                }

                if (processRequired) {
                    dependencies.push({
                        type: 'require',
                        path: 'process',
                        from: __dirname
                    });
                }

                if (main) {
                    dependencies.push({
                        type: 'require',
                        resolvedPath: main.filePath
                    });

                    dependencies.push({
                        type: 'commonjs-main',
                        dir: resolved.realPath,
                        main: main.path,
                        _sourceFile: main.filePath
                    });

                    
                } else {
                    var additionalVars;
                    if (processRequired) {
                        additionalVars = [VAR_REQUIRE_PROCESS];
                    }
                    if (this.run) {
                        dependencies.push({
                            type: 'commonjs-run',
                            path: resolved.logicalPath,
                            _file: resolved.filePath,
                            _additionalVars: additionalVars
                        });
                    }
                    else {
                        dependencies.push({
                            type: 'commonjs-def',
                            path: resolved.realPath,
                            _file: resolved.filePath,
                            _additionalVars: additionalVars
                        });
                    }


                    // Include all additional dependencies
                    if (requires && requires.length) {
                        

                        var from = nodePath.dirname(resolved.filePath);

                        if (logger.isDebugEnabled()) {
                            logger.debug('Requires found for "' + resolved.filePath + '":\n   [' + requires.join(', ') + '] - FROM: ' + from + '\n\n');
                        }

                        requires.forEach(function(reqDependency) {
                            dependencies.push({
                                type: 'require',
                                path: reqDependency,
                                from: from
                            });
                        });
                    }

                    // Check if the required file has an "-optimizer.json" associated with it
                    var ext = nodePath.extname(resolved.filePath);
                    var optimizerJsonPath = resolved.filePath.slice(0, 0-ext.length) + '-optimizer.json';
                    if (fs.existsSync(optimizerJsonPath)) {
                        dependencies.push({
                            type: 'package',
                            path: optimizerJsonPath
                        });
                    }

                    // Also check if the directory has an optimizer.json and if so we should include that as well
                    optimizerJsonPath = nodePath.join(nodePath.dirname(resolved.filePath), 'optimizer.json');
                    if (fs.existsSync(optimizerJsonPath)) {
                        dependencies.push({
                            type: 'package',
                            path: optimizerJsonPath
                        });
                    }
                }

                if (dep) {
                    dependencies.push(extend({
                        type: 'commonjs-dep',
                        _sourceFile: main ? main.filePath : resolved.filePath
                    }, dep));
                }

                if (remap) {
                    dependencies.push(extend({
                        type: 'commonjs-remap',
                        _sourceFile: resolved.filePath
                    }, remap));
                }

                return dependencies;
            });
        
    }
};