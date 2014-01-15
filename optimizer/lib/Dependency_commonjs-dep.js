var transport = require('../../transport');

module.exports = {
    properties: {
        'parentPath': 'string',
        'childName': 'string',
        'childVersion': 'string'
    },
    
    getDir: function() {
        return this.getParentManifestDir();
    },

    read: function(context) {
        return transport.dependencyCode(
            this.parentPath,
            this.childName,
            this.childVersion);
    },

    lastModified: function() {
        return 0;
    }
};