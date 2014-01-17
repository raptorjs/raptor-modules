'use strict';

var chai = require('chai');
chai.Assertion.includeStack = true;
var expect = chai.expect;

describe('raptor-modules/client' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        done();
    });

    it('should resolve modules using search path', function(done) {
        var clientImpl = require('../lib/index');

        // define a module for a given real path
        clientImpl.define('/baz@3.0.0/lib/index', function(require, exports, module, __filename, __dirname) {
            module.exports.test = true;
        });

        // Module "foo" requires "baz" 3.0.0
        // This will create the following link:
        // /$/foo/$/baz --> baz@3.0.0
        clientImpl.registerDependency('/$/foo', 'baz', '3.0.0');

        var resolved;

        // Make sure that if we try to resolve "baz/lib/index" from within some module
        // located at "/$/foo" then we should get back "/$/foo/$/baz"
        resolved = clientImpl.resolve('baz/lib/index', '/$/foo');
        expect(resolved.logicalPath).to.equal('/$/foo/$/baz/lib/index');
        expect(resolved.realPath).to.equal('/baz@3.0.0/lib/index');

        // A module further nested under /$/foo should also resolve to the same
        // logical path
        resolved = clientImpl.resolve('baz/lib/index', '/$/foo/some/other/module');
        expect(resolved.logicalPath).to.equal('/$/foo/$/baz/lib/index');
        expect(resolved.realPath).to.equal('/baz@3.0.0/lib/index');

        // Code at under "/some/module" doesn't know about baz
        expect(clientImpl.resolve('baz/lib/index', '/some/module')).to.equal(null);

        done();
    });

    it('should resolve absolute paths', function(done) {

        var clientImpl = require('../lib/index');

        var resolved;

        // define a module for a given real path
        clientImpl.define('/baz@3.0.0/lib/index', function(require, exports, module, __filename, __dirname) {
            module.exports.test = true;
        });

        // Module "foo" requires "baz" 3.0.0
        // This will create the following link:
        // /$/foo/$/baz --> baz@3.0.0
        clientImpl.registerDependency('/$/foo', 'baz', '3.0.0');

        // Make sure that if we try to resolve "baz" with  from within some module
        // located at "/$/foo" then we should get back "/$/foo/$/baz"
        resolved = clientImpl.resolve(
            '/$/foo/$/baz/lib/index' /* target is absolute path */,
            '/$/foo' /* the from is ignored */);

        expect(resolved.logicalPath).to.equal('/$/foo/$/baz/lib/index');
        expect(resolved.realPath).to.equal('/baz@3.0.0/lib/index');

        resolved = clientImpl.resolve(
            '/baz@3.0.0/lib/index' /* target is absolute path to specific version of module */,
            '/$/foo' /* from is ignored if target is absolute path */);

        expect(resolved.logicalPath).to.equal('/baz@3.0.0/lib/index');
        expect(resolved.realPath).to.equal('/baz@3.0.0/lib/index');

        // A module further nested under /$/foo should also resolve to the same logical path
        resolved = clientImpl.resolve('baz', '/$/foo/some/other/module');
        expect(resolved.logicalPath).to.equal('/$/foo/$/baz');
        expect(resolved.realPath).to.equal('/baz@3.0.0');

        // Without registering "main", "/baz@3.0.0" will not be known
        resolved = clientImpl.resolve('/baz@3.0.0', '/some/module');

        expect(resolved.realPath).to.equal('/baz@3.0.0');
        expect(resolved.logicalPath).to.equal('/baz@3.0.0');
        
        done();
    });

    it('should instantiate modules', function(done) {
        var clientImpl = require('../lib/index');

        var instanceCount = 0;

        // define a module for a given real path
        clientImpl.define('/baz@3.0.0/lib/index', function(require, exports, module, __filename, __dirname) {
            instanceCount++;
            module.exports = {
                __filename: __filename,
                __dirname: __dirname
            };
        });

        // Module "foo" requires "baz" 3.0.0
        // This will create the following link:
        // /$/foo/$/baz --> baz@3.0.0
        clientImpl.registerDependency('/$/foo', 'baz', '3.0.0');

        var baz = clientImpl.require('baz/lib/index', '/$/foo');

        expect(instanceCount).to.equal(1);

        expect(baz.__filename).to.equal('/baz@3.0.0/lib/index');
        expect(baz.__dirname).to.equal('/baz@3.0.0/lib');

        clientImpl.require('baz/lib/index', '/$/foo');

        expect(instanceCount).to.equal(1);

        done();
    });

    it('should handle load module exceptions', function(done) {
        done();
    });

    it('should normalize paths', function(done) {
        var clientImpl = require('../lib/index');
        expect(clientImpl.normalize('abc')).to.equal('abc');
        expect(clientImpl.normalize('./abc')).to.equal('abc');
        expect(clientImpl.normalize('abc/./def')).to.equal('abc/def');
        expect(clientImpl.normalize('abc/../def')).to.equal('def');
        expect(clientImpl.normalize('abc/..')).to.equal('');
        expect(clientImpl.normalize('/abc/..')).to.equal('/');
        expect(clientImpl.normalize('/.')).to.equal('/');
        expect(clientImpl.normalize('')).to.equal('');
        expect(clientImpl.normalize('/abc/def/.')).to.equal('/abc/def');
        done();
    });

    it('should join relative paths', function(done) {
        // NOTE: Second argument to join should start with "." or "..".
        //       I don't care about joining an absolute path, empty string
        //       or even a "module name" because these are handled specially
        //       in the resolve method.
        var clientImpl = require('../lib/index');
        expect(clientImpl.join('/foo/baz', './abc.js')).to.equal('/foo/baz/abc.js');
        expect(clientImpl.join('/foo/baz', '../abc.js')).to.equal('/foo/abc.js');
        expect(clientImpl.join('/foo', '..')).to.equal('/');
        expect(clientImpl.join('/foo', '../..')).to.equal('');
        expect(clientImpl.join('foo', '..')).to.equal('');
        expect(clientImpl.join('foo/bar', '../test.js')).to.equal('foo/test.js');
        expect(clientImpl.join('abc/def', '.')).to.equal('abc/def');
        expect(clientImpl.join('/', '.')).to.equal('/');
        done();
    });
});
