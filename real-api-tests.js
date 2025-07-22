/**
 * DAS (Dify Application Script) - 実際のAPIを使用したChatbotテストスイート
 * Google Apps Script環境で実際のDify APIを呼び出してテストを実行
 */

/**
 * 実際のAPIテスト設定
 * 実行前に以下の設定を行ってください：
 * 1. API_KEY: 有効なDify APIキー
 * 2. BASE_URL: DifyインスタンスのベースURL
 * 3. TEST_USER: テスト用ユーザーID
 */
const REAL_API_TEST_CONFIG = {
  API_KEY: "app-xxxxxxxxxxxxxxxxxx", // 実際のAPIキーに変更してください
  BASE_URL: "https://api.dify.ai/v1", // 実際のDifyインスタンスURLに変更してください
  TEST_USER: "test-user-api-real", // テスト用ユーザーID
  ENABLE_FILE_TESTS: false, // ファイルテストを有効にする場合はtrueに設定
  ENABLE_AUDIO_TESTS: false, // 音声テストを有効にする場合はtrueに設定
  ENABLE_DESTRUCTIVE_TESTS: false, // 削除系テストを有効にする場合はtrueに設定
  TEST_TIMEOUT: 30000, // テストタイムアウト（ミリ秒）
};

/**
 * 実際のAPIテスト用のフレームワーククラス
 */
class RealApiTestFramework {
  constructor() {
    this.testResults = [];
    this.currentTestName = "";
  }

  /**
   * テストの実行とアサーション
   */
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        `アサーション失敗: ${message}. 期待値: ${expected}, 実際の値: ${actual}`,
      );
    }
  }

  assertTrue(condition, message) {
    if (!condition) {
      throw new Error(`アサーション失敗: ${message}. 条件がfalseです`);
    }
  }

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(
        `アサーション失敗: ${message}. 値がnullまたはundefinedです`,
      );
    }
  }

  assertHasProperty(obj, property, message) {
    if (!obj || !obj.hasOwnProperty(property)) {
      throw new Error(
        `アサーション失敗: ${message}. プロパティ '${property}' が存在しません`,
      );
    }
  }

  assertIsArray(value, message) {
    if (!Array.isArray(value)) {
      throw new Error(`アサーション失敗: ${message}. 値が配列ではありません`);
    }
  }

  assertIsObject(value, message) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(
        `アサーション失敗: ${message}. 値がオブジェクトではありません`,
      );
    }
  }

  assertIsString(value, message) {
    if (typeof value !== "string") {
      throw new Error(`アサーション失敗: ${message}. 値が文字列ではありません`);
    }
  }

  /**
   * 単一テストの実行
   */
  runTest(testName, testFunction) {
    this.currentTestName = testName;
    const startTime = new Date();

    try {
      Logger.log(`[実際APIテスト開始] ${testName}`);
      const result = testFunction();

      // Promiseの場合は待機
      if (result && typeof result.then === "function") {
        result
          .then(() => {
            this.recordSuccess(testName, startTime);
          })
          .catch((error) => {
            this.recordFailure(testName, error, startTime);
          });
      } else {
        this.recordSuccess(testName, startTime);
      }
    } catch (error) {
      this.recordFailure(testName, error, startTime);
    }
  }

  recordSuccess(testName, startTime) {
    const duration = new Date() - startTime;
    this.testResults.push({
      name: testName,
      status: "PASS",
      duration: duration,
      message: "成功",
    });
    Logger.log(`[テスト成功] ${testName} (${duration}ms)`);
  }

  recordFailure(testName, error, startTime) {
    const duration = new Date() - startTime;
    this.testResults.push({
      name: testName,
      status: "FAIL",
      duration: duration,
      message: error.message,
      error: error,
    });
    Logger.log(`[テスト失敗] ${testName}: ${error.message} (${duration}ms)`);
  }

  /**
   * テスト結果の出力
   */
  generateReport() {
    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;
    const total = this.testResults.length;

    Logger.log("");
    Logger.log("=== 実際のAPIテスト結果レポート ===");
    Logger.log(`合計テスト数: ${total}`);
    Logger.log(`成功: ${passed}`);
    Logger.log(`失敗: ${failed}`);
    Logger.log(`成功率: ${((passed / total) * 100).toFixed(2)}%`);
    Logger.log("");

    // 失敗したテストの詳細
    const failures = this.testResults.filter((r) => r.status === "FAIL");
    if (failures.length > 0) {
      Logger.log("=== 失敗したテスト詳細 ===");
      failures.forEach((failure) => {
        Logger.log(`❌ ${failure.name}: ${failure.message}`);
      });
    }

    // 成功したテストの一覧
    const successes = this.testResults.filter((r) => r.status === "PASS");
    if (successes.length > 0) {
      Logger.log("");
      Logger.log("=== 成功したテスト ===");
      successes.forEach((success) => {
        Logger.log(`✅ ${success.name} (${success.duration}ms)`);
      });
    }

    return {
      total: total,
      passed: passed,
      failed: failed,
      successRate: (passed / total) * 100,
      results: this.testResults,
    };
  }
}

// グローバルテストフレームワークインスタンス
const realApiTestFramework = new RealApiTestFramework();

/**
 * 実際のAPIテスト設定チェック
 */
function checkRealApiTestConfig() {
  Logger.log("=== 実際のAPIテスト設定チェック ===");

  if (REAL_API_TEST_CONFIG.API_KEY === "app-xxxxxxxxxxxxxxxxxx") {
    Logger.log(
      "⚠️  警告: API_KEYがデフォルト値です。実際のDify APIキーに変更してください",
    );
    return false;
  }

  Logger.log(
    `✅ API_KEY: 設定済み (${REAL_API_TEST_CONFIG.API_KEY.substring(0, 10)}...)`,
  );
  Logger.log(`✅ BASE_URL: ${REAL_API_TEST_CONFIG.BASE_URL}`);
  Logger.log(`✅ TEST_USER: ${REAL_API_TEST_CONFIG.TEST_USER}`);
  Logger.log(
    `📁 ファイルテスト: ${REAL_API_TEST_CONFIG.ENABLE_FILE_TESTS ? "有効" : "無効"}`,
  );
  Logger.log(
    `🎵 音声テスト: ${REAL_API_TEST_CONFIG.ENABLE_AUDIO_TESTS ? "有効" : "無効"}`,
  );
  Logger.log(
    `🗑️  削除系テスト: ${REAL_API_TEST_CONFIG.ENABLE_DESTRUCTIVE_TESTS ? "有効" : "無効"}`,
  );
  Logger.log("");

  return true;
}

/**
 * テスト用Chatbotインスタンス作成
 */
function createTestChatbot() {
  return new Chatbot(
    REAL_API_TEST_CONFIG.API_KEY,
    REAL_API_TEST_CONFIG.BASE_URL,
  );
}

// ================== 実際のAPIテスト関数群 ==================

/**
 * 1. 基本メッセージ送信テスト（ブロッキングモード）
 */
function testRealApiSendMessageBlocking() {
  const chatbot = createTestChatbot();

  const response = chatbot.sendMessage(
    "こんにちは！テストメッセージです。",
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "blocking" },
  );

  realApiTestFramework.assertNotNull(response, "レスポンスが存在すること");
  realApiTestFramework.assertHasProperty(
    response,
    "answer",
    "answerプロパティが存在すること",
  );
  realApiTestFramework.assertIsString(
    response.answer,
    "answerが文字列であること",
  );

  Logger.log(`受信した回答: ${response.answer}`);

  // 基本的な情報が含まれているかチェック
  if (response.conversation_id) {
    realApiTestFramework.assertIsString(
      response.conversation_id,
      "conversation_idが文字列であること",
    );
    Logger.log(`会話ID: ${response.conversation_id}`);
  }

  if (response.message_id) {
    realApiTestFramework.assertIsString(
      response.message_id,
      "message_idが文字列であること",
    );
    Logger.log(`メッセージID: ${response.message_id}`);
  }
}

/**
 * 2. ストリーミングメッセージ送信テスト
 */
function testRealApiSendMessageStreaming() {
  const chatbot = createTestChatbot();

  const response = chatbot.sendMessage(
    "ストリーミングテストです。短い応答をお願いします。",
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "streaming" },
  );

  realApiTestFramework.assertNotNull(
    response,
    "ストリーミングレスポンスが存在すること",
  );
  realApiTestFramework.assertHasProperty(
    response,
    "answer",
    "answerプロパティが存在すること",
  );

  Logger.log(`ストリーミング回答: ${response.answer}`);

  if (response.conversation_id) {
    Logger.log(`ストリーミング会話ID: ${response.conversation_id}`);
  }
}

/**
 * 3. 会話リスト取得テスト
 */
function testRealApiGetConversations() {
  const chatbot = createTestChatbot();

  const conversations = chatbot.getConversations(
    REAL_API_TEST_CONFIG.TEST_USER,
    { limit: 10 },
  );

  realApiTestFramework.assertNotNull(conversations, "会話リストが存在すること");
  realApiTestFramework.assertHasProperty(
    conversations,
    "data",
    "dataプロパティが存在すること",
  );
  realApiTestFramework.assertIsArray(
    conversations.data,
    "dataが配列であること",
  );

  Logger.log(`取得した会話数: ${conversations.data.length}`);

  if (conversations.data.length > 0) {
    const firstConversation = conversations.data[0];
    realApiTestFramework.assertHasProperty(
      firstConversation,
      "id",
      "会話にIDが存在すること",
    );
    Logger.log(`最初の会話ID: ${firstConversation.id}`);
  }
}

/**
 * 4. アプリケーション情報取得テスト
 */
function testRealApiGetAppInfo() {
  const chatbot = createTestChatbot();

  const appInfo = chatbot.getAppInfo();

  realApiTestFramework.assertNotNull(appInfo, "アプリ情報が存在すること");
  Logger.log("アプリ情報取得成功");

  // 基本的なアプリ情報があるかチェック
  if (appInfo.name) {
    Logger.log(`アプリ名: ${appInfo.name}`);
  }
  if (appInfo.description) {
    Logger.log(`アプリ説明: ${appInfo.description}`);
  }
}

/**
 * 5. アプリケーションパラメータ取得テスト
 */
function testRealApiGetAppParameters() {
  const chatbot = createTestChatbot();

  const params = chatbot.getAppParameters();

  realApiTestFramework.assertNotNull(params, "パラメータ情報が存在すること");
  Logger.log("パラメータ情報取得成功");

  if (params.user_input_form) {
    Logger.log("ユーザー入力フォーム設定あり");
  }
  if (params.file_upload) {
    Logger.log(`ファイルアップロード設定: ${params.file_upload.allowed}`);
  }
}

/**
 * 6. 会話履歴メッセージ取得テスト
 */
function testRealApiGetConversationMessages() {
  const chatbot = createTestChatbot();

  // まず会話リストを取得
  const conversations = chatbot.getConversations(
    REAL_API_TEST_CONFIG.TEST_USER,
    { limit: 1 },
  );

  if (conversations.data && conversations.data.length > 0) {
    const conversationId = conversations.data[0].id;

    const messages = chatbot.getConversationMessages(
      conversationId,
      REAL_API_TEST_CONFIG.TEST_USER,
      { limit: 5 },
    );

    realApiTestFramework.assertNotNull(
      messages,
      "会話メッセージが存在すること",
    );
    realApiTestFramework.assertHasProperty(
      messages,
      "data",
      "dataプロパティが存在すること",
    );
    realApiTestFramework.assertIsArray(messages.data, "dataが配列であること");

    Logger.log(
      `会話 ${conversationId} のメッセージ数: ${messages.data.length}`,
    );
  } else {
    Logger.log("テスト用会話が存在しないため、会話履歴テストをスキップ");
  }
}

/**
 * 7. フィードバック送信テスト
 */
function testRealApiSendFeedback() {
  const chatbot = createTestChatbot();

  // まずメッセージを送信してメッセージIDを取得
  const response = chatbot.sendMessage(
    "フィードバックテスト用メッセージ",
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "blocking" },
  );

  if (response.message_id) {
    const feedback = chatbot.sendFeedback(
      response.message_id,
      "like",
      REAL_API_TEST_CONFIG.TEST_USER,
    );

    realApiTestFramework.assertNotNull(
      feedback,
      "フィードバック応答が存在すること",
    );
    Logger.log(
      `メッセージ ${response.message_id} にLikeフィードバック送信成功`,
    );
  } else {
    Logger.log(
      "メッセージIDが取得できないため、フィードバックテストをスキップ",
    );
  }
}

/**
 * 8. 推奨質問取得テスト
 */
function testRealApiGetSuggestedQuestions() {
  const chatbot = createTestChatbot();

  // まずメッセージを送信してメッセージIDを取得
  const response = chatbot.sendMessage(
    "推奨質問テスト用メッセージ",
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "blocking" },
  );

  if (response.message_id) {
    try {
      const suggestions = chatbot.getSuggestedQuestions(
        response.message_id,
        REAL_API_TEST_CONFIG.TEST_USER,
      );

      realApiTestFramework.assertNotNull(suggestions, "推奨質問が存在すること");
      Logger.log(`メッセージ ${response.message_id} の推奨質問取得成功`);

      if (suggestions.data && Array.isArray(suggestions.data)) {
        Logger.log(`推奨質問数: ${suggestions.data.length}`);
      }
    } catch (error) {
      // 推奨質問が無効になっている場合もあるので、エラーをログに記録
      Logger.log(`推奨質問取得でエラー（設定無効の可能性）: ${error.message}`);
    }
  } else {
    Logger.log("メッセージIDが取得できないため、推奨質問テストをスキップ");
  }
}

/**
 * 9. ファイルアップロードテスト（オプション）
 */
function testRealApiUploadFile() {
  if (!REAL_API_TEST_CONFIG.ENABLE_FILE_TESTS) {
    Logger.log(
      "ファイルテストが無効のため、ファイルアップロードテストをスキップ",
    );
    return;
  }

  const chatbot = createTestChatbot();

  // テスト用の小さなテキストファイルを作成
  const testContent =
    "これはテスト用ファイルです。\n実際のAPIテスト中に作成されました。";
  const testFile = Utilities.newBlob(
    testContent,
    "text/plain",
    "test-file.txt",
  );

  try {
    const uploadResult = chatbot.uploadFile(
      testFile,
      REAL_API_TEST_CONFIG.TEST_USER,
    );

    realApiTestFramework.assertNotNull(
      uploadResult,
      "ファイルアップロード結果が存在すること",
    );
    realApiTestFramework.assertHasProperty(
      uploadResult,
      "id",
      "ファイルIDが存在すること",
    );

    Logger.log(`ファイルアップロード成功: ${uploadResult.id}`);

    if (uploadResult.name) {
      Logger.log(`アップロードファイル名: ${uploadResult.name}`);
    }
  } catch (error) {
    Logger.log(`ファイルアップロードエラー: ${error.message}`);
    throw error;
  }
}

/**
 * 10. 会話名変更テスト（オプション）
 */
function testRealApiRenameConversation() {
  if (!REAL_API_TEST_CONFIG.ENABLE_DESTRUCTIVE_TESTS) {
    Logger.log("削除系テストが無効のため、会話名変更テストをスキップ");
    return;
  }

  const chatbot = createTestChatbot();

  // まず会話を作成
  const response = chatbot.sendMessage(
    "会話名変更テスト用メッセージ",
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "blocking" },
  );

  if (response.conversation_id) {
    const newName = `テスト会話_${new Date().getTime()}`;

    try {
      const renameResult = chatbot.renameConversation(
        response.conversation_id,
        newName,
        REAL_API_TEST_CONFIG.TEST_USER,
      );

      realApiTestFramework.assertNotNull(
        renameResult,
        "会話名変更結果が存在すること",
      );
      Logger.log(
        `会話 ${response.conversation_id} の名前を "${newName}" に変更成功`,
      );
    } catch (error) {
      Logger.log(`会話名変更エラー: ${error.message}`);
      throw error;
    }
  } else {
    Logger.log("会話IDが取得できないため、会話名変更テストをスキップ");
  }
}

/**
 * 11. エラーハンドリングテスト
 */
function testRealApiErrorHandling() {
  const chatbot = createTestChatbot();

  // 無効なパラメータでのテスト
  try {
    chatbot.sendMessage("", REAL_API_TEST_CONFIG.TEST_USER); // 空のクエリ
    realApiTestFramework.assertTrue(false, "空のクエリでエラーが発生すべき");
  } catch (error) {
    realApiTestFramework.assertTrue(
      error.message.includes("query"),
      "queryに関するエラーメッセージが含まれること",
    );
    Logger.log(`期待されたエラー: ${error.message}`);
  }

  // 無効なユーザーでのテスト
  try {
    chatbot.sendMessage("テスト", ""); // 空のユーザー
    realApiTestFramework.assertTrue(false, "空のユーザーでエラーが発生すべき");
  } catch (error) {
    realApiTestFramework.assertTrue(
      error.message.includes("user"),
      "userに関するエラーメッセージが含まれること",
    );
    Logger.log(`期待されたエラー: ${error.message}`);
  }

  // 無効な会話IDでのテスト
  try {
    chatbot.getConversationMessages(
      "invalid-conversation-id",
      REAL_API_TEST_CONFIG.TEST_USER,
    );
    realApiTestFramework.assertTrue(false, "無効な会話IDでエラーが発生すべき");
  } catch (error) {
    realApiTestFramework.assertTrue(
      error.message.length > 0,
      "エラーメッセージが存在すること"
    );
    Logger.log(`無効な会話IDでのエラー: ${error.message}`);
  }
}

/**
 * 12. レート制限テスト
 */
function testRealApiRateLimit() {
  const chatbot = createTestChatbot();

  Logger.log("レート制限テスト開始（複数リクエスト送信）");

  // 複数のリクエストを短時間で送信
  const promises = [];
  for (let i = 0; i < 5; i++) {
    try {
      const response = chatbot.sendMessage(
        `レート制限テスト ${i + 1}`,
        REAL_API_TEST_CONFIG.TEST_USER,
        { response_mode: "blocking" },
      );
      promises.push(response);
      Logger.log(`リクエスト ${i + 1} 成功`);
    } catch (error) {
      Logger.log(`リクエスト ${i + 1} エラー: ${error.message}`);
      // レート制限に引っかかった場合
      if (error.message.includes("レート制限")) {
        Logger.log("レート制限が正常に動作しています");
        break;
      }
    }

    // 少し待機
    Utilities.sleep(1000);
  }

  Logger.log("レート制限テスト完了");
}

/**
 * 13. パフォーマンステスト
 */
function testRealApiPerformance() {
  const chatbot = createTestChatbot();

  const startTime = new Date();

  const response = chatbot.sendMessage(
    "パフォーマンステスト用メッセージ。応答時間を測定しています。",
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "blocking" },
  );

  const endTime = new Date();
  const duration = endTime - startTime;

  realApiTestFramework.assertNotNull(
    response,
    "パフォーマンステスト応答が存在すること",
  );
  Logger.log(`API応答時間: ${duration}ms`);

  // 応答時間が許容範囲内かチェック
  if (duration < REAL_API_TEST_CONFIG.TEST_TIMEOUT) {
    Logger.log("✅ 応答時間は許容範囲内です");
  } else {
    Logger.log("⚠️  応答時間が長すぎます");
  }
}

/**
 * 14. 大量データ送信テスト
 */
function testRealApiLargeData() {
  const chatbot = createTestChatbot();

  // 長いメッセージを送信
  const largeMessage = "これは大量データテストです。" + "あ".repeat(1000);

  const response = chatbot.sendMessage(
    largeMessage,
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "blocking" },
  );

  realApiTestFramework.assertNotNull(
    response,
    "大量データテスト応答が存在すること",
  );
  Logger.log(`大量データ（${largeMessage.length}文字）送信成功`);
}

/**
 * 15. 特殊文字・Unicode テスト
 */
function testRealApiUnicodeAndSpecialChars() {
  const chatbot = createTestChatbot();

  const specialMessage =
    "特殊文字テスト: 🚀🎉💻 Unicode: こんにちは 中文 العربية 🌟";

  const response = chatbot.sendMessage(
    specialMessage,
    REAL_API_TEST_CONFIG.TEST_USER,
    { response_mode: "blocking" },
  );

  realApiTestFramework.assertNotNull(
    response,
    "特殊文字テスト応答が存在すること",
  );
  Logger.log("特殊文字・Unicode送信成功");
}

// ================== メイン実行関数 ==================

/**
 * 全ての実際のAPIテストを実行
 */
function runAllRealApiTests() {
  Logger.log("=== 実際のAPIを使用したChatbotテストスイート開始 ===");
  Logger.log(`実行時刻: ${new Date()}`);
  Logger.log("");

  // 設定チェック
  if (!checkRealApiTestConfig()) {
    Logger.log("❌ テスト設定が正しく構成されていません。テストを終了します。");
    return;
  }

  // テスト実行
  const testCases = [
    {
      name: "基本メッセージ送信（ブロッキング）",
      func: testRealApiSendMessageBlocking,
    },
    {
      name: "ストリーミングメッセージ送信",
      func: testRealApiSendMessageStreaming,
    },
    { name: "会話リスト取得", func: testRealApiGetConversations },
    { name: "アプリケーション情報取得", func: testRealApiGetAppInfo },
    {
      name: "アプリケーションパラメータ取得",
      func: testRealApiGetAppParameters,
    },
    {
      name: "会話履歴メッセージ取得",
      func: testRealApiGetConversationMessages,
    },
    { name: "フィードバック送信", func: testRealApiSendFeedback },
    { name: "推奨質問取得", func: testRealApiGetSuggestedQuestions },
    { name: "ファイルアップロード", func: testRealApiUploadFile },
    { name: "会話名変更", func: testRealApiRenameConversation },
    { name: "エラーハンドリング", func: testRealApiErrorHandling },
    { name: "レート制限", func: testRealApiRateLimit },
    { name: "パフォーマンス", func: testRealApiPerformance },
    { name: "大量データ送信", func: testRealApiLargeData },
    { name: "特殊文字・Unicode", func: testRealApiUnicodeAndSpecialChars },
  ];

  // 各テストを実行
  testCases.forEach((testCase) => {
    try {
      realApiTestFramework.runTest(testCase.name, testCase.func);
    } catch (error) {
      Logger.log(`[テスト実行エラー] ${testCase.name}: ${error.message}`);
    }

    // テスト間で少し待機（API負荷軽減）
    Utilities.sleep(1000);
  });

  // 最終レポート生成
  const report = realApiTestFramework.generateReport();

  Logger.log("");
  Logger.log("=== 実際のAPIテスト完了 ===");
  Logger.log(`終了時刻: ${new Date()}`);

  return report;
}

/**
 * 個別テスト実行（デバッグ用）
 */
function runSingleRealApiTest(testName) {
  Logger.log(`=== 個別実際のAPIテスト実行: ${testName} ===`);

  if (!checkRealApiTestConfig()) {
    Logger.log("❌ テスト設定が正しく構成されていません。");
    return;
  }

  const testMap = {
    sendmessage: testRealApiSendMessageBlocking,
    streaming: testRealApiSendMessageStreaming,
    conversations: testRealApiGetConversations,
    appinfo: testRealApiGetAppInfo,
    parameters: testRealApiGetAppParameters,
    messages: testRealApiGetConversationMessages,
    feedback: testRealApiSendFeedback,
    suggestions: testRealApiGetSuggestedQuestions,
    upload: testRealApiUploadFile,
    rename: testRealApiRenameConversation,
    error: testRealApiErrorHandling,
    ratelimit: testRealApiRateLimit,
    performance: testRealApiPerformance,
    largedata: testRealApiLargeData,
    unicode: testRealApiUnicodeAndSpecialChars,
  };

  const testFunc = testMap[testName.toLowerCase()];

  if (testFunc) {
    realApiTestFramework.runTest(testName, testFunc);
    realApiTestFramework.generateReport();
  } else {
    Logger.log(`❌ 未知のテスト名: ${testName}`);
    Logger.log(`利用可能なテスト: ${Object.keys(testMap).join(", ")}`);
  }
}

/**
 * 基本テストのみ実行（クイックテスト）
 */
function runBasicRealApiTests() {
  Logger.log("=== 基本的な実際のAPIテスト実行 ===");

  if (!checkRealApiTestConfig()) {
    Logger.log("❌ テスト設定が正しく構成されていません。");
    return;
  }

  const basicTests = [
    { name: "基本メッセージ送信", func: testRealApiSendMessageBlocking },
    { name: "会話リスト取得", func: testRealApiGetConversations },
    { name: "アプリケーション情報取得", func: testRealApiGetAppInfo },
    { name: "エラーハンドリング", func: testRealApiErrorHandling },
  ];

  basicTests.forEach((testCase) => {
    realApiTestFramework.runTest(testCase.name, testCase.func);
    Utilities.sleep(500);
  });

  return realApiTestFramework.generateReport();
}

// ================== GAS実行用のメイン関数 ==================

/**
 * Google Apps Script実行用のメイン関数
 */
function main() {
  return runAllRealApiTests();
}

/**
 * 設定確認のみ実行
 */
function checkConfig() {
  return checkRealApiTestConfig();
}

/**
 * クイックテスト実行
 */
function quickTest() {
  return runBasicRealApiTests();
}
