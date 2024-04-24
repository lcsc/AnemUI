const coreCfg  = require('@lcsc/anemui-core/webpack.config');
//const path = require('path');
//const distPath= path.resolve(__dirname, 'dist');

module.exports = (env,argv) => {
    let ret = coreCfg(env,argv);

//    ret.output.path=distPath;
    
    return ret;
}