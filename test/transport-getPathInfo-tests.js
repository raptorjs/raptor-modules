'use strict';
require('../'); // Load the module
var nodePath = require('path');
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

require('../transport'); // Load this module just to make sure it works

describe('raptor-modules/transport.getPathInfo' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        done();
    });

    it('should resolve path info correctly for top-level installed modules', function() {
        var transport = require('../transport');
        var path = nodePath.join(__dirname, "test-project/node_modules/foo/lib/index.js");
        var pathInfo = transport.getPathInfo(path);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/node_modules/foo/lib/index.js',
            realPath: '/foo@1.0.0/lib/index.js',
            filePath: path,
            isDir: false,
            dep: {
                parentPath: '',
                childId: 'foo',
                childVersion: '1.0.0'
            }
        });
    });

    it('should resolve path info correctly for directories', function() {
        var transport = require('../transport');
        var path;
        var pathInfo;

        path = nodePath.join(__dirname, "test-project/node_modules/foo");
        pathInfo = transport.getPathInfo(path);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/node_modules/foo',
            realPath: '/foo@1.0.0',
            filePath: path,
            isDir: true,
            dep: {
                parentPath: '',
                childId: 'foo',
                childVersion: '1.0.0'
            },
            main: nodePath.join(__dirname, "test-project/node_modules/foo/lib/index.js")
        });

        path = nodePath.join(__dirname, "test-project/node_modules/bar");
        pathInfo = transport.getPathInfo(path);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/node_modules/bar',
            realPath: '/bar@2.0.0',
            filePath: path,
            isDir: true,
            dep: {
                parentPath: '',
                childId: 'bar',
                childVersion: '2.0.0'
            },
            main: nodePath.join(__dirname, "test-project/node_modules/bar/lib/index.js")
        });

        path = nodePath.join(__dirname, "test-project/src/hello-world");
        pathInfo = transport.getPathInfo(path);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/src/hello-world',
            realPath: '/src/hello-world',
            filePath: path,
            isDir: true,
            main: nodePath.join(__dirname, "test-project/src/hello-world/index.js")
        });
    });

    it('should resolve path info correctly for second-level installed modules', function() {
        var transport = require('../transport');
        var path = nodePath.join(__dirname, "test-project/node_modules/foo/node_modules/baz/lib/index.js");
        var pathInfo = transport.getPathInfo(path);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/node_modules/foo/node_modules/baz/lib/index.js',
            realPath: '/baz@3.0.0/lib/index.js',
            filePath: path,
            isDir: false,
            dep: {
                parentPath: '/node_modules/foo',
                childId: 'baz',
                childVersion: '3.0.0'
            }
        });
    });

    it('should resolve path info correctly for application modules', function() {
        var transport = require('../transport');
        var path = nodePath.join(__dirname, "test-project/src/hello-world/index.js");
        var pathInfo = transport.getPathInfo(path);
        expect(pathInfo).to.deep.equal({
            logicalPath: '/src/hello-world/index.js',
            realPath: '/src/hello-world/index.js',
            filePath: path,
            isDir: false
        });
    });


});

