---
allowed-tools: Bash(git commit:*),Bash(git add:*), Bash(git status:*),
description: gitコミットの作成
---

# commit メッセージを作成

## 実行手順

1. /codeReview を実行してコードのレビューを行う
2. 問題があれば作業を中断
3. `git status`でファイルを確認
4. [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)に従ってコミットを実行

## 形式の指定

- type(scope): subject の形式に従う
- タイトルは 50 文字以内、本文は 72 文字程度で改行
- 動詞は原形を使用（add, fix, update など）
- scope は原則記述するが、適切なものがない場合は省略可
- コミットメッセージは小文字で始める

## 実装とテストが含まれる場合の優先ルール

- 実装とテストコードが含まれている場合、type は test よりも feat/fix を優先する
