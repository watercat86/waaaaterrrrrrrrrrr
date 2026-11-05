# friend-chat

テキストチャット / ファイル添付 / ビデオ通話 / 画面共有だけの最小構成。

## ローカル起動
    npm install
    npm start   # http://localhost:3000

## Render デプロイ
1. GitHub に push
2. Render → New → Web Service → リポジトリを選択
3. Runtime: Node / Build: `npm install` / Start: `npm start`
4. (任意) 通話が繋がらない人がいる場合は環境変数 `TURN_URL` `TURN_USER` `TURN_PASS` を設定

## 注意
- 履歴はサーバに保存されません (メモリ上のみ・リロードで消える)
- 通話は P2P のメッシュ方式。4〜5人程度までを想定
- 無料プランは放置するとスリープし、最初のアクセスが遅い