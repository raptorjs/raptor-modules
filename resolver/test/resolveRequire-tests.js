'use strict';
require('../'); // Load the module
var nodePath = require('path');
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

require('../'); // Load this module just to make sure it works

describe('raptor-modules/resolver.resolveRequire' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        done();
    });

    it('should resolve require correctly for top-level installed modules dirs', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project');
        var pathInfo = resolver.resolveRequire('foo', from);

        expect(pathInfo).to.deep.equal({
            logicalPath: '/$/foo',
            realPath: '/foo@1.0.0',
            main: {
                filePath: nodePath.join(__dirname, 'test-project/node_modules/foo/lib/index.js'),
                path: 'lib/index'
            },
            filePath: nodePath.join(__dirname, 'test-project/node_modules/foo'),
            isDir: true,
            dep: {
                parentPath: '',
                childName: 'foo',
                childVersion: '1.0.0'
            }
        });
    });

    it('should resolve require correctly for top-level installed module files', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project');
        var pathInfo = resolver.resolveRequire('foo/lib/index', from);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/$/foo/lib/index',
            realPath: '/foo@1.0.0/lib/index',
            filePath: nodePath.join(__dirname, 'test-project/node_modules/foo/lib/index.js'),
            isDir: false,
            dep: {
                parentPath: '',
                childName: 'foo',
                childVersion: '1.0.0'
            }
        });
    });

    it('should resolve require correctly for relative paths', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/src');
        var pathInfo = resolver.resolveRequire('./hello-world', from);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/src/hello-world',
            realPath: '/src/hello-world',
            filePath: nodePath.join(__dirname, 'test-project/src/hello-world'),
            isDir: true,
            main: {
                filePath: nodePath.join(__dirname, 'test-project/src/hello-world/index.js'),
                path: 'index'
            }
        });
    });


    

    it('should handle browser override for main script in a sub-module', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/src');
        var pathInfo = resolver.resolveRequire('browser-overrides/main/sub/sub', from);
        expect(pathInfo).to.deep.equal({

            logicalPath: '/$/browser-overrides/main/sub/sub_browser',
            realPath: '/browser-overrides@0.0.0/main/sub/sub_browser',
            filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/main/sub/sub_browser.js'),
            isDir: false,
            dep: {
                parentPath: '',
                childName: 'browser-overrides',
                childVersion: '0.0.0'
            },
            remap: {
                from: '/browser-overrides@0.0.0/main/sub/sub',
                to: 'sub_browser'
            },
            isBrowserOverride: true
        });
    });

    it('should handle browser files overrides for main script', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/src');
        var pathInfo = resolver.resolveRequire('browser-overrides/override-files', from);
        expect(pathInfo).to.deep.equal({

            logicalPath: '/$/browser-overrides/override-files',
            realPath: '/browser-overrides@0.0.0/override-files',
            filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/override-files'),
            isDir: true,
            dep: {
                parentPath: '',
                childName: 'browser-overrides',
                childVersion: '0.0.0'
            },
            main: {
                filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/override-files/index.js'),
                path: 'index'
            }
        });
    });

    it('should handle browser files overrides for root file', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/src');
        var pathInfo = resolver.resolveRequire('browser-overrides/override-files/hello', from);
        expect(pathInfo).to.deep.equal({

            logicalPath: '/$/browser-overrides/override-files/hello_browser',
            realPath: '/browser-overrides@0.0.0/override-files/hello_browser',
            filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/override-files/hello_browser.js'),
            isDir: false,
            dep: {
                parentPath: '',
                childName: 'browser-overrides',
                childVersion: '0.0.0'
            },
            remap: {
                from: "/browser-overrides@0.0.0/override-files/hello",
                to: "hello_browser"
            },
            isBrowserOverride: true
        });
    });

    it('should handle browser files overrides for nested file', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/src');
        var pathInfo = resolver.resolveRequire('browser-overrides/override-files/hello/world', from);
        expect(pathInfo).to.deep.equal({

            logicalPath: '/$/browser-overrides/override-files/hello/world_browser',
            realPath: '/browser-overrides@0.0.0/override-files/hello/world_browser',
            filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/override-files/hello/world_browser.js'),
            isDir: false,
            dep: {
                parentPath: '',
                childName: 'browser-overrides',
                childVersion: '0.0.0'
            },
            remap: {
                from: '/browser-overrides@0.0.0/override-files/hello/world',
                to: 'world_browser',
            },
            isBrowserOverride: true
        });
    });

    it('should handle browser files overrides for file to module', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/browser-overrides/override-files');
        var pathInfo = resolver.resolveRequire('browser-overrides/override-files/hello-world', from);
        expect(pathInfo).to.deep.equal({

            logicalPath: '/$/browser-overrides/$/hello-world-browserify/index',
            realPath: '/hello-world-browserify@9.9.9/index',
            filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/node_modules/hello-world-browserify/index.js'),
            isDir: false,
            dep: {
                parentPath: '/$/browser-overrides',
                childName: 'hello-world-browserify',
                childVersion: '9.9.9'
            },
            remap: {
                from: '/browser-overrides@0.0.0/override-files/hello-world',
                to: '../$/hello-world-browserify/index'
            },
            isBrowserOverride: true
        });
    });

    it('should handle browser overrides for one module to another module', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/override-files');
        var pathInfo = resolver.resolveRequire('hello-world', from);
        // console.log(JSON.stringify(pathInfo, null, '    '));
        expect(pathInfo).to.deep.equal({

            logicalPath: '/$/browser-overrides/$/hello-world-browserify',
            realPath: '/hello-world-browserify@9.9.9',
            filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/node_modules/hello-world-browserify'),
            isDir: true,
            main: {
                filePath: nodePath.join(__dirname, 'test-project/node_modules/browser-overrides/node_modules/hello-world-browserify/index.js'),
                path: 'index'
            },
            dep: {
                parentPath: '/$/browser-overrides',
                childName: 'hello-world',
                childVersion: '9.9.9',
                remap: 'hello-world-browserify'
            },
            isBrowserOverride: true
        });
    });

    it('should handle module not found', function() {
        require('app-module-path').addPath(nodePath.join(__dirname, 'test-project/src'));
        var resolver = require('../');
        var from = nodePath.join(__dirname, 'test-project/node_modules/bar');
        var e = null;
        try {
            resolver.resolveRequire('hello-world', from);
        }
        catch(_e) {
            e = _e;
        }
        expect(e).to.not.equal(null);
    });

});

