const nextConfig = require('eslint-config-next')

// Patch: set explicit React version to avoid detection issues in Next.js 16
const [mainConfig, ...rest] = nextConfig
module.exports = [
  {
    ...mainConfig,
    settings: {
      ...mainConfig.settings,
      react: { version: '19' },
    },
  },
  ...rest,
]
