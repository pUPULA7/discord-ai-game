# CHANGELOG

指示の反映内容、矛盾時の判断理由、スキップした指示をここに記録します（新しいものが上）。

## 2026-11-17 — Discord 連携

- `scripts/discord.mjs` を追加（指示チャンネルの新規投稿を `instructions/pending/` に取り込む / リアクションを付ける）
- `npm run discord:fetch` / `npm run discord:react` を追加
- `CLAUDE.md` に定期実行時の手順（取り込み → 反映 → main へ push → リアクション）を追記

## 2026-11-17 — 土台の作成

- Phaser 3 + Vite で最小の 2D ゲームを作成（四角いプレイヤーが矢印キー / WASD で移動）
- GitHub Actions で main への push 時に GitHub Pages へ自動デプロイ
- `instructions/pending/`・`instructions/done/` を作成
- `CLAUDE.md`（作業ルール）、`GAME.md`（設計メモ）、`README.md` を整備
