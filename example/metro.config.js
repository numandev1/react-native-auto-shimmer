const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('@expo/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

const root = path.resolve(__dirname, '..');

/**
 * @type {import('metro-config').MetroConfig}
 */
let config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

// ── /skeleton-save endpoint ───────────────────────────────────────────────────
// This MUST be added before withRozenite so our enhanceMiddleware is stored
// first, then Rozenite wraps it (Rozenite chains enhanceMiddleware internally).

function skeletonSaveMiddleware(middleware) {
  return (req, res, next) => {
    if (req.method === 'OPTIONS' && req.url === '/skeleton-save') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/skeleton-save') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');

      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const { name, outDir, viewportWidth, height, skeletons } = JSON.parse(body);

          if (!name || !Array.isArray(skeletons) || !viewportWidth || !outDir) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }

          const absOut = path.isAbsolute(outDir)
            ? outDir
            : path.resolve(__dirname, outDir);
          fs.mkdirSync(absOut, { recursive: true });

          const jsonFile = path.join(absOut, `${name}.skeletons.json`);

          let existing = { breakpoints: {} };
          if (fs.existsSync(jsonFile)) {
            try { existing = JSON.parse(fs.readFileSync(jsonFile, 'utf8')); }
            catch { existing = { breakpoints: {} }; }
          }

          const key = String(Math.round(viewportWidth));
          existing.breakpoints[key] = {
            name,
            viewportWidth: Math.round(viewportWidth),
            width: Math.round(viewportWidth),
            height: Math.round(height || 0),
            skeletons,
          };

          fs.writeFileSync(jsonFile, JSON.stringify(existing, null, 2) + '\n');

          const relFile = path.relative(__dirname, jsonFile);
          console.log(`\n  [Skeleton Inspector] ✓  ${name}  →  ${skeletons.length} skeletons  →  ${relFile}\n`);

          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, file: relFile, skeletons: skeletons.length }));
        } catch (e) {
          console.error('[skeleton-save] Error:', e.message);
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }

    return middleware(req, res, next);
  };
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return skeletonSaveMiddleware(middleware);
  },
};

/**
 * Rozenite DevTools plugin integration.
 * withRozenite returns a Promise<config> — Metro supports async config.
 * Enable with: WITH_ROZENITE=true yarn start
 */
if (process.env.WITH_ROZENITE === 'true') {
  try {
    const { withRozenite } = require('@rozenite/metro');

    const pluginPkgJson = require.resolve(
      '@react-native-auto-shimmer/rozenite-plugin/package.json',
      { paths: [__dirname] }
    );
    const pluginPath = path.dirname(pluginPkgJson);
    const pluginCjs = path.join(pluginPath, 'dist', 'react-native.cjs');
    const pluginBridgeCjs = require.resolve('@rozenite/plugin-bridge', {
      paths: [__dirname],
    });

    config.watchFolders = [...(config.watchFolders ?? []), pluginPath];
    config.resolver = {
      ...config.resolver,
      extraNodeModules: {
        ...config.resolver?.extraNodeModules,
        '@react-native-auto-shimmer/rozenite-plugin': pluginCjs,
        '@rozenite/plugin-bridge': pluginBridgeCjs,
      },
    };

    // withRozenite wraps the existing enhanceMiddleware (our skeleton-save)
    // and adds its own DevTools frontend injection on top.
    config = withRozenite(config, {
      enabled: true,
      include: ['@react-native-auto-shimmer/rozenite-plugin'],
    });

    console.log('[metro] Rozenite Skeleton Inspector enabled');
  } catch (e) {
    console.warn('[metro] Rozenite setup failed:', e.message);
  }
}

module.exports = config;
