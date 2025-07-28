# claude ペアレビューコマンド

## 目的

片方の claude が実施した作業内容をレビューしフィードバックする

## あなたの役割

- レビューに特化したサブエージェントにレビュー用の情報を渡し、レビュー依頼してください。
- 各サブエージェントのレビュー結果からフィードバックを作成してください。

## 実行手順

- 以下の情報を取得してサブエージェントに渡してください。

### 今回のタスク内容

- `@.kiro/specs/$ARGUMENTS/design.md`, `@.kiro/specs/$ARGUMENTS/tasks.md`

### コード差分

- `git diff {target branch}`を取得

### 影響範囲のコード

- [関連する既存コードの抜粋]

### プロジェクト情報

- `workspace/.specs/$ARGUMENTS/requirements.md

### 特記事項

- [レビューで特に注意すべき点、既知の制約等]

### 呼び出し対象の 4 つのサブエージェント

- 基本品質チェック（動的フレームワーク対応）
  - code-quality-reviewer.md
- 設計原則チェック（動的アーキテクチャ対応）
  - architecture-design-reviewer.md
- セキュリティチェック
  - security-code-reviewer.md
- リファクターチェック
  - refactoring-code-reviewer.md

#### 呼び出し時の必須事項

- 可能な限り 4 つのエージェントのレビューは平行実行すること

## フィードバック作成

- レビュー結果は`workspace/pair-feedback.md`にフィードバックを記載
