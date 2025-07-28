## Chatflow クラス APIリファレンス

`Chatflow`クラスは`ChatBase`クラスを継承しており、Difyのチャットフローと対話するためのメソッドを提供します。

### 継承元

- `Dify`
- `ChatBase`

---

### `ChatBase`クラスから継承したメソッド

#### `sendMessage(query, user, options)`
チャットフローにメッセージを送信し、ワークフローを実行します。

- **パラメータ:**
  - `query` (string, 必須): ユーザーの入力。
  - `user` (string, 任意): ユーザー識別子。
  - `options` (Object, 任意): 
    - `inputs` (Object): フローで定義された変数（キーと値）。
    - `response_mode` (string): `'streaming'` (デフォルト) または `'blocking'`。
    - `conversation_id` (string): 既存の会話ID。
    - `files` (Array): ファイルリスト。
- **戻り値:** (Object) ストリーミングモードでは、`workflow_run_id`, `node_outputs`など、ワークフローの進行状況を含むイベントが返されます。

---

### `Dify`クラスから継承したメソッド

（`Chatbot`のドキュメントと同様）