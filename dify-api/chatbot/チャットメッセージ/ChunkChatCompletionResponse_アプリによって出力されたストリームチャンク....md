はい、承知いたしました。提供された文章を Markdown 形式で構造化します。

---

## **ChunkChatCompletionResponse**

アプリによって出力されたストリームチャンクを返します。

- **Content-Type:** text/event-stream
- **形式:** 各ストリーミングチャンクは data: で始まり、2 つの改行文字 \\n\\n で区切られます。

**表示例:**

```JSON

data: {"event": "message", "task\_id": "900bbd43-dc0b-4383-a372-aa6e6c414227", "id": "663c5084-a254-4040-8ad3-51f2a3c1a77c", "answer": "Hi", "created\_at": 1705398420}\\n\\n
```

---

ストリーミングチャンクの構造は event に応じて異なります。

### **event: message**

LLM（大規模言語モデル）がテキストチャンクイベントを返します。完全なテキストがチャンク形式で出力されます。

- **task_id** (string): タスク ID。リクエストの追跡と Stop Generate API に使用されます。
- **message_id** (string): 一意のメッセージ ID。
- **conversation_id** (string): 会話 ID。
- **answer** (string): LLM が返したテキストチャンクの内容。
- **created_at** (int): 作成タイムスタンプ（例: 1705395332）。

### **event: agent_message**

LLM がテキストチャンクイベントを返します。エージェントアシスタントが有効な場合、完全なテキストがチャンク形式で出力されます（エージェントモードでのみサポート）。

- **task_id** (string): タスク ID。
- **message_id** (string): 一意のメッセージ ID。
- **conversation_id** (string): 会話 ID。
- **answer** (string): LLM が返したテキストチャンクの内容。
- **created_at** (int): 作成タイムスタンプ。

### **event: tts_message**

TTS（音声合成）オーディオストリームイベントです。内容は Mp3 形式のオーディオブロックで、base64 文字列としてエンコードされています。再生時には、base64 をデコードしてプレーヤーに入力します（自動再生が有効な場合のみ利用可能）。

- **task_id** (string): タスク ID。
- **message_id** (string): 一意のメッセージ ID。
- **audio** (string): base64 でエンコードされた音声データ。
- **created_at** (int): 作成タイムスタンプ。

### **event: tts_message_end**

TTS オーディオストリームの終了を示すイベントです。

- **task_id** (string): タスク ID。
- **message_id** (string): 一意のメッセージ ID。
- **audio** (string): 空の文字列。
- **created_at** (int): 作成タイムスタンプ。

### **event: agent_thought**

エージェントの思考プロセス（LLM の思考、ツール呼び出しの入出力）を含みます（エージェントモードでのみサポート）。

- **id** (string): 各反復に一意なエージェント思考 ID。
- **task_id** (string): タスク ID。
- **message_id** (string): 一意のメッセージ ID。
- **position** (int): メッセージ内のエージェント思考の順番。
- **thought** (string): LLM が考えていること。
- **observation** (string): ツール呼び出しからの応答。
- **tool** (string): 呼び出されたツールのリスト（; で区切られます）。
- **tool_input** (string): ツールの入力（JSON 形式）。例: {"dalle3": {"prompt": "a cute cat"}}
- **created_at** (int): 作成タイムスタンプ。
- **message_files** (array\[string\]): message_file イベントを参照します。
  - **file_id** (string): ファイル ID。
  - **conversation_id** (string): 会話 ID。

### **event: message_file**

ツールによって新しいファイルが作成されたことを示すイベントです。

- **id** (string): ファイルの一意な ID。
- **type** (string): ファイルタイプ（現在は "image" のみ許可）。
- **belongs_to** (string): 所属（現在は 'assistant' のみ）。
- **url** (string): ファイルのリモート URL。
- **conversation_id** (string): 会話 ID。

### **event: message_end**

ストリーミングが終了したことを示すイベントです。

- **task_id** (string): タスク ID。
- **message_id** (string): 一意のメッセージ ID。
- **conversation_id** (string): 会話 ID。
- **metadata** (object): メタデータ。
  - **usage** (Usage): モデルの使用情報。
  - **retriever_resources** (array\[RetrieverResource\]): 引用と帰属のリスト。

### **event: message_replace**

メッセージ内容の置換イベントです。出力内容のモデレーションが有効で、内容が不適切だと判断された場合に、このイベントを通じてメッセージ内容が事前に設定された返信に置き換えられます。

- **task_id** (string): タスク ID。
- **message_id** (string): 一意のメッセージ ID。
- **conversation_id** (string): 会話 ID。
- **answer** (string): 置換される内容。
- **created_at** (int): 作成タイムスタンプ。

### **event: error**

ストリーミングプロセス中に例外が発生した場合に出力されるイベントです。このイベントを受信するとストリームは終了します。

- **task_id** (string): タスク ID。
- **message_id** (string): 一意のメッセージ ID。
- **status** (int): HTTP ステータスコード。
- **code** (string): エラーコード。
- **message** (string): エラーメッセージ。

### **event: ping**

接続を維持するために 10 秒ごとに発生するイベントです。
