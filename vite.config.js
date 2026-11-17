import { defineConfig } from 'vite';

// GitHub Pages は https://<user>.github.io/discord-ai-game/ で配信されるため base をリポジトリ名に合わせる
export default defineConfig({
  base: '/discord-ai-game/',
  build: {
    chunkSizeWarningLimit: 2000, // Phaser 本体が大きいので警告閾値を上げる
  },
});
