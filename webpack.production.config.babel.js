import webpack from 'webpack';
import config from './webpack.config.babel.js';

config.output.chunkFilename = 'chunk.[id].[name]_[chunkhash:7].js';

config.plugins.push(
  new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false
    }
  }),
  new webpack.DefinePlugin({
    "process.env": {
      NODE_ENV: JSON.stringify("production")
    }
  })
);

export default config;