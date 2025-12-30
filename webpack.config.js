const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: './BULWARK/background/background.js',
        'content-script': './BULWARK/content/content-script.js',
        popup: './BULWARK/popup/popup.js',
        dashboard: './BULWARK/dashboard/dashboard.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        clean: true
    },
    resolve: {
        alias: {
            // Alias for cleaner imports if needed
            '@bulwark': path.resolve(__dirname, 'BULWARK')
        }
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'BULWARK/popup/popup.html', to: 'popup.html' },
                { from: 'BULWARK/popup/popup.css', to: 'popup.css' },
                { from: 'BULWARK/dashboard/dashboard.html', to: 'dashboard/dashboard.html' },
                { from: 'BULWARK/settings', to: 'settings' },
                { from: 'BULWARK/blocked', to: 'blocked' },
                { from: 'BULWARK/content/injected.js', to: 'content/injected.js' },
                { from: 'icons', to: 'icons', noErrorOnMissing: true },
                { from: 'rules.json', to: 'rules.json', noErrorOnMissing: true }
            ],
        }),
    ],
    devtool: 'cheap-module-source-map'
};
