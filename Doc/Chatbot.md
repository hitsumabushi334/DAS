## Chatbot クラス APIリファレンス

`Chatbot`クラスは`ChatBase`クラスを継承しており、Difyのチャットボット機能と対話するためのメソッドを提供します。

### 継承元

- `Dify`
- `ChatBase`

---

### `ChatBase`クラスから継承したメソッド

#### `sendMessage(query, user, options)`
チャットボットにメッセージを送信します。

- **パラメータ:**
  - `query` (string, 必須): ユーザーの質問や入力。
  - `user` (string, 必須): ユーザー識別子。
  - `options` (Object, 任意): 
    - `response_mode` (string): `'streaming'` (デフォルト) または `'blocking'`。
    - `conversation_id` (string): 既存の会話ID (UUID形式)。
    - `files` (Array): `{type, transfer_method, url, upload_file_id}` の形式のオブジェクト配列。
    - `auto_generate_name` (boolean): `true`の場合、会話名を自動生成します。デフォルトは`true`。
- **戻り値 (blocking):** (Object) 完全なAPIレスポンス。
  ```json
  {
    "event": "message",
    "task_id": "...",
    "id": "...",
    "message_id": "...",
    "conversation_id": "...",
    "mode": "chat",
    "answer": "...",
    "metadata": {
      "usage": { ... },
      "retriever_resources": [ ... ]
    },
    "created_at": 1705395332
  }
  ```
- **戻り値 (streaming):** (Object) SSEイベントストリームを解析した結果。
  ```json
  {
    "answer": "...",
    "conversation_id": "...",
    "message_id": "...",
    "task_id": "...",
    "metadata": { ... },
    "created_at": 1705395332,
    "audio": null,
    "file_id": "",
    "file_url": ""
  }
  ```

#### `getConversations(user, options)`
指定したユーザーの会話一覧を取得します。

- **パラメータ:**
  - `user` (string, 必須): ユーザー識別子。
  - `options` (Object, 任意):
    - `last_id` (string): 前のページの最後の会話ID。
    - `limit` (integer): 取得する会話の数。デフォルトは20。
    - `sort_by` (string): ソート順。`-created_at` (デフォルト), `created_at`, `-updated_at`, `updated_at`。
- **戻り値:** (Object) 会話一覧。
  ```json
  {
    "data": [
      {
        "id": "...",
        "name": "...",
        "inputs": { ... },
        "status": "...",
        "introduction": "...",
        "created_at": 1705395332,
        "updated_at": 1705395332
      }
    ],
    "limit": 20,
    "has_more": true
  }
  ```

#### `getConversationMessages(conversationId, user, options)`
特定の会話のメッセージ履歴を取得します。

- **パラメータ:**
  - `conversationId` (string, 必須): 会話ID。
  - `user` (string, 必須): ユーザー識別子。
  - `options` (Object, 任意):
    - `first_id` (string): 最初のメッセージID。
    - `limit` (integer): 取得するメッセージの数。デフォルトは20。
- **戻り値:** (Object) メッセージ履歴。
  ```json
  {
    "data": [
      {
        "id": "...",
        "conversation_id": "...",
        "inputs": { ... },
        "query": "...",
        "answer": "...",
        "message_files": [ ... ],
        "feedback": { "rating": "like" },
        "retriever_resources": [ ... ],
        "created_at": 1705395332
      }
    ],
    "limit": 20,
    "has_more": true
  }
  ```

#### `renameConversation(conversationId, name, user, autoGenerate)`
会話の名前を変更します。

- **パラメータ:**
  - `conversationId` (string, 必須): 会話ID。
  - `name` (string): 新しい会話名。
  - `user` (string, 必須): ユーザー識別子。
  - `autoGenerate` (boolean): `true`の場合、会話名を自動生成します。デフォルトは`false`。
- **戻り値:** (Object) 更新された会話情報。
  ```json
  {
    "id": "...",
    "name": "...",
    "inputs": { ... },
    "status": "...",
    "introduction": "...",
    "created_at": 1705395332,
    "updated_at": 1705395332
  }
  ```

#### `deleteConversation(conversationId, user)`
会話を削除します。

- **パラメータ:**
  - `conversationId` (string, 必須): 会話ID。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (void)

#### `getSuggestedQuestions(messageId, user)`
メッセージに対する次の推奨質問を取得します。

- **パラメータ:**
  - `messageId` (string, 必須): メッセージID。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Object) 推奨質問リスト。
  ```json
  {
    "result": "success",
    "data": [
      "質問1",
      "質問2"
    ]
  }
  ```

#### `stopTask(taskId, user)`
メッセージの生成を停止します。

- **パラメータ:**
  - `taskId` (string, 必須): タスクID。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Object) 停止結果。
  ```json
  {
    "result": "success"
  }
  ```

#### `getConversationVariables(conversationId, user, options)`
会話から変数を取得します。

- **パラメータ:**
  - `conversationId` (string, 必須): 会話ID。
  - `user` (string, 必須): ユーザー識別子。
  - `options` (Object, 任意):
    - `last_id` (string): 前のページの最後の変数ID。
    - `limit` (integer): 取得する変数の数。デフォルトは20。
    - `variable_name` (string): 変数名でフィルタリング。
- **戻り値:** (Object) 変数一覧。
  ```json
  {
    "data": [
      {
        "id": "...",
        "name": "...",
        "value_type": "string",
        "value": "...",
        "description": "...",
        "created_at": 1705395332,
        "updated_at": 1705395332
      }
    ],
    "limit": 20,
    "has_more": true
  }
  ```

---

### `Dify`クラスから継承したメソッド

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
    "opening_statement": "...",
    "suggested_questions": [ ... ],
    "file_upload": { ... },
    "system_parameters": { ... }
  }
  ```

#### `getAppMeta()`
アプリケーションのメタ情報を取得します。

- **戻り値:** (Object) メタ情報。
  ```json
  {
    "tool_icons": { ... }
  }
  ```

#### `getWebAppSettings()`
WebAppの設定を取得します。

- **戻り値:** (Object) WebApp設定。
  ```json
  {
    "title": "...",
    "chat_color_theme": "...",
    "icon_type": "emoji",
    "icon": "🤖",
    "icon_background": "#FFFFFF",
    "description": "...",
    "copyright": "...",
    "privacy_policy": "...",
    "custom_disclaimer": "...",
    "default_language": "ja-JP",
    "show_workflow_steps": true,
    "use_icon_as_answer_icon": true
  }
  ```

#### `uploadFile(file, user)`
ファイルをDifyにアップロードします。

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

#### `getAppFeedbacks(options)`
メッセージのフィードバックを取得します。

- **パラメータ:**
  - `options` (Object, 任意):
    - `page` (integer): ページ番号。デフォルトは1。
    - `limit` (integer): 1ページあたりの件数。デフォルトは20。
- **戻り値:** (Object) フィードバック一覧。
  ```json
  {
    "data": [
      {
        "id": "...",
        "app_id": "...",
        "conversation_id": "...",
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

#### `sendFeedback(messageId, rating, user, content)`
メッセージにフィードバックを作成します。

- **パラメータ:**
  - `messageId` (string, 必須): メッセージID。
  - `rating` (string, 必須): `like` または `dislike`。
  - `user` (string, 必須): ユーザー識別子。
  - `content` (string, 任意): フィードバックの内容。
- **戻り値:** (Object) 作成されたフィードバック情報。

#### `textToAudio(options, user)`
テキストを音声に変換します。

- **パラメータ:**
  - `options` (Object, 必須):
    - `text` (string): 音声に変換するテキスト。
    - `message_id` (string, 任意): メッセージID。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Blob) 音声ファイル。

#### `audioToText(file, user)`
音声をテキストに変換します。

- **パラメータ:**
  - `file` (Blob, 必須): 音声ファイル。
  - `user` (string, 必須): ユーザー識別子。
- **戻り値:** (Object) 変換されたテキスト。
  ```json
  {
    "text": "..."
  }
  ```