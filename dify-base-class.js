/**
 * Dify API 基底クラス
 *
 * 全4クラス（Chatbot、Chatflow、Textgenerator、Workflow）の共通機能を提供
 *
 * @author DAS Project
 * @version 2.0.0
 */

/**
 * HTTP ステータスコード定数
 */
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
 */
class Dify {
  /**
   * Dify API クライアントを初期化
   *
   * @param {Object} options - 設定オプション
   * @param {string} options.apiKey - Dify API キー
   * @param {string} [options.baseUrl] - API ベース URL
   * @param {string} [options.user] - デフォルトユーザー識別子
   */
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
    this._initializeAppFeatures();
  }

  /**
   * アプリケーション基本情報を取得
   *
   * @returns {Object} アプリケーション情報のJSONオブジェクト
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
   * @returns {Object} パラメータ情報のJSONオブジェクト
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
   * @returns {Object} WebApp設定情報のJSONオブジェクト
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
   * @param {Blob} file - アップロードするファイル
   * @param {string} [user] - ユーザー識別子
   * @returns {Object} アップロード結果のJSONオブジェクト
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
        `ファイルサイズが制限を超えています（最大: ${Math.round(maxFileSize / 1024 / 1024)}MB）`,
      );
    }

    console.log(
      `📤 ファイルをアップロードしています... (${Math.round(file.size / 1024)}KB)`,
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
   * アプリケーション機能を初期化（内部メソッド）
   *
   * @private
   */
  _initializeAppFeatures() {
    try {
      console.log("🔧 アプリケーション機能を初期化しています...");

      // アプリ情報を取得
      const appInfo = this.getAppInfo();

      // 機能フラグを設定
      this.features = {
        file_upload: appInfo.file_upload || false,
        opening_statement: appInfo.opening_statement || "",
        suggested_questions: appInfo.suggested_questions || [],
        speech_to_text: appInfo.speech_to_text || false,
        text_to_speech: appInfo.text_to_speech || false,
        retriever_resource: appInfo.retriever_resource || false,
        annotation_reply: appInfo.annotation_reply || false,
        user_input_form: appInfo.user_input_form || [],
      };

      // ユーザー入力フォーム設定
      this.userInput = appInfo.user_input_form || [];

      // システムパラメータ設定
      this.systemParameters = {
        file_size_limit: appInfo.file_size_limit || 50 * 1024 * 1024,
        file_upload_limit: appInfo.file_upload_limit || 50 * 1024 * 1024,
        supported_file_types: appInfo.supported_file_types || [],
      };

      console.log("✅ アプリケーション機能の初期化が完了しました");
    } catch (error) {
      console.warn(
        "⚠️ アプリケーション機能の初期化に失敗しました:",
        error.message,
      );
      // 初期化エラーは致命的ではないため、デフォルト値で継続
      this.features = {};
      this.userInput = [];
      this.systemParameters = { file_upload_limit: 50 * 1024 * 1024 };
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
  _makeRequest(endpoint, method = "GET", payload = null) {
    // レート制限チェック
    this._checkRateLimit();

    const url = this.baseUrl + endpoint;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    let options = {
      method: method,
      headers: headers,
    };

    // ペイロードの処理
    if (payload) {
      if (method === "GET") {
        // GETリクエストの場合はクエリパラメータとして追加
        const queryString = this._buildQueryString(payload);
        if (queryString) {
          const separator = url.includes("?") ? "&" : "?";
          options = { ...options, url: url + separator + queryString };
        }
      } else if (
        payload instanceof FormData ||
        (payload.file && payload.user)
      ) {
        // ファイルアップロードの場合
        delete headers["Content-Type"]; // multipart/form-dataを自動設定させる
        options.payload = payload;
      } else {
        // JSONペイロード
        options.payload = JSON.stringify(payload);
      }
    }

    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      // ステータスコードチェック
      if (responseCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
        throw new Error(
          "レート制限に達しました。しばらく待ってから再試行してください。",
        );
      }

      if (responseCode >= 400) {
        let errorMessage = `HTTP ${responseCode}: リクエストが失敗しました`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // JSON解析エラーは無視
        }
        throw new Error(errorMessage);
      }

      // レスポンス解析
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.warn("⚠️ JSON解析に失敗しました。生のレスポンスを返します。");
        return { content: responseText };
      }
    } catch (error) {
      const sanitizedMessage = error.message.replace(
        new RegExp(this.apiKey, "g"),
        "***",
      );
      console.error(
        `❌ リクエストエラー [${method} ${endpoint}]:`,
        sanitizedMessage,
      );
      throw new Error(sanitizedMessage);
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
      (timestamp) => now - timestamp < this._rateLimitWindow,
    );

    // 制限チェック
    if (this._rateLimitRequests.length >= this._rateLimitMax) {
      throw new Error(
        `レート制限に達しました（${this._rateLimitMax}リクエスト/${this._rateLimitWindow / 1000}秒）`,
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
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
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
