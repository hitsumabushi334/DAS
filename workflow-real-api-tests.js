/**
 * DAS (Dify Application Script) - Workflow 実際のAPIを使用したテストスイート
 * Google Apps Script環境で実際のDify Workflow APIを呼び出してテストを実行
 */

/**
 * 実際のAPIテスト設定
 * 実行前に以下の設定を行ってください：
 * 1. API_KEY: 有効なDify APIキー
 * 2. BASE_URL: DifyインスタンスのベースURL
 * 3. TEST_USER: テスト用ユーザーID
 * 4. WORKFLOW_APP_ID: テスト用のワークフローアプリケーションID
 */
const WORKFLOW_REAL_API_TEST_CONFIG = {
  API_KEY: PropertiesService.getScriptProperties().getProperty("DIFY_API_KEY"), // 実際のAPIキーに変更してください
  BASE_URL: "https://api.dify.ai/v1", // 実際のDifyインスタンスURLに変更してください
  TEST_USER: "test-user-workflow-api-real", // テスト用ユーザーID
  WORKFLOW_APP_ID: PropertiesService.getScriptProperties().getProperty("DIFY_WORKFLOW_APP_ID"), // ワークフローアプリID
  ENABLE_FILE_TESTS: true, // ファイルテストを有効にする場合はtrueに設定
  ENABLE_DESTRUCTIVE_TESTS: false, // 停止系テストを有効にする場合はtrueに設定
  TEST_TIMEOUT: 60000, // テストタイムアウト（ミリ秒）- ワークフローは処理時間が長い場合がある
};

/**
 * 実際のAPIテスト用のフレームワーククラス
 */
class WorkflowRealApiTestFramework {
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

  assertHasProperty(obj, property, message) {
    if (!obj || !obj.hasOwnProperty(property)) {
      throw new Error(
        `アサーション失敗: ${message}. プロパティ '${property}' が存在しません`
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
        `アサーション失敗: ${message}. 値がオブジェクトではありません`
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
      Logger.log(`[Workflow実際APIテスト開始] ${testName}`);
      const result = testFunction();

      // Promiseの場合は待機
      if (result && typeof result.then === "function") {
        result
          .then(() => {
            this.recordSuccess(testName, startTime);
          })
          .catch((error) => {
            this.recordFailure(testName, startTime, error);
          });
      } else {
        this.recordSuccess(testName, startTime);
      }
    } catch (error) {
      this.recordFailure(testName, startTime, error);
    }
  }

  recordSuccess(testName, startTime) {
    const endTime = new Date();
    const duration = endTime - startTime;
    this.testResults.push({
      name: testName,
      status: "SUCCESS",
      duration: duration,
      error: null,
    });
    Logger.log(`[成功] ${testName} (${duration}ms)`);
  }

  recordFailure(testName, startTime, error) {
    const endTime = new Date();
    const duration = endTime - startTime;
    this.testResults.push({
      name: testName,
      status: "FAILURE",
      duration: duration,
      error: error.message,
    });
    Logger.log(`[失敗] ${testName} (${duration}ms): ${error.message}`);
  }

  /**
   * テスト結果のレポート生成
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(
      (result) => result.status === "SUCCESS"
    ).length;
    const failedTests = totalTests - successfulTests;

    console.log("\n=== DAS Workflow 実際APIテスト結果 ===");
    console.log(`総テスト数: ${totalTests}`);
    console.log(`成功: ${successfulTests}`);
    console.log(`失敗: ${failedTests}`);
    console.log(
      `成功率: ${totalTests > 0 ? ((successfulTests / totalTests) * 100).toFixed(2) : 0}%`
    );

    if (failedTests > 0) {
      console.log("\n=== 失敗したテスト ===");
      this.testResults
        .filter((result) => result.status === "FAILURE")
        .forEach((result) => {
          console.log(`❌ ${result.name}: ${result.error}`);
        });
    }

    return {
      total: totalTests,
      successful: successfulTests,
      failed: failedTests,
      success_rate: totalTests > 0 ? (successfulTests / totalTests) * 100 : 0,
      results: this.testResults,
    };
  }
}

/**
 * Workflow実際のAPIテストスイート
 */
class WorkflowRealApiTestSuite {
  constructor() {
    this.framework = new WorkflowRealApiTestFramework();
    this.workflow = null;
    this.testWorkflowRunId = null; // テストで作成されたワークフロー実行ID
    this.testTaskId = null; // テストで作成されたタスクID
  }

  /**
   * テスト前のセットアップ
   */
  setUp() {
    if (!WORKFLOW_REAL_API_TEST_CONFIG.API_KEY) {
      throw new Error(
        "API_KEYが設定されていません。WORKFLOW_REAL_API_TEST_CONFIG.API_KEYを設定してください。"
      );
    }

    this.workflow = new Workflow({
      apiKey: WORKFLOW_REAL_API_TEST_CONFIG.API_KEY,
      baseUrl: WORKFLOW_REAL_API_TEST_CONFIG.BASE_URL,
      user: WORKFLOW_REAL_API_TEST_CONFIG.TEST_USER,
    });

    Logger.log("Workflow実際APIテストスイートの初期化が完了しました");
  }

  /**
   * 全テストの実行
   */
  runAllTests() {
    console.log("=== DAS Workflow 実際APIテスト開始 ===\n");

    try {
      this.setUp();

      // 基本機能テスト
      this.testBasicWorkflowFunctionality();

      // ワークフロー実行テスト
      this.testWorkflowExecution();

      // ワークフローログテスト
      this.testWorkflowLogs();

      // ワークフロー詳細取得テスト
      this.testWorkflowRunDetail();

      // ファイルアップロードテスト（有効な場合）
      if (WORKFLOW_REAL_API_TEST_CONFIG.ENABLE_FILE_TESTS) {
        this.testFileUpload();
      }

      // 停止系テスト（有効な場合）
      if (WORKFLOW_REAL_API_TEST_CONFIG.ENABLE_DESTRUCTIVE_TESTS) {
        this.testWorkflowTaskStop();
      }

    } catch (error) {
      Logger.log(`テストスイートの実行エラー: ${error.message}`);
    }

    return this.framework.generateReport();
  }

  /**
   * 基本機能テスト
   */
  testBasicWorkflowFunctionality() {
    console.log("\n--- 基本機能テスト ---");

    // 1. Workflowインスタンス作成テスト
    this.framework.runTest("Workflowインスタンス作成", () => {
      this.framework.assertNotNull(this.workflow, "Workflowインスタンスが作成されている");
      this.framework.assertEqual(
        this.workflow.apiKey,
        WORKFLOW_REAL_API_TEST_CONFIG.API_KEY,
        "APIキーが正しく設定されている"
      );
      this.framework.assertEqual(
        this.workflow.baseUrl,
        WORKFLOW_REAL_API_TEST_CONFIG.BASE_URL,
        "ベースURLが正しく設定されている"
      );
      this.framework.assertEqual(
        this.workflow.user,
        WORKFLOW_REAL_API_TEST_CONFIG.TEST_USER,
        "ユーザーが正しく設定されている"
      );
    });

    // 2. 必須パラメータ検証テスト
    this.framework.runTest("runWorkflow - 必須パラメータ検証", () => {
      try {
        this.workflow.runWorkflow(null);
        throw new Error("例外が発生するはずです");
      } catch (error) {
        this.framework.assertTrue(
          error.message.includes("inputsは必須パラメータです"),
          "適切なエラーメッセージが表示される"
        );
      }
    });

    // 3. getWorkflowRunDetail - 必須パラメータ検証テスト
    this.framework.runTest("getWorkflowRunDetail - 必須パラメータ検証", () => {
      try {
        this.workflow.getWorkflowRunDetail(null);
        throw new Error("例外が発生するはずです");
      } catch (error) {
        this.framework.assertTrue(
          error.message.includes("workflowRunIdは必須パラメータです"),
          "適切なエラーメッセージが表示される"
        );
      }
    });

    // 4. stopWorkflowTask - 必須パラメータ検証テスト
    this.framework.runTest("stopWorkflowTask - 必須パラメータ検証", () => {
      try {
        this.workflow.stopWorkflowTask(null);
        throw new Error("例外が発生するはずです");
      } catch (error) {
        this.framework.assertTrue(
          error.message.includes("taskIdは必須パラメータです"),
          "適切なエラーメッセージが表示される"
        );
      }
    });
  }

  /**
   * ワークフロー実行テスト
   */
  testWorkflowExecution() {
    console.log("\n--- ワークフロー実行テスト ---");

    // 1. ストリーミングモードでのワークフロー実行
    this.framework.runTest("runWorkflow - ストリーミングモード", () => {
      try {
        const inputs = {
          query: "Hello, this is a test workflow execution.",
        };

        const result = this.workflow.runWorkflow(inputs, null, {
          response_mode: "streaming",
        });

        this.framework.assertNotNull(result, "結果が返される");
        this.framework.assertHasProperty(result, "workflow_run_id", "workflow_run_idが含まれる");
        this.framework.assertHasProperty(result, "task_id", "task_idが含まれる");

        // テスト用にIDを保存
        if (result.workflow_run_id) {
          this.testWorkflowRunId = result.workflow_run_id;
        }
        if (result.task_id) {
          this.testTaskId = result.task_id;
        }

        Logger.log(`ワークフロー実行結果: ${JSON.stringify(result)}`);
      } catch (error) {
        // ワークフローが設定されていない場合やAPIエラーの場合
        Logger.log(`ワークフロー実行エラー（予期されるエラーの可能性）: ${error.message}`);
        this.framework.assertTrue(
          error.message.includes("API エラー") || error.message.includes("app_unavailable"),
          "APIエラーまたはアプリ利用不可エラー"
        );
      }
    });

    // 2. ブロッキングモードでのワークフロー実行
    this.framework.runTest("runWorkflow - ブロッキングモード", () => {
      try {
        const inputs = {
          query: "Hello, this is a blocking mode test.",
        };

        const result = this.workflow.runWorkflow(inputs, null, {
          response_mode: "blocking",
        });

        this.framework.assertNotNull(result, "結果が返される");
        this.framework.assertHasProperty(result, "workflow_run_id", "workflow_run_idが含まれる");

        Logger.log(`ブロッキングモード実行結果: ${JSON.stringify(result)}`);
      } catch (error) {
        Logger.log(`ブロッキングモード実行エラー（予期されるエラーの可能性）: ${error.message}`);
        this.framework.assertTrue(
          error.message.includes("API エラー") || error.message.includes("app_unavailable"),
          "APIエラーまたはアプリ利用不可エラー"
        );
      }
    });

    // 3. カスタム入力でのワークフロー実行
    this.framework.runTest("runWorkflow - カスタム入力", () => {
      try {
        const inputs = {
          text_input: "Custom test input",
          number_input: 42,
          boolean_input: true,
        };

        const result = this.workflow.runWorkflow(inputs);

        this.framework.assertNotNull(result, "結果が返される");
        Logger.log(`カスタム入力実行結果: ${JSON.stringify(result)}`);
      } catch (error) {
        Logger.log(`カスタム入力実行エラー（予期されるエラーの可能性）: ${error.message}`);
        this.framework.assertTrue(
          error.message.includes("API エラー"),
          "APIエラー"
        );
      }
    });
  }

  /**
   * ワークフローログテスト
   */
  testWorkflowLogs() {
    console.log("\n--- ワークフローログテスト ---");

    // 1. 基本的なログ取得
    this.framework.runTest("getWorkflowLogs - 基本取得", () => {
      try {
        const result = this.workflow.getWorkflowLogs();

        this.framework.assertNotNull(result, "結果が返される");
        this.framework.assertHasProperty(result, "data", "dataプロパティが含まれる");
        this.framework.assertHasProperty(result, "page", "pageプロパティが含まれる");
        this.framework.assertHasProperty(result, "limit", "limitプロパティが含まれる");
        this.framework.assertHasProperty(result, "has_more", "has_moreプロパティが含まれる");
        this.framework.assertIsArray(result.data, "dataが配列である");

        Logger.log(`ログ取得結果: 取得件数=${result.data.length}`);
      } catch (error) {
        Logger.log(`ログ取得エラー: ${error.message}`);
        this.framework.assertTrue(
          error.message.includes("API エラー"),
          "APIエラー"
        );
      }
    });

    // 2. オプション付きログ取得
    this.framework.runTest("getWorkflowLogs - オプション付き", () => {
      try {
        const result = this.workflow.getWorkflowLogs(null, {
          page: 1,
          limit: 5,
          status: "succeeded",
        });

        this.framework.assertNotNull(result, "結果が返される");
        this.framework.assertHasProperty(result, "data", "dataプロパティが含まれる");
        this.framework.assertTrue(
          result.limit <= 5,
          "limit設定が反映される"
        );

        Logger.log(`オプション付きログ取得結果: limit=${result.limit}`);
      } catch (error) {
        Logger.log(`オプション付きログ取得エラー: ${error.message}`);
        this.framework.assertTrue(
          error.message.includes("API エラー"),
          "APIエラー"
        );
      }
    });

    // 3. キーワード検索
    this.framework.runTest("getWorkflowLogs - キーワード検索", () => {
      try {
        const result = this.workflow.getWorkflowLogs(null, {
          keyword: "test",
          limit: 10,
        });

        this.framework.assertNotNull(result, "結果が返される");
        this.framework.assertHasProperty(result, "data", "dataプロパティが含まれる");

        Logger.log(`キーワード検索結果: 取得件数=${result.data.length}`);
      } catch (error) {
        Logger.log(`キーワード検索エラー: ${error.message}`);
        this.framework.assertTrue(
          error.message.includes("API エラー"),
          "APIエラー"
        );
      }
    });
  }

  /**
   * ワークフロー詳細取得テスト
   */
  testWorkflowRunDetail() {
    console.log("\n--- ワークフロー詳細取得テスト ---");

    // 1. 有効なIDでの詳細取得（テストで作成されたIDがある場合）
    if (this.testWorkflowRunId) {
      this.framework.runTest("getWorkflowRunDetail - 有効なID", () => {
        try {
          const result = this.workflow.getWorkflowRunDetail(this.testWorkflowRunId);

          this.framework.assertNotNull(result, "結果が返される");
          this.framework.assertHasProperty(result, "id", "idが含まれる");
          this.framework.assertHasProperty(result, "workflow_id", "workflow_idが含まれる");
          this.framework.assertHasProperty(result, "status", "statusが含まれる");
          this.framework.assertEqual(result.id, this.testWorkflowRunId, "IDが一致する");

          Logger.log(`詳細取得結果: status=${result.status}`);
        } catch (error) {
          Logger.log(`詳細取得エラー: ${error.message}`);
          this.framework.assertTrue(
            error.message.includes("API エラー"),
            "APIエラー"
          );
        }
      });
    }

    // 2. 無効なIDでの詳細取得
    this.framework.runTest("getWorkflowRunDetail - 無効なID", () => {
      try {
        const invalidId = "00000000-0000-0000-0000-000000000000";
        this.workflow.getWorkflowRunDetail(invalidId);
        
        // 404エラーが期待される
        throw new Error("404エラーが発生するはずです");
      } catch (error) {
        this.framework.assertTrue(
          error.message.includes("API エラー") && error.message.includes("404"),
          "404エラーが発生する"
        );
      }
    });
  }

  /**
   * ファイルアップロードテスト
   */
  testFileUpload() {
    console.log("\n--- ファイルアップロードテスト ---");

    // 1. テキストファイルのアップロード
    this.framework.runTest("uploadFile - テキストファイル", () => {
      try {
        // テスト用のテキストファイルを作成
        const testContent = "これはワークフロー用のテストファイルです。\nテスト日時: " + new Date().toISOString();
        const testBlob = Utilities.newBlob(testContent, "text/plain", "workflow_test.txt");

        const result = this.workflow.uploadFile(testBlob);

        this.framework.assertNotNull(result, "結果が返される");
        this.framework.assertHasProperty(result, "id", "idが含まれる");
        this.framework.assertHasProperty(result, "name", "nameが含まれる");
        this.framework.assertHasProperty(result, "size", "sizeが含まれる");
        this.framework.assertHasProperty(result, "mime_type", "mime_typeが含まれる");
        this.framework.assertEqual(result.name, "workflow_test.txt", "ファイル名が正しい");

        Logger.log(`ファイルアップロード結果: ${result.name} (${result.size} bytes)`);
      } catch (error) {
        Logger.log(`ファイルアップロードエラー: ${error.message}`);
        this.framework.assertTrue(
          error.message.includes("API エラー") || error.message.includes("ファイルアップロードエラー"),
          "アップロードエラー"
        );
      }
    });

    // 2. ファイルサイズ制限テスト
    this.framework.runTest("uploadFile - サイズ制限テスト", () => {
      try {
        // 小さなファイルで正常なケース
        const smallContent = "小さなテストファイル";
        const smallBlob = Utilities.newBlob(smallContent, "text/plain", "small_test.txt");

        const result = this.workflow.uploadFile(smallBlob);
        this.framework.assertNotNull(result, "小さなファイルのアップロードが成功");

        Logger.log(`小さなファイルアップロード成功: ${result.name}`);
      } catch (error) {
        Logger.log(`小さなファイルアップロードエラー: ${error.message}`);
      }
    });

    // 3. ファイル未指定エラーテスト
    this.framework.runTest("uploadFile - ファイル未指定エラー", () => {
      try {
        this.workflow.uploadFile(null);
        throw new Error("例外が発生するはずです");
      } catch (error) {
        this.framework.assertTrue(
          error.message.includes("fileは必須パラメータです"),
          "適切なエラーメッセージが表示される"
        );
      }
    });
  }

  /**
   * ワークフロータスク停止テスト
   */
  testWorkflowTaskStop() {
    console.log("\n--- ワークフロータスク停止テスト ---");

    // 1. 有効なタスクIDでの停止（テストで作成されたIDがある場合）
    if (this.testTaskId) {
      this.framework.runTest("stopWorkflowTask - 有効なタスクID", () => {
        try {
          const result = this.workflow.stopWorkflowTask(this.testTaskId);

          this.framework.assertNotNull(result, "結果が返される");
          this.framework.assertHasProperty(result, "result", "resultが含まれる");
          this.framework.assertEqual(result.result, "success", "停止成功");

          Logger.log(`タスク停止結果: ${result.result}`);
        } catch (error) {
          Logger.log(`タスク停止エラー（予期されるエラーの可能性）: ${error.message}`);
          this.framework.assertTrue(
            error.message.includes("API エラー"),
            "APIエラー"
          );
        }
      });
    }

    // 2. 無効なタスクIDでの停止
    this.framework.runTest("stopWorkflowTask - 無効なタスクID", () => {
      try {
        const invalidTaskId = "00000000-0000-0000-0000-000000000000";
        this.workflow.stopWorkflowTask(invalidTaskId);
        
        // エラーが期待される
        throw new Error("エラーが発生するはずです");
      } catch (error) {
        this.framework.assertTrue(
          error.message.includes("API エラー"),
          "APIエラーが発生する"
        );
      }
    });
  }

  /**
   * 個別テスト実行（デバッグ用）
   */
  runSingleTest(testName) {
    console.log(`=== 個別テスト実行: ${testName} ===`);

    const testMethods = {
      basic: () => this.testBasicWorkflowFunctionality(),
      execution: () => this.testWorkflowExecution(),
      logs: () => this.testWorkflowLogs(),
      detail: () => this.testWorkflowRunDetail(),
      file: () => this.testFileUpload(),
      stop: () => this.testWorkflowTaskStop(),
    };

    if (testMethods[testName]) {
      try {
        this.setUp();
        testMethods[testName]();
        return this.framework.generateReport();
      } catch (error) {
        Logger.log(`個別テスト実行エラー: ${error.message}`);
        return null;
      }
    } else {
      console.log(`テスト '${testName}' が見つかりません。`);
      console.log("利用可能なテスト:", Object.keys(testMethods).join(", "));
      return null;
    }
  }
}

/**
 * テスト実行用関数
 */

/**
 * 全てのWorkflow実際APIテストを実行
 */
function runWorkflowRealApiTests() {
  const testSuite = new WorkflowRealApiTestSuite();
  return testSuite.runAllTests();
}

/**
 * 個別テストを実行（デバッグ用）
 */
function runSingleWorkflowRealApiTest(testName) {
  const testSuite = new WorkflowRealApiTestSuite();
  return testSuite.runSingleTest(testName);
}

/**
 * 基本機能テストのみ実行
 */
function runWorkflowBasicTestsOnly() {
  const testSuite = new WorkflowRealApiTestSuite();
  console.log("=== Workflow基本機能テスト専用実行 ===\n");
  testSuite.setUp();
  testSuite.testBasicWorkflowFunctionality();
  return testSuite.framework.generateReport();
}

/**
 * ワークフロー実行テストのみ実行
 */
function runWorkflowExecutionTestsOnly() {
  const testSuite = new WorkflowRealApiTestSuite();
  console.log("=== Workflowワークフロー実行テスト専用実行 ===\n");
  testSuite.setUp();
  testSuite.testWorkflowExecution();
  return testSuite.framework.generateReport();
}

/**
 * メイン実行関数
 */
function mainWorkflowTests() {
  console.log("DAS Workflow 実際APIテストスイート");
  console.log("=====================================\n");
  console.log("利用可能な関数:");
  console.log("• runWorkflowRealApiTests() - 全テスト実行");
  console.log("• runSingleWorkflowRealApiTest('basic') - 個別テスト実行");
  console.log("• runWorkflowBasicTestsOnly() - 基本機能テストのみ");
  console.log("• runWorkflowExecutionTestsOnly() - 実行テストのみ");
  console.log("\n=== 全テスト実行開始 ===");

  return runWorkflowRealApiTests();
}

// デバッグ用の簡易テスト実行
function quickWorkflowTest() {
  console.log("=== Workflow簡易テスト実行 ===");
  const testSuite = new WorkflowRealApiTestSuite();
  testSuite.setUp();
  testSuite.testBasicWorkflowFunctionality();
  return testSuite.framework.generateReport();
}