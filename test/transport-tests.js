'use strict';
require('../'); // Load the module
var nodePath = require('path');
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

require('../transport'); // Load this module just to make sure it works

describe('raptor-modules/transport' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        done();
    });

    it.only('should resolve path info correctly', function() {
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


});

