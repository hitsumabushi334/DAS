/**
 * DAS (Dify Application Script) - Workflow Class
 * Google Apps Script から Dify Workflow API を簡単に呼び出すためのライブラリ
 */

/**
 * Workflowクラス - Difyのワークフロー機能へのアクセス
 * @param {Object} options - 初期化オプション
 * @param {string} options.apiKey - Dify APIキー (必須)
 * @param {string} options.user - ユーザー識別子 (必須, 未指定時はクラスのuserプロパティを使用)
 * @param {string} [options.baseUrl] - Dify APIのベースURL (任意, デフォルト: "https://api.dify.ai/v1")
 *
 * @property {string} apiKey - Dify APIキー
 * @property {string} baseUrl - Dify APIのベースURL
 * @property {string} user - デフォルトユーザー識別子
 * @property {Object} _cache - リクエストキャッシュ (内部使用)
 * @property {number} _cacheTimeout - キャッシュタイムアウト (ミリ秒)
 * @property {Array<number>} _rateLimitRequests - レート制限用リクエスト履歴
 * @property {number} _rateLimitWindow - レート制限ウィンドウ (ミリ秒)
 * @property {number} _rateLimitMax - レート制限最大リクエスト数
 */
class Workflow {
  constructor(options) {
    const { apiKey, user, baseUrl } = options;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.dify.ai/v1";
    this.user = user;

    // リクエストキャッシュ (GETリクエスト用)
    this._cache = {};
    this._cacheTimeout = 5 * 60 * 1000; // 5分間のキャッシュ

    // レート制限 (1分間に60リクエスト)
    this._rateLimitRequests = [];
    this._rateLimitWindow = 60 * 1000; // 1分間 
    this._rateLimitMax = 60; // 最大60リクエスト
  }

  /**
   * ワークフローを実行する
   * @param {Object} inputs - アプリで定義された変数値の入力 (必須)
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.response_mode] - 応答モード (任意, 'streaming' または 'blocking', デフォルト: 'streaming')
   * @param {Array<object>} [options.files] - ファイルリスト (任意) - 下位互換性のため。inputsの使用を推奨
   *
   * @returns {Object} 応答モードによって異なる構造のJSONオブジェクト
   *
   * **blocking モードの戻り値:**
   * ```json
   * {
   *   "workflow_run_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "task_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "data": {
   *     "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *     "workflow_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *     "status": "succeeded",
   *     "outputs": {},
   *     "error": null,
   *     "elapsed_time": 123,
   *     "total_tokens": 123,
   *     "total_steps": 0,
   *     "created_at": 123,
   *     "finished_at": 123
   *   }
   * }
   * ```
   *
   * **streaming モードの戻り値:**
   * ストリーミングイベントを解析して結合された結果を返します
   */
  runWorkflow(inputs, user, options) {
    user = user || this.user;
    if (!inputs) {
      throw new Error(`inputsは必須パラメータです`);
    }

    options = options || {};

    const payload = {
      inputs: inputs,
      response_mode: options.response_mode || "streaming",
      user: user,
    };

    if (options.files) {
      payload.files = options.files;
    }

    // ストリーミングモードの場合
    if (payload.response_mode === "streaming") {
      // ストリーミング用の特別な処理
      const url = this.baseUrl + "/workflows/run";
      const options = {
        method: "POST",
        headers: {
          Authorization: "Bearer " + this.apiKey,
          "Content-Type": "application/json",
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      };
      const response = UrlFetchApp.fetch(url, options);
      return this._parseStreamingResponse(response);
    }

    // ブロッキングモードの場合
    return this._makeRequest("/workflows/run", "POST", payload);
  }

  /**
   * ワークフローログを取得する
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.keyword] - 検索するキーワード (任意)
   * @param {string} [options.status] - 実行ステータス (任意, succeeded, failed, stopped, running)
   * @param {number} [options.page] - 現在のページ (任意, デフォルト: 1)
   * @param {number} [options.limit] - 1回のリクエストで返すアイテムの数 (任意, デフォルト: 20)
   *
   * @returns {Object} ワークフローログリスト - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "page": 1,
   *   "limit": 20,
   *   "total": 50,
   *   "has_more": true,
   *   "data": [
   *     {
   *       "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "workflow_run": {
   *         "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *         "version": "1.0",
   *         "status": "succeeded",
   *         "error": null,
   *         "elapsed_time": 123,
   *         "total_tokens": 123,
   *         "total_steps": 5,
   *         "created_at": 123,
   *         "finished_at": 123
   *       },
   *       "created_from": "api",
   *       "created_by_role": "end_user",
   *       "created_by_account": null,
   *       "created_by_end_user": {
   *         "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *         "type": "user",
   *         "is_anonymous": false,
   *         "session_id": "session-123"
   *       },
   *       "created_at": 123
   *     }
   *   ]
   * }
   * ```
   */
  getWorkflowLogs(user, options) {
    user = user || this.user;
    options = options || {};

    const params = {};
    
    if (options.keyword) params.keyword = options.keyword;
    if (options.status) params.status = options.status;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const queryString = this._buildQueryString(params);
    const endpoint = queryString ? "/workflows/logs?" + queryString : "/workflows/logs";

    return this._makeRequest(endpoint, "GET");
  }

  /**
   * ワークフロー実行詳細を取得する
   * @param {string} workflowRunId - ワークフロー実行ID (必須, UUID形式)
   *
   * @returns {Object} ワークフロー実行詳細 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "workflow_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "status": "succeeded",
   *   "inputs": "{\"query\": \"Hello World\"}",
   *   "outputs": {
   *     "result": "処理結果"
   *   },
   *   "error": null,
   *   "total_steps": 5,
   *   "total_tokens": 123,
   *   "created_at": 123,
   *   "finished_at": 123,
   *   "elapsed_time": 12.5
   * }
   * ```
   */
  getWorkflowRunDetail(workflowRunId) {
    if (!workflowRunId) {
      throw new Error(`workflowRunIdは必須パラメータです`);
    }

    return this._makeRequest("/workflows/run/" + workflowRunId, "GET");
  }

  /**
   * ワークフロータスクの生成を停止する
   * @param {string} taskId - タスクID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} 停止結果
   * ```json
   * {
   *   "result": "success"
   * }
   * ```
   */
  stopWorkflowTask(taskId, user) {
    user = user || this.user;
    if (!taskId) {
      throw new Error(`taskIdは必須パラメータです`);
    }

    const payload = { user: user };

    return this._makeRequest("/workflows/tasks/" + taskId + "/stop", "POST", payload);
  }

  /**
   * ファイルをアップロードする (ワークフロー用)
   * @param {Blob} file - アップロードするファイル (必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} アップロード結果 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "name": "example.pdf",
   *   "size": 1048576,
   *   "extension": "pdf",
   *   "mime_type": "application/pdf",
   *   "created_by": "user-id",
   *   "created_at": 1705395332
   * }
   * ```
   */
  uploadFile(file, user) {
    user = user || this.user;
    if (!file) {
      throw new Error(`fileは必須パラメータです`);
    }

    // ファイルサイズ検証 (50MB制限)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.getSize && file.getSize() > MAX_FILE_SIZE) {
      throw new Error(
        `ファイルサイズが制限を超えています。最大サイズ: ${
          MAX_FILE_SIZE / (1024 * 1024)
        }MB`
      );
    }

    const formData = {
      file: file,
      user: user,
    };

    const options = {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.apiKey,
      },
      payload: formData,
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(this.baseUrl + "/files/upload", options);

    const HTTP_STATUS = {
      OK: 200,
      CREATED: 201,
    };

    if (
      response.getResponseCode() !== HTTP_STATUS.OK &&
      response.getResponseCode() !== HTTP_STATUS.CREATED
    ) {
      let errorInfo;
      try {
        const responseText = response.getContentText();
        errorInfo = JSON.parse(responseText);
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }

      throw new Error(
        `ファイルアップロードエラー (HTTP ${response.getResponseCode()}): ${
          errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * ストリーミングレスポンスを解析する (内部メソッド)
   * @param {HTTPResponse} response - UrlFetchAppからのレスポンス
   * @returns {Object} 解析された結果
   * @private
   */
  _parseStreamingResponse(response) {
    const HTTP_STATUS = { OK: 200 };
    const responseCode = response.getResponseCode();

    if (responseCode === HTTP_STATUS.OK) {
      Logger.log("Workflow streaming API call successful");

      const content = response.getContentText();
      const lines = content.split("\n");
      let workflowRunId = null;
      let taskId = null;
      let outputs = {};
      let error = null;
      let status = null;
      let totalSteps = 0;
      let totalTokens = 0;
      let elapsedTime = null;
      let createdAt = null;
      let finishedAt = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("data: ")) {
          try {
            const dataStr = line.substring(6);

            // [DONE]チェック
            if (dataStr.trim() === "[DONE]") {
              Logger.log("Workflow streaming completed with [DONE] signal");
              break;
            }

            const json = JSON.parse(dataStr);

            switch (json.event) {
              case "workflow_started":
                Logger.log("workflow_started event received");
                if (json.workflow_run_id) {
                  workflowRunId = json.workflow_run_id;
                }
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.data && json.data.created_at) {
                  createdAt = json.data.created_at;
                }
                break;

              case "workflow_finished":
                Logger.log("workflow_finished event received");
                if (json.data) {
                  status = json.data.status;
                  outputs = json.data.outputs || {};
                  error = json.data.error;
                  totalSteps = json.data.total_steps || 0;
                  totalTokens = json.data.total_tokens || 0;
                  elapsedTime = json.data.elapsed_time;
                  finishedAt = json.data.finished_at;
                }
                break;

              case "node_started":
                Logger.log("node_started event received");
                break;

              case "node_finished":
                Logger.log("node_finished event received");
                break;

              case "error":
                Logger.log("error event received");
                error = json.data ? json.data.error : json.message;
                status = "failed";
                throw new Error(`ワークフローストリーミングエラー: ${error}`);

              default:
                Logger.log(`未知のイベント: ${json.event}`);
                break;
            }
          } catch (parseError) {
            Logger.log(`JSON解析エラー: ${parseError.message}, データ: ${dataStr}`);
            // 解析エラーは無視して続行
          }
        }
      }

      return {
        workflow_run_id: workflowRunId,
        task_id: taskId,
        status: status,
        outputs: outputs,
        error: error,
        total_steps: totalSteps,
        total_tokens: totalTokens,
        elapsed_time: elapsedTime,
        created_at: createdAt,
        finished_at: finishedAt,
      };
    } else {
      let errorInfo;
      try {
        const responseText = response.getContentText();
        errorInfo = JSON.parse(responseText);
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }

      throw new Error(
        `ワークフローAPI エラー (HTTP ${responseCode}): ${
          errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }
  }

  /**
   * HTTP リクエストを作成・実行する (内部メソッド)
   * @param {string} endpoint - APIエンドポイント
   * @param {string} method - HTTPメソッド
   * @param {Object} [payload] - リクエストペイロード
   * @returns {Object} API レスポンス
   * @private
   */
  _makeRequest(endpoint, method, payload) {
    const HTTP_STATUS = { OK: 200 };
    const url = this.baseUrl + endpoint;

    // GETリクエストの場合、キャッシュをチェック
    if (method === "GET") {
      const cacheKey = url;
      const cached = this._cache[cacheKey];

      if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
        return cached.data;
      }
    }

    // レート制限チェック
    this._checkRateLimit();

    const options = {
      method: method,
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
      muteHttpExceptions: true,
    };

    if (payload && method !== "GET") {
      options.payload = JSON.stringify(payload);
    }

    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (responseCode < HTTP_STATUS.OK || responseCode >= 300) {
        let errorInfo;
        try {
          errorInfo = JSON.parse(responseText);
        } catch (e) {
          errorInfo = { message: responseText };
        }

        // セキュリティのためAPI keyが含まれる可能性のあるエラーメッセージをサニタイズ
        const safeErrorMessage = (
          errorInfo.message ||
          errorInfo.error ||
          responseText
        ).replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");
        throw new Error(
          `API エラー (HTTP ${responseCode}): ${safeErrorMessage}`
        );
      }

      const responseData = JSON.parse(responseText);

      // GETリクエストの結果をキャッシュ
      if (method === "GET") {
        const cacheKey = url;
        this._cache[cacheKey] = {
          data: responseData,
          timestamp: Date.now(),
        };
      }

      return responseData;
    } catch (error) {
      if (error.message.indexOf("API エラー") === 0) {
        throw error;
      }
      throw new Error(`リクエスト実行エラー: ${error.message}`);
    }
  }

  /**
   * レート制限をチェックする (内部メソッド)
   * @private
   */
  _checkRateLimit() {
    const now = Date.now();

    // 古いリクエストを削除
    this._rateLimitRequests = this._rateLimitRequests.filter(
      (timestamp) => now - timestamp < this._rateLimitWindow
    );

    // リクエスト数が上限に達している場合、エラーを投げる
    if (this._rateLimitRequests.length >= this._rateLimitMax) {
      throw new Error(
        `レート制限に達しました。${this._rateLimitWindow / 1000}秒間に${
          this._rateLimitMax
        }リクエストを超えています`
      );
    }

    // 現在のリクエストを記録
    this._rateLimitRequests.push(now);
  }

  /**
   * クエリ文字列を構築する (内部メソッド)
   * @param {Object} params - パラメータオブジェクト
   * @returns {string} エンコードされたクエリ文字列
   * @private
   */
  _buildQueryString(params) {
    return Object.keys(params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
  }
}