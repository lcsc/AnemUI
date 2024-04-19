const coreCfg = require('anemui-core/webpack.config');

module.exports = (env, argv) => {
    let ret = coreCfg(env, argv);
    return ret;
}