var nodePath = require('path');
var transport = require('../../transport');

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
            transport.getPathInfo(this.resolvedPath) :
            transport.resolveRequire(this.path, this.from);
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
        var dependencies = [];
        var dep = this._resolved.dep;
        var main = this._resolved.main;

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
                path: this._resolved.realPath,
                main: main.path
            });

            dependencies.push({
                type: 'require',
                resolvedPath: main.filePath
            });
        }
        else {
            if (this.run) {
                dependencies.push({
                    type: 'commonjs-run',
                    path: this._resolved.logicalPath,
                    _file: this._resolved.filePath
                });
            }
            else {
                dependencies.push({
                    type: 'commonjs-def',
                    path: this._resolved.realPath,
                    _file: this._resolved.filePath
                });   
            }
        }

        // Also, scan the resolved file to see if there any other requires

        return dependencies;
    }
};