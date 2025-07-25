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
 * @property {Object} fileUploadConfig - ファイルアップロード設定 (初期化時に取得)
 * @property {Object} systemParameters - システムパラメータ (初期化時に取得)
 * @property {Array} userInputForm - ユーザー入力フォーム設定 (初期化時に取得)
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

    // アプリケーション機能の有効状態を初期化時に取得・保存
    this._initializeAppFeatures();
  }

  /**
   * ワークフローを実行する
   * @param {Object} inputs - アプリで定義された変数値の入力 (必須)
   * @param {string} [inputs.type] - 入力のタイプ (document,image,audio,video,custom)変数がファイルリストの場合必須
   * @param {string} [inputs.transfer_method] - 転送方法 画像URLの場合はremote_url / ファイルアップロードの場合はlocal_file(変数がファイルリストの場合必須)
   * @param {string} [inputs.url] - アップロードするファイルの名前 （転送方法がremote_urlの場合必須）
   * @param {string} [inputs.upload_file_id] - アップロードされたファイルID、事前にファイルアップロードAPIを通じて取得する必要があります（転送方法がlocal_fileの場合）
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
   * ```json
   * {
   *   "workflow_run_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "task_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "status": "succeeded",
   *   "outputs": {},
   *   "error": null,
   *   "total_steps": 5,
   *   "total_tokens": 123,
   *   "elapsed_time": 12.5,
   *   "created_at": 123,
   *   "finished_at": 123,
   *   "combined_text": "結合されたテキスト出力",
   *   "text_chunks": [
   *     {
   *       "text": "テキストフラグメント",
   *       "from_variable_selector": ["node_id", "variable_name"]
   *     }
   *   ],
   *   "audio_chunks": [
   *     {
   *       "audio": "Base64エンコードされたMP3音声データ",
   *       "message_id": "message-id",
   *       "created_at": 123
   *     }
   *   ]
   * }
   * ```
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
  getWorkflowLogs(options) {
    options = options || {};

    const params = {};

    if (options.keyword) params.keyword = options.keyword;
    if (options.status) params.status = options.status;
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const queryString = this._buildQueryString(params);
    const endpoint = queryString
      ? "/workflows/logs?" + queryString
      : "/workflows/logs";

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

    return this._makeRequest(
      "/workflows/tasks/" + taskId + "/stop",
      "POST",
      payload,
    );
  }

  /**
   * アプリケーションの基本情報を取得する
   *
   * @returns {Object} アプリケーションの基本情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "name": "アプリケーション名",
   *   "description": "アプリケーションの説明",
   *   "tags": ["タグ1", "タグ2"]
   * }
   * ```
   */
  getAppInfo() {
    return this._makeRequest("/info", "GET");
  }

  /**
   * アプリケーションのパラメータ情報を取得する
   *
   * @returns {Object} アプリケーションのパラメータ情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "user_input_form": [
   *     {
   *       "text-input": {
   *         "label": "変数表示ラベル名",
   *         "variable": "変数ID",
   *         "required": true,
   *         "default": "デフォルト値"
   *       }
   *     }
   *   ],
   *   "file_upload": {
   *     "image": {
   *       "enabled": true,
   *       "number_limits": 3,
   *       "detail": "高解像度",
   *       "transfer_methods": ["remote_url", "local_file"]
   *     }
   *   },
   *   "system_parameters": {
   *     "file_size_limit": 50,
   *     "image_file_size_limit": 10,
   *     "audio_file_size_limit": 50,
   *     "video_file_size_limit": 100
   *   }
   * }
   * ```
   */
  getAppParameters() {
    return this._makeRequest("/parameters", "GET");
  }

  /**
   * WebApp設定を取得する
   *
   * @returns {Object} WebApp設定情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "title": "WebApp名",
   *   "icon_type": "emoji",
   *   "icon": "🤖",
   *   "icon_background": "#FFFFFF",
   *   "icon_url": "https://example.com/icon.png",
   *   "description": "説明",
   *   "copyright": "著作権情報",
   *   "privacy_policy": "プライバシーポリシーのリンク",
   *   "custom_disclaimer": "カスタム免責事項",
   *   "default_language": "ja-JP",
   *   "show_workflow_steps": true
   * }
   * ```
   */
  getWebAppSettings() {
    return this._makeRequest("/site", "GET");
  }

  /**
   * アプリケーション機能の初期化（内部メソッド）
   * @private
   */
  _initializeAppFeatures() {
    try {
      const appParams = this.getAppParameters();

      // 各機能の有効状態をプロパティに保存
      this.fileUpload = {
        image: appParams.file_upload.image || {},
        document: appParams.file_upload.document || {},
        video: appParams.file_upload.video || {},
        audio: appParams.file_upload.audio || {},
      };
      // ユーザー入力フォームの構成の設定も保存
      this.userInput = {
        text_input:
          appParams.user_input_form.filter((param) => {
            return param.text_input;
          }) || [],
        paragraph:
          appParams.user_input_form.filter((param) => {
            return param.paragraph;
          }) || [],
        select:
          appParams.user_input_form.filter((param) => {
            return param.select;
          }) || [],
      };
      // システムパラメータも保存
      this.systemParameters = appParams.system_parameters || {};
    } catch (error) {
      // 初期化時のエラーは警告として記録し、デフォルト値を設定
      Logger.log(
        "アプリケーション機能の初期化中にエラーが発生しました: " +
          error.message,
      );
      // 成功時と同じプロパティ構造に合わせる
      this.fileUpload = {
        image: {},
        document: {},
        video: {},
        audio: {},
      };
      this.userInput = {
        text_input: [],
        paragraph: [],
        select: [],
      };
      this.systemParameters = {};
    }
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
        }MB`,
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
        }`,
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
      let status = "";
      let error = null;
      let combinedText = "";
      let textChunks = [];
      let audio = null;

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

              case "text_chunk":
                Logger.log("text_chunk event received");
                if (json.data && json.data.text) {
                  combinedText += json.data.text;
                  textChunks.push({
                    text: json.data.text,
                    from_variable_selector:
                      json.data.from_variable_selector || null,
                  });
                }
                break;

              case "workflow_finished":
                Logger.log("workflow_finished event received");
                if (json.data) {
                  outputs = json.data.outputs || {};
                  error = json.data.error;
                  status = json.data.status || "succeeded";
                }
                break;

              case "node_started":
                Logger.log(
                  `node_started event received - Node: ${
                    json.data?.title || json.data?.node_id
                  } (${json.data?.node_type})`,
                );
                break;

              case "node_finished":
                Logger.log(
                  `node_finished event received - Node: ${
                    json.data?.title || json.data?.node_id
                  } (${json.data?.status})`,
                );
                break;

              case "tts_message":
                Logger.log("tts_message event received");
                if (json.audio) {
                  audio = json.audio;
                }
                break;

              case "tts_message_end":
                Logger.log("tts_message_end event received");
                break;

              case "ping":
                Logger.log("ping event received - connection maintained");
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
            Logger.log(
              `JSON解析エラー: ${parseError.message}, データ: ${dataStr}`,
            );
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
        combined_text: combinedText,
        text_chunks: textChunks,
        audio: audio,
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
        }`,
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
          `API エラー (HTTP ${responseCode}): ${safeErrorMessage}`,
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
      (timestamp) => now - timestamp < this._rateLimitWindow,
    );

    // リクエスト数が上限に達している場合、エラーを投げる
    if (this._rateLimitRequests.length >= this._rateLimitMax) {
      throw new Error(
        `レート制限に達しました。${this._rateLimitWindow / 1000}秒間に${
          this._rateLimitMax
        }リクエストを超えています`,
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
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
      )
      .join("&");
  }
}
