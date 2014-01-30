var transport = require('../../transport');

module.exports = {
    properties: {
        'from': 'string',
        'to': 'string'
    },
    
    getDir: function() {
        return this.getParentManifestDir();
    },

    read: function(context) {
        return transport.registerRemapCode(
            this.from,
            this.to);
    },

    lastModified: function() {
        return 0;
    }
};