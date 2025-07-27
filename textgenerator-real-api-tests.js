/**
 * DAS (Dify Application Script) - Textgenerator 実際のAPIを使用したテストスイート
 * Google Apps Script環境で実際のDify Text Generation APIを呼び出してテストを実行
 */

/**
 * 実際のAPIテスト設定
 * 実行前に以下の設定を行ってください：
 * 1. API_KEY: 有効なDify APIキー
 * 2. BASE_URL: DifyインスタンスのベースURL
 * 3. TEST_USER: テスト用ユーザーID
 * 4. TEXTGEN_APP_ID: テスト用のテキストジェネレーションアプリケーションID
 */
const TEXTGEN_REAL_API_TEST_CONFIG = {
  API_KEY: PropertiesService.getScriptProperties().getProperty(
    "DIFY_TEXTGEN_API_KEY"
  ), // 実際のAPIキーに変更してください
  BASE_URL: "https://api.dify.ai/v1", // 実際のDifyインスタンスURLに変更してください
  TEST_USER: "test-user-textgen-api-real", // テスト用ユーザーID
  TEXTGEN_APP_ID: PropertiesService.getScriptProperties().getProperty(
    "DIFY_TEXTGEN_APP_ID"
  ), // テキストジェネレーションアプリID
  ENABLE_FILE_TESTS: true, // ファイルテストを有効にする場合はtrueに設定
  ENABLE_AUDIO_TESTS: true, // 音声テストを有効にする場合はtrueに設定
  ENABLE_FEEDBACK_TESTS: true, // フィードバックテストを有効にする場合はtrueに設定
  ENABLE_DESTRUCTIVE_TESTS: true, // 停止系テストを有効にする場合はtrueに設定
  TEST_TIMEOUT: 30000, // テストタイムアウト（ミリ秒）
};

/**
 * 実際のAPIテスト用のフレームワーククラス
 */
class TextgeneratorRealApiTestFramework {
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
        `アサーション失敗: ${message}. 期待値: ${expected}, 実際の値: ${actual}`
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
        `アサーション失敗: ${message}. 値がnullまたはundefinedです`
      );
    }
  }

  assertThrows(fn, message) {
    try {
      fn();
      throw new Error(`アサーション失敗: ${message}. 例外が発生しませんでした`);
    } catch (error) {
      if (error.message.includes("アサーション失敗")) {
        throw error;
      }
      // 予期される例外の場合は成功
    }
  }

  /**
   * テストケースの実行
   */
  runTest(testName, testFunction) {
    this.currentTestName = testName;
    const startTime = Date.now();

    try {
      console.log(`🔄 テスト実行中: ${testName}`);
      testFunction();
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: testName,
        status: "PASS",
        duration: duration,
        message: "テスト成功",
      });
      console.log(`✅ テスト成功: ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: testName,
        status: "FAIL",
        duration: duration,
        message: error.message,
      });
      console.error(
        `❌ テスト失敗: ${testName} (${duration}ms) - ${error.message}`
      );
    }
  }

  /**
   * テスト結果の出力
   */
  printResults() {
    const passedTests = this.testResults.filter((r) => r.status === "PASS");
    const failedTests = this.testResults.filter((r) => r.status === "FAIL");

    console.log("\n" + "=".repeat(60));
    console.log("📊 Textgenerator 実際のAPIテスト結果");
    console.log("=".repeat(60));
    console.log(`総テスト数: ${this.testResults.length}`);
    console.log(`成功: ${passedTests.length}`);
    console.log(`失敗: ${failedTests.length}`);
    console.log(
      `成功率: ${((passedTests.length / this.testResults.length) * 100).toFixed(
        1
      )}%`
    );

    if (failedTests.length > 0) {
      console.log("\n❌ 失敗したテスト:");
      failedTests.forEach((test) => {
        console.log(`  - ${test.name}: ${test.message}`);
      });
    }

    console.log("\n⏱️ 実行時間:");
    this.testResults.forEach((test) => {
      const status = test.status === "PASS" ? "✅" : "❌";
      console.log(`  ${status} ${test.name}: ${test.duration}ms`);
    });
  }
}

/**
 * テストで使用するサンプルファイルを作成
 */
function createTestImageFile() {
  // 1x1ピクセルのPNG画像を作成（base64データ）
  const base64Data =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77gwAAAABJRU5ErkJggg==";
  const binaryData = Utilities.base64Decode(base64Data);
  return Utilities.newBlob(binaryData, "image/png", "test-image.png");
}

/**
 * Textgeneratorクラスの実際のAPIテスト実行
 */
function runTextgeneratorRealApiTests() {
  const framework = new TextgeneratorRealApiTestFramework();

  // APIキーの確認
  if (!TEXTGEN_REAL_API_TEST_CONFIG.API_KEY) {
    console.error("❌ エラー: DIFY_TEXTGEN_API_KEYが設定されていません");
    console.log(
      "PropertiesService.getScriptProperties().setProperty('DIFY_TEXTGEN_API_KEY', 'your-api-key');を実行してください"
    );
    return;
  }

  console.log("🚀 Textgenerator 実際のAPIテストを開始します...");

  // Textgeneratorインスタンスを作成
  let textgen;
  try {
    textgen = new Textgenerator({
      apiKey: TEXTGEN_REAL_API_TEST_CONFIG.API_KEY,
      baseUrl: TEXTGEN_REAL_API_TEST_CONFIG.BASE_URL,
      user: TEXTGEN_REAL_API_TEST_CONFIG.TEST_USER,
    });
  } catch (error) {
    console.error("❌ Textgeneratorインスタンスの作成に失敗:", error.message);
    return;
  }

  // 1. アプリケーション情報取得テスト
  framework.runTest("アプリケーション基本情報取得", () => {
    const appInfo = textgen.getAppInfo();
    framework.assertNotNull(appInfo, "アプリケーション情報が取得できません");
    framework.assertTrue(
      typeof appInfo.name === "string",
      "アプリケーション名が文字列ではありません"
    );
    console.log("📋 アプリケーション名:", appInfo.name);
  });

  framework.runTest("アプリケーションパラメータ取得", () => {
    const params = textgen.getAppParameters();
    framework.assertNotNull(params, "パラメータ情報が取得できません");
    framework.assertTrue(
      Array.isArray(params.user_input_form),
      "user_input_formが配列ではありません"
    );
    console.log("⚙️ ユーザー入力フォーム数:", params.user_input_form.length);
  });

  framework.runTest("WebApp設定取得", () => {
    const settings = textgen.getWebAppSettings();
    framework.assertNotNull(settings, "WebApp設定が取得できません");
    framework.assertTrue(
      typeof settings.title === "string",
      "WebAppタイトルが文字列ではありません"
    );
    console.log("🎨 WebAppタイトル:", settings.title);
  });

  // 2. 完了メッセージ作成テスト（Streaming）
  framework.runTest("完了メッセージ作成 - Streamingモード", () => {
    const response = textgen.createCompletionMessage(
      { query: "Hello, this is a test message for streaming mode." },
      null,
      { response_mode: "streaming" }
    );

    framework.assertNotNull(response, "レスポンスがnullです");
    framework.assertNotNull(
      response.message_id,
      "message_idが設定されていません"
    );
    framework.assertTrue(
      typeof response.answer === "string",
      "answerが文字列ではありません"
    );
    framework.assertTrue(response.answer.length > 0, "answerが空です");

    console.log(
      "💬 生成されたメッセージ:",
      response.answer.substring(0, 100) + "..."
    );

    // 後続のテストで使用するためにmessage_idを保存
    if (!this.lastMessageId) {
      this.lastMessageId = response.message_id;
    }
  });

  // 3. 完了メッセージ作成テスト（Blocking）
  framework.runTest("完了メッセージ作成 - Blockingモード", () => {
    const response = textgen.createCompletionMessage(
      { query: "Hello, this is a test message for blocking mode." },
      null,
      { response_mode: "blocking" }
    );

    framework.assertNotNull(response, "レスポンスがnullです");
    framework.assertNotNull(
      response.message_id,
      "message_idが設定されていません"
    );
    framework.assertTrue(
      typeof response.answer === "string",
      "answerが文字列ではありません"
    );
    framework.assertEqual(
      response.event,
      "message",
      "eventが'message'ではありません"
    );

    console.log(
      "🔒 Blockingモード応答:",
      response.answer.substring(0, 100) + "..."
    );
  });

  // 4. ファイルアップロードテスト
  if (TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_FILE_TESTS) {
    framework.runTest("ファイルアップロード", () => {
      const testFile = createTestImageFile();
      const uploadResult = textgen.uploadFile(testFile);

      framework.assertNotNull(uploadResult, "アップロード結果がnullです");
      framework.assertNotNull(
        uploadResult.id,
        "ファイルIDが設定されていません"
      );
      framework.assertTrue(
        typeof uploadResult.name === "string",
        "ファイル名が文字列ではありません"
      );
      framework.assertTrue(uploadResult.size > 0, "ファイルサイズが0以下です");

      console.log(
        "📁 アップロードファイル:",
        uploadResult.name,
        `(${uploadResult.size}bytes)`
      );
    });
  }

  // 5. メッセージフィードバックテスト
  if (
    TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_FEEDBACK_TESTS &&
    this.lastMessageId
  ) {
    framework.runTest("メッセージフィードバック送信", () => {
      const feedback = {
        rating: "like",
        content: "テスト用のフィードバックです",
      };

      const result = textgen.submitMessageFeedback(
        this.lastMessageId,
        feedback
      );
      framework.assertNotNull(result, "フィードバック結果がnullです");
      framework.assertEqual(
        result.result,
        "success",
        "フィードバック送信が成功していません"
      );

      console.log("👍 フィードバック送信完了");
    });

    framework.runTest("アプリフィードバック一覧取得", () => {
      const feedbacks = textgen.getAppFeedbacks({ page: 1, limit: 10 });
      framework.assertNotNull(feedbacks, "フィードバック一覧がnullです");
      framework.assertTrue(
        Array.isArray(feedbacks.data),
        "フィードバックデータが配列ではありません"
      );

      console.log("📝 フィードバック件数:", feedbacks.data.length);
    });
  }

  // 6. 音声変換テスト
  if (TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_AUDIO_TESTS) {
    framework.runTest("テキスト音声変換", () => {
      const audioBlob = textgen.textToAudio({
        text: "これはテスト用の音声変換です。",
      });

      framework.assertNotNull(audioBlob, "音声Blobがnullです");
      framework.assertTrue(
        audioBlob.getBytes().length > 0,
        "音声ファイルのサイズが0以下です"
      );
      framework.assertTrue(
        audioBlob.getContentType().includes("audio"),
        "音声ファイルのContent-Typeが正しくありません"
      );

      console.log(
        "🔊 音声ファイル生成:",
        audioBlob.getName(),
        `(${audioBlob.getBytes().length}bytes)`
      );
    });
  }

  // 7. エラーハンドリングテスト
  framework.runTest("無効な入力でのエラーハンドリング", () => {
    framework.assertThrows(() => {
      textgen.createCompletionMessage({}, null, {});
    }, "無効な入力で例外が発生しません");
  });

  const response = textgen.stopCompletionTask("invalid-task-id");
  framework.runTest("無効なタスクIDでの停止エラーハンドリング", () => {
    framework.assertThrows(() => {
      textgen.stopCompletionTask("invalid-task-id");
    }, `無効なタスクIDで例外が発生しません ${JSON.stringify(response)}`);
  });

  framework.runTest(
    "無効なメッセージIDでのフィードバックエラーハンドリング",
    () => {
      framework.assertThrows(() => {
        textgen.submitMessageFeedback("invalid-message-id", { rating: "like" });
      }, "無効なメッセージIDで例外が発生しません");
    }
  );

  // 8. 停止機能テスト（破壊的テストが有効な場合のみ）
  if (TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_DESTRUCTIVE_TESTS) {
    framework.runTest("完了メッセージ生成停止", () => {
      // ストリーミングモードでメッセージを開始
      const response = textgen.createCompletionMessage(
        { query: "This is a long message that we will try to stop..." },
        null,
        { response_mode: "streaming" }
      );

      if (response.task_id) {
        const stopResult = textgen.stopTask(response.task_id);
        framework.assertNotNull(stopResult, "停止結果がnullです");
        console.log("⏹️ タスク停止完了");
      }
    });
  }

  // テスト結果の出力
  framework.printResults();

  return framework.testResults;
}

/**
 * 個別テスト実行用の関数群
 */

/**
 * アプリケーション情報テストのみ実行
 */
function testTextgeneratorAppInfo() {
  console.log("🔍 アプリケーション情報テストを実行中...");

  const textgen = new Textgenerator({
    apiKey: TEXTGEN_REAL_API_TEST_CONFIG.API_KEY,
    baseUrl: TEXTGEN_REAL_API_TEST_CONFIG.BASE_URL,
    user: TEXTGEN_REAL_API_TEST_CONFIG.TEST_USER,
  });

  try {
    const appInfo = textgen.getAppInfo();
    console.log(
      "📋 アプリケーション基本情報:",
      JSON.stringify(appInfo, null, 2)
    );

    const params = textgen.getAppParameters();
    console.log(
      "⚙️ アプリケーションパラメータ:",
      JSON.stringify(params, null, 2)
    );

    const settings = textgen.getWebAppSettings();
    console.log("🎨 WebApp設定:", JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("❌ アプリケーション情報テストエラー:", error.message);
  }
}

/**
 * 完了メッセージ作成テストのみ実行
 */
function testTextgeneratorCompletion() {
  console.log("💬 完了メッセージ作成テストを実行中...");

  const textgen = new Textgenerator({
    apiKey: TEXTGEN_REAL_API_TEST_CONFIG.API_KEY,
    baseUrl: TEXTGEN_REAL_API_TEST_CONFIG.BASE_URL,
    user: TEXTGEN_REAL_API_TEST_CONFIG.TEST_USER,
  });

  try {
    // Streamingモードテスト
    console.log("🔄 Streamingモードテスト...");
    const streamingResponse = textgen.createCompletionMessage(
      {
        query:
          "Explain the concept of artificial intelligence in simple terms.",
      },
      null,
      { response_mode: "streaming" }
    );
    console.log(
      "📊 Streaming結果:",
      JSON.stringify(streamingResponse, null, 2)
    );

    // Blockingモードテスト
    console.log("🔒 Blockingモードテスト...");
    const blockingResponse = textgen.createCompletionMessage(
      { query: "What is machine learning?" },
      null,
      { response_mode: "blocking" }
    );
    console.log("📊 Blocking結果:", JSON.stringify(blockingResponse, null, 2));
  } catch (error) {
    console.error("❌ 完了メッセージ作成テストエラー:", error.message);
  }
}

/**
 * ファイルアップロードテストのみ実行
 */
function testTextgeneratorFileUpload() {
  console.log("📁 ファイルアップロードテストを実行中...");

  const textgen = new Textgenerator({
    apiKey: TEXTGEN_REAL_API_TEST_CONFIG.API_KEY,
    baseUrl: TEXTGEN_REAL_API_TEST_CONFIG.BASE_URL,
    user: TEXTGEN_REAL_API_TEST_CONFIG.TEST_USER,
  });

  try {
    const testFile = createTestImageFile();
    const uploadResult = textgen.uploadFile(testFile);
    console.log("📊 アップロード結果:", JSON.stringify(uploadResult, null, 2));
  } catch (error) {
    console.error("❌ ファイルアップロードテストエラー:", error.message);
  }
}

/**
 * 音声変換テストのみ実行
 */
function testTextgeneratorAudio() {
  console.log("🔊 音声変換テストを実行中...");

  const textgen = new Textgenerator({
    apiKey: TEXTGEN_REAL_API_TEST_CONFIG.API_KEY,
    baseUrl: TEXTGEN_REAL_API_TEST_CONFIG.BASE_URL,
    user: TEXTGEN_REAL_API_TEST_CONFIG.TEST_USER,
  });

  try {
    const audioBlob = textgen.textToAudio({
      text: "Hello, this is a test audio message generated by the Textgenerator class.",
    });

    console.log("🔊 音声ファイル情報:");
    console.log("  - ファイル名:", audioBlob.getName());
    console.log("  - サイズ:", audioBlob.getBytes().length, "bytes");
    console.log("  - Content-Type:", audioBlob.getContentType());

    // Google Driveに保存してテスト用に確認
    // const savedFile = DriveApp.createFile(audioBlob);
    // console.log("💾 Google Driveに保存:", savedFile.getUrl());
  } catch (error) {
    console.error("❌ 音声変換テストエラー:", error.message);
  }
}

/**
 * APIキー設定用のヘルパー関数
 */
function setTextgeneratorApiKey(apiKey) {
  PropertiesService.getScriptProperties().setProperty(
    "DIFY_TEXTGEN_API_KEY",
    apiKey
  );
  console.log("✅ Textgenerator APIキーを設定しました");
}

function setTextgeneratorAppId(appId) {
  PropertiesService.getScriptProperties().setProperty(
    "DIFY_TEXTGEN_APP_ID",
    appId
  );
  console.log("✅ Textgenerator アプリIDを設定しました");
}

/**
 * 設定状況確認用の関数
 */
function checkTextgeneratorTestConfig() {
  console.log("🔍 Textgenerator テスト設定状況:");
  console.log(
    "  - API Key:",
    TEXTGEN_REAL_API_TEST_CONFIG.API_KEY ? "✅ 設定済み" : "❌ 未設定"
  );
  console.log("  - Base URL:", TEXTGEN_REAL_API_TEST_CONFIG.BASE_URL);
  console.log("  - Test User:", TEXTGEN_REAL_API_TEST_CONFIG.TEST_USER);
  console.log(
    "  - App ID:",
    TEXTGEN_REAL_API_TEST_CONFIG.TEXTGEN_APP_ID ? "✅ 設定済み" : "❌ 未設定"
  );
  console.log(
    "  - File Tests:",
    TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_FILE_TESTS ? "✅ 有効" : "❌ 無効"
  );
  console.log(
    "  - Audio Tests:",
    TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_AUDIO_TESTS ? "✅ 有効" : "❌ 無効"
  );
  console.log(
    "  - Feedback Tests:",
    TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_FEEDBACK_TESTS ? "✅ 有効" : "❌ 無効"
  );
  console.log(
    "  - Destructive Tests:",
    TEXTGEN_REAL_API_TEST_CONFIG.ENABLE_DESTRUCTIVE_TESTS
      ? "✅ 有効"
      : "❌ 無効"
  );
}
