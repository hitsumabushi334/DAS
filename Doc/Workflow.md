## Workflow クラス APIリファレンス

`Workflow`クラスは`Dify`クラスを継承しており、Difyのワークフローを実行および管理するためのメソッドを提供します。

### 継承元

- `Dify`

---

### `Workflow`クラスのメソッド

#### `runWorkflow(data, user, files)`
指定された入力でワークフローを実行します。

- **パラメータ:**
  - `data` (Object, 必須): 
    - `inputs` (Object, 必須): ワークフローの入力変数。
    - `response_mode` (string, 任意): `'streaming'` (デフォルト) または `'blocking'`。
  - `user` (string, 任意): ユーザー識別子。
  - `files` (Array, 任意): ファイルリスト。
- **戻り値:** (Object) `workflow_run_id`, `status`, `outputs`などを含むオブジェクト。

#### `getWorkflowRun(workflowRunId, user)`
特定のワークフロー実行の詳細を取得します。

- **戻り値:** (Object) `id`, `status`, `outputs`, `error`, `elapsed_time`などを含む詳細情報。

#### `getWorkflowLogs(workflowRunId, user)`
特定のワークフロー実行のログを取得します。

- **戻り値:** (Object) `{data}`。`data`には各ノードの実行ログの配列が含まれます。

---

### `Dify`クラスから継承したメソッド

（`Chatbot`のドキュメントと同様）