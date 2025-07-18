#!/bin/bash

# ロケール設定を修正
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# デバッグログ
DEBUG_LOG="/tmp/discord-notification-debug.log"
echo "=== $(date) ===" >> "$DEBUG_LOG"
echo "Script started with LC_ALL=$LC_ALL" >> "$DEBUG_LOG"

if [ "$stop_hook_active" = "true" ]; then
    echo "stop_hook_active is true, exiting" >> "$DEBUG_LOG"
    exit 0
fi

WEBHOOK_URL="$DISCORD_WEBHOOK_URL"

if [ -z "$WEBHOOK_URL" ]; then
    echo "DISCORD_WEBHOOK_URL not set" >> "$DEBUG_LOG"
    exit 0
fi

# 詳細な情報を収集
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
WORKDIR=$(basename "$(pwd)")
FULL_PATH=$(pwd)
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
USER=$(whoami)
SESSION_DURATION=""

# セッション時間の計算（Claudeプロセスの開始時間から）
if command -v ps &> /dev/null; then
    CLAUDE_PID=$(ps aux | grep -E "claude|anthropic" | grep -v grep | head -1 | awk '{print $2}')
    if [ -n "$CLAUDE_PID" ]; then
        START_TIME=$(ps -o lstart= -p "$CLAUDE_PID" 2>/dev/null)
        if [ -n "$START_TIME" ]; then
            SESSION_DURATION="セッション開始: $START_TIME"
        fi
    fi
fi

# ファイル変更統計の取得
FILE_STATS=""
CHANGED_FILES=""
if command -v git &> /dev/null && git rev-parse --git-dir >/dev/null 2>&1; then
    echo "Git repository detected" >> "$DEBUG_LOG"
    
    # 最近のコミットと比較
    ADDED_FILES=$(git diff --name-only --diff-filter=A HEAD~1 HEAD 2>/dev/null | head -5)
    MODIFIED_FILES=$(git diff --name-only --diff-filter=M HEAD~1 HEAD 2>/dev/null | head -5)
    DELETED_FILES=$(git diff --name-only --diff-filter=D HEAD~1 HEAD 2>/dev/null | head -5)
    
    # 作業ディレクトリの変更
    UNSTAGED_FILES=$(git diff --name-only 2>/dev/null | head -5)
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null | head -5)
    
    # 統計情報
    TOTAL_COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    LAST_COMMIT=$(git log -1 --pretty=format:"%h %s" 2>/dev/null || echo "なし")
    
    if [ -n "$ADDED_FILES" ]; then
        FILE_STATS="${FILE_STATS}✅ 追加ファイル: $(echo "$ADDED_FILES" | tr '\n' ', ' | sed 's/, $//')\n"
    fi
    if [ -n "$MODIFIED_FILES" ]; then
        FILE_STATS="${FILE_STATS}✏️ 修正ファイル: $(echo "$MODIFIED_FILES" | tr '\n' ', ' | sed 's/, $//')\n"
    fi
    if [ -n "$DELETED_FILES" ]; then
        FILE_STATS="${FILE_STATS}❌ 削除ファイル: $(echo "$DELETED_FILES" | tr '\n' ', ' | sed 's/, $//')\n"
    fi
    if [ -n "$UNSTAGED_FILES" ]; then
        FILE_STATS="${FILE_STATS}🔄 未ステージ: $(echo "$UNSTAGED_FILES" | tr '\n' ', ' | sed 's/, $//')\n"
    fi
    if [ -n "$STAGED_FILES" ]; then
        FILE_STATS="${FILE_STATS}📝 ステージ済み: $(echo "$STAGED_FILES" | tr '\n' ', ' | sed 's/, $//')\n"
    fi
    
    CHANGED_FILES="📊 Git統計: ${TOTAL_COMMITS}コミット | 最新: ${LAST_COMMIT}"
else
    echo "Not a git repository, checking recent files" >> "$DEBUG_LOG"
    
    # Git以外の場合は最近変更されたファイルを取得
    RECENT_FILES=$(find . -maxdepth 3 -type f \( -name "*.py" -o -name "*.js" -o -name "*.sh" -o -name "*.md" -o -name "*.json" \) -mmin -60 2>/dev/null | head -5)
    if [ -n "$RECENT_FILES" ]; then
        FILE_STATS="📄 最近変更されたファイル:\n$(echo "$RECENT_FILES" | sed 's|^\./||' | tr '\n' ', ' | sed 's/, $//')"
    fi
fi

# システム情報
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' 2>/dev/null || echo "不明")
MEMORY_INFO=$(free -h | awk 'NR==2{print $3"/"$2}' 2>/dev/null || echo "不明")

# 詳細なメッセージを作成
MESSAGE="🎯 **Claude Code 作業完了レポート**

⏰ **完了時刻**: ${TIMESTAMP}
👤 **ユーザー**: ${USER}
📁 **作業場所**: ${FULL_PATH}
🌿 **ブランチ**: ${BRANCH}
${SESSION_DURATION:+⌛ **セッション**: ${SESSION_DURATION}}

📈 **システム情報**:
💾 ディスク使用量: ${DISK_USAGE}
🧠 メモリ使用量: ${MEMORY_INFO}

📊 **ファイル変更情報**:
${FILE_STATS:-"変更なし"}

${CHANGED_FILES}

✨ **作業お疲れ様でした！**"

echo "Detailed message prepared" >> "$DEBUG_LOG"
echo "Message length: ${#MESSAGE}" >> "$DEBUG_LOG"

# 安全なJSON生成（jqを使用）
if command -v jq &> /dev/null; then
    JSON_PAYLOAD=$(jq -n --arg content "$MESSAGE" '{content: $content}')
    echo "JSON created with jq" >> "$DEBUG_LOG"
else
    # 手動でJSON作成（特殊文字をエスケープ）
    SAFE_MESSAGE=$(echo "$MESSAGE" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\n/\\n/g; s/\r/\\r/g; s/\t/\\t/g')
    JSON_PAYLOAD="{\"content\":\"$SAFE_MESSAGE\"}"
    echo "JSON created manually" >> "$DEBUG_LOG"
fi

echo "JSON payload length: ${#JSON_PAYLOAD}" >> "$DEBUG_LOG"

# JSON形式を検証
if echo "$JSON_PAYLOAD" | jq . >/dev/null 2>&1; then
    echo "JSON validation passed" >> "$DEBUG_LOG"
else
    echo "JSON validation failed" >> "$DEBUG_LOG"
    exit 1
fi

# Discord通知の送信
RESPONSE=$(curl -s -H "Content-Type: application/json" -X POST -d "$JSON_PAYLOAD" "$WEBHOOK_URL" 2>&1)
CURL_EXIT=$?

echo "Curl exit code: $CURL_EXIT" >> "$DEBUG_LOG"
echo "Discord response: $RESPONSE" >> "$DEBUG_LOG"

# レスポンスをチェック
if [ $CURL_EXIT -eq 0 ] && ! echo "$RESPONSE" | grep -q '"code"'; then
    echo "Discord notification sent successfully" >> "$DEBUG_LOG"
    exit 0
else
    echo "Discord notification failed" >> "$DEBUG_LOG"
    exit 1
fi
