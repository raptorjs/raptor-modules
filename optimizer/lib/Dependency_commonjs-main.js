var transport = require('../../transport');

module.exports = {
    properties: {
        'dir': 'string',
        'main': 'string'
    },
    
    getDir: function() {
        return this.getParentManifestDir();
    },

    read: function(context) {
        return transport.registerMainCode(
            this.dir,
            this.main);
    },

    lastModified: function() {
        return 0;
    }
};