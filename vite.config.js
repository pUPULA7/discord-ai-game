import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const pixelfx = fileURLToPath(new URL('./vendor/pixelfx/src', import.meta.url));

// GitHub Pages は https://<user>.github.io/discord-ai-game/ で配信されるため base をリポジトリ名に合わせる
export default defineConfig({
  base: '/discord-ai-game/',
  resolve: {
    // pixelfx（vendor/pixelfx に同梱）を README と同じ書き方で import できるようにする
    //   import { createFx } from 'pixelfx';
    //   import * as burst from 'pixelfx/fx/pickups/collect-burst';
    alias: [
      { find: /^pixelfx$/, replacement: `${pixelfx}/core/index.js` },
      { find: /^pixelfx\/fx\/(.+)$/, replacement: `${pixelfx}/fx/$1.js` },
      { find: /^pixelfx\/core\/(.+)$/, replacement: `${pixelfx}/core/$1.js` },
    ],
  },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser 本体が大きいので警告閾値を上げる
  },
});
