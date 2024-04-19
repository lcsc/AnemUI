const path = require('path');
const miniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require('webpack');
//const distPath= path.resolve(__dirname, 'dist');
const assetsPath=path.resolve(__dirname, 'assets');
const fs = require("fs");

const moduleConfig=require(process.env.npm_package_name+"/csconfig");

var viewerAssets = path.resolve(path.dirname(require.resolve(process.env.npm_package_name+"/package.json")),"assets");
if(fs.existsSync(viewerAssets)){
  var stats = fs.statSync(viewerAssets);
  if(stats.isDirectory()){
    console.log(viewerAssets +" is Dir");  
  }else{
    console.error(viewerAssets +" Not Dir");  
    throw new Error("Viewer Assets is not a Dir")
  }
}else{
  console.warn(viewerAssets +" NOT FOUND");  
  viewerAssets=undefined
}

const copyPatterns=[
  { from: assetsPath, to: moduleConfig.distPath },
];

if(viewerAssets!=undefined) {
  copyPatterns.push({ from: viewerAssets, to: moduleConfig.distPath })
}


function getEnvSuffix(){
  if(process.env.NODE_ENV!=undefined){
    return "."+process.env.NODE_ENV
  }else{
    return "";
  }
}
const envSuffix=getEnvSuffix();

function buildEnv(parent){
  console.log("building env... ",parent)
  let ret = {}
  let noEnv={}
  let env={}
  try{
    noEnv= require(parent+"/env/env")
//    console.log(noEnv)
  }catch(e){
    console.warn("no default env for "+ parent)
  }
  try{
    env= require(parent+"/env/env"+envSuffix)
//    console.log(env)
  }catch(e){
    console.warn("no env for "+parent)
  }
  ret={...noEnv,...env}
  //console.log(ret)
  return ret;
}

const ENV={...buildEnv(__dirname), ...buildEnv(process.env.npm_package_name)}
//console.log("Final")
//console.log(ENV)


const base={
  entry: './src/index.ts',
  output: {
    filename: '[name].bundle.js',
    path:moduleConfig.distPath,
  },
  resolve: {
    fallback: {
      buffer: require.resolve('buffer'),
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [miniCssExtractPlugin.loader, 'css-loader'],
        //type: 'asset/resource',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name]-[hash:8][ext]',
        },
      },
      {
        test: /\.(scss)$/,
        use: [
          {
            loader: miniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'postcss-loader',
          },
          {
            loader: 'sass-loader'
          }
        ]
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.ENV':JSON.stringify(ENV),
      'process.env.CS_CONFIG':JSON.stringify(moduleConfig)
    }),
    new HtmlWebpackPlugin({
      title:"cs-viewer",
      'meta': {
        'viewport': 'width=device-width,initial-scale=1',
        'description':{id:'description',content:'Maps page'},
        'Content-Type':{'http-equiv':'Content-Type',content:'text/html; charset=utf-8'}
      }
    }),
    new CopyPlugin({
      patterns: copyPatterns
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new miniCssExtractPlugin(),
  ]
};

const production={
  ...base,
  mode:'production'
}

const development={
  ...base,
  devtool: 'inline-source-map',
  mode: 'development',
  devServer: {
    static: ['./assets'],
    port:9000,
    compress: false,
    client: {
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: true,
      },
    },
    proxy: {
      "/maps": {
        "secure": false,
        "logger": console,
        changeOrigin:true,
        "target": moduleConfig.proxyDataUrl
      },
      "/stations": {
        "secure": false,
        "logger": console,
        changeOrigin:true,
        "target": moduleConfig.proxyDataUrl
      },
      "/stations.json": {
        "secure": false,
        "logger": console,
        changeOrigin:true,
        "target": moduleConfig.proxyDataUrl
      },
      "/times.js": {
        "secure": false,
        "logger": console,
        changeOrigin:true,
        "target": moduleConfig.proxyDataUrl
      },
      "/times.json": {
        "secure": false,
        "logger": console,
        changeOrigin:true,
        "target": moduleConfig.proxyDataUrl
      },
      "/nc": {
        "secure": false,
        "logger": console,
        changeOrigin:true,
        "target": moduleConfig.proxyDataUrl
      },
      "/geoserver":{
        "secure": false,
        "logger": console,
        changeOrigin:true,
        "target": "https://yesa.eead.csic.es/"
      }

    },
  },
  optimization: {
      runtimeChunk: 'single',
  },
};
if(viewerAssets!=undefined){
  development.devServer.static.push(viewerAssets)
}


module.exports = (env,argv) => {
  
  switch (process.env.NODE_ENV) {
    case "developmentWms":
    case "development":
      console.log("Running development") 
      return development
    case "production":
    case "wms":
      console.log("Running production")
      return production 
    default:
       console.log("Running base")
       return base
   }
}