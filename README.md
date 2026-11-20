# discord-ai-game

Discord で友達が出した指示を、AI（Claude）が定期的に反映して育てていく 2D ブラウザゲームです。

## 遊び方

ブラウザで GitHub Pages を開くだけで遊べます:
https://pupula7.github.io/discord-ai-game/

| キー | 動作 |
| --- | --- |
| 矢印キー / WASD | プレイヤー（四角）を移動 |

現在の仕様は [GAME.md](./GAME.md)、変更履歴は [CHANGELOG.md](./CHANGELOG.md) を見てください。

## 指示の出し方（仕組み）

1. Discord のフォーラム内のスレッド「ai指示文」に、ゲームへの要望を書き込む（1 投稿 = 1 指示）
2. Claude の定期実行（ルーティン）が起動し、新しい投稿を `instructions/pending/` に取り込む（`scripts/discord.mjs`）
3. 未処理の指示をまとめてゲームに反映し、反映済みの指示を `instructions/done/` に移動する
4. main に push されると GitHub Pages に自動デプロイされる
5. 反映された投稿には ✅、スキップされた投稿には 🙅 のリアクションが付く

AI の作業ルールは [CLAUDE.md](./CLAUDE.md) にあります。

## 開発方法

必要なもの: Node.js 20 以上（CI は 22）

```bash
npm install
```

```bash
npm run dev      # 開発サーバー起動（http://localhost:5173/discord-ai-game/）
```

```bash
npm run build    # dist/ に本番ビルド
```

```bash
npm run preview  # ビルド結果をローカルで確認
```

### デプロイ

`main` ブランチに push すると GitHub Actions（`.github/workflows/deploy.yml`）がビルドして GitHub Pages に公開します。

初回のみ、GitHub のリポジトリ設定で **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にしてください。

### ディレクトリ構成

```
src/                  ゲームのソース（Phaser）
instructions/pending/ 未処理の指示
instructions/done/    処理済みの指示
.github/workflows/    デプロイ設定
```
