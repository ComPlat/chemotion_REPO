process.env.NODE_ENV = process.env.NODE_ENV || 'production'

const webpackConfig = require('./base')

// Reduce peak memory usage during CI asset:precompile.
// Feature specs render the app in a browser but do not benefit from
// minified or source-mapped output, so we disable both. Terser is the
// single largest memory consumer in the production build.
webpackConfig.devtool = false
webpackConfig.optimization = {
  ...(webpackConfig.optimization || {}),
  minimize: false,
  minimizer: [],
}

module.exports = webpackConfig
