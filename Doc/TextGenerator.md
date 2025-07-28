## TextGenerator クラス API リファレンス

`TextGenerator`クラスは`Dify`クラスを継承しており、Dify のテキスト生成（完了型）アプリケーションと対話するためのメソッドを提供します。

### 継承元

- `Dify`

---

### `TextGenerator`クラスのメソッド

#### `createCompletionMessage(inputs, user, options)`

テキストを生成します。

- **パラメータ:**
  - `inputs` (Object, 必須): アプリケーションで定義された変数を含むオブジェクト。
    - `query` (string, 必須): 生成の元となる入力テキスト。
  - `user` (string, 必須): ユーザー識別子。
  - `options` (Object, 任意):
    - `response_mode` (string): `'streaming'` (デフォルト) または `'blocking'`。
    - `files` (Array): 関連付けるファイルリスト。

- **戻り値 (blocking):** (Object) 完全な API レスポンス。
  ```json
  {
    "event": "message",
    "task_id": "...",
    "id": "...",
    "message_id": "...",
    "mode": "completion",
    "answer": "...",
    "metadata": {
      "usage": { ... }
    },
    "created_at": 1705395332
  }
  ```
- **戻り値 (streaming):** (Object) SSE イベントストリームを解析した結果。
  ```json
  {
    "message_id": "...",
    "task_id": "...",
    "status": "succeeded",
    "answer": "...",
    "metadata": { ... },
    "audio": null
  }
  ```

#### `submitMessageFeedback(messageId, feedback, user)`

メッセージにフィードバックを送信します。

- **パラメータ:**
  - `messageId` (string, 必須): フィードバック対象のメッセージID。
  - `feedback` (Object, 必須): 評価内容。
    - `rating` (string): `'like'` または `'dislike'`。
    - `content` (string, 任意): フィードバックの具体的なテキスト。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Object) 送信結果。
  ```json
  {
    "result": "success"
  }
  ```

#### `getAppFeedbacks(options)`

アプリケーションに送信されたフィードバックの一覧を取得します。

- **パラメータ:**
  - `options` (Object, 任意):
    - `page` (integer): ページ番号。デフォルトは 1。
    - `limit` (integer): 1 ページあたりの件数。デフォルトは 20。
- **戻り値:** (Object) フィードバック一覧。
  ```json
  {
    "data": [
      {
        "id": "...",
        "app_id": "...",
        "message_id": "...",
        "rating": "like",
        "content": "...",
        "from_source": "...",
        "from_end_user_id": "...",
        "from_account_id": "...",
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  }
  ```

---

### `Dify`クラスから継承したメソッド

#### `stopTask(taskId, user)`

メッセージの生成を停止します。

- **パラメータ:**
  - `taskId` (string, 必須): タスク ID。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Object) 停止結果。
  ```json
  {
    "result": "success"
  }
  ```

#### `getAppInfo()`

アプリケーションの基本情報を取得します。

- **戻り値:** (Object) アプリケーション情報。
  ```json
  {
    "name": "...",
    "description": "...",
    "tags": ["tag1", "tag2"]
  }
  ```

#### `getAppParameters(user)`

アプリケーションのパラメータ設定を取得します。

- **パラメータ:**
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Object) パラメータ情報。
  ```json
  {
    "user_input_form": [ ... ],
    "file_upload": { ... },
    "system_parameters": { ... }
  }
  ```

#### `getWebAppSettings()`

WebApp の設定を取得します。

- **戻り値:** (Object) WebApp 設定。
  ```json
  {
    "title": "...",
    "icon_type": "emoji",
    "icon": "🤖",
    "icon_background": "#FFFFFF",
    "description": "...",
    "copyright": "...",
    "privacy_policy": "...",
    "custom_disclaimer": "...",
    "default_language": "ja-JP"
  }
  ```

#### `uploadFile(file, user)`

ファイルを Dify にアップロードします。

- **パラメータ:**
  - `file` (Blob, 必須): アップロードするファイル。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Object) アップロード結果。
  ```json
  {
    "id": "...",
    "name": "...",
    "size": 1048576,
    "extension": "pdf",
    "mime_type": "application/pdf",
    "created_by": "...",
    "created_at": 1705395332
  }
  ```

#### `textToAudio(options, user)`

テキストを音声に変換します。

- **パラメータ:**
  - `options` (Object, 必須):
    - `text` (string): 音声に変換するテキスト。
    - `message_id` (string, 任意): メッセージ ID。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Blob) 音声ファイル。