//@ts-check
const { defineConfig } = require('@zardoy/vscode-utils/build/defineConfig.cjs')
const NodeModulesPolyfills = require('@esbuild-plugins/node-modules-polyfill')

module.exports = defineConfig({
    esbuild: {
        plugins: [NodeModulesPolyfills.NodeModulesPolyfillPlugin()],
    },
    target: {
        desktop: true,
        web: true,
    },
})
