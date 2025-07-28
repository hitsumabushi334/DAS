## TextGenerator クラス APIリファレンス

`Textgenerator`クラスは`Dify`クラスを継承しており、Difyのテキスト生成機能を利用するためのメソッドを提供します。

### 継承元

- `Dify`

---

### `TextGenerator`クラスのメソッド

#### `createCompletionMessage(inputs, user, options)`
入力に基づいてテキストを生成します。

- **パラメータ:**
  - `inputs` (Object, 必須): `query`キーを含む入力データ。
  - `user` (string, 任意): ユーザー識別子。
  - `options` (Object, 任意): `response_mode`, `files`など。
- **戻り値:** (Object) `message_id`, `task_id`, `answer`などを含むオブジェクト。

#### `submitMessageFeedback(messageId, feedback, user)`
生成されたメッセージにフィードバックを送信します。

- **戻り値:** (Object) `{result: 'success'}`

---

### `Dify`クラスから継承したメソッド

（`Chatbot`のドキュメントと同様）