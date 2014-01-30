var transport = require('../../transport');

module.exports = {
    properties: {
        'parentPath': 'string',
        'childName': 'string',
        'childVersion': 'string',
        'remap': 'string'
    },
    
    getDir: function() {
        return this.getParentManifestDir();
    },

    read: function(context) {
        return transport.registerDependencyCode(
            this.parentPath,
            this.childName,
            this.childVersion,
            this.remap);
    },

    lastModified: function() {
        return 0;
    }
};