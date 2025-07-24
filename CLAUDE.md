# DAS プロジェクト - Claude Code 設定

## 目次

- [プロジェクト概要](#プロジェクト概要)
- [基本ルール](#基本ルール)
- [実装作業フロー](#実装作業フロー)
- [開発環境・ツール](#開発環境ツール)
- [プロジェクト構造](#プロジェクト構造)

## プロジェクト概要

**DAS (Dify Application Script)**

Google Apps Script（GAS）から Dify API を簡単に呼び出すためのライブラリプロジェクト

### 主な機能

1. Chatbot、Chatflow、Workflow、TextGenerator の各機能に対応
2. 統一されたインターフェースで Dify サービスへアクセス可能
3. GAS 環境での簡単な実装と呼び出し

### 対象 API・エンドポイント

- **Chatbot**: `/chat-messages` - 会話管理、ファイル操作
- **Chatflow**: `/chat-messages` - フロー実行、パラメータ管理
- **Workflow**: `/workflows/run` - 実行管理、ログ取得
- **TextGenerator**: `/completion-messages` - テキスト生成、音声変換

## 基本ルール

### 対話ルール

- 常に日本語で応答する
- 不明な点があれば人間に確認する（human-in-the-loop ツール使用）
- 必要に応じて Web 検索を活用する
- @要件定義書.md 及び@作業計画書.md に従って実装すること
- api リファレンスとして@dify-api を参照すること

### 開発原則

1. **YAGNI**: 必要最小限の実装
2. **DRY**: 重複コードの排除
3. **KISS**: シンプルな解決策を優先

### 作業報告規則

作業完了時は、以下の形式で作業内容の要約を必ずユーザーに報告してください：

```
---
作業完了報告:

1. [実施した作業項目1]
2. [実施した作業項目2]
3. [実施した作業項目3]
...
---

```

## 実装作業フロー

### 作業前の必須ステップ

1. 要件定義（目的・機能・制約を明確化）
2. 作業計画（手順・ファイル・テスト方法）

### 要件定義テンプレート

```
## 概要
- 目的：[解決する課題]
- スコープ：[今回の実装範囲]

## 機能要件
### [機能名]
- 概要：[簡潔な説明]
- 入力：[必要なデータ]
- 処理：[実行内容]
- 出力：[期待結果]

## 制約・条件
- [技術的制約]
- [パフォーマンス要件]
- [セキュリティ要件]
```

### 作業計画テンプレート

```
## タスク1: [機能概要]
1. [具体的作業内容]
   - 要件：[満たす要件]
   - ファイル：[対象ファイル]

## タスク2: [次の機能]
...
```

### コードレビュー規則

コードレビューの依頼がされた場合、必ず日本語でレビューすること

## 開発環境・ツール

**DAS (Dify Application Script)**

- Google Apps Script ライブラリプロジェクト
- 作業ディレクトリ: `/workspace`
- プロジェクト概要：
  1. Google Apps Script（GAS）から Dify API を簡単に呼び出すためのライブラリ
  2. Chatbot、Chatflow、Workflow、TextGenerator の各機能に対応
  3. 統一されたインターフェースで Dify サービスへアクセス可能

### 技術スタック

- **実行環境**: Google Apps Script（V8 ランタイム）
- **言語**: JavaScript（ES6 互換）
- **HTTP 通信**: UrlFetchApp（GAS 標準ライブラリ）
- **認証**: Bearer Token（Dify API Key）
- **開発ツール**: clasp（Google Apps Script CLI）
- **対象 API**: Dify API v1

### 開発コマンド

```bash
clasp push    # Google Cloudに反映
clasp pull    # Cloudから取得
clasp open    # Apps Scriptエディタで開く
clasp create [scriptTitle] # 新しい Apps Script プロジェクトを作成する
```

### プロジェクト構造

```
/workspace/
├── main.js              # メインライブラリファイル
├── appsscript.json      # GASプロジェクト設定
├── 要件定義書.md        # プロジェクト要件定義
├── 作業計画書.md        # 開発作業計画
├── README.md            # プロジェクト説明
├── CLAUDE.md            # Claude設定ファイル
├── dify-api/            # APIリファレンス
│   ├── chatbot/         # チャットボットAPI仕様
│   ├── チャットフロー/  # チャットフローAPI仕様
│   ├── ワークフロー/    # ワークフローAPI仕様
│   └── テキストジェネレーター/ # テキスト生成API仕様
├── tests/               # テストファイル（予定）
└── examples/            # 使用例（予定）
```

### API エンドポイント対応

- **Chatbot**: `/chat-messages`、会話管理、ファイル操作
- **Chatflow**: `/chat-messages`、フロー実行、パラメータ管理
- **Workflow**: `/workflows/run`、実行管理、ログ取得
- **TextGenerator**: `/completion-messages`、テキスト生成、音声変換
