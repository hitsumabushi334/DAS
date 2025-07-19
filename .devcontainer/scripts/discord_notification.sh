#!/bin/bash

# ロケール設定
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

INPUT=$(cat)

# トランスクリプトを処理（作業完了報告を含むメッセージを優先的に取得）
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path')
if [ -f "$TRANSCRIPT_PATH" ]; then
    # トランスクリプトファイルへの書き込み完了を待機（最大3秒）
    sleep 1.0

    # 最新の作業完了報告メッセージを探す（最新のものから順に検索）
    LAST_MESSAGE=""
    
    # 最新の10件のアシスタントメッセージから最新の作業完了報告を探す
    message_count=0
    while IFS= read -r line && [ "$message_count" -lt 10 ]; do
        if echo "$line" | jq -e '.type == "assistant"' >/dev/null 2>&1; then
            # テキストコンテンツを抽出
            message_content=$(echo "$line" | jq -r '.message.content[]? | select(.type == "text") | .text' 2>/dev/null)
            if [ -n "$message_content" ]; then
                message_count=$((message_count + 1))
                
                # 最新のメッセージを保持（最初に見つかったもの）
                if [ -z "$LAST_MESSAGE" ]; then
                    LAST_MESSAGE="$message_content"
                fi
                
                # 作業完了報告を含むメッセージが見つかったら即座に使用（最新のもの）
                if echo "$message_content" | grep -q "作業完了報告:"; then
                    LAST_MESSAGE="$message_content"
                    break
                fi
            fi
        fi
    done < <(tac "$TRANSCRIPT_PATH")
fi

# 作業内容を抽出する関数
extract_work_summary() {
    local message="$1"
    local work_summary=""
    
    # 作業完了報告の形式をチェック
    if echo "$message" | grep -q "作業完了報告:"; then
        # ---で始まり---で終わる作業完了報告を抽出
        work_summary=$(echo "$message" | sed -n '/^---$/,/^---$/p' | sed '1d;$d' | sed '/^作業完了報告:$/d')
    fi
    
    echo "$work_summary" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$'
}

# フックイベントタイプを抽出
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')

# 終了条件の確認（stop_hook_activeフラグのみチェック）
if [ "$stop_hook_active" = "true" ]; then
    exit 0
fi

# Discord Webhook URLの確認
WEBHOOK_URL="$DISCORD_WEBHOOK_URL"
if [ -z "$WEBHOOK_URL" ]; then
    exit 0
fi

# 作業内容の抽出
WORK_SUMMARY=""
if [ -n "$LAST_MESSAGE" ]; then
    WORK_SUMMARY=$(extract_work_summary "$LAST_MESSAGE")
fi

# 基本情報を収集
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
FULL_PATH=$(pwd)
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
USER=$(whoami)

# メッセージを作成
if [ "$HOOK_EVENT" = "Notification" ]; then
    MESSAGE="----------------------
🔔 **Claude が承認を求めています**

⏰ **時刻**: ${TIMESTAMP}
👤 **ユーザー**: ${USER}
📁 **作業場所**: ${FULL_PATH}
🌿 **ブランチ**: ${BRANCH}

📋 **操作の確認が必要です**"
else
    MESSAGE="--------------------------
🎯 **Claude Code 作業完了レポート**

${WORK_SUMMARY:+📋 **作業内容**:
${WORK_SUMMARY}

}⏰ **完了時刻**: ${TIMESTAMP}
👤 **ユーザー**: ${USER}
📁 **作業場所**: ${FULL_PATH}
🌿 **ブランチ**: ${BRANCH}

✨ **作業お疲れ様でした！**"
fi

# JSON生成とDiscord通知送信
JSON_PAYLOAD=$(jq -n --arg content "$MESSAGE" '{content: $content}')

# JSON形式を検証してDiscord通知を送信
if echo "$JSON_PAYLOAD" | jq . >/dev/null 2>&1; then
    curl -s -H "Content-Type: application/json" -X POST -d "$JSON_PAYLOAD" "$WEBHOOK_URL" >/dev/null 2>&1
fi
