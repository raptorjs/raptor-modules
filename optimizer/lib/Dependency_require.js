var nodePath = require('path');
var getPathInfo = require('../../util').getPathInfo;
var resolveRequire = require('../../resolver').resolveRequire;
var extend = require('raptor-util').extend;

var detective = require('detective');
var fs = require('fs');
var raptorPromises = require('raptor-promises');

function findRequires(resolved) {

    if (resolved.isDir) {
        return raptorPromises.resolved();
    }

    var path = resolved.filePath;

    var deferred = raptorPromises.defer();
    fs.readFile(path, {encoding: 'utf8'}, function(err, src) {
        if (err) {
            return deferred.reject(err);
        }

        deferred.resolve(detective(src));
    });

    return deferred.promise;
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
            return nodePath.dirname(this._resolved.main);
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

    getDependencies: function() {

        var resolved = this._resolved;

        return findRequires(resolved)
            .then(function(requires) {

                var dependencies = [];
                var dep = resolved.dep;
                var main = resolved.main;
                var remap = resolved.remap;

                dependencies.push({
                    type: 'package',
                    path: nodePath.join(__dirname, '../../client/optimizer.json')
                });

                if (dep) {
                    dependencies.push(extend({
                        type: 'commonjs-dep'
                    }, dep));
                }

                if (main) {
                    dependencies.push({
                        type: 'commonjs-main',
                        dir: resolved.realPath,
                        main: main.path
                    });

                    dependencies.push({
                        type: 'require',
                        resolvedPath: main.filePath
                    });
                } else {

                    // Include all additional dependencies
                    if (requires) {
                        var from = nodePath.dirname(resolved.filePath);

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
                    
                    if (this.run) {
                        dependencies.push({
                            type: 'commonjs-run',
                            path: resolved.logicalPath,
                            _file: resolved.filePath
                        });
                    }
                    else {
                        dependencies.push({
                            type: 'commonjs-def',
                            path: resolved.realPath,
                            _file: resolved.filePath
                        });   
                    }
                }

                if (remap) {
                    dependencies.push(extend({
                        type: 'commonjs-remap'
                    }, remap));
                }

                return dependencies;
            });
        
    }
};