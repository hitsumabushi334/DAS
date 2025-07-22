/**
 * DAS Chatbotクラス テスト関数
 * Google Apps Script環境用のテスト実装
 */

// ===== テストフレームワーク =====

/**
 * 簡易アサーション関数
 */
class TestAssertion {
  static assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        `アサーションエラー: ${message || ""} - 期待値: ${expected}, 実際値: ${actual}`,
      );
    }
  }

  static assertNotEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(
        `アサーションエラー: ${message || ""} - 値が等しくないはずです: ${actual}`,
      );
    }
  }

  static assertTrue(condition, message) {
    if (!condition) {
      throw new Error(
        `アサーションエラー: ${message || ""} - 条件がtrueではありません`,
      );
    }
  }

  static assertFalse(condition, message) {
    if (condition) {
      throw new Error(
        `アサーションエラー: ${message || ""} - 条件がfalseではありません`,
      );
    }
  }

  static assertThrows(fn, expectedErrorMessage, message) {
    try {
      fn();
      throw new Error(
        `アサーションエラー: ${message || ""} - エラーが発生するはずです`,
      );
    } catch (error) {
      if (
        expectedErrorMessage &&
        !error.message.includes(expectedErrorMessage)
      ) {
        throw new Error(
          `アサーションエラー: ${message || ""} - 期待したエラーメッセージと異なります。期待: ${expectedErrorMessage}, 実際: ${error.message}`,
        );
      }
    }
  }

  static assertNotNull(value, message) {
    if (value == null) {
      throw new Error(
        `アサーションエラー: ${message || ""} - 値がnullまたはundefinedです`,
      );
    }
  }

  static assertInstanceOf(value, expectedType, message) {
    if (!(value instanceof expectedType)) {
      throw new Error(
        `アサーションエラー: ${message || ""} - 期待した型のインスタンスではありません`,
      );
    }
  }
}

/**
 * テスト実行器
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
    };
  }

  addTest(name, testFunction) {
    this.tests.push({ name, testFunction });
  }

  run() {
    console.log("=== DAS Chatbotクラス テスト開始 ===");

    for (const test of this.tests) {
      try {
        console.log(`テスト実行中: ${test.name}`);
        test.testFunction();
        this.results.passed++;
        console.log(`✅ ${test.name} - 成功`);
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({ test: test.name, error: error.message });
        console.error(`❌ ${test.name} - 失敗: ${error.message}`);
      }
    }

    console.log("\n=== テスト結果 ===");
    console.log(`成功: ${this.results.passed}`);
    console.log(`失敗: ${this.results.failed}`);
    console.log(`合計: ${this.tests.length}`);

    if (this.results.failed > 0) {
      console.log("\n=== エラー詳細 ===");
      for (const error of this.results.errors) {
        console.log(`${error.test}: ${error.error}`);
      }
    }

    return this.results;
  }
}

// ===== Chatbotテスト用のモック =====

/**
 * UrlFetchAppのモック（実際のAPIを呼ばないため）
 */
const MockUrlFetchApp = {
  fetch: function (url, options) {
    // モックレスポンスを返す
    const mockResponse = {
      getResponseCode: () => 200,
      getContentText: () =>
        JSON.stringify({
          event: "message",
          answer: "テスト応答",
          conversation_id: "test-conv-id",
          message_id: "test-msg-id",
        }),
      getBlob: () => ({ size: 1024, type: "audio/mp3" }),
    };
    return mockResponse;
  },
};

// UrlFetchAppをモックで置き換える（テスト時のみ）
const originalUrlFetchApp = globalThis.UrlFetchApp;

// ===== Chatbotクラス テスト関数 =====

/**
 * Chatbotコンストラクタのテスト
 */
function testChatbotConstructor() {
  // 正常なコンストラクタテスト
  const chatbot = new Chatbot("test-api-key", "https://test.api.com");
  TestAssertion.assertEqual(
    chatbot.apiKey,
    "test-api-key",
    "APIキーが正しく設定される",
  );
  TestAssertion.assertEqual(
    chatbot.baseUrl,
    "https://test.api.com",
    "ベースURLが正しく設定される",
  );

  // デフォルトURLテスト
  const chatbotDefault = new Chatbot("test-key");
  TestAssertion.assertEqual(
    chatbotDefault.baseUrl,
    "https://api.dify.ai/v1",
    "デフォルトURLが設定される",
  );

  // キャッシュとレート制限の初期化確認
  TestAssertion.assertNotNull(chatbot._cache, "キャッシュが初期化される");
  TestAssertion.assertNotNull(
    chatbot._rateLimitRequests,
    "レート制限配列が初期化される",
  );
}

/**
 * sendMessageメソッドのテスト
 */
function testSendMessage() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.sendMessage();
    },
    "query と user は必須パラメータです",
    "必須パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.sendMessage("テストクエリ");
    },
    "query と user は必須パラメータです",
    "userパラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.sendMessage("", "test-user");
    },
    "query と user は必須パラメータです",
    "空のqueryでエラー",
  );
}

/**
 * getConversationsメソッドのテスト
 */
function testGetConversations() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.getConversations();
    },
    "user は必須パラメータです",
    "userパラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.getConversations("");
    },
    "user は必須パラメータです",
    "空のuserでエラー",
  );
}

/**
 * getConversationMessagesメソッドのテスト
 */
function testGetConversationMessages() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.getConversationMessages();
    },
    "conversationId と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.getConversationMessages("test-conv-id");
    },
    "conversationId と user は必須パラメータです",
    "userパラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.getConversationMessages("", "test-user");
    },
    "conversationId と user は必須パラメータです",
    "空のconversationIdでエラー",
  );
}

/**
 * renameConversationメソッドのテスト
 */
function testRenameConversation() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.renameConversation();
    },
    "conversationId と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.renameConversation("test-conv-id", "", "test-user");
    },
    "name または autoGenerate のいずれかが必要です",
    "nameもautoGenerateもない場合エラー",
  );
}

/**
 * deleteConversationメソッドのテスト
 */
function testDeleteConversation() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.deleteConversation();
    },
    "conversationId と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.deleteConversation("test-conv-id");
    },
    "conversationId と user は必須パラメータです",
    "userパラメータなしでエラー",
  );
}

/**
 * uploadFileメソッドのテスト
 */
function testUploadFile() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.uploadFile();
    },
    "file と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.uploadFile("dummy-file");
    },
    "file と user は必須パラメータです",
    "userパラメータなしでエラー",
  );
}

/**
 * sendFeedbackメソッドのテスト
 */
function testSendFeedback() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.sendFeedback();
    },
    "messageId, rating, user は必須パラメータです",
    "パラメータなしでエラー",
  );

  // 不正なratingのテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.sendFeedback("test-msg-id", "invalid", "test-user");
    },
    'rating は "like" または "dislike" である必要があります',
    "無効なratingでエラー",
  );
}

/**
 * textToAudioメソッドのテスト
 */
function testTextToAudio() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.textToAudio();
    },
    "user は必須パラメータです",
    "userパラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.textToAudio("test-user", {});
    },
    "message_id または text のいずれかが必要です",
    "message_idもtextもない場合エラー",
  );
}

/**
 * audioToTextメソッドのテスト
 */
function testAudioToText() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.audioToText();
    },
    "file と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.audioToText("dummy-file");
    },
    "file と user は必須パラメータです",
    "userパラメータなしでエラー",
  );
}

/**
 * stopGenerationメソッドのテスト
 */
function testStopGeneration() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.stopGeneration();
    },
    "taskId と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.stopGeneration("test-task-id");
    },
    "taskId と user は必須パラメータです",
    "userパラメータなしでエラー",
  );
}

/**
 * getSuggestedQuestionsメソッドのテスト
 */
function testGetSuggestedQuestions() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.getSuggestedQuestions();
    },
    "messageId と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.getSuggestedQuestions("test-msg-id");
    },
    "messageId と user は必須パラメータです",
    "userパラメータなしでエラー",
  );
}

/**
 * getConversationVariablesメソッドのテスト
 */
function testGetConversationVariables() {
  const chatbot = new Chatbot("test-api-key");

  // 必須パラメータ不足のテスト
  TestAssertion.assertThrows(
    () => {
      chatbot.getConversationVariables();
    },
    "conversationId と user は必須パラメータです",
    "パラメータなしでエラー",
  );

  TestAssertion.assertThrows(
    () => {
      chatbot.getConversationVariables("test-conv-id");
    },
    "conversationId と user は必須パラメータです",
    "userパラメータなしでエラー",
  );
}

/**
 * _buildQueryStringメソッドのテスト（内部メソッド）
 */
function testBuildQueryString() {
  const chatbot = new Chatbot("test-api-key");

  // 空のパラメータ
  const emptyResult = chatbot._buildQueryString({});
  TestAssertion.assertEqual(emptyResult, "", "空のパラメータで空文字列");

  // 単一パラメータ
  const singleResult = chatbot._buildQueryString({ key: "value" });
  TestAssertion.assertEqual(singleResult, "key=value", "単一パラメータ");

  // 複数パラメータ
  const multiResult = chatbot._buildQueryString({
    user: "test-user",
    limit: 20,
    sort_by: "-updated_at",
  });
  TestAssertion.assertTrue(
    multiResult.includes("user=test-user"),
    "複数パラメータにuserが含まれる",
  );
  TestAssertion.assertTrue(
    multiResult.includes("limit=20"),
    "複数パラメータにlimitが含まれる",
  );
  TestAssertion.assertTrue(
    multiResult.includes("sort_by=-updated_at"),
    "複数パラメータにsort_byが含まれる",
  );

  // 特殊文字のエスケープテスト
  const escapeResult = chatbot._buildQueryString({
    query: "test query with spaces",
    special: "value&with=special",
  });
  TestAssertion.assertTrue(
    escapeResult.includes("test%20query%20with%20spaces"),
    "スペースがエスケープされる",
  );
}

/**
 * _checkRateLimitメソッドのテスト（内部メソッド）
 */
function testCheckRateLimit() {
  const chatbot = new Chatbot("test-api-key");

  // 正常なレート制限内での動作
  for (let i = 0; i < 50; i++) {
    chatbot._checkRateLimit(); // 50回は制限内なので例外が発生しない
  }
  TestAssertion.assertEqual(
    chatbot._rateLimitRequests.length,
    50,
    "レート制限配列に50件記録される",
  );

  // レート制限を超えた場合のテスト
  for (let i = 0; i < 10; i++) {
    chatbot._checkRateLimit();
  }

  TestAssertion.assertThrows(
    () => {
      chatbot._checkRateLimit(); // 61回目でエラーが発生
    },
    "レート制限に達しました",
    "レート制限を超えるとエラー",
  );
}

/**
 * HTTP_STATUS定数のテスト
 */
function testHttpStatusConstants() {
  TestAssertion.assertEqual(HTTP_STATUS.OK, 200, "HTTP OKが200");
  TestAssertion.assertEqual(HTTP_STATUS.CREATED, 201, "HTTP CREATEDが201");
  TestAssertion.assertEqual(
    HTTP_STATUS.BAD_REQUEST,
    400,
    "HTTP BAD_REQUESTが400",
  );
  TestAssertion.assertEqual(
    HTTP_STATUS.UNAUTHORIZED,
    401,
    "HTTP UNAUTHORIZEDが401",
  );
  TestAssertion.assertEqual(HTTP_STATUS.FORBIDDEN, 403, "HTTP FORBIDDENが403");
  TestAssertion.assertEqual(HTTP_STATUS.NOT_FOUND, 404, "HTTP NOT_FOUNDが404");
  TestAssertion.assertEqual(
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    500,
    "HTTP INTERNAL_SERVER_ERRORが500",
  );
}

/**
 * _parseStreamingResponseメソッドのテスト（内部メソッド）
 */
function testParseStreamingResponse() {
  const chatbot = new Chatbot("test-api-key");

  // モックレスポンス作成
  const mockStreamingResponse = {
    getResponseCode: () => 200,
    getContentText:
      () => `data: {"event":"message","answer":"こんにちは","conversation_id":"conv-123","id":"msg-456","task_id":"task-789"}
data: {"event":"message_end","metadata":{"usage":{"tokens":50}}}
data: [DONE]`,
  };

  const result = chatbot._parseStreamingResponse(mockStreamingResponse);
  TestAssertion.assertEqual(
    result.answer,
    "こんにちは",
    "ストリーミング応答の解析が正しい",
  );
  TestAssertion.assertEqual(
    result.conversation_id,
    "conv-123",
    "会話IDが正しく解析される",
  );
  TestAssertion.assertEqual(
    result.message_id,
    "msg-456",
    "メッセージIDが正しく解析される",
  );
  TestAssertion.assertEqual(
    result.task_id,
    "task-789",
    "タスクIDが正しく解析される",
  );
}

/**
 * エラー処理のテスト
 */
function testErrorHandling() {
  const chatbot = new Chatbot("");

  // 空のAPIキーでのエラー
  TestAssertion.assertEqual(chatbot.apiKey, "", "空のAPIキーが設定される");

  // 不正なURL形式
  const invalidUrlChatbot = new Chatbot("test-key", "invalid-url");
  TestAssertion.assertEqual(
    invalidUrlChatbot.baseUrl,
    "invalid-url",
    "不正なURLでも設定される",
  );
}

/**
 * オプション引数のデフォルト値テスト
 */
function testDefaultOptions() {
  const chatbot = new Chatbot("test-api-key");

  // sendMessageのデフォルトオプション確認
  // 実際のAPIを呼ばないため、パラメータ構築部分のみテスト可能

  // getConversationsのデフォルト値テスト
  // 内部的なパラメータ構築をテストするには、モック化が必要
}

// ===== テスト実行関数 =====

/**
 * 全テストを実行する
 */
function runAllTests() {
  const runner = new TestRunner();

  // テストを追加
  runner.addTest("コンストラクタテスト", testChatbotConstructor);
  runner.addTest("sendMessageテスト", testSendMessage);
  runner.addTest("getConversationsテスト", testGetConversations);
  runner.addTest("getConversationMessagesテスト", testGetConversationMessages);
  runner.addTest("renameConversationテスト", testRenameConversation);
  runner.addTest("deleteConversationテスト", testDeleteConversation);
  runner.addTest("uploadFileテスト", testUploadFile);
  runner.addTest("sendFeedbackテスト", testSendFeedback);
  runner.addTest("textToAudioテスト", testTextToAudio);
  runner.addTest("audioToTextテスト", testAudioToText);
  runner.addTest("stopGenerationテスト", testStopGeneration);
  runner.addTest("getSuggestedQuestionsテスト", testGetSuggestedQuestions);
  runner.addTest(
    "getConversationVariablesテスト",
    testGetConversationVariables,
  );
  runner.addTest("buildQueryStringテスト", testBuildQueryString);
  runner.addTest("checkRateLimitテスト", testCheckRateLimit);
  runner.addTest("HTTP_STATUS定数テスト", testHttpStatusConstants);
  runner.addTest("parseStreamingResponseテスト", testParseStreamingResponse);
  runner.addTest("エラー処理テスト", testErrorHandling);

  // テスト実行
  return runner.run();
}

/**
 * 個別テスト実行（デバッグ用）
 */
function runIndividualTest() {
  console.log("=== 個別テスト実行例 ===");

  try {
    testChatbotConstructor();
    console.log("✅ コンストラクタテスト成功");
  } catch (error) {
    console.error("❌ コンストラクタテスト失敗:", error.message);
  }

  try {
    testBuildQueryString();
    console.log("✅ buildQueryStringテスト成功");
  } catch (error) {
    console.error("❌ buildQueryStringテスト失敗:", error.message);
  }
}

/**
 * パフォーマンステスト（レート制限など）
 */
function runPerformanceTests() {
  console.log("=== パフォーマンステスト ===");

  const chatbot = new Chatbot("test-api-key");

  // レート制限のパフォーマンステスト
  const startTime = Date.now();
  for (let i = 0; i < 30; i++) {
    try {
      chatbot._checkRateLimit();
    } catch (error) {
      console.log(`レート制限エラー発生: ${i}回目`);
      break;
    }
  }
  const endTime = Date.now();

  console.log(`レート制限チェック30回実行時間: ${endTime - startTime}ms`);
  console.log("レート制限記録数:", chatbot._rateLimitRequests.length);
}

// Google Apps Scriptでの実行時のエントリーポイント
function main() {
  console.log("DAS Chatbotクラス テストプログラム開始");

  try {
    const results = runAllTests();
    console.log(`\n=== 最終結果 ===`);
    console.log(`✅ 成功: ${results.passed}件`);
    console.log(`❌ 失敗: ${results.failed}件`);

    if (results.failed === 0) {
      console.log("🎉 すべてのテストが成功しました！");
    } else {
      console.log("⚠️ 一部のテストが失敗しました。詳細を確認してください。");
    }

    return results;
  } catch (error) {
    console.error("テスト実行中に予期しないエラーが発生しました:", error);
    throw error;
  }
}

// テスト実行用の個別関数をエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runAllTests,
    runIndividualTest,
    runPerformanceTests,
    TestAssertion,
    TestRunner,
    main,
  };
}
