require('raptor-detect/runtime').detect({
    node: function() {
        require('./index_node');
    }
});