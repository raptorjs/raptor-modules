require('raptor-ecma/es6');
var extend = require('raptor-util').extend;

function registerDependencyTypes(optimizer) {
    optimizer.dependencies.registerPackageType('require', require('./Dependency_require'));
    optimizer.dependencies.registerJavaScriptType('commonjs-def', require('./Dependency_commonjs-def'));
    optimizer.dependencies.registerJavaScriptType('commonjs-run', require('./Dependency_commonjs-run'));
    optimizer.dependencies.registerJavaScriptType('commonjs-dep', require('./Dependency_commonjs-dep'));
    optimizer.dependencies.registerJavaScriptType('commonjs-main', require('./Dependency_commonjs-main'));
    optimizer.dependencies.registerJavaScriptType('commonjs-remap', require('./Dependency_commonjs-remap'));
    optimizer.dependencies.registerJavaScriptType('commonjs-resolved', require('./Dependency_commonjs-resolved'));
    optimizer.dependencies.addNormalizer(function(dependency) {
        if (typeof dependency === 'string') {
            if (dependency.startsWith('require ')) {
                return {
                    type: 'require',
                    path: dependency.substring('require '.length)
                };
            }
        }
        else if (!dependency.type) {
            if (dependency.require) {
                var reqDep = {
                    type: 'require',
                    path: dependency.require
                };

                delete dependency.require;
                extend(reqDep, dependency);
                return reqDep;
            }
        }
    });
}

exports.registerDependencyTypes = registerDependencyTypes;
exports.INCLUDE_CLIENT = true;