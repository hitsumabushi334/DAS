/**
 * DAS (Dify Application Script) - 全クラス統合版 v3.0
 *
 * Difyベースクラス継承による完全統合実装
 *
 * @author DAS Project
 * @version 3.0.0
 */

// ========================================
// HTTP ステータスコード定数
// ========================================
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// ========================================
// Dify ベースクラス（全クラス共通機能）
// ========================================

/**
 * Dify API 基底クラス
 *
 * 全クラス共通の機能を提供：
 * - アプリ情報取得
 * - ファイルアップロード
 * - レート制限
 * - キャッシュ管理
 * - エラーハンドリング
 * - HTTP リクエスト処理
 *
 *  * Dify API クライアントを初期化
 *
 * @param {Object} options - 設定オプション
 * @param {string} options.apiKey - Dify API キー
 * @param {string} [options.baseUrl] - API ベース URL (デフォルト: "https://api.dify.ai/v1")
 * @param {string} [options.user] - デフォルトユーザー識別子
 * @throws {Error} API キーが未指定の場合
 * @property {string} apiKey - Dify APIキー (認証に使用)
 * @property {string} baseUrl - APIのベースURL (デフォルト: "https://api.dify.ai/v1")
 * @property {string} user - デフォルトユーザー識別子
 * @property {Object} _cache - HTTPリクエストのキャッシュ (内部使用)
 * @property {number} _cacheTimeout - キャッシュの有効期限 (ミリ秒, デフォルト: 5分)
 * @property {Array<number>} _rateLimitRequests - レート制限用リクエスト履歴 (内部使用)
 * @property {number} _rateLimitWindow - レート制限ウィンドウ (ミリ秒, デフォルト: 1分)
 * @property {number} _rateLimitMax - レート制限最大リクエスト数 (デフォルト: 60/分)
 * @property {Object} features - アプリケーション機能の有効状態
 * @property {Object} userInput - ユーザー入力フォームの設定
 * @property {Object} userInput.text_input - テキスト入力フィールドの配列
 * @property {Object} userInput.paragraph - 段落入力フィールドの配列
 * @property {Object} userInput.select - 選択入力フィールドの配列
 * @property {Object} systemParameters - システムパラメータ (ファイルサイズ制限等)
 * @property {Object} fileUpload - ファイルアップロード設定
 * @property {Object} fileUpload.image - 画像ファイルアップロード設定
 * @property {Object} fileUpload.document - 文書ファイルアップロード設定
 * @property {Object} fileUpload.video - 動画ファイルアップロード設定
 * @property {Object} fileUpload.audio - 音声ファイルアップロード設定
 * @property {string} [stopEndpoint] - タスク停止用エンドポイント (サブクラスで設定)
 */
class Dify {
  constructor(options) {
    // 必須パラメータの検証
    if (!options || !options.apiKey) {
      throw new Error("API キーは必須です");
    }

    // 基本設定
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || "https://api.dify.ai/v1";
    this.user = options.user;

    // キャッシュ設定
    this._cache = {};
    this._cacheTimeout = 5 * 60 * 1000; // 5分間

    // レート制限設定
    this._rateLimitRequests = [];
    this._rateLimitWindow = 60 * 1000; // 1分間
    this._rateLimitMax = 60; // 60リクエスト

    // アプリケーション機能状態
    this.features = {};
    this.userInput = {};
    this.systemParameters = {};

    // 初期化処理
    this._initializeCommonProperties();
  }

  /**
   * アプリケーション基本情報を取得
   *
   * @returns {Object} アプリケーション情報のJSONオブジェクト - 以下の構造
   * ```json
   * {
   *   "name": "アプリケーション名",
   *   "description": "アプリケーションの説明",
   *   "tags": ["タグ1", "タグ2"]
   * }
   * ```
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * const dify = new Dify({ apiKey: "your-api-key" });
   * const appInfo = dify.getAppInfo();
   * console.log(appInfo.name);
   */
  getAppInfo() {
    const cacheKey = "app-info";
    const cached = this._getCachedResponse(cacheKey);
    if (cached) {
      console.log("ℹ️ キャッシュからアプリ情報を取得しました");
      return cached;
    }

    console.log("🔍 アプリ情報を取得しています...");

    try {
      const response = this._makeRequest("/parameters", "GET");
      this._setCachedResponse(cacheKey, response);
      console.log("✅ アプリ情報の取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ アプリ情報の取得に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * アプリケーションのパラメータ情報を取得
   *
   * @returns {Object} パラメータ情報のJSONオブジェクト - 以下の構造
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
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * const dify = new Dify({ apiKey: "your-api-key" });
   * const params = dify.getAppParameters();
   * console.log(params.file_upload.image.enabled);
   */
  getAppParameters() {
    const cacheKey = "app-parameters";
    const cached = this._getCachedResponse(cacheKey);
    if (cached) {
      console.log("ℹ️ キャッシュからパラメータ情報を取得しました");
      return cached;
    }

    console.log("🔍 パラメータ情報を取得しています...");

    try {
      const response = this._makeRequest("/parameters", "GET");
      this._setCachedResponse(cacheKey, response);
      console.log("✅ パラメータ情報の取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ パラメータ情報の取得に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * WebApp設定を取得
   *
   * @returns {Object} WebApp設定情報のJSONオブジェクト - 以下の構造
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
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * const dify = new Dify({ apiKey: "your-api-key" });
   * const settings = dify.getWebAppSettings();
   * console.log(settings.title);
   */
  getWebAppSettings() {
    const cacheKey = "webapp-settings";
    const cached = this._getCachedResponse(cacheKey);
    if (cached) {
      console.log("ℹ️ キャッシュからWebApp設定を取得しました");
      return cached;
    }

    console.log("🔍 WebApp設定を取得しています...");

    try {
      const response = this._makeRequest("/site", "GET");
      this._setCachedResponse(cacheKey, response);
      console.log("✅ WebApp設定の取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ WebApp設定の取得に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * ファイルをアップロード
   *
   * @param {Blob} file - アップロードするファイル (必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} アップロード結果のJSONオブジェクト - 以下の構造
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
   * @throws {Error} ファイルが未指定の場合
   * @throws {Error} ユーザー識別子が未指定の場合
   * @throws {Error} ファイルサイズが制限を超えている場合
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * const dify = new Dify({ apiKey: "your-api-key", user: "user-123" });
   * const file = DriveApp.getFilesByName("example.pdf").next().getBlob();
   * const result = dify.uploadFile(file);
   * console.log(result.id);
   */
  uploadFile(file, user) {
    // パラメータ検証
    if (!file) {
      throw new Error("ファイルは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    // ファイルサイズ制限チェック
    const maxFileSize =
      this.systemParameters.file_upload_limit || 50 * 1024 * 1024; // デフォルト50MB
    if (file.size > maxFileSize) {
      throw new Error(
        `ファイルサイズが制限を超えています（最大: ${Math.round(
          maxFileSize / 1024 / 1024
        )}MB）`
      );
    }

    console.log(
      `📤 ファイルをアップロードしています... (${Math.round(
        file.size / 1024
      )}KB)`
    );

    try {
      const formData = {
        file: file,
        user: actualUser,
      };

      const response = this._makeRequest("/files/upload", "POST", formData);
      console.log("✅ ファイルアップロードが完了しました");
      return response;
    } catch (error) {
      console.error("❌ ファイルアップロードに失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * テキストを音声に変換する
   * @param {Object} options - 変換オプション (必須)
   * @param {string} [options.text] - 音声生成コンテンツ (任意, message_idが指定されていない場合は必須)
   * @param {string} [options.message_id] - メッセージID (任意, UUID形式, textより優先)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Blob} 音声ファイル (MP3またはWAV形式) - ファイル名は自動設定されます
   * @throws {Error} optionsが未指定の場合
   * @throws {Error} textまたはmessage_idが両方とも未指定の場合
   * @throws {Error} API リクエストが失敗した場合
   * @example
   * const dify = new Dify({ apiKey: "your-api-key", user: "user-123" });
   *
   * // テキストから音声を生成
   * const audioBlob = dify.textToAudio({
   *   text: "こんにちは、これは音声合成のテストです。"
   * });
   *
   * // メッセージIDから音声を生成
   * const audioFromMessage = dify.textToAudio({
   *   message_id: "3c90c3cc-0d44-4b50-8888-8dd25736052a"
   * });
   */
  textToAudio(options, user) {
    user = user || this.user;
    if (!options) {
      throw new Error("optionsは必須パラメータです");
    }
    if (!options.text && !options.message_id) {
      throw new Error("textまたはmessage_idのいずれかは必須パラメータです");
    }

    const payload = {
      user: user,
    };

    if (options.text) {
      payload.text = options.text;
    }
    if (options.message_id) {
      payload.message_id = options.message_id;
    }

    const url = this.baseUrl + "/text-to-audio";
    const requestOptions = {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, requestOptions);
    const responseCode = response.getResponseCode();

    if (responseCode !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        const responseText = response.getContentText();
        errorInfo = JSON.parse(responseText);
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }

      throw new Error(
        `音声変換エラー (HTTP ${responseCode}): ${
          errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }

    // レスポンスの音声データをBlobとして返す
    const contentType = response.getHeaders()["Content-Type"] || "audio/mp3";
    const audioData = response.getBlob();

    // ファイル名を適切に設定
    const extension = contentType.includes("wav") ? "wav" : "mp3";
    const fileName = `audio_${Date.now()}.${extension}`;

    return audioData.setName(fileName);
  }

  /**
   * タスクを停止する（汎用メソッド）
   * @param {string} taskId - タスクID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} 停止結果 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "result": "success"
   * }
   * ```
   * @throws {Error} taskIdが未指定の場合
   * @throws {Error} stopEndpointが設定されていない場合
   * @throws {Error} API リクエストが失敗した場合
   * @example
   * const dify = new Dify({ apiKey: "your-api-key", user: "user-123" });
   * const result = dify.stopTask("3c90c3cc-0d44-4b50-8888-8dd25736052a");
   * console.log(result.result); // "success"
   */
  stopTask(taskId, user) {
    user = user || this.user;
    if (!taskId) {
      throw new Error("taskIdは必須パラメータです");
    }

    if (!this.stopEndpoint) {
      throw new Error("stopEndpointが設定されていません");
    }

    const payload = { user: user };
    const endpoint = this.stopEndpoint.replace("{taskId}", taskId);
    return this._makeRequest(endpoint, "POST", payload);
  }

  /**
   * 共通プロパティの初期化（内部メソッド）
   * userInput、systemParameters、fileUploadの初期化を行う
   *
   * @private
   */
  _initializeCommonProperties() {
    try {
      const appParameters = this.getAppParameters();

      // ユーザー入力フォームの構成の設定も保存
      this.userInput = {
        text_input:
          appParameters.user_input_form.filter((param) => {
            return param.text_input;
          }) || [],
        paragraph:
          appParameters.user_input_form.filter((param) => {
            return param.paragraph;
          }) || [],
        select:
          appParameters.user_input_form.filter((param) => {
            return param.select;
          }) || [],
      };

      // システムパラメータも保存
      this.systemParameters = appParameters.system_parameters || {};

      // ファイルアップロード設定
      this.fileUpload = {
        image: appParameters.file_upload.image || {},
        document: appParameters.file_upload.document || {},
        video: appParameters.file_upload.video || {},
        audio: appParameters.file_upload.audio || {},
      };
    } catch (error) {
      // 初期化時のエラーは警告として記録し、デフォルト値を設定
      Logger.log(
        "共通プロパティの初期化中にエラーが発生しました: " + error.message
      );

      // デフォルト値を設定
      this.userInput = {
        text_input: [],
        paragraph: [],
        select: [],
      };
      this.systemParameters = {};
      this.fileUpload = {
        image: {},
        document: {},
        video: {},
        audio: {},
      };
    }
  }

  /**
   * 共通リクエスト処理メソッド - 全クラス共通のリクエスト送信とログ処理
   *
   * @protected
   * @param {string} endpoint - APIエンドポイント (必須, 例: "/chat-messages")
   * @param {Object} payload - リクエストペイロード (必須)
   * @param {Object} [options] - オプション設定 (任意)
   * @param {string} [options.response_mode] - 応答モード ("streaming" または "blocking")
   * @param {string} [operationName] - 操作名（ログ用, デフォルト: "リクエスト"）
   *
   * @returns {Object} APIレスポンス - ストリーミング解析済みまたはJSON形式
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * // サブクラスでの使用例
   * const payload = { query: "Hello", user: "user-123" };
   * const response = this._sendRequest("/chat-messages", payload, { response_mode: "blocking" }, "メッセージ送信");
   */
  _sendRequest(endpoint, payload, options = {}, operationName = "リクエスト") {
    console.log(
      `🚀 ${operationName}を送信しています... [${this.constructor.name}]`
    );

    try {
      const response = this._makeRequest(endpoint, "POST", payload);

      // ストリーミングレスポンスの解析（サブクラス固有）
      if (
        options.response_mode === "streaming" &&
        this._parseStreamingResponse
      ) {
        return this._parseStreamingResponse(response);
      }

      console.log(`✅ ${operationName}が完了しました`);
      return response;
    } catch (error) {
      console.error(
        `❌ ${operationName}に失敗しました [${this.constructor.name}]:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * HTTP リクエストを実行（内部メソッド）
   *
   * @private
   * @param {string} endpoint - API エンドポイント
   * @param {string} method - HTTP メソッド
   * @param {Object} [payload] - リクエストペイロード
   * @returns {Object} レスポンスのJSONオブジェクト
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
   * レート制限をチェック（内部メソッド）
   *
   * @private
   */
  _checkRateLimit() {
    const now = Date.now();

    // 古いリクエストを削除
    this._rateLimitRequests = this._rateLimitRequests.filter(
      (timestamp) => now - timestamp < this._rateLimitWindow
    );

    // 制限チェック
    if (this._rateLimitRequests.length >= this._rateLimitMax) {
      throw new Error(
        `レート制限に達しました（${this._rateLimitMax}リクエスト/${
          this._rateLimitWindow / 1000
        }秒）`
      );
    }

    // 現在のリクエストを記録
    this._rateLimitRequests.push(now);
  }

  /**
   * クエリ文字列を構築（内部メソッド）
   *
   * @private
   * @param {Object} params - パラメータオブジェクト
   * @returns {string} クエリ文字列
   */
  _buildQueryString(params) {
    if (!params || typeof params !== "object") {
      return "";
    }

    const queryParts = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        queryParts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        );
      }
    }

    return queryParts.join("&");
  }

  /**
   * キャッシュからレスポンスを取得（内部メソッド）
   *
   * @private
   * @param {string} key - キャッシュキー
   * @returns {Object|null} キャッシュされたレスポンス
   */
  _getCachedResponse(key) {
    const cached = this._cache[key];
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * レスポンスをキャッシュに保存（内部メソッド）
   *
   * @private
   * @param {string} key - キャッシュキー
   * @param {Object} data - キャッシュするデータ
   */
  _setCachedResponse(key, data) {
    this._cache[key] = {
      data: data,
      timestamp: Date.now(),
    };
  }
}

// ========================================
// ChatBase クラス（Chatbot/Chatflow共通機能）
// ========================================

/**
 * ChatBaseクラス - Difyベースクラスを継承したチャット系機能
 *
 * Chatbot/Chatflow共通の機能を提供：
 * - 会話管理
 * - メッセージ履歴
 * - フィードバック機能
 * - 音声変換機能
 * - 推奨質問取得
 * - Template Method パターンによるsendMessage統合
 *
 * **継承プロパティ (Difyクラスから):**
 * すべてのDifyクラスのプロパティを継承
 * * ChatBase クライアントを初期化
 *
 * @param {Object} options - 設定オプション
 * @param {string} options.apiKey - Dify API キー
 * @param {string} [options.baseUrl] - API ベース URL (デフォルト: "https://api.dify.ai/v1")
 * @param {string} [options.user] - デフォルトユーザー識別子
 * @throws {Error} API キーが未指定の場合
 * **ChatBase特有のプロパティ:**
 * @property {string} stopEndpoint - チャットメッセージタスク停止用エンドポイント (固定値: "/chat-messages/{taskId}/stop")
 * @property {Object} features - チャット系機能の有効状態
 * @property {boolean} features.speechToText - 音声→テキスト変換機能の有効状態
 * @property {boolean} features.textToSpeech - テキスト→音声変換機能の有効状態
 * @property {boolean} features.suggestedQuestionsAfterAnswer - 回答後推奨質問機能の有効状態
 * @property {Array} suggestedQuestions - アプリで設定された推奨質問リスト
 * @property {string} openingStatement - アプリで設定されたオープニングメッセージ
 */
class ChatBase extends Dify {
  constructor(options) {
    super(options);

    // stopEndpointを設定
    this.stopEndpoint = "/chat-messages/{taskId}/stop";

    // チャット系特有の初期化処理
    this._initializeChatFeatures();
  }

  /**
   * メッセージを送信（Template Method パターン）- ChatbotとChatflow共通メソッド
   *
   * @param {string} query - ユーザー入力/質問内容 (必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {Object} [options.inputs] - アプリで定義された変数値の入力 (任意)
   * @param {string} [options.response_mode] - 応答モード (任意, 'streaming' または 'blocking', デフォルト: 'blocking')
   * @param {string} [options.conversation_id] - 会話ID (任意, UUID形式)
   * @param {Array} [options.files] - ファイルリスト (任意)
   * @param {boolean} [options.auto_generate_name] - 自動名前生成フラグ (任意, デフォルト: true)
   *
   * @returns {Object} 応答結果のJSONオブジェクト - 応答モードによって構造が異なる
   * @throws {Error} クエリが未指定または非文字列の場合
   * @throws {Error} ユーザー識別子が未指定の場合
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * const chatbot = new Chatbot({ apiKey: "your-api-key", user: "user-123" });
   *
   * // 基本的なメッセージ送信
   * const response = chatbot.sendMessage("こんにちは");
   *
   * // オプション付きメッセージ送信
   * const response2 = chatbot.sendMessage("質問です", "user-456", {
   *   response_mode: "streaming",
   *   conversation_id: "conv-123",
   *   inputs: { variable1: "value1" }
   * });
   */
  sendMessage(query, user, options = {}) {
    // 共通バリデーション
    if (!query || typeof query !== "string") {
      throw new Error("クエリは必須の文字列です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    // ペイロード構築
    const payload = {
      inputs: options.inputs || {},
      query: query,
      response_mode: options.response_mode || "streaming",
      user: actualUser,
      conversation_id: options.conversation_id,
      files: options.files || [],
      auto_generate_name: options.auto_generate_name !== false,
    };

    // 共通リクエスト処理を使用
    return this._sendRequest(
      "/chat-messages",
      payload,
      options,
      "メッセージ送信"
    );
  }
  /**
   * アプリケーションのメタ情報を取得する
   *
   * @returns {Object} メタ情報 - アプリケーションのメタデータを含むJSONオブジェクト
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * const chatbot = new Chatbot({ apiKey: "your-api-key", user: "user-123" });
   * const meta = chatbot.getAppMeta();
   * console.log(meta);
   */
  getAppMeta() {
    return this._makeRequest("/meta", "GET");
  }

  /**
   * 会話一覧を取得する
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.last_id] - 最後のメッセージID (任意, ページング用)
   * @param {number} [options.limit] - 取得件数 (任意, デフォルト: 20)
   * @param {boolean} [options.pinned] - ピン留めされた会話のみ取得 (任意)
   *
   * @returns {Object} 会話一覧 - 以下の構造のJSONオブジェクト
   */
  getConversations(user, options) {
    user = user || this.user;
    options = options || {};

    const params = { user: user };
    if (options.last_id) params.last_id = options.last_id;
    if (options.limit) params.limit = options.limit;
    if (options.pinned !== undefined) params.pinned = options.pinned;

    const queryString = this._buildQueryString(params);
    const endpoint = queryString
      ? "/conversations?" + queryString
      : "/conversations";

    return this._makeRequest(endpoint, "GET");
  }

  /**
   * 会話履歴メッセージを取得する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.first_id] - 最初のメッセージID (任意, ページング用)
   * @param {number} [options.limit] - 取得件数 (任意, デフォルト: 20)
   *
   * @returns {Object} メッセージ履歴 - 以下の構造のJSONオブジェクト
   */
  getConversationMessages(conversationId, user, options) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    options = options || {};

    const params = { user: user };
    if (options.first_id) params.first_id = options.first_id;
    if (options.limit) params.limit = options.limit;
    params.conversation_id = conversationId;

    const queryString = this._buildQueryString(params);
    const endpoint = queryString ? "/messages?" + queryString : "/messages";

    return this._makeRequest(endpoint + queryString, "GET");
  }

  /**
   * 会話の名前を変更する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [name] - 新しい会話名 (任意, 指定しない場合は自動生成)
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {boolean} [autoGenerate] - 自動生成フラグ (任意, nameが未指定の場合にtrue推奨)
   *
   * @returns {Object} 更新結果
   */
  renameConversation(conversationId, name, user, autoGenerate) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    const payload = { user: user };

    if (name) {
      payload.name = name;
    }

    if (autoGenerate !== undefined) {
      payload.auto_generate = autoGenerate;
    }

    return this._makeRequest(
      "/conversations/" + conversationId + "/name",
      "POST",
      payload
    );
  }

  /**
   * 会話を削除する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意)
   *
   * @returns {Object} 削除結果
   */
  deleteConversation(conversationId, user) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    const payload = { user: user };

    return this._makeRequest(
      "/conversations/" + conversationId,
      "DELETE",
      payload
    );
  }
  /**
   * メッセージフィードバックを送信する
   * @param {string} messageId - メッセージID (必須, UUID形式)
   * @param {string} rating - 評価 (必須, 'like' または 'dislike')
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {string} [content] - フィードバック内容 (任意)
   *
   * @returns {Object} 送信結果
   */
  sendFeedback(messageId, rating, user, content) {
    user = user || this.user;
    if (!messageId) {
      throw new Error(`messageIdは必須パラメータです`);
    }
    if (!rating) {
      throw new Error(`ratingは必須パラメータです`);
    }

    const payload = {
      user: user,
      rating: rating,
    };

    if (content) {
      payload.content = content;
    }

    return this._makeRequest(
      "/messages/" + messageId + "/feedbacks",
      "POST",
      payload
    );
  }

  /**
   * 音声をテキストに変換する
   * @param {Blob} file - 音声ファイル (必須)
   * @param {string} [user] - ユーザー識別子 (任意)
   *
   * @returns {Object} 変換されたテキスト
   */
  audioToText(file, user) {
    user = user || this.user;
    if (!file) {
      throw new Error(`fileは必須パラメータです`);
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

    const response = UrlFetchApp.fetch(
      this.baseUrl + "/audio-to-text",
      options
    );
    const responseCode = response.getResponseCode();

    if (responseCode !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        const responseText = response.getContentText();
        errorInfo = JSON.parse(responseText);
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }

      throw new Error(
        `音声変換エラー (HTTP ${responseCode}): ${
          errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * 推奨質問を取得する
   * @param {string} messageId - メッセージID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意)
   *
   * @returns {Object} 推奨質問リスト
   */
  getSuggestedQuestions(messageId, user) {
    user = user || this.user;
    if (!messageId) {
      throw new Error(`messageIdは必須パラメータです`);
    }

    const params = { user: user };
    const queryString = this._buildQueryString(params);
    const endpoint = queryString
      ? "/messages/" + messageId + "/suggested?" + queryString
      : "/messages/" + messageId + "/suggested";

    return this._makeRequest(endpoint, "GET");
  }

  /**
   * アプリフィードバック一覧を取得する
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {number} [options.page] - ページ番号 (任意, デフォルト: 1)
   * @param {number} [options.limit] - 1ページあたりの件数 (任意, デフォルト: 20)
   *
   * @returns {Object} フィードバック一覧
   */
  getAppFeedbacks(options) {
    options = options || {};

    const params = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const queryString = this._buildQueryString(params);
    const endpoint = queryString ? "/feedbacks?" + queryString : "/feedbacks";

    return this._makeRequest(endpoint, "GET");
  }

  /**
   * 会話変数を取得する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意)
   *
   * @returns {Object} 会話変数
   */
  getConversationVariables(conversationId, user) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    const params = { user: user };
    const queryString = this._buildQueryString(params);
    const endpoint = queryString
      ? "/conversations/" + conversationId + "/variables?" + queryString
      : "/conversations/" + conversationId + "/variables";

    return this._makeRequest(endpoint, "GET");
  }
  /**
   * チャット系機能の初期化（内部メソッド）
   * チャット固有のfeatures、suggestedQuestions、openingStatementを初期化
   *
   * @private
   */
  _initializeChatFeatures() {
    try {
      const appSite = this.getWebAppSettings();
      const appParameters = this.getAppParameters();

      // チャット固有機能の有効状態を取得
      this.features = {
        speechToText:
          appParameters.speech_to_text && appParameters.speech_to_text.enabled,
        textToSpeech:
          appParameters.text_to_speech && appParameters.text_to_speech.enabled,
        suggestedQuestionsAfterAnswer:
          appParameters.suggested_questions_after_answer &&
          appParameters.suggested_questions_after_answer.enabled,
      };

      // 推奨質問とオープニングメッセージも取得・保存
      this.suggestedQuestions = appSite.suggested_questions || [];
      this.openingStatement = appSite.opening_statement || "";
    } catch (error) {
      // 初期化時のエラーは警告として記録し、デフォルト値を設定
      Logger.log(
        "チャット系機能の初期化中にエラーが発生しました: " + error.message
      );

      // デフォルト値を設定
      this.features = {
        speechToText: false,
        textToSpeech: false,
        suggestedQuestionsAfterAnswer: false,
      };
      this.suggestedQuestions = [];
      this.openingStatement = "";
    }
  }

  /**
   * ストリーミングレスポンスを解析（サブクラスで実装）
   *
   * @abstract
   * @private
   * @param {Object} response - レスポンスオブジェクト
   * @returns {Object} 解析されたレスポンス
   */
  _parseStreamingResponse(response) {
    throw new Error(
      "_parseStreamingResponseメソッドはサブクラスで実装してください"
    );
  }
}

// ========================================
// 各クラス実装
// ========================================

/**
 * Chatbotクラス - Difyチャットボット機能
 *
 * Chatbotクライアントを初期化
 *
 * @param {Object} options - 設定オプション
 * @param {string} options.apiKey - Dify API キー
 * @param {string} [options.baseUrl] - API ベース URL (デフォルト: "https://api.dify.ai/v1")
 * @param {string} [options.user] - デフォルトユーザー識別子
 * @throws {Error} API キーが未指定の場合
 * @property {string} stopEndpoint - チャットメッセージタスク停止用エンドポイント (固定値: "/chat-messages/{taskId}/stop")
 * @property {Object} features - チャット系機能の有効状態
 * @property {boolean} features.speechToText - 音声→テキスト変換機能の有効状態
 * @property {boolean} features.textToSpeech - テキスト→音声変換機能の有効状態
 * @property {boolean} features.suggestedQuestionsAfterAnswer - 回答後推奨質問機能の有効状態
 * @property {Array} suggestedQuestions - アプリで設定された推奨質問リスト
 * @property {string} openingStatement - アプリで設定されたオープニングメッセージ
 *
 * **継承プロパティ:**
 * - Difyクラスのすべてのプロパティを継承
 * - ChatBaseクラスのすべてのプロパティを継承
 *
 * **Chatbot特有の動作:**
 * - ストリーミングレスポンス解析でagent_messageイベントを処理
 * - agent_thoughtイベントによるエージェント思考プロセスの追跡
 * - message_replaceイベントによるメッセージ置換の対応
 * - TTSメッセージイベントによる音声データの処理
 *
 * **利用可能なイベント:**
 * - agent_message: エージェントからのメッセージ
 * - message: 一般的なメッセージ
 * - tts_message: テキスト音声合成メッセージ
 * - agent_thought: エージェントの思考プロセス
 * - message_file: ファイル関連メッセージ
 * - message_replace: メッセージ置換
 * - message_end: メッセージ終了
 */
class Chatbot extends ChatBase {
  constructor(options) {
    super(options);
  }

  /**
   * ストリーミングレスポンスを解析（Chatbot特有）
   *
   * @private
   * @param {Object} response - レスポンスオブジェクト
   * @returns {Object} 解析されたレスポンス
   */
  _parseStreamingResponse(response) {
    const responseCode = response.getResponseCode();

    if (responseCode === HTTP_STATUS.OK) {
      Logger.log("Chatbot streaming API call successful");

      const content = response.getContentText();
      const lines = content.split("\n");
      let answer = "";
      let conversationId = null;
      let messageId = null;
      let taskId = null;
      let metadata = null;
      let createdAt = null;
      let fileId = null;
      let fileUrl = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("data: ")) {
          try {
            const dataStr = line.substring(6);

            // [DONE]チェック
            if (dataStr.trim() === "[DONE]") {
              Logger.log("Streaming completed with [DONE] signal");
              break;
            }

            const json = JSON.parse(dataStr);

            switch (json.event) {
              case "agent_message":
                Logger.log("agent_message event received");
                if (json.answer) {
                  answer += json.answer;
                }
                if (json.conversation_id) {
                  conversationId = json.conversation_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.created_at) {
                  createdAt = json.created_at;
                }
                break;
              case "message":
                Logger.log("message event received");
                if (json.answer) {
                  answer += json.answer;
                }
                if (json.conversation_id) {
                  conversationId = json.conversation_id;
                }
                if (json.id) {
                  messageId = json.id;
                }
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.created_at) {
                  createdAt = json.created_at;
                }
                break;
              case "tts_message":
                Logger.log("tts_message event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                if (json.audio) {
                  Logger.log("Audio data received in tts_message event");
                  // base64デコードしてBlobに変換
                  const audioBlob = Utilities.newBlob(
                    Utilities.base64Decode(json.audio),
                    "audio/mpeg",
                    "tts_audio.mp3"
                  );
                  json.audio = audioBlob;
                }
                if (json.created_at) {
                  createdAt = json.created_at;
                }
                break;
              case "tts_message_end":
                Logger.log("tts_message_end event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                break;
              case "agent_thought":
                Logger.log("agent_thought event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                break;
              case "message_file":
                Logger.log("message_file event received");
                if (json.conversation_id) {
                  conversationId = json.conversation_id;
                }
                if (json.id) {
                  fileId = json.id;
                }
                if (json.url) {
                  fileUrl = json.url;
                }
                break;
              case "message_replace":
                Logger.log("message_replace event received");
                if (json.answer) {
                  answer = json.answer;
                }
                if (json.conversation_id) {
                  conversationId = json.conversation_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                if (json.task_id) {
                  taskId = json.task_id;
                }
                break;
              case "ping":
                Logger.log("ping event received - connection keepalive");
                break;
              case "message_end":
                Logger.log("message_end event received");
                if (json.metadata) {
                  metadata = json.metadata;
                  Logger.log(
                    "Usage metadata: " + JSON.stringify(json.metadata)
                  );
                }
                return {
                  answer: answer,
                  conversation_id: conversationId,
                  message_id: messageId,
                  task_id: taskId,
                  metadata: metadata,
                  created_at: json.created_at || "",
                  audio: json.audio || null,
                  file_id: fileId || "",
                  file_url: fileUrl || "",
                };
              case "error":
                Logger.log("Error event: " + JSON.stringify(json));
                throw new Error(
                  `ストリーミングエラー: ${json.message || json.code}`
                );
              default:
                Logger.log(
                  "Unknown event: " + json.event + " - " + JSON.stringify(json)
                );
                break;
            }
          } catch (e) {
            Logger.log(
              "Error parsing JSON line: " + line + " - " + e.toString()
            );
            // JSONパースエラーは継続処理（部分データの可能性）
            continue;
          }
        }
      }

      // message_endイベントが来なかった場合の戻り値
      return {
        answer: answer,
        conversation_id: conversationId,
        message_id: messageId,
        task_id: taskId,
        metadata: metadata,
        created_at: createdAt || "",
        audio: null, // 音声データはTTSメッセージで
        file_id: fileId || "",
        file_url: fileUrl || "",
      };
    } else {
      Logger.log(
        "Streaming API error - HTTP " +
          responseCode +
          ": " +
          response.getContentText()
      );
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `ストリーミングAPIエラー (HTTP ${responseCode}): ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }
  }
}

/**
 * Chatflowクラス - Difyチャットフロー機能
 *
 * Chatflowクライアントを初期化
 *
 * @param {Object} options - 設定オプション
 * @param {string} options.apiKey - Dify API キー
 * @param {string} [options.baseUrl] - API ベース URL (デフォルト: "https://api.dify.ai/v1")
 * @param {string} [options.user] - デフォルトユーザー識別子
 * @throws {Error} API キーが未指定の場合
 * @property {string} stopEndpoint - チャットメッセージタスク停止用エンドポイント (固定値: "/chat-messages/{taskId}/stop")
 * @property {Object} features - チャット系機能の有効状態
 * @property {boolean} features.speechToText - 音声→テキスト変換機能の有効状態
 * @property {boolean} features.textToSpeech - テキスト→音声変換機能の有効状態
 * @property {boolean} features.suggestedQuestionsAfterAnswer - 回答後推奨質問機能の有効状態
 * @property {Array} suggestedQuestions - アプリで設定された推奨質問リスト
 * @property {string} openingStatement - アプリで設定されたオープニングメッセージ
 *
 * **継承プロパティ:**
 * - Difyクラスのすべてのプロパティを継承
 * - ChatBaseクラスのすべてのプロパティを継承
 *
 * **Chatflow特有の動作:**
 * - ワークフロー関連イベントの処理 (workflow_started, node_started, node_finished, workflow_finished)
 * - ノード実行結果の追跡と出力データの収集
 * - ワークフロー実行IDの管理
 * - 複数ノードの出力データ統合
 *
 * **利用可能なイベント:**
 * - message: メッセージ
 * - message_file: ファイル関連メッセージ
 * - message_replace: メッセージ置換
 * - tts_message: テキスト音声合成メッセージ
 * - workflow_started: ワークフロー開始
 * - node_started: ノード開始
 * - node_finished: ノード完了
 * - workflow_finished: ワークフロー完了
 * - message_end: メッセージ終了
 *
 * **レスポンス拡張データ:**
 * - workflow_run_id: ワークフロー実行ID
 * - workflow_output: ワークフロー最終出力
 * - node_outputs: 各ノードの出力データ配列
 */

class Chatflow extends ChatBase {
  constructor(options) {
    super(options);
  }

  /**
   * ストリーミングレスポンスを解析（Chatflow特有）
   *
   * @private
   * @param {Object} response - レスポンスオブジェクト
   * @returns {Object} 解析されたレスポンス
   */
  _parseStreamingResponse(response) {
    const responseCode = response.getResponseCode();

    if (responseCode === HTTP_STATUS.OK) {
      Logger.log("Chatflow streaming API call successful");

      const content = response.getContentText();
      const lines = content.split("\n");
      let answer = "";
      let conversationId = null;
      let messageId = null;
      let taskId = null;
      let metadata = null;
      let createdAt = null;
      let fileId = null;
      let fileUrl = null;
      let workflowRunId = null;
      let workflowOutput = {};
      let nodeOutputs = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("data: ")) {
          try {
            const dataStr = line.substring(6);

            // [DONE]チェック
            if (dataStr.trim() === "[DONE]") {
              Logger.log("Streaming completed with [DONE] signal");
              break;
            }

            const json = JSON.parse(dataStr);

            switch (json.event) {
              case "message":
                Logger.log("message event received");
                if (json.answer) {
                  answer += json.answer;
                }
                if (json.conversation_id) {
                  conversationId = json.conversation_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.created_at) {
                  createdAt = json.created_at;
                }
                break;
              case "message_file":
                Logger.log("message_file event received");
                if (json.conversation_id) {
                  conversationId = json.conversation_id;
                }
                if (json.id) {
                  fileId = json.id;
                }
                if (json.url) {
                  fileUrl = json.url;
                }
                break;
              case "message_replace":
                Logger.log("message_replace event received");
                if (json.answer) {
                  answer = json.answer;
                }
                if (json.conversation_id) {
                  conversationId = json.conversation_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                if (json.task_id) {
                  taskId = json.task_id;
                }
                break;
              case "tts_message":
                Logger.log("tts_message event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                if (json.audio) {
                  Logger.log("Audio data received in tts_message event");
                  // base64デコードしてBlobに変換
                  const audioBlob = Utilities.newBlob(
                    Utilities.base64Decode(json.audio),
                    "audio/mpeg",
                    "tts_audio.mp3"
                  );
                  json.audio = audioBlob;
                }
                if (json.created_at) {
                  createdAt = json.created_at;
                }
                break;
              case "tts_message_end":
                Logger.log("tts_message_end event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.message_id) {
                  messageId = json.message_id;
                }
                break;
              case "workflow_started":
                Logger.log("workflow_started event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.workflow_run_id) {
                  workflowRunId = json.workflow_run_id;
                }
                break;
              case "node_started":
                Logger.log("node_started event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.workflow_run_id) {
                  workflowRunId = json.workflow_run_id;
                }
                break;
              case "node_finished":
                Logger.log("node_finished event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.workflow_run_id) {
                  workflowRunId = json.workflow_run_id;
                }
                // json.data.outputsの詳細ログを追加
                if (json.data?.outputs) {
                  Logger.log(
                    "node_finished - json.data.outputs structure: " +
                      JSON.stringify(json.data.outputs, null, 2)
                  );
                  nodeOutputs.push(json.data.outputs);
                } else {
                  Logger.log(
                    "node_finished - json.data.outputs is null or undefined"
                  );
                }
                break;
              case "workflow_finished":
                Logger.log("workflow_finished event received");
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.workflow_run_id) {
                  workflowRunId = json.workflow_run_id;
                }
                // json.data.outputsの詳細ログを追加
                if (json.data?.outputs) {
                  Logger.log(
                    "workflow_finished - json.data.outputs structure: " +
                      JSON.stringify(json.data.outputs, null, 2)
                  );
                  workflowOutput = json.data.outputs;
                } else {
                  Logger.log(
                    "workflow_finished - json.data.outputs is null or undefined"
                  );
                }
                break;
              case "ping":
                Logger.log("ping event received - connection keepalive");
                break;
              case "message_end":
                Logger.log("message_end event received");
                if (json.metadata) {
                  metadata = json.metadata;
                  Logger.log(
                    "Usage metadata: " + JSON.stringify(json.metadata)
                  );
                }
                return {
                  answer: answer,
                  conversation_id: conversationId,
                  message_id: messageId,
                  task_id: taskId,
                  workflow_run_id: workflowRunId,
                  metadata: metadata,
                  created_at: json.created_at || "",
                  audio: json.audio || null,
                  file_id: fileId || "",
                  file_url: fileUrl || "",
                  workflow_output: workflowOutput || {},
                  node_outputs: nodeOutputs || [],
                };
              case "error":
                Logger.log("Error event: " + JSON.stringify(json));
                throw new Error(
                  `ストリーミングエラー: ${json.message || json.code}`
                );
              default:
                Logger.log(
                  "Unknown event: " + json.event + " - " + JSON.stringify(json)
                );
                break;
            }
          } catch (e) {
            Logger.log(
              "Error parsing JSON line: " + line + " - " + e.toString()
            );
            // JSONパースエラーは継続処理（部分データの可能性）
            continue;
          }
        }
      }

      // message_endイベントが来なかった場合の戻り値
      return {
        answer: answer,
        conversation_id: conversationId,
        message_id: messageId,
        task_id: taskId,
        workflow_run_id: workflowRunId,
        metadata: metadata,
        created_at: createdAt || "",
        audio: null,
        file_id: fileId || "",
        file_url: fileUrl || "",
        workflow_output: workflowOutput || {},
        node_outputs: nodeOutputs || [],
      };
    } else {
      Logger.log(
        "Streaming API error - HTTP " +
          responseCode +
          ": " +
          response.getContentText()
      );
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `ストリーミングAPIエラー (HTTP ${responseCode}): ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }
  }
}

/**
 * Textgeneratorクラス - Difyテキスト生成機能
 *
 *Textgenerator クライアントを初期化
 *
 * @param {Object} options - 設定オプション
 * @param {string} options.apiKey - Dify API キー
 * @param {string} [options.baseUrl] - API ベース URL (デフォルト: "https://api.dify.ai/v1")
 * @param {string} [options.user] - デフォルトユーザー識別子
 * @throws {Error} API キーが未指定の場合
 *
 * **Textgenerator特有のプロパティ:**
 * @property {string} stopEndpoint - 完了メッセージタスク停止用エンドポイント (固定値: "/completion-messages/{taskId}/stop")
 * 
 * **継承プロパティ:**
 * - Difyクラスのすべてのプロパティを継承

 *
 * **Textgenerator特有の動作:**
 * - 完了型メッセージ生成 (会話履歴なし)
 * - テキスト生成に特化したストリーミング解析
 * - メッセージフィードバック機能
 * - アプリフィードバック一覧取得
 *
 * **利用可能なイベント:**
 * - message: メッセージ生成
 * - message_replace: メッセージ置換
 * - message_end: メッセージ終了
 * - tts_message: テキスト音声合成メッセージ
 * - tts_message_end: TTS終了
 * - ping: 接続維持
 * - error: エラー
 *
 * **レスポンスデータ:**
 * - message_id: メッセージID
 * - task_id: タスクID
 * - status: 実行ステータス
 * - answer: 生成されたテキスト
 * - combined_text: 結合されたテキスト
 * - metadata: メタデータ (使用トークン数等)
 * - audio: 音声データ (TTS有効時)
 */
class Textgenerator extends Dify {
  constructor(options) {
    super(options);

    // stopEndpointを設定
    this.stopEndpoint = "/completion-messages/{taskId}/stop";
  }

  /**
   * 完了メッセージを作成する - テキスト生成APIの主要メソッド
   *
   * @param {Object} inputs - アプリで定義された変数値の入力 (必須)
   * @param {string} inputs.query - 入力テキスト、処理される内容 (必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.response_mode] - 応答モード (任意, 'streaming' または 'blocking', デフォルト: 'streaming')
   * @param {Array} [options.files] - ファイルリスト (任意)
   *
   * @returns {Object} 応答結果のJSONオブジェクト - 応答モードによって構造が異なる
   * @throws {Error} inputsが未指定またはオブジェクトでない場合
   * @throws {Error} inputs.queryが未指定または文字列でない場合
   * @throws {Error} ユーザー識別子が未指定の場合
   * @throws {Error} APIリクエストが失敗した場合
   * @example
   * const textgen = new Textgenerator({ apiKey: "your-api-key", user: "user-123" });
   *
   * // 基本的なテキスト生成
   * const result = textgen.createCompletionMessage({
   *   query: "天気について教えて"
   * });
   *
   * // ストリーミングモードでのテキスト生成
   * const streamResult = textgen.createCompletionMessage({
   *   query: "AIについて説明してください"
   * }, "user-456", {
   *   response_mode: "streaming"
   * });
   */
  createCompletionMessage(inputs, user, options = {}) {
    if (!inputs || typeof inputs !== "object") {
      throw new Error("入力パラメータは必須のオブジェクトです");
    }

    if (!inputs.query || typeof inputs.query !== "string") {
      throw new Error("inputs.query は必須の文字列です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    // ペイロード構築
    const payload = {
      inputs: inputs,
      response_mode: options.response_mode || "streaming",
      user: actualUser,
      files: options.files || [],
    };

    // 共通リクエスト処理を使用
    return this._sendRequest(
      "/completion-messages",
      payload,
      options,
      "完了メッセージ作成"
    );
  }
  /**
   * メッセージフィードバックを送信する
   * @param {string} messageId - メッセージID (必須, UUID形式)
   * @param {Object} feedback - フィードバック内容 (必須)
   * @param {string} [feedback.rating] - 評価 ('like', 'dislike', null) (任意)
   * @param {string} [feedback.content] - フィードバックの具体的な内容 (任意)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} フィードバック送信結果
   * ```json
   * {
   *   "result": "success"
   * }
   * ```
   */
  submitMessageFeedback(messageId, feedback, user) {
    user = user || this.user;
    if (!messageId) {
      throw new Error(`messageIdは必須パラメータです`);
    }
    if (!feedback) {
      throw new Error(`feedbackは必須パラメータです`);
    }

    const payload = {
      user: user,
      rating: feedback.rating || null,
      content: feedback.content || null,
    };

    return this._makeRequest(
      "/messages/" + messageId + "/feedbacks",
      "POST",
      payload
    );
  }

  /**
   * アプリのメッセージフィードバック一覧を取得する
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {number} [options.page] - ページ番号 (任意, デフォルト: 1)
   * @param {number} [options.limit] - 1ページあたりの件数 (任意, デフォルト: 20)
   *
   * @returns {Object} フィードバック一覧 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "data": [
   *     {
   *       "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "app_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "conversation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "message_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "rating": "like",
   *       "content": "フィードバック内容",
   *       "from_source": "api",
   *       "from_end_user_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "from_account_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "created_at": "2023-11-07T05:31:56Z",
   *       "updated_at": "2023-11-07T05:31:56Z"
   *     }
   *   ]
   * }
   * ```
   */
  getAppFeedbacks(options) {
    options = options || {};

    const params = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const queryString = this._buildQueryString(params);
    const endpoint = queryString
      ? "/app/feedbacks?" + queryString
      : "/app/feedbacks";

    return this._makeRequest(endpoint, "GET");
  }

  /**
   * ストリーミングレスポンスを解析
   *
   * @private
   * @param {Object} response - レスポンスオブジェクト
   * @returns {Object} 解析されたレスポンス
   */
  _parseStreamingResponse(response) {
    const HTTP_STATUS = { OK: 200 };
    const responseCode = response.getResponseCode();

    if (responseCode === HTTP_STATUS.OK) {
      Logger.log("Textgenerator streaming API call successful");

      const content = response.getContentText();
      const lines = content.split("\n");
      let messageId = null;
      let taskId = null;
      let status = "";
      let error = null;
      let combinedText = "";
      let textChunks = [];
      let audio = null;
      let metadata = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("data: ")) {
          try {
            const dataStr = line.substring(6);

            // [DONE]チェック
            if (dataStr.trim() === "[DONE]") {
              Logger.log(
                "Textgenerator streaming completed with [DONE] signal"
              );
              break;
            }

            const json = JSON.parse(dataStr);

            switch (json.event) {
              case "message":
                Logger.log("message event received");
                if (json.message_id) {
                  messageId = json.message_id;
                }
                if (json.task_id) {
                  taskId = json.task_id;
                }
                if (json.answer) {
                  combinedText += json.answer;
                }
                if (json.metadata) {
                  metadata = json.metadata;
                }
                status = "succeeded";
                break;

              case "message_replace":
                Logger.log("message_replace event received");
                if (json.answer) {
                  combinedText = json.answer;
                }
                break;

              case "message_end":
                Logger.log("message_end event received");
                if (json.metadata) {
                  metadata = json.metadata;
                }
                status = "succeeded";
                break;

              case "tts_message":
                Logger.log("tts_message event received");
                if (json.audio) {
                  const audioBlob = Utilities.newBlob(
                    Utilities.base64Decode(json.audio),
                    "audio/mpeg",
                    "tts_audio.mp3"
                  );
                  audio = audioBlob;
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
                throw new Error(
                  `テキストジェネレーターストリーミングエラー: ${error}`
                );

              default:
                Logger.log(`未知のイベント: ${json.event}`);
                break;
            }
          } catch (e) {
            Logger.log(
              "Error parsing JSON line: " + line + " - " + e.toString()
            );
            // JSONパースエラーは継続処理（部分データの可能性）
          }
        }
      }

      return {
        message_id: messageId,
        task_id: taskId,
        status: status,
        answer: combinedText,
        combined_text: combinedText,
        text_chunks: textChunks,
        metadata: metadata,
        error: error,
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
        `テキストジェネレーターAPI エラー (HTTP ${responseCode}): ${
          errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }
  }
}

/**
 * Workflowクラス - Difyワークフロー機能
 *
 *Workflow クライアントを初期化
 *
 * @param {Object} options - 設定オプション
 * @param {string} options.apiKey - Dify API キー
 * @param {string} [options.baseUrl] - API ベース URL (デフォルト: "https://api.dify.ai/v1")
 * @param {string} [options.user] - デフォルトユーザー識別子
 * @throws {Error} API キーが未指定の場合
 * **継承プロパティ:**
 * - Difyクラスのすべてのプロパティを継承
 *
 * **Workflow特有のプロパティ:**
 * @property {string} stopEndpoint - ワークフロータスク停止用エンドポイント (固定値: "/workflows/tasks/{taskId}/stop")
 *
 * **Workflow特有の動作:**
 * - ワークフローベースの処理実行 (ノードの順次実行)
 * - ワークフロー実行ログの管理・取得
 * - ワークフロー実行詳細の取得
 * - 複雑なワークフローでのストリーミング処理
 * - ノード間でのデータ受け渡し管理
 *
 * **利用可能なイベント:**
 * - workflow_started: ワークフロー開始
 * - text_chunk: テキストチャンク出力
 * - workflow_finished: ワークフロー完了
 * - node_started: ノード開始
 * - node_finished: ノード完了
 * - tts_message: テキスト音声合成メッセージ
 * - tts_message_end: TTS終了
 * - ping: 接続維持
 * - error: エラー
 *
 * **レスポンスデータ:**
 * - workflow_run_id: ワークフロー実行ID
 * - task_id: タスクID
 * - status: 実行ステータス
 * - workflow_outputs: ワークフロー最終出力
 * - node_outputs: 各ノードの出力データ配列
 * - answer: 結合されたテキスト出力
 * - text_chunks: テキストチャンクの配列
 * - audio: 音声データ (TTS有効時)
 * - created_at: 作成日時
 *
 * **主要機能:**
 * - runWorkflow(): ワークフロー実行
 * - getWorkflowLogs(): ワークフローログ取得
 * - getWorkflowRunDetail(): ワークフロー実行詳細取得
 * - stopTask(): ワークフロータスク停止 (継承)
 */
class Workflow extends Dify {
  constructor(options) {
    super(options);

    // stopEndpointを設定
    this.stopEndpoint = "/workflows/tasks/{taskId}/stop";
  }

  /**
   * ワークフローを実行する
   *
   * @param {Object} inputs - アプリで定義された変数値の入力
   * @param {string} [user] - ユーザー識別子
   * @param {Object} [options] - オプションパラメータ
   * @returns {Object} 応答結果のJSONオブジェクト
   */
  runWorkflow(inputs, user, options = {}) {
    if (!inputs || typeof inputs !== "object") {
      throw new Error("入力パラメータは必須のオブジェクトです");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    // ペイロード構築
    const payload = {
      inputs: inputs,
      response_mode: options.response_mode || "streaming",
      user: actualUser,
    };

    if (options.files && options.files.length > 0) {
      payload.files = options.files;
    }

    // 共通リクエスト処理を使用
    return this._sendRequest(
      "/workflows/run",
      payload,
      options,
      "ワークフロー実行"
    );
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
   * ストリーミングレスポンスを解析
   *
   * @private
   * @param {Object} response - レスポンスオブジェクト
   * @returns {Object} 解析されたレスポンス
   */
  _parseStreamingResponse(response) {
    const HTTP_STATUS = { OK: 200 };
    const responseCode = response.getResponseCode();

    if (responseCode === HTTP_STATUS.OK) {
      Logger.log("Workflow streaming API call successful");

      const content = response.getContentText();
      const lines = content.split("\n");
      let workflowRunId = null;
      let nodeOutputs = [];
      let workflowOutput = {};
      let taskId = null;
      let status = "";
      let error = null;
      let answer = "";
      let textChunks = [];
      let audio = null;
      let createdAt = null;

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
                  answer += json.data.text;
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
                  workflowOutput = json.data.outputs || {};
                  error = json.data.error;
                  status = json.data.status || "succeeded";
                  // json.data.outputsの詳細ログを追加
                  if (json.data.outputs) {
                    Logger.log(
                      "workflow_finished - json.data.outputs structure: " +
                        JSON.stringify(json.data.outputs, null, 2)
                    );
                  } else {
                    Logger.log(
                      "workflow_finished - json.data.outputs is null or undefined"
                    );
                  }
                }
                break;

              case "node_started":
                Logger.log(
                  `node_started event received - Node: ${
                    json.data?.title || json.data?.node_id
                  } (${json.data?.node_type})`
                );
                break;

              case "node_finished":
                Logger.log(
                  `node_finished event received - Node: ${
                    json.data?.title || json.data?.node_id
                  } (${json.data?.status})`
                );
                // json.data.outputsの詳細ログを追加
                if (json.data?.outputs) {
                  Logger.log(
                    "node_finished - json.data.outputs structure: " +
                      JSON.stringify(json.data.outputs, null, 2)
                  );
                  nodeOutputs.push(json.data.outputs);
                } else {
                  Logger.log(
                    "node_finished - json.data.outputs is null or undefined"
                  );
                }
                break;

              case "tts_message":
                Logger.log("tts_message event received");
                if (json.audio) {
                  const audioBlob = Utilities.newBlob(
                    Utilities.base64Decode(json.audio),
                    "audio/mpeg",
                    "tts_audio.mp3"
                  );
                  audio = audioBlob;
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
          } catch (e) {
            Logger.log(
              "Error parsing JSON line: " + line + " - " + e.toString()
            );
            // JSONパースエラーは継続処理（部分データの可能性）
          }
          // 解析エラーは無視して続行
        }
      }

      return {
        workflow_run_id: workflowRunId,
        task_id: taskId,
        status: status,
        workflow_outputs: workflowOutput,
        node_outputs: nodeOutputs,
        error: error,
        answer: answer,
        text_chunks: textChunks,
        audio: audio,
        created_at: createdAt,
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
}
