# test-program.js

フォーマッターテスト用のJavaScriptファイルです。

## 概要

このファイルは、JavaScriptのフォーマッターやコード整形ツールのテストを目的として作成されています。様々なJavaScriptの機能や構文パターンが含まれており、コードの整形や品質チェックツールの動作確認に使用できます。

## 機能

### 基本関数

- **greet(name, age = 20)**: 挨拶メッセージを生成
- **formatDate(date = new Date())**: 日付を日本語形式でフォーマット
- **calculate(a, b, operation = "add")**: 四則演算を実行

### クラス

- **TaskManager**: タスク管理クラス
  - `addTask(task)`: タスクを追加
  - `completeTask(id)`: タスクを完了
  - `getTasks()`: 未完了タスクを取得

### 非同期処理

- **processData(data)**: 配列データを非同期で処理（各要素を2倍にする）

## 実行方法

```bash
node test-program.js
```

## 出力例

```
=== プログラム実行開始 ===
実行時刻: 2024年1月1日 12:00
こんにちは、山田太郎さん（25歳）！今日も良い一日を！
掛け算結果: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
タスク一覧: [
  { id: 1704067200000, task: 'フォーマッターのテスト', completed: false },
  { id: 1704067200001, task: 'コードの整形確認', completed: false }
]
非同期処理結果: [2, 4, 6, 8, 10]
```

## モジュール仕様

このファイルは以下の関数とクラスをエクスポートしています：

- `greet`
- `calculate`
- `TaskManager`
- `processData`

## テスト対象の要素

- ES6+の構文（アロー関数、テンプレートリテラル、デフォルト引数）
- クラス定義
- 非同期処理（Promise、async/await）
- エラーハンドリング
- 配列操作（map、filter）
- 条件分岐（switch文）
- モジュールシステム