はい、承知いたしました。ご提供の文章をコピー可能なMarkdown形式で構造化します。

---

# **ChunkCompletionResponse**

アプリによって出力されたストリームチャンクを返します。Content-Typeはtext/event-streamです。  
各ストリーミングチャンクはdata:で始まり、2つの改行文字\\n\\nで区切られます。以下のように表示されます：

data: {"event": "text\_chunk", "workflow\_run\_id": "b85e5fc5-751b-454d-b14e-dc5f240b0a31", "task\_id": "bd029338-b068-4d34-a331-fc85478922c2", "data": {"text": "\\u4e3a\\u4e86", "from\_variable\_selector": \["1745912968134", "text"\]}}

ストリーミングチャンクの構造はeventに応じて異なります。

---

## **event: workflow\_started**

ワークフローが実行を開始したことを示します。

* task\_id (string): タスクID。リクエストの追跡とStop Generate APIに使用されます。  
* workflow\_run\_id (string): ワークフロー実行の一意のID。  
* event (string): workflow\_startedに固定されます。  
* data (object): 詳細情報。  
  * id (string): ワークフロー実行の一意のID。  
  * workflow\_id (string): 関連するワークフローのID。  
  * created\_at (timestamp): 作成タイムスタンプ（例：1705395332）。

---

## **event: node\_started**

ノードの実行が開始されたことを示します。

* task\_id (string): タスクID。  
* workflow\_run\_id (string): ワークフロー実行の一意のID。  
* event (string): node\_startedに固定されます。  
* data (object): 詳細情報。  
  * id (string): ワークフロー実行の一意のID。  
  * node\_id (string): ノードのID。  
  * node\_type (string): ノードのタイプ。  
  * title (string): ノードの名前。  
  * index (int): 実行シーケンス番号。トレースノードシーケンスの表示に使用されます。  
  * predecessor\_node\_id (string, optional):先行ノードのID。キャンバス表示の実行パスに使用されます。  
  * inputs (object): ノードで使用されるすべての前のノード変数の内容。  
  * created\_at (timestamp): 開始タイムスタンプ（例：1705395332）。

---

## **event: text\_chunk**

テキストの断片（フラグメント）を示します。

* task\_id (string): タスクID。  
* workflow\_run\_id (string): ワークフロー実行の一意のID。  
* event (string): text\_chunkに固定されます。  
* data (object): 詳細情報。  
  * text (string): テキスト内容。  
  * from\_variable\_selector (array): テキストの生成元パス。どのノードのどの変数から生成されたかを開発者が理解するための情報です。

---

## **event: node\_finished**

ノードの実行が終了したことを示します。成功または失敗の状態を含みます。

* task\_id (string): タスクID。  
* workflow\_run\_id (string): ワークフロー実行の一意のID。  
* event (string): node\_finishedに固定されます。  
* data (object): 詳細情報。  
  * id (string): ワークフロー実行の一意のID。  
  * node\_id (string): ノードのID。  
  * node\_type (string): ノードのタイプ。  
  * title (string): ノードの名前。  
  * index (int): 実行シーケンス番号。  
  * predecessor\_node\_id (string, optional): 先行ノードのID。  
  * inputs (object): ノードで使用されるすべての前のノード変数の内容。  
  * process\_data (json, optional): ノードのプロセスデータ。  
  * outputs (json, optional): 出力内容。  
  * status (string): 実行ステータス (running / succeeded / failed / stopped)。  
  * error (string, optional): エラー理由。  
  * elapsed\_time (float, optional): 使用時間（秒）。  
  * execution\_metadata (json): メタデータ。  
    * total\_tokens (int, optional): 使用トークン数。  
    * total\_price (decimal, optional): 総コスト。  
    * currency (string, optional): 通貨（例：USD / RMB）。  
  * created\_at (timestamp): 開始タイムスタンプ（例：1705395332）。

---

## **event: workflow\_finished**

ワークフローの実行が終了したことを示します。成功または失敗の状態を含みます。

* task\_id (string): タスクID。  
* workflow\_run\_id (string): ワークフロー実行の一意のID。  
* event (string): workflow\_finishedに固定されます。  
* data (object): 詳細情報。  
  * id (string): ワークフロー実行のID。  
  * workflow\_id (string): 関連するワークフローのID。  
  * status (string): 実行ステータス (running / succeeded / failed / stopped)。  
  * outputs (json, optional): 出力内容。  
  * error (string, optional): エラー理由。  
  * elapsed\_time (float, optional): 使用時間（秒）。  
  * total\_tokens (int, optional): 使用トークン数。  
  * total\_steps (int): デフォルトは0。  
  * created\_at (timestamp): 開始時間。  
  * finished\_at (timestamp): 終了時間。

---

## **event: tts\_message**

TTS（音声合成）オーディオストリームイベント。内容は**Base64でエンコードされたMP3形式のオーディオブロック**です。再生時にはBase64をデコードしてプレーヤーに入力します。（このメッセージは自動再生が有効な場合にのみ利用可能です）

* task\_id (string): タスクID。  
* message\_id (string): 一意のメッセージID。  
* audio (string): Base64でエンコードされたオーディオコンテンツ。  
* created\_at (int): 作成タイムスタンプ（例：1705395332）。

---

## **event: tts\_message\_end**

TTSオーディオストリームの終了を示すイベント。

* task\_id (string): タスクID。  
* message\_id (string): 一意のメッセージID。  
* audio (string): 終了イベントにはオーディオがないため、空の文字列です。  
* created\_at (int): 作成タイムスタンプ（例：1705395332）。

---

## **event: ping**

接続を維持するために10秒ごとに送信されるPingイベントです。