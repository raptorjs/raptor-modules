'use strict';
require('../'); // Load the module
var nodePath = require('path');
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var fs = require('fs');

require('../'); // Load this module just to make sure it works

describe('raptor-modules/optimizer/Dependency_require' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        done();
    });

    it('should resolve to the the correct optimizer manifest for a "require" dependency that resolves to a root module', function(done) {


        var requireDependency = require('../lib/Dependency_require');
        requireDependency.path = "bar";
        requireDependency.from = nodePath.join(__dirname, 'test-project');
        requireDependency.init();

        requireDependency.getDependencies()
            .then(function(dependencies) {
                var lookup = {};

                expect(dependencies.length).to.equal(3);

                dependencies.forEach(function(d) {
                    lookup[d.type] = d;
                });

                expect(lookup['commonjs-dep']).to.deep.equal({
                    type: 'commonjs-dep',
                    parentPath: '',
                    childName: 'bar',
                    childVersion: '2.0.0'
                });

                expect(lookup['commonjs-main']).to.deep.equal({
                    type: 'commonjs-main',
                    dir: '/bar@2.0.0',
                    main: 'lib/index'
                });

                expect(lookup.require).to.deep.equal({
                    type: 'require',
                    resolvedPath: nodePath.join(__dirname, 'test-project/node_modules/bar/lib/index.js')
                });
                done();
            })
            .fail(done);
    });

    it('should resolve to the the correct optimizer manifest for a "require" dependency with a resolved path', function(done) {

        var requireDependency = require('../lib/Dependency_require');
        requireDependency.resolvedPath = nodePath.join(__dirname, 'test-project/node_modules/bar/lib/index.js');
        requireDependency.init();
        requireDependency.getDependencies()
            .then(function(dependencies) {
                var lookup = {};

                expect(dependencies.length).to.equal(3);

                var requires = [];

                dependencies.forEach(function(d) {
                    if (d.type === 'require') {
                        requires.push(d);
                    }
                    else {
                        lookup[d.type] = d;    
                    }
                    
                });

                expect(lookup['commonjs-def']).to.deep.equal({
                    type: 'commonjs-def',
                    path: '/bar@2.0.0/lib/index',
                    _file: nodePath.join(__dirname, 'test-project/node_modules/bar/lib/index.js')
                });

                expect(lookup['commonjs-def']).to.deep.equal({
                    type: 'commonjs-def',
                    path: '/bar@2.0.0/lib/index',
                    _file: nodePath.join(__dirname, 'test-project/node_modules/bar/lib/index.js')
                });

                expect(requires.length).to.equal(1);

                expect(requires).to.deep.equal([{
                        type: 'require',
                        path: 'baz',
                        from: nodePath.join(__dirname, 'test-project/node_modules/bar/lib')
                    }]);

                done();
            })
            .fail(done);
    });

    it('should resolve to the the correct optimizer manifest for a "require" dependency that resolves to a nested installed module', function(done) {

        var requireDependency = require('../lib/Dependency_require');
        requireDependency.path = "baz";
        requireDependency.from = nodePath.join(__dirname, 'test-project/node_modules/bar');
        requireDependency.init();

        requireDependency.getDependencies()
            .then(function(dependencies) {
                var lookup = {};

                expect(dependencies.length).to.equal(3);

                dependencies.forEach(function(d) {
                    lookup[d.type] = d;
                });

                expect(lookup['commonjs-dep']).to.deep.equal({
                    type: 'commonjs-dep',
                    parentPath: '/$/bar',
                    childName: 'baz',
                    childVersion: '3.0.0'
                });

                expect(lookup['commonjs-main']).to.deep.equal({
                    type: 'commonjs-main',
                    dir: '/baz@3.0.0',
                    main: 'lib/index'
                });

                expect(lookup.require).to.deep.equal({
                    type: 'require',
                    resolvedPath: nodePath.join(__dirname, 'test-project/node_modules/bar/node_modules/baz/lib/index.js')
                });
                done();
            })
            .fail(done);

    });

    it('should resolve to the the correct optimizer manifest for a "require" dependency with a resolved path and a non-string require in code', function(done) {

        var requireDependency = require('../lib/Dependency_require');
        requireDependency.resolvedPath = nodePath.join(__dirname, 'test-project/node_modules/foo/lib/index.js');
        requireDependency.init();
        requireDependency.getDependencies()
            .then(function(dependencies) {
                var lookup = {};

                expect(dependencies.length).to.equal(2);

                var requires = [];

                dependencies.forEach(function(d) {
                    if (d.type === 'require') {
                        requires.push(d);
                    }
                    else {
                        lookup[d.type] = d;    
                    }
                    
                });

                expect(lookup['commonjs-def']).to.deep.equal({
                    type: 'commonjs-def',
                    path: '/foo@1.0.0/lib/index',
                    _file: nodePath.join(__dirname, 'test-project/node_modules/foo/lib/index.js')
                });

                expect(lookup['commonjs-def']).to.deep.equal({
                    type: 'commonjs-def',
                    path: '/foo@1.0.0/lib/index',
                    _file: nodePath.join(__dirname, 'test-project/node_modules/foo/lib/index.js')
                });

                expect(requires.length).to.equal(0);

                done();
            })
            .fail(done);
    });

    

});

