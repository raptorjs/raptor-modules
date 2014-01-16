require('raptor-ecma/es6');

function registerDependencyTypes(optimizer) {
    optimizer.dependencies.registerPackageType('require', require('./Dependency_require'));
    optimizer.dependencies.registerJavaScriptType('commonjs-def', require('./Dependency_commonjs-def'));
    optimizer.dependencies.registerJavaScriptType('commonjs-run', require('./Dependency_commonjs-run'));
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
                return {
                    type: 'require',
                    path: dependency.substring('require '.length)
                };       
            }
        }
    });
}

exports.registerDependencyTypes = registerDependencyTypes;