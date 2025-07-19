# Claude Code Configuration

This file contains project-specific instructions and context for Claude Code.

## rules

次のルールを厳守してください。

- 常に日本語で応答すること。
- ユーザーを入力をもとに不足している情報がないか考え、不足している情報がある場合はユーザーに追加の情報提供を求めてください。
- AI としての知識の限界や、情報の不完全性を認識し、適切に伝えます。
- 追加情報が必要と判断した場合、WEB search ツールを使用してください。

また 、次の規則を厳守してください。

1. YAGNI：将来使うかも知れない機能は実装しない。
2. DRY:重複コードは必ず関数化、モジュール化する。
3. KISS:複雑な解決策より単純な解決策を優先。

## 作業完了時の報告

作業が完了したら必ずどのような作業を行ったかわかる用に作業内容の要約を通常のメッセージに追加してユーザーに通知してください。
例：機能 A を実装した場合、
"---

1. 機能 A についての要件定義書を作成しました。
2. 実装のための作業計画書(タスクリスト)を作成しました。
3. タスクリストに基づいて実装が完了しました。
4. テストコードを作成し、パスしたことを確認しました。

---"

## Project Overview

- Project name: DAS
- Location: C:\DAS
- Type: [To be determined]

## Common Commands

- Build: [To be added]
- Test: [To be added]
- Lint: [To be added]
- Type check: [To be added]

## Project Structure

```
C:\DAS\
├── src/          # Source code
├── docs/         # Documentation
├── tests/        # Test files
└── CLAUDE.md     # This file
```

## Development Notes

- [Add project-specific notes here]
