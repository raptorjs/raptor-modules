var transport = require('../../transport');
var fs = require('fs');

module.exports = {
    properties: {
        'path': 'string'
    },
    
    getDir: function() {
        return this.getParentManifestDir();
    },

    read: function(context) {
        return transport.defineCode(
            this.path, 
            fs.createReadStream(this._file, {encoding: 'utf8'}));
    },

    lastModified: function() {
        return this.resourceLastModified(this._file);
    },

    getSourceFile: function() {
        return this._file;
    }
};