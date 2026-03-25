const { existsSync } = require('fs')
const { join } = require('path')

const platform = process.platform
const arch = process.arch

function loadNativeAddon() {
  // Try platform-specific binary first
  const binaryName = `instruo-native.${platform}-${arch === 'arm64' ? 'arm64' : 'x64'}.node`
  const localPath = join(__dirname, binaryName)

  if (existsSync(localPath)) {
    return require(localPath)
  }

  // Fallback: try generic name
  const genericPath = join(__dirname, 'instruo-native.node')
  if (existsSync(genericPath)) {
    return require(genericPath)
  }

  throw new Error(
    `instruo-native: No prebuilt binary found for ${platform}-${arch}. ` +
    `Build from source: cd native && cargo build --release`
  )
}

module.exports = loadNativeAddon()
