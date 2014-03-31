var defineCode = require('./defineCode');


module.exports = function(path, code, options) {
    options = options || {};
    options.run = true;
    return defineCode(path, code, options);
};

module.exports.sync = function(path, code, options) {
    options = options || {};
    options.run = true;
    return defineCode.sync(path, code, options);
};