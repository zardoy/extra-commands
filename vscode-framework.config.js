//@ts-check
const { defineConfig } = require('@zardoy/vscode-utils/build/defineConfig.cjs')

module.exports = defineConfig({
    target: {
        desktop: true,
        web: true,
    },
})
