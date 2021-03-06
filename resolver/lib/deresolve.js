
/*

Examples:
deresolve('/my-project/node_modules/foo/index.js', '/my-project/src') -->
	'foo'

deresolve('/my-project/node_modules/foo/hello.js', '/my-project/src') -->
	'foo/hello'

deresolve('/my-project/src/bar.js', '/my-project/src/index.js') -->
	'./bar'
*/


var nodePath = require('path');
var raptorModulesUtil = require('../../util');
var nodeModulesPrefixRegExp = /^node_modules[\\\/](.+)/;
var resolveFrom = require('resolve-from');

require('raptor-polyfill/string/startsWith');
require('raptor-polyfill/string/endsWith');

function removeRegisteredExt(path) {
    var basename = nodePath.basename(path);
    var ext = nodePath.extname(basename);

    if (require.extensions[ext]) {
        return path.slice(0, 0-ext.length);
    } else {
        return path;
    }
}

function relPath(path, from) {
	var dirname = nodePath.dirname(path);
	var main = raptorModulesUtil.findMain(dirname);
	if (main === path) {
		path = nodePath.dirname(path); // We only need to walk to the parent directory if the target is the main file for the directory
	}

	// Didn't find the target path on the search path so construct a relative path
	var relativePath = removeRegisteredExt(nodePath.relative(from, path));
	if (relativePath.charAt(0) !== '.') {
		relativePath = './' + relativePath;
	}

    relativePath = relativePath.replace(/[\\]/g, '/');

	return relativePath;
	// var relPathParts = relPath.split(/[\\\/]/);
	// if (relPathParts.indexOf('node_modules') === -1) {
	//	// Only use the relative path if we *not* are crossing into a
	// }
}

function deresolve(targetPath, from) {
	var targetRootDir = raptorModulesUtil.getModuleRootDir(targetPath);
	var fromRootDir = raptorModulesUtil.getModuleRootDir(from);

    // console.log();
    // console.log('deresolve() - BEGIN');
    // console.log('    targetPath: ' + targetPath);
    // console.log('          from: ' + from);
    // console.log(' targetRootDir: ' + targetRootDir);
    // console.log('   fromRootDir: ' + fromRootDir);

	if (targetRootDir && fromRootDir && targetRootDir === fromRootDir) {
        // The target module is in the same project... just use a relative path
		return relPath(targetPath, from);
	}

    var matches;
    var deresolvedPath;



    if (targetPath.startsWith(fromRootDir)) {
        var fromNodeModulesDir = nodePath.join(fromRootDir, 'node_modules');

        if (targetRootDir.startsWith(fromNodeModulesDir)) {
            // They have a common root so the target path must in an installed module that is
            // *not* linked in.
            //
            // Example:
            //    targetPath:       /development/my-project/node_modules/foo/lib/index.js
            //    from:             /development/my-project/lib/index.js
            //
            //    targetRootDir:    /development/my-project/node_modules/foo
            //    fromRootDir:      /development/my-project
            //
            //    Expected output:  foo/lib/index.js
            deresolvedPath = targetPath.substring(fromRootDir.length + 1);
            // Example: deresolvedPath = node_modules/foo/lib/index.js

            matches = nodeModulesPrefixRegExp.exec(deresolvedPath);

            if (matches) {
                deresolvedPath = matches[1];
                // Example: deresolvedPath = foo/lib/index.js
            }
        }
    }

    if (!deresolvedPath) {
        // The module is linked in or is not installed at the project level.
        // We will try deresolving using the name of target module
        //
        // Example:
        //    targetPath:       /development/foo/lib/index.js
        //    from:             /development/my-project/lib/index.js
        //
        //    targetRootDir:    /development/foo
        //    fromRootDir:      /development/my-project
        //
        //    Does the following exist?:
        //    /development/my-project/node_modules/foo/lib/index.js ?
        //
        //    Expected output:  foo/lib/index.js
        var targetModulePkg = raptorModulesUtil.getModuleRootPackage(targetRootDir);
        if (targetModulePkg) {
            var targetModuleName = targetModulePkg.name;
            var targetModuleRelPath = nodePath.relative(targetRootDir, targetPath);

            deresolvedPath = nodePath.join(targetModuleName, targetModuleRelPath);
            deresolvedPath = deresolvedPath.replace(/[\\]/g, '/');

            try {
                // Try the deresolved path to see if it works... if it doesn't work
                // then we will just have to calculate a relative path
                resolveFrom(from, deresolvedPath);
            } catch(e) {
                deresolvedPath = null;
            }
        }
    }

    if (!deresolvedPath) {
        return relPath(targetPath, from);
    }

    var targetMain = raptorModulesUtil.findMain(targetRootDir);

	if (targetMain === targetPath) {
        // Chop off the ending part that main resolves to
        // Example:
        //    targetPath:       /development/my-project/node_modules/foo/lib/index.js
        //    targetRootDir:    /development/my-project/node_modules/foo
        //    targetMain:       /development/my-project/node_modules/foo/lib/index.js

        //    deresolvedPath:   foo/lib/index.js
        //
        //    Expected output:  foo
        var extra = targetPath.substring(targetRootDir.length);
        if (deresolvedPath.endsWith(extra)) {
            deresolvedPath = deresolvedPath.slice(0, 0 - extra.length);
        }
	}

    deresolvedPath = deresolvedPath.replace(/[\\]/g, '/');
    deresolvedPath = removeRegisteredExt(deresolvedPath);

    return deresolvedPath;
}

module.exports = deresolve;