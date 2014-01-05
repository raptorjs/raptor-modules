

function conditionalRequire(id, require) {
    var path;
    
    try {
        path = require.resolve(id);
    }
    catch(e) {}

    if (path) {
        return require(path);
    }
}

exports.conditionalRequire = conditionalRequire;

require('raptor-detect/runtime').detect({
    node: function() {
        require('./index_node');
    }
});