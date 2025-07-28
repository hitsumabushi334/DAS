## Workflow クラス APIリファレンス

`Workflow`クラスは`Dify`クラスを継承しており、Difyのワークフロー機能と対話するためのメソッドを提供します。

### 継承元

- `Dify`

---

### `Workflow`クラスのメソッド

#### `runWorkflow(inputs, user, options)`
ワークフローを実行します。

- **パラメータ:**
  - `inputs` (Object, 必須): ワークフローの入力。キーと値のペアで指定します。
  - `user` (string, 必須): ユーザー識別子。
  - `options` (Object, 任意): 
    - `response_mode` (string): `'streaming'` (デフォルト) または `'blocking'`。
    - `files` (Array): `{type, transfer_method, url, upload_file_id}` の形式のオブジェクト配列。
- **戻り値 (blocking):** (Object) ワークフローの実行結果。
  ```json
  {
    "workflow_run_id": "...",
    "task_id": "...",
    "data": {
      "id": "...",
      "workflow_id": "...",
      "status": "succeeded",
      "outputs": { ... },
      "error": null,
      "elapsed_time": 1.23,
      "total_tokens": 123,
      "total_steps": 5,
      "created_at": 1705395332,
      "finished_at": 1705395333
    }
  }
  ```
- **戻り値 (streaming):** (Object) SSEイベントストリームを解析した結果。

#### `getWorkflowLogs(options)`
ワークフローの実行履歴を取得します。

- **パラメータ:**
  - `options` (Object, 任意):
    - `page` (integer): ページ番号。デフォルトは1。
    - `limit` (integer): 1ページあたりの件数。デフォルトは20。
    - `keyword` (string): 検索キーワード。
    - `status` (string): `succeeded`, `failed`, `stopped`, `running` のいずれか。
- **戻り値:** (Object) 実行履歴の一覧。
  ```json
  {
    "page": 1,
    "limit": 20,
    "total": 100,
    "has_more": true,
    "data": [
      {
        "id": "...",
        "workflow_run": { ... },
        "created_from": "...",
        "created_by_role": "...",
        "created_by_account": "...",
        "created_by_end_user": { ... },
        "created_at": 1705395332
      }
    ]
  }
  ```

#### `getWorkflowRunDetail(workflowRunId)`
ワークフローの実行状況を取得します。

- **パラメータ:**
  - `workflowRunId` (string, 必須): ワークフロー実行ID。
- **戻り値:** (Object) 実行状況の詳細。
  ```json
  {
    "id": "...",
    "workflow_id": "...",
    "status": "succeeded",
    "inputs": "{...}",
    "outputs": { ... },
    "error": null,
    "total_steps": 5,
    "total_tokens": 123,
    "created_at": 1705395332,
    "finished_at": 1705395333,
    "elapsed_time": 1.23
  }
  ```

---

### `Dify`クラスから継承したメソッド

#### `stopTask(taskId, user)`
ワークフロータスクの生成を停止します。

- **パラメータ:**
  - `taskId` (string, 必須): タスクID。
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
WebAppの設定を取得します。

- **戻り値:** (Object) WebApp設定。
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
    "default_language": "ja-JP",
    "show_workflow_steps": true
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
