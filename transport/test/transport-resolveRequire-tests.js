'use strict';
require('../'); // Load the module
var nodePath = require('path');
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

require('../'); // Load this module just to make sure it works

describe('raptor-modules/transport.resolveRequire' , function() {

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
        var transport = require('../');
        var from = nodePath.join(__dirname, 'test-project');
        var pathInfo = transport.resolveRequire('foo', from);
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
        var transport = require('../');
        var from = nodePath.join(__dirname, 'test-project');
        var pathInfo = transport.resolveRequire('foo/lib/index', from);
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
        var transport = require('../');
        var from = nodePath.join(__dirname, 'test-project/src');
        var pathInfo = transport.resolveRequire('./hello-world', from);
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


});
