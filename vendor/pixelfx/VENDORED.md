# pixelfx（同梱コピー）

- 元: https://github.com/patch-gg/pixelfx
- コミット: 5294518ce7c72e48b6100a744596e0acf57f2826（v0.3.1）
- ライセンス: MIT（`LICENSE`）。一部は Hugo Duprez / rehan-remade の MIT コードを含む（`NOTICE.md`）
- 同梱したもの: `src/`（コアと全エフェクト）、`tools/`（render / list / check / new / sheets など。ギャラリー用の build-gallery / serve は除外）、`docs/AUTHORING.md`、`docs/CATALOG.md`
- 除外したもの: `gallery/`（Patch Pixel フォントは MIT 対象外）、`docs/readme/`（README 用画像）、`.github/`、`.claude-plugin/`
- `tools/render.mjs` などの出力先 `records/` は .gitignore 済み（確認用の一時ファイル）

ゲーム側からは `pixelfx`（コア）と `pixelfx/fx/<カテゴリ>/<名前>`（エフェクト）でインポートできる（`vite.config.js` のエイリアス）。
アップデートするときは元リポジトリから同じ範囲をコピーし直し、このファイルのコミットを更新する。
