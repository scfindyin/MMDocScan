const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    // Fix pdf-parse test data loading issue
    // The pdf-parse library tries to load test files when module.parent is undefined
    // We need to ensure module.parent is always defined during build
    config.plugins.push(
      new webpack.IgnorePlugin({
        checkResource: (resource, context) => {
          // Ignore test data files in pdf-parse
          if (context.includes('pdf-parse') && resource.includes('./test/data/')) {
            return true;
          }
          return false;
        }
      })
    );

    // Also configure module rules to skip pdf-parse test files
    config.module.rules.push({
      test: /node_modules\/pdf-parse\/test\//,
      use: 'ignore-loader'
    });

    return config;
  },
  // Configure externals to prevent build issues
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse']
  },
  // Increase API route body size limit to 50MB (for PDF uploads)
  // Default is 4MB which is too small for typical PDF documents
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

module.exports = nextConfig
