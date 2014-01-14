'use strict';


/*
GOAL: This module should exactly mirror the NodeJS module system.
The module transport will generate code that provides definitions
modules. This information is used to resolve dependencies on
client-side (in the browser).
*/

/*
File Modules#
If the exact filename is not found, then node will attempt to load the required filename with the added extension of .js, .json, and then .node.

.js files are interpreted as JavaScript text files, and .json files are parsed as JSON text files. .node files are interpreted as compiled addon modules loaded with dlopen.

A module prefixed with '/' is an absolute path to the file. For example, require('/home/marco/foo.js') will load the file at /home/marco/foo.js.

A module prefixed with './' is relative to the file calling require(). That is, circle.js must be in the same directory as foo.js for require('./circle') to find it.

Without a leading '/' or './' to indicate a file, the module is either a "core module" or is loaded from a node_modules folder.

If the given path does not exist, require() will throw an Error with its code property set to 'MODULE_NOT_FOUND'.

Loading from node_modules Folders#
If the module identifier passed to require() is not a native module, and does not begin with '/', '../', or './', then node starts at the parent directory of the current module, and adds /node_modules, and attempts to load the module from that location.

If it is not found there, then it moves to the parent directory, and so on, until the root of the tree is reached.

For example, if the file at '/home/ry/projects/foo.js' called require('bar.js'), then node would look in the following locations, in this order:

/home/ry/projects/node_modules/bar.js
/home/ry/node_modules/bar.js
/home/node_modules/bar.js
/node_modules/bar.js
This allows programs to localize their dependencies, so that they do not clash.

*/

/**
 * Defines a packages whose metadata is used by raptor-loader to load the package.
 */
function defineModule(modulePath, factoryFunc) {
    /*
    $rmod.def('/baz@3.0.0/lib/index', function(require, exports, module, __filename, __dirname) {
        // module source code goes here
    });
    */
}

/*
In addition, the following code would be sent down to the browser
in order to allow client code to add "symbolic links" to allow the
logical paths to be maintained:

$rmod.dep('', 'foo', '1.0.0');          // /node_modules/foo → /foo@1.0.0
$rmod.dep('', 'bar', '2.0.0');          // /node_modules/bar → /bar@2.0.0
$rmod.dep('/node_modules/foo', 'baz', '3.0.0'); // /node_modules/foo/node_modules/baz → /baz@3.0.0
$rmod.dep('/node_modules/bar', 'baz', '3.0.0'); // /node_modules/bar/node_modules/baz → /baz@3.0.0
*/
function registerModuleDependency(basePath, moduleName, moduleVersion) {

}

/*
$rmod.run('/src/ui-pages/login/login-page', function(require, exports, module, __filename, __dirname) {
    // module source code goes here
});
*/
function registerRunModule(modulePath, factoryFunc) {

}

/*
Node.js allows a main script to be associated with a directory.
If the directory is required'd then the main script will be used
to determine which module is actually resolved. The main script
can be explicitly declared in a package.json file contained in
the directory or, if not explicitly declared, a default main
script of "index" will be assumed. The main script is assumed
to be relative to the module directory.

To allow for mapping a directory to a main script, the following code will be used:
$rmod.main('/foo@1.0.0', 'lib/index');

By registering a main script for the /foo@1.0.0 module, the following will work as expected:

require.resolve('foo'); // Returns "/node_modules/foo/lib/index
*/
function registerMain() {

}

var $rmod = {
    def: defineModule,

    dep: registerModuleDependency,

    run: registerRunModule,

    main: registerMain
};


if (typeof window === 'undefined') {
    module.exports = $rmod;
} else {
    window.$rmod = $rmod;
}
