// Custom _ctx.web.js - webpack will resolve this path relative to config.context
// The webpack config sets context to apps/mobile, so './app' resolves to apps/mobile/app
export const ctx = require.context(
  './app',
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/,
  'sync'
);

