var nodePath = require('path');
var getPathInfo = require('../../util').getPathInfo;
var resolveRequire = require('../../resolver').resolveRequire;

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

                if (dep) {
                    dependencies.push({
                        type: 'commonjs-dep',
                        parentPath: dep.parentPath,
                        childName: dep.childName,
                        childVersion: dep.childVersion
                    });
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
                }
                else {

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

                return dependencies;
            });
        
    }
};