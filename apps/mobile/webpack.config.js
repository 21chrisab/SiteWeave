const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  // Set EXPO_ROUTER_APP_ROOT as an absolute path
  const appRoot = path.resolve(__dirname, 'app');
  process.env.EXPO_ROUTER_APP_ROOT = appRoot;

  // Create webpack config with explicit context
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      projectRoot: __dirname,
    },
    argv
  );

  // CRITICAL: Set webpack context to the mobile app directory
  // This ensures require.context paths resolve relative to apps/mobile
  config.context = __dirname;

  // Replace expo-router's _ctx.web.js with our version that has literal path
  const webpack = require('webpack');
  config.plugins = config.plugins || [];
  
  // Fix require.context resolution for _ctx.web.js
  // When webpack processes require.context('./app'), it needs to resolve relative to the file
  // Since _ctx.web.js is in apps/mobile/, './app' should resolve to apps/mobile/app
  // ContextReplacementPlugin helps webpack find the correct context directory
  config.plugins.push(
    new webpack.ContextReplacementPlugin(
      /^\.\/app$/,
      appRoot,
      true,
      /.*/
    )
  );
  
  // Add DefinePlugin to set the environment variable (for runtime use)
  const existingDefinePluginIndex = config.plugins.findIndex(
    plugin => plugin instanceof webpack.DefinePlugin
  );
  
  if (existingDefinePluginIndex >= 0) {
    const existingPlugin = config.plugins[existingDefinePluginIndex];
    existingPlugin.definitions = existingPlugin.definitions || {};
    existingPlugin.definitions['process.env.EXPO_ROUTER_APP_ROOT'] = JSON.stringify('./app');
  } else {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify('./app'),
      })
    );
  }
  
  // Use resolve.alias as a more reliable way to replace the module
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias['expo-router/_ctx.web'] = path.resolve(__dirname, '_ctx.web.js');
  config.resolve.alias['expo-router/_ctx.web.js'] = path.resolve(__dirname, '_ctx.web.js');
  
  // Also try NormalModuleReplacementPlugin as backup
  const customCtxPath = path.resolve(__dirname, '_ctx.web.js');
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /expo-router[\\/]_ctx\.web\.js$/,
      customCtxPath
    ),
    new webpack.NormalModuleReplacementPlugin(
      /expo-router[\\/]_ctx\.web$/,
      customCtxPath
    )
  );
  
  // Configure webpack to resolve the app directory correctly
  config.resolve.modules = config.resolve.modules || [];
  if (!config.resolve.modules.includes(__dirname)) {
    config.resolve.modules.push(__dirname);
  }
  
  // Ensure webpack can resolve the app directory from _ctx.web.js
  // Since _ctx.web.js is in apps/mobile/, and app is in apps/mobile/app,
  // we need to ensure webpack resolves './app' relative to apps/mobile
  config.resolve.alias['@app'] = appRoot;
  
  // Also add a custom loader or plugin to handle require.context
  // Actually, the issue is that require.context resolves relative to the file,
  // not the webpack context. So we need to ensure the file is processed correctly.
  // Let's try using a different approach - modify the require.context to use an absolute path
  // that webpack can understand at build time.

  return config;
};
