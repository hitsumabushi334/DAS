/**
 * DAS (Dify Application Script) - 実際のAPIを使用したChatflowテストスイート
 * Google Apps Script環境で実際のDify APIを呼び出してテストを実行
 */

/**
 * 実際のAPIテスト設定
 * 実行前に以下の設定を行ってください：
 * 1. API_KEY: 有効なDify APIキー
 * 2. BASE_URL: DifyインスタンスのベースURL
 * 3. TEST_USER: テスト用ユーザーID
 */
const REAL_API_TEST_CONFIG_CHATFLOW = {
  API_KEY: PropertiesService.getScriptProperties().getProperty("DIFY_CHATFLOW_API_KEY"), // 実際のAPIキーに変更してください
  BASE_URL: "https://api.dify.ai/v1", // 実際のDifyインスタンスURLに変更してください
  TEST_USER: "test-user-chatflow-real", // テスト用ユーザーID
  ENABLE_FILE_TESTS: true, // ファイルテストを有効にする場合はtrueに設定
  ENABLE_AUDIO_TESTS: true, // 音声テストを有効にする場合はtrueに設定
  ENABLE_DESTRUCTIVE_TESTS: true, // 削除系テストを有効にする場合はtrueに設定
  TEST_TIMEOUT: 30000, // テストタイムアウト（ミリ秒）
};

/**
 * 実際のAPIテスト用のフレームワーククラス
 */
class RealApiTestFrameworkChatflow {
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
      Logger.log(`[Chatflow実際APIテスト開始] ${testName}`);
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
    Logger.log(`[Chatflowテスト成功] ${testName} (${duration}ms)`);
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
    Logger.log(
      `[Chatflowテスト失敗] ${testName}: ${error.message} (${duration}ms)`,
    );
  }

  /**
   * テスト結果の出力
   */
  generateReport() {
    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;
    const total = this.testResults.length;

    Logger.log("");
    Logger.log("=== Chatflow実際のAPIテスト結果レポート ===");
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
const realApiTestFrameworkChatflow = new RealApiTestFrameworkChatflow();

/**
 * 実際のAPIテスト設定チェック
 */
function checkRealApiTestConfigChatflow() {
  Logger.log("=== Chatflow実際のAPIテスト設定チェック ===");

  if (REAL_API_TEST_CONFIG_CHATFLOW.API_KEY === "app-xxxxxxxxxxxxxxxxxx") {
    Logger.log(
      "⚠️  警告: API_KEYがデフォルト値です。実際のDify APIキーに変更してください",
    );
    return false;
  }

  Logger.log(
    `✅ API_KEY: 設定済み (${REAL_API_TEST_CONFIG_CHATFLOW.API_KEY.substring(0, 10)}...)`,
  );
  Logger.log(`✅ BASE_URL: ${REAL_API_TEST_CONFIG_CHATFLOW.BASE_URL}`);
  Logger.log(`✅ TEST_USER: ${REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER}`);
  Logger.log(
    `📁 ファイルテスト: ${
      REAL_API_TEST_CONFIG_CHATFLOW.ENABLE_FILE_TESTS ? "有効" : "無効"
    }`,
  );
  Logger.log(
    `🎵 音声テスト: ${
      REAL_API_TEST_CONFIG_CHATFLOW.ENABLE_AUDIO_TESTS ? "有効" : "無効"
    }`,
  );
  Logger.log(
    `🗑️  削除系テスト: ${
      REAL_API_TEST_CONFIG_CHATFLOW.ENABLE_DESTRUCTIVE_TESTS ? "有効" : "無効"
    }`,
  );
  Logger.log("");

  return true;
}

/**
 * テスト用Chatflowインスタンス作成
 */
function createTestChatflow() {
  return new Chatflow(
    REAL_API_TEST_CONFIG_CHATFLOW.API_KEY,
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    REAL_API_TEST_CONFIG_CHATFLOW.BASE_URL,
  );
}

// ================== 実際のAPIテスト関数群 ==================

/**
 * 1. 基本メッセージ送信テスト（ブロッキングモード）
 */
function testRealApiChatflowSendMessageBlocking() {
  const chatflow = createTestChatflow();

  const response = chatflow.sendMessage(
    "こんにちは！Chatflowテストメッセージです。",
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  realApiTestFrameworkChatflow.assertNotNull(
    response,
    "レスポンスが存在すること",
  );
  realApiTestFrameworkChatflow.assertHasProperty(
    response,
    "answer",
    "answerプロパティが存在すること",
  );
  realApiTestFrameworkChatflow.assertIsString(
    response.answer,
    "answerが文字列であること",
  );

  Logger.log(`受信した回答: ${response.answer}`);

  // 基本的な情報が含まれているかチェック
  if (response.conversation_id) {
    realApiTestFrameworkChatflow.assertIsString(
      response.conversation_id,
      "conversation_idが文字列であること",
    );
    Logger.log(`会話ID: ${response.conversation_id}`);
  }

  if (response.message_id) {
    realApiTestFrameworkChatflow.assertIsString(
      response.message_id,
      "message_idが文字列であること",
    );
    Logger.log(`メッセージID: ${response.message_id}`);
  }
}

/**
 * 2. ストリーミングメッセージ送信テスト
 */
function testRealApiChatflowSendMessageStreaming() {
  const chatflow = createTestChatflow();

  const response = chatflow.sendMessage(
    "Chatflowストリーミングテストです。短い応答をお願いします。",
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "streaming" },
  );

  realApiTestFrameworkChatflow.assertNotNull(
    response,
    "ストリーミングレスポンスが存在すること",
  );
  realApiTestFrameworkChatflow.assertHasProperty(
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
function testRealApiChatflowGetConversations() {
  const chatflow = createTestChatflow();

  const conversations = chatflow.getConversations(
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { limit: 10 },
  );

  realApiTestFrameworkChatflow.assertNotNull(
    conversations,
    "会話リストが存在すること",
  );
  realApiTestFrameworkChatflow.assertHasProperty(
    conversations,
    "data",
    "dataプロパティが存在すること",
  );
  realApiTestFrameworkChatflow.assertIsArray(
    conversations.data,
    "dataが配列であること",
  );

  Logger.log(`取得した会話数: ${conversations.data.length}`);

  if (conversations.data.length > 0) {
    const firstConversation = conversations.data[0];
    realApiTestFrameworkChatflow.assertHasProperty(
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
function testRealApiChatflowGetAppInfo() {
  const chatflow = createTestChatflow();

  const appInfo = chatflow.getAppInfo();

  realApiTestFrameworkChatflow.assertNotNull(
    appInfo,
    "アプリ情報が存在すること",
  );
  Logger.log("Chatflowアプリ情報取得成功");

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
function testRealApiChatflowGetAppParameters() {
  const chatflow = createTestChatflow();

  const params = chatflow.getAppParameters();

  realApiTestFrameworkChatflow.assertNotNull(
    params,
    "パラメータ情報が存在すること",
  );
  Logger.log("Chatflowパラメータ情報取得成功");

  if (params.user_input_form) {
    Logger.log("ユーザー入力フォーム設定あり");
    Logger.log(
      `テキスト入力設定: ${params.user_input_form.text_input?.variable || "なし"}`,
    );
    Logger.log(
      `段落入力設定: ${params.user_input_form.paragraph?.variable || "なし"}`,
    );
    Logger.log(
      `選択入力設定: ${params.user_input_form.select?.variable || "なし"}`,
    );
  }
  if (params.file_upload) {
    Logger.log(
      `ファイルアップロード設定: 画像アップロード=${
        params.file_upload.image?.enabled || false
      }`,
    );
    Logger.log(
      `ファイルアップロード設定: ドキュメントアップロード=${
        params.file_upload.document?.enabled || false
      }`,
    );
    Logger.log(
      `ファイルアップロード設定: 音声アップロード=${
        params.file_upload.audio?.enabled || false
      }`,
    );
    Logger.log(
      `ファイルアップロード設定: ビデオアップロード=${
        params.file_upload.video?.enabled || false
      }`,
    );
    Logger.log(`カスタム設定：${params.custom?.enabled || false}`);
  }
}

/**
 * 6. 会話履歴メッセージ取得テスト
 */
function testRealApiChatflowGetConversationMessages() {
  const chatflow = createTestChatflow();

  // まず会話リストを取得
  const conversations = chatflow.getConversations(
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { limit: 1 },
  );

  if (conversations.data && conversations.data.length > 0) {
    const conversationId = conversations.data[0].id;

    const messages = chatflow.getConversationMessages(
      conversationId,
      REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
      { limit: 5 },
    );

    realApiTestFrameworkChatflow.assertNotNull(
      messages,
      "会話メッセージが存在すること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      messages,
      "data",
      "dataプロパティが存在すること",
    );
    realApiTestFrameworkChatflow.assertIsArray(
      messages.data,
      "dataが配列であること",
    );

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
function testRealApiChatflowSendFeedback() {
  const chatflow = createTestChatflow();

  // まずメッセージを送信してメッセージIDを取得
  const response = chatflow.sendMessage(
    "Chatflowフィードバックテスト用メッセージ",
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  if (response.message_id) {
    const feedback = chatflow.sendFeedback(
      response.message_id,
      "like",
      REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
      "This is a test feedback content for Chatflow",
    );

    realApiTestFrameworkChatflow.assertNotNull(
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
function testRealApiChatflowGetSuggestedQuestions() {
  const chatflow = createTestChatflow();

  // まずメッセージを送信してメッセージIDを取得
  const response = chatflow.sendMessage(
    "Chatflow推奨質問テスト用メッセージ",
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  if (response.message_id) {
    try {
      const suggestions = chatflow.getSuggestedQuestions(
        response.message_id,
        REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
      );

      realApiTestFrameworkChatflow.assertNotNull(
        suggestions,
        "推奨質問が存在すること",
      );
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
function testRealApiChatflowUploadFile() {
  if (!REAL_API_TEST_CONFIG_CHATFLOW.ENABLE_FILE_TESTS) {
    Logger.log(
      "ファイルテストが無効のため、Chatflowファイルアップロードテストをスキップ",
    );
    return;
  }

  const chatflow = createTestChatflow();

  // テスト用の小さなテキストファイルを作成
  const testContent =
    "これはChatflowテスト用ファイルです。\n実際のAPIテスト中に作成されました。";
  const testFile = Utilities.newBlob(
    testContent,
    "text/plain",
    "chatflow-test-file.txt",
  );

  try {
    const uploadResult = chatflow.uploadFile(
      testFile,
      REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    );

    realApiTestFrameworkChatflow.assertNotNull(
      uploadResult,
      "ファイルアップロード結果が存在すること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      uploadResult,
      "id",
      "ファイルIDが存在すること",
    );

    Logger.log(`Chatflowファイルアップロード成功: ${uploadResult.id}`);

    if (uploadResult.name) {
      Logger.log(`アップロードファイル名: ${uploadResult.name}`);
    }
  } catch (error) {
    Logger.log(`Chatflowファイルアップロードエラー: ${error.message}`);
    throw error;
  }
}

/**
 * 10. 会話名変更テスト（オプション）
 */
function testRealApiChatflowRenameConversation() {
  if (!REAL_API_TEST_CONFIG_CHATFLOW.ENABLE_DESTRUCTIVE_TESTS) {
    Logger.log("削除系テストが無効のため、Chatflow会話名変更テストをスキップ");
    return;
  }

  const chatflow = createTestChatflow();

  // まず会話を作成
  const response = chatflow.sendMessage(
    "Chatflow会話名変更テスト用メッセージ",
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  if (response.conversation_id) {
    const newName = `Chatflowテスト会話_${new Date().getTime()}`;

    try {
      const renameResult = chatflow.renameConversation(
        response.conversation_id,
        newName,
        REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
      );

      realApiTestFrameworkChatflow.assertNotNull(
        renameResult,
        "会話名変更結果が存在すること",
      );
      Logger.log(
        `会話 ${response.conversation_id} の名前を "${newName}" に変更成功`,
      );
    } catch (error) {
      Logger.log(`Chatflow会話名変更エラー: ${error.message}`);
      throw error;
    }
  } else {
    Logger.log("会話IDが取得できないため、会話名変更テストをスキップ");
  }
}

/**
 * 11. エラーハンドリングテスト
 */
function testRealApiChatflowErrorHandling() {
  const chatflow = createTestChatflow();

  // 無効なパラメータでのテスト
  try {
    chatflow.sendMessage("", REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER); // 空のクエリ
    realApiTestFrameworkChatflow.assertTrue(
      false,
      "空のクエリでエラーが発生すべき",
    );
  } catch (error) {
    realApiTestFrameworkChatflow.assertTrue(
      error.message.includes("query"),
      "queryに関するエラーメッセージが含まれること",
    );
    Logger.log(`期待されたエラー: ${error.message}`);
  }


  // 無効な会話IDでのテスト
  try {
    chatflow.getConversationMessages(
      "invalid-conversation-id",
      REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    );
    realApiTestFrameworkChatflow.assertTrue(
      false,
      "無効な会話IDでエラーが発生すべき",
    );
  } catch (error) {
    realApiTestFrameworkChatflow.assertTrue(
      error.message.length > 0,
      "エラーメッセージが存在すること",
    );
    Logger.log(`無効な会話IDでのエラー: ${error.message}`);
  }
}

/**
 * 12. レート制限テスト
 */
function testRealApiChatflowRateLimit() {
  const chatflow = createTestChatflow();

  Logger.log("Chatflowレート制限テスト開始（複数リクエスト送信）");

  // 複数のリクエストを短時間で送信
  const promises = [];
  for (let i = 0; i < 5; i++) {
    try {
      const response = chatflow.sendMessage(
        `Chatflowレート制限テスト ${i + 1}`,
        REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
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

  Logger.log("Chatflowレート制限テスト完了");
}

/**
 * 13. パフォーマンステスト
 */
function testRealApiChatflowPerformance() {
  const chatflow = createTestChatflow();

  const startTime = new Date();

  const response = chatflow.sendMessage(
    "Chatflowパフォーマンステスト用メッセージ。応答時間を測定しています。",
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  const endTime = new Date();
  const duration = endTime - startTime;

  realApiTestFrameworkChatflow.assertNotNull(
    response,
    "パフォーマンステスト応答が存在すること",
  );
  Logger.log(`ChatflowAPI応答時間: ${duration}ms`);

  // 応答時間が許容範囲内かチェック
  if (duration < REAL_API_TEST_CONFIG_CHATFLOW.TEST_TIMEOUT) {
    Logger.log("✅ 応答時間は許容範囲内です");
  } else {
    Logger.log("⚠️  応答時間が長すぎます");
  }
}

/**
 * 14. 大量データ送信テスト
 */
function testRealApiChatflowLargeData() {
  const chatflow = createTestChatflow();

  // 長いメッセージを送信
  const largeMessage =
    "これはChatflow大量データテストです。" + "あ".repeat(1000);

  const response = chatflow.sendMessage(
    largeMessage,
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  realApiTestFrameworkChatflow.assertNotNull(
    response,
    "大量データテスト応答が存在すること",
  );
  Logger.log(`Chatflow大量データ（${largeMessage.length}文字）送信成功`);
}

/**
 * 15. 特殊文字・Unicode テスト
 */
function testRealApiChatflowUnicodeAndSpecialChars() {
  const chatflow = createTestChatflow();

  const specialMessage =
    "Chatflow特殊文字テスト: 🚀🎉💻 Unicode: こんにちは 中文 العربية 🌟";

  const response = chatflow.sendMessage(
    specialMessage,
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  realApiTestFrameworkChatflow.assertNotNull(
    response,
    "特殊文字テスト応答が存在すること",
  );
  Logger.log("Chatflow特殊文字・Unicode送信成功");
}

/**
 * 16. インスタンスプロパティ保持確認テスト
 */
function testRealApiChatflowInstancePropertyRetention() {
  const chatflow = createTestChatflow();

  // インスタンス作成後の基本プロパティ確認
  realApiTestFrameworkChatflow.assertNotNull(
    chatflow.apiKey,
    "apiKeyプロパティが保持されていること",
  );
  realApiTestFrameworkChatflow.assertNotNull(
    chatflow.baseUrl,
    "baseUrlプロパティが保持されていること",
  );
  realApiTestFrameworkChatflow.assertEqual(
    chatflow.baseUrl,
    REAL_API_TEST_CONFIG_CHATFLOW.BASE_URL,
    "baseUrlが正しく設定されていること",
  );

  // キャッシュプロパティの確認
  realApiTestFrameworkChatflow.assertNotNull(
    chatflow._cache,
    "キャッシュプロパティが初期化されていること",
  );
  realApiTestFrameworkChatflow.assertIsObject(
    chatflow._cache,
    "キャッシュがオブジェクト型であること",
  );
  realApiTestFrameworkChatflow.assertEqual(
    chatflow._cacheTimeout,
    5 * 60 * 1000,
    "キャッシュタイムアウトが正しく設定されていること",
  );

  // レート制限プロパティの確認
  realApiTestFrameworkChatflow.assertNotNull(
    chatflow._rateLimitRequests,
    "レート制限配列が初期化されていること",
  );
  realApiTestFrameworkChatflow.assertIsArray(
    chatflow._rateLimitRequests,
    "レート制限配列が配列型であること",
  );
  realApiTestFrameworkChatflow.assertEqual(
    chatflow._rateLimitWindow,
    60 * 1000,
    "レート制限ウィンドウが正しく設定されていること",
  );
  realApiTestFrameworkChatflow.assertEqual(
    chatflow._rateLimitMax,
    60,
    "レート制限最大値が正しく設定されていること",
  );

  // アプリケーション機能プロパティの確認（初期化後）
  if (chatflow.features) {
    realApiTestFrameworkChatflow.assertIsObject(
      chatflow.features,
      "featuresプロパティがオブジェクト型であること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      chatflow.features,
      "speechToText",
      "speechToText機能フラグが存在すること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      chatflow.features,
      "textToSpeech",
      "textToSpeech機能フラグが存在すること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      chatflow.features,
      "fileUpload",
      "fileUpload機能フラグが存在すること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      chatflow.features,
      "suggestedQuestionsAfterAnswer",
      "suggestedQuestionsAfterAnswer機能フラグが存在すること",
    );
  }

  // ユーザー入力フォーム設定の確認
  if (chatflow.userInput) {
    realApiTestFrameworkChatflow.assertIsObject(
      chatflow.userInput,
      "userInputプロパティがオブジェクト型であること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      chatflow.userInput,
      "text_input",
      "text_input設定が存在すること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      chatflow.userInput,
      "paragraph",
      "paragraph設定が存在すること",
    );
    realApiTestFrameworkChatflow.assertHasProperty(
      chatflow.userInput,
      "select",
      "select設定が存在すること",
    );
  }

  // システムパラメータの確認
  if (chatflow.systemParameters) {
    realApiTestFrameworkChatflow.assertIsObject(
      chatflow.systemParameters,
      "systemParametersプロパティがオブジェクト型であること",
    );
  }

  // メッセージ送信後のプロパティ維持確認
  const response = chatflow.sendMessage(
    "Chatflowプロパティ保持テスト用メッセージ",
    REAL_API_TEST_CONFIG_CHATFLOW.TEST_USER,
    { response_mode: "blocking" },
  );

  // メッセージ送信後もプロパティが維持されていることを確認
  realApiTestFrameworkChatflow.assertEqual(
    chatflow.apiKey,
    REAL_API_TEST_CONFIG_CHATFLOW.API_KEY,
    "メッセージ送信後もapiKeyが維持されていること",
  );
  realApiTestFrameworkChatflow.assertEqual(
    chatflow.baseUrl,
    REAL_API_TEST_CONFIG_CHATFLOW.BASE_URL,
    "メッセージ送信後もbaseUrlが維持されていること",
  );
  realApiTestFrameworkChatflow.assertNotNull(
    chatflow._cache,
    "メッセージ送信後もキャッシュプロパティが維持されていること",
  );
  realApiTestFrameworkChatflow.assertIsArray(
    chatflow._rateLimitRequests,
    "メッセージ送信後もレート制限配列が維持されていること",
  );

  // レート制限配列にリクエストが追加されたことを確認
  realApiTestFrameworkChatflow.assertTrue(
    chatflow._rateLimitRequests.length > 0,
    "レート制限配列にリクエストが記録されていること",
  );

  Logger.log("Chatflowインスタンスプロパティ保持確認テスト完了");
  Logger.log(`APIキー設定: ${chatflow.apiKey.substring(0, 10)}...`);
  Logger.log(`ベースURL: ${chatflow.baseUrl}`);
  Logger.log(`キャッシュエントリ数: ${Object.keys(chatflow._cache).length}`);
  Logger.log(`レート制限リクエスト数: ${chatflow._rateLimitRequests.length}`);

  if (chatflow.features) {
    Logger.log(`機能設定: ${JSON.stringify(chatflow.features)}`);
  }
}

// ================== メイン実行関数 ==================

/**
 * 全ての実際のAPIテストを実行
 */
function runAllRealApiChatflowTests() {
  Logger.log("=== 実際のAPIを使用したChatflowテストスイート開始 ===");
  Logger.log(`実行時刻: ${new Date()}`);
  Logger.log("");

  // 設定チェック
  if (!checkRealApiTestConfigChatflow()) {
    Logger.log("❌ テスト設定が正しく構成されていません。テストを終了します。");
    return;
  }

  // テスト実行
  const testCases = [
    {
      name: "基本メッセージ送信（ブロッキング）",
      func: testRealApiChatflowSendMessageBlocking,
    },
    {
      name: "ストリーミングメッセージ送信",
      func: testRealApiChatflowSendMessageStreaming,
    },
    { name: "会話リスト取得", func: testRealApiChatflowGetConversations },
    { name: "アプリケーション情報取得", func: testRealApiChatflowGetAppInfo },
    {
      name: "アプリケーションパラメータ取得",
      func: testRealApiChatflowGetAppParameters,
    },
    {
      name: "会話履歴メッセージ取得",
      func: testRealApiChatflowGetConversationMessages,
    },
    { name: "フィードバック送信", func: testRealApiChatflowSendFeedback },
    { name: "推奨質問取得", func: testRealApiChatflowGetSuggestedQuestions },
    { name: "ファイルアップロード", func: testRealApiChatflowUploadFile },
    { name: "会話名変更", func: testRealApiChatflowRenameConversation },
    { name: "エラーハンドリング", func: testRealApiChatflowErrorHandling },
    { name: "レート制限", func: testRealApiChatflowRateLimit },
    { name: "パフォーマンス", func: testRealApiChatflowPerformance },
    { name: "大量データ送信", func: testRealApiChatflowLargeData },
    {
      name: "特殊文字・Unicode",
      func: testRealApiChatflowUnicodeAndSpecialChars,
    },
    {
      name: "インスタンスプロパティ保持",
      func: testRealApiChatflowInstancePropertyRetention,
    },
  ];

  // 各テストを実行
  testCases.forEach((testCase) => {
    try {
      realApiTestFrameworkChatflow.runTest(testCase.name, testCase.func);
    } catch (error) {
      Logger.log(`[テスト実行エラー] ${testCase.name}: ${error.message}`);
    }

    // テスト間で少し待機（API負荷軽減）
    Utilities.sleep(1000);
  });

  // 最終レポート生成
  const report = realApiTestFrameworkChatflow.generateReport();

  Logger.log("");
  Logger.log("=== ChatflowのAPI実際のテスト完了 ===");
  Logger.log(`終了時刻: ${new Date()}`);

  return report;
}

/**
 * 個別テスト実行（デバッグ用）
 */
function runSingleRealApiChatflowTest(testName) {
  Logger.log(`=== 個別Chatflow実際のAPIテスト実行: ${testName} ===`);

  if (!checkRealApiTestConfigChatflow()) {
    Logger.log("❌ テスト設定が正しく構成されていません。");
    return;
  }

  const testMap = {
    sendmessage: testRealApiChatflowSendMessageBlocking,
    streaming: testRealApiChatflowSendMessageStreaming,
    conversations: testRealApiChatflowGetConversations,
    appinfo: testRealApiChatflowGetAppInfo,
    parameters: testRealApiChatflowGetAppParameters,
    messages: testRealApiChatflowGetConversationMessages,
    feedback: testRealApiChatflowSendFeedback,
    suggestions: testRealApiChatflowGetSuggestedQuestions,
    upload: testRealApiChatflowUploadFile,
    rename: testRealApiChatflowRenameConversation,
    error: testRealApiChatflowErrorHandling,
    ratelimit: testRealApiChatflowRateLimit,
    performance: testRealApiChatflowPerformance,
    largedata: testRealApiChatflowLargeData,
    unicode: testRealApiChatflowUnicodeAndSpecialChars,
    properties: testRealApiChatflowInstancePropertyRetention,
  };

  const testFunc = testMap[testName.toLowerCase()];

  if (testFunc) {
    realApiTestFrameworkChatflow.runTest(testName, testFunc);
    realApiTestFrameworkChatflow.generateReport();
  } else {
    Logger.log(`❌ 未知のテスト名: ${testName}`);
    Logger.log(`利用可能なテスト: ${Object.keys(testMap).join(", ")}`);
  }
}

/**
 * 基本テストのみ実行（クイックテスト）
 */
function runBasicRealApiChatflowTests() {
  Logger.log("=== 基本的なChatflow実際のAPIテスト実行 ===");

  if (!checkRealApiTestConfigChatflow()) {
    Logger.log("❌ テスト設定が正しく構成されていません。");
    return;
  }

  const basicTests = [
    {
      name: "基本メッセージ送信",
      func: testRealApiChatflowSendMessageBlocking,
    },
    { name: "会話リスト取得", func: testRealApiChatflowGetConversations },
    { name: "アプリケーション情報取得", func: testRealApiChatflowGetAppInfo },
    { name: "エラーハンドリング", func: testRealApiChatflowErrorHandling },
  ];

  basicTests.forEach((testCase) => {
    realApiTestFrameworkChatflow.runTest(testCase.name, testCase.func);
    Utilities.sleep(500);
  });

  return realApiTestFrameworkChatflow.generateReport();
}

// ================== GAS実行用のメイン関数 ==================

/**
 * Google Apps Script実行用のメイン関数（Chatflow実際のAPIテスト用）
 * 注意: この関数は明示的に呼び出す必要があります
 */
function runRealApiChatflowTestsMain() {
  return runAllRealApiChatflowTests();
}

/**
 * 設定確認のみ実行
 */
function checkChatflowConfig() {
  return checkRealApiTestConfigChatflow();
}

/**
 * クイックテスト実行
 */
function quickChatflowTest() {
  return runBasicRealApiChatflowTests();
}
