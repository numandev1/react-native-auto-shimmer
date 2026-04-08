const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');
const { withSkeletonInspector } = require('react-native-auto-shimmer-rozenite-plugin/metro');

const root = path.resolve(__dirname, '..');

/**
 * @type {import('metro-config').MetroConfig}
 */
let config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

// ─── Skeleton Inspector ───────────────────────────────────────────────────────
// Adds the /skeleton-save endpoint so the inspector can write .ts/.json to disk.
config = withSkeletonInspector(config);

if (process.env.WITH_ROZENITE === 'true') {
  try {
    const { withRozenite } = require('@rozenite/metro');

    // NOTE: This block is only needed in this monorepo example because
    // react-native-auto-shimmer-rozenite-plugin is a local package, not
    // installed via npm. In a real project this block is NOT needed — just:
    //   config = withRozenite(config, { enabled: true });
    const pluginPkgJson = require.resolve(
      'react-native-auto-shimmer-rozenite-plugin/package.json',
      { paths: [__dirname] }
    );
    const pluginPath = path.dirname(pluginPkgJson);
    config.watchFolders = [...(config.watchFolders ?? []), pluginPath];
    config.resolver = {
      ...config.resolver,
      extraNodeModules: {
        ...config.resolver?.extraNodeModules,
        'react-native-auto-shimmer-rozenite-plugin': path.join(pluginPath, 'dist', 'react-native.cjs'),
        '@rozenite/plugin-bridge': require.resolve('@rozenite/plugin-bridge', { paths: [__dirname] }),
      },
    };

    config = withRozenite(config, { enabled: true });

    console.log('[metro] Rozenite Skeleton Inspector enabled');
  } catch (e) {
    console.warn('[metro] Rozenite setup failed:', e.message);
  }
}

module.exports = config;
