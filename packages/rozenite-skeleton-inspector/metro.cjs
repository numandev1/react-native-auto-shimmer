/**
 * Metro middleware for react-native-auto-shimmer Skeleton Inspector.
 *
 * Adds a /skeleton-save endpoint to Metro that the Skeleton Inspector DevTools
 * panel uses to write captured skeleton files (.ts or .json) to disk.
 *
 * Usage in metro.config.js:
 *
 *   const { withSkeletonInspector } = require('@react-native-auto-shimmer/rozenite-plugin/metro');
 *   config = withSkeletonInspector(config);
 *
 * That's it — no other setup needed for the save endpoint.
 */

'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Middleware factory — wraps the existing Metro middleware and intercepts
 * POST /skeleton-save requests before passing everything else through.
 */
function skeletonSaveMiddleware(middleware) {
  return function (req, res, next) {
    // CORS preflight
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
      req.on('data', function (chunk) { body += chunk; });
      req.on('end', function () {
        try {
          const payload = JSON.parse(body);
          const { name, outDir, viewportWidth, height, skeletons, asDescriptor, descriptorSource } = payload;

          if (!name || !Array.isArray(skeletons) || !viewportWidth || !outDir) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing required fields: name, outDir, viewportWidth, skeletons' }));
            return;
          }

          const absOut = path.isAbsolute(outDir) ? outDir : path.resolve(process.cwd(), outDir);
          fs.mkdirSync(absOut, { recursive: true });

          if (asDescriptor && descriptorSource) {
            // ── Save as .ts (ResponsiveSkeletons — recommended) ───────────
            const tsFile = path.join(absOut, name + '.skeletons.ts');
            fs.writeFileSync(tsFile, descriptorSource, 'utf8');
            const relFile = path.relative(process.cwd(), tsFile);
            console.log('\n  [Skeleton Inspector] ✓  ' + name + '  →  ' + skeletons.length + ' skeletons  →  ' + relFile + '\n');
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, file: relFile, skeletons: skeletons.length }));
          } else {
            // ── Save as .json (raw breakpoints snapshot) ──────────────────
            const jsonFile = path.join(absOut, name + '.skeletons.json');

            let existing = { breakpoints: {} };
            if (fs.existsSync(jsonFile)) {
              try { existing = JSON.parse(fs.readFileSync(jsonFile, 'utf8')); }
              catch (_) { existing = { breakpoints: {} }; }
            }

            const key = String(Math.round(viewportWidth));
            existing.breakpoints[key] = {
              name: name,
              viewportWidth: Math.round(viewportWidth),
              width: Math.round(viewportWidth),
              height: Math.round(height || 0),
              skeletons: skeletons,
            };

            fs.writeFileSync(jsonFile, JSON.stringify(existing, null, 2) + '\n');
            const relFile = path.relative(process.cwd(), jsonFile);
            console.log('\n  [Skeleton Inspector] ✓  ' + name + '  →  ' + skeletons.length + ' skeletons  →  ' + relFile + '\n');
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, file: relFile, skeletons: skeletons.length }));
          }
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

/**
 * Wraps a Metro config object with the skeleton-save middleware.
 * Call this before withRozenite so Rozenite can chain on top.
 *
 * @param {object} config - Existing Metro config
 * @returns {object} Enhanced Metro config
 */
function withSkeletonInspector(config) {
  const prevEnhance = config.server && config.server.enhanceMiddleware;

  return Object.assign({}, config, {
    server: Object.assign({}, config.server, {
      enhanceMiddleware: function (middleware, server) {
        // Chain: our save endpoint first, then any previously registered middleware
        const chained = prevEnhance ? prevEnhance(middleware, server) : middleware;
        return skeletonSaveMiddleware(chained);
      },
    }),
  });
}

module.exports = { withSkeletonInspector, skeletonSaveMiddleware };
