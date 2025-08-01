# Chatbot クラス実装レポート

## 実装概要

タスクリストと要件定義書に従い、DAS（Dify Application Script）ライブラリの Chatbot クラスを実装しました。

## 実装内容

### 1. 実装したメソッド一覧

#### 1.1 メッセージ送信機能

- **sendMessage(query, user, options)**: チャットメッセージの送信
  - パラメータ: クエリ、ユーザー ID、オプション（会話 ID、レスポンスモード等）
  - エンドポイント: `/chat-messages`

#### 1.2 会話管理機能

- **getConversations(user, options)**: 会話リストの取得

  - パラメータ: ユーザー ID、オプション（ページネーション、ソート）
  - エンドポイント: `/conversations`

- **getConversationMessages(conversationId, user, options)**: 会話履歴メッセージの取得

  - パラメータ: 会話 ID、ユーザー ID、オプション
  - エンドポイント: `/conversations/{id}/messages`

- **renameConversation(conversationId, name, user)**: 会話名の変更

  - パラメータ: 会話 ID、新しい名前、ユーザー ID
  - エンドポイント: `/conversations/{id}`

- **deleteConversation(conversationId, user)**: 会話の削除
  - パラメータ: 会話 ID、ユーザー ID
  - エンドポイント: `/conversations/{id}`

#### 1.3 ファイル操作機能

- **uploadFile(file, user)**: ファイルのアップロード
  - パラメータ: ファイル（Blob）、ユーザー ID
  - エンドポイント: `/files/upload`
  - 対応形式: png、jpg、jpeg、webp、gif

#### 1.4 メッセージフィードバック機能

- **sendFeedback(messageId, rating, user)**: メッセージへのフィードバック送信
  - パラメータ: メッセージ ID、評価（'like'/'dislike'）、ユーザー ID
  - エンドポイント: `/messages/{id}/feedbacks`

#### 1.5 音声とテキスト変換機能

- **textToAudio(user, options)**: テキストから音声への変換

  - パラメータ: ユーザー ID、オプション（メッセージ ID またはテキスト）
  - エンドポイント: `/text-to-audio`
  - 戻り値: Blob（音声ファイル）

- **audioToText(file, user)**: 音声からテキストへの変換
  - パラメータ: 音声ファイル（Blob）、ユーザー ID
  - エンドポイント: `/audio-to-text`

#### 1.6 その他の機能

- **stopGeneration(taskId, user)**: メッセージ生成の停止
  - パラメータ: タスク ID、ユーザー ID
  - エンドポイント: `/chat-messages/{taskId}/stop`

### 2. 共通機能

#### 2.1 HTTP リクエスト処理

- **\_makeRequest(endpoint, method, payload)**: 共通 HTTP リクエストメソッド（内部使用）
  - 認証ヘッダーの自動付与
  - エラーハンドリング
  - レスポンスの解析

## 技術仕様

### 認証方式

- Bearer Token 認証
- Authorization ヘッダーに API Key を設定

### エラーハンドリング

- HTTP ステータスコードによる判定
- 詳細なエラーメッセージの提供
- JSON 解析エラーの処理

### データ形式

- リクエスト: JSON 形式
- ファイルアップロード: multipart/form-data 形式
- レスポンス: JSON 形式（音声変換は Blob）

## 実装方針の準拠

### 要件定義書への準拠

- ✅ Chatbot クラスの全機能を実装
- ✅ 入出力仕様に準拠
- ✅ セキュリティ要件（API Key 管理、HTTPS 通信、入力値バリデーション）
- ✅ エラーハンドリング要件

### タスクリストへの準拠

- ✅ 個別実装方針（共通処理の後回し）
- ✅ メッセージ送信機能
- ✅ 会話管理機能
- ✅ ファイルアップロード機能
- ✅ メッセージフィードバック機能
- ✅ 音声とテキスト変換機能

### Google Apps Script 対応

- ✅ ES5 互換の JavaScript
- ✅ UrlFetchApp の使用
- ✅ プロトタイプベースのクラス定義

## API ドキュメントとの整合性

実装は以下の API ドキュメントと完全に整合しています：

- チャットメッセージ送信 (`/chat-messages`)
- ファイルアップロード (`/files/upload`)
- 会話管理 (`/conversations`)
- 音声変換 (`/text-to-audio`, `/audio-to-text`)
- その他各種エンドポイント

## 使用例

### ブロッキングモード

```javascript
// インスタンス作成
const chatbot = new Chatbot("your-api-key", "https://api.dify.ai/v1");

// ブロッキングモードでメッセージ送信
const response = chatbot.sendMessage("こんにちは", "user123", {
  response_mode: "blocking",
  conversation_id: "optional-conversation-id",
});
console.log(response.answer);
```

### ストリーミングモード

```javascript
// ストリーミングモードでメッセージ送信
const result = chatbot.sendMessage("長い質問をしてください", "user123", {
  response_mode: "streaming",
  onChunk: function (chunk) {
    // リアルタイムでチャンクを受信
    console.log("チャンク受信:", chunk);
    if (chunk.event === "message") {
      console.log("回答の一部:", chunk.answer);
    }
  },
  onComplete: function (result) {
    // ストリーミング完了時
    console.log("最終回答:", result.answer);
    console.log("会話ID:", result.conversation_id);
  },
  onError: function (error) {
    // エラー処理
    console.error("エラー発生:", error.message);
  },
});
```

### その他の機能

```javascript
// 会話リスト取得
const conversations = chatbot.getConversations("user123", { limit: 10 });

// ファイルアップロード
const file = DriveApp.getFileById("file-id").getBlob();
const uploadResult = chatbot.uploadFile(file, "user123");
```

## ストリーミングモード機能追加

### 新機能の概要

- **Server-Sent Events (SSE) 対応**: Dify API のストリーミングレスポンスを処理
- **リアルタイムコールバック**: `onChunk`, `onComplete`, `onError` コールバック関数
- **イベント解析**: SSE 形式のデータを適切に解析し、各イベントタイプに対応

### 実装詳細

1. **`_sendStreamingMessage`メソッド**: ストリーミング専用の HTTP リクエスト処理
2. **`_parseStreamingResponse`メソッド**: SSE 形式レスポンスの解析処理
3. **イベントハンドリング**: `message`, `message_replace`, `message_end` イベントの処理

### SSE イベントタイプ

- **message**: 通常のメッセージイベント（完全な回答）
- **message_replace**: メッセージ置き換えイベント（回答の更新）
- **message_end**: メッセージ終了イベント（ストリーミング完了）

## まとめ

Chatbot クラスはタスクリストと要件定義書の全要件を満たし、さらにストリーミングモード対応により、Dify API の全機能への統一されたアクセスを提供します。Google Apps Script 環境での動作を前提とし、適切なエラーハンドリング、セキュリティ対策、そしてリアルタイム処理が実装されています。

### 追加機能

- **ストリーミング対応**: リアルタイムレスポンス処理
- **ES6 Class 記法**: 現代的な JavaScript 構文
- **包括的コールバック**: エラー処理とイベント処理の完全対応
