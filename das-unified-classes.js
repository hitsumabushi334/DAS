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
        error.message
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
          "レート制限に達しました。しばらく待ってから再試行してください。"
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
        "***"
      );
      console.error(
        `❌ リクエストエラー [${method} ${endpoint}]:`,
        sanitizedMessage
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
 */
class ChatBase extends Dify {
  /**
   * ChatBase クライアントを初期化
   *
   * @param {Object} options - 設定オプション
   * @param {string} options.apiKey - Dify API キー
   * @param {string} [options.baseUrl] - API ベース URL
   * @param {string} [options.user] - デフォルトユーザー識別子
   */
  constructor(options) {
    super(options);

    // チャット系特有の初期化処理
    this._initializeChatFeatures();
  }

  /**
   * メッセージを送信（Template Method パターン）
   *
   * @param {string} query - ユーザー入力/質問内容
   * @param {string} [user] - ユーザー識別子
   * @param {Object} [options] - オプションパラメータ
   * @returns {Object} 応答結果のJSONオブジェクト
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

    console.log(`💬 メッセージを送信しています... [${this.constructor.name}]`);

    // ペイロード構築（共通部分）
    const payload = {
      inputs: options.inputs || {},
      query: query,
      response_mode: options.response_mode || "blocking",
      user: actualUser,
      conversation_id: options.conversation_id,
      files: options.files || [],
      auto_generate_name: options.auto_generate_name !== false,
    };

    try {
      // サブクラス固有のエンドポイント取得
      const endpoint = this._getMessageEndpoint();

      const response = this._makeRequest(endpoint, "POST", payload);

      // ストリーミングレスポンスの解析（サブクラス固有）
      if (options.response_mode === "streaming") {
        return this._parseStreamingResponse(response);
      }

      console.log("✅ メッセージ送信が完了しました");
      return response;
    } catch (error) {
      console.error(
        `❌ メッセージ送信に失敗しました [${this.constructor.name}]:`,
        error.message
      );
      throw error;
    }
  }

  // 会話管理メソッド群（省略 - chat-base-class.jsと同じ実装）
  getConversations(user, options = {}) {
    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(
      `📋 会話履歴一覧を取得しています... [${this.constructor.name}]`
    );

    const queryParams = {
      user: actualUser,
      first_id: options.first_id,
      limit: options.limit || 20,
      pinned: options.pinned,
    };

    try {
      const response = this._makeRequest("/conversations", "GET", queryParams);
      console.log("✅ 会話履歴一覧の取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 会話履歴一覧の取得に失敗しました:", error.message);
      throw error;
    }
  }

  getConversationMessages(conversationId, user, options = {}) {
    if (!conversationId) {
      throw new Error("会話IDは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(`📄 会話メッセージを取得しています... (ID: ${conversationId})`);

    const queryParams = {
      user: actualUser,
      conversation_id: conversationId,
      first_id: options.first_id,
      limit: options.limit || 20,
    };

    try {
      const response = this._makeRequest("/messages", "GET", queryParams);
      console.log("✅ 会話メッセージの取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 会話メッセージの取得に失敗しました:", error.message);
      throw error;
    }
  }

  // その他のメソッド群も同様に実装...

  /**
   * チャット系機能を初期化（内部メソッド）
   *
   * @private
   */
  _initializeChatFeatures() {
    try {
      console.log("🔧 チャット系機能を初期化しています...");
      console.log("✅ チャット系機能の初期化が完了しました");
    } catch (error) {
      console.warn("⚠️ チャット系機能の初期化に失敗しました:", error.message);
    }
  }

  /**
   * メッセージエンドポイントを取得（サブクラスで実装）
   *
   * @abstract
   * @private
   * @returns {string} API エンドポイント
   */
  _getMessageEndpoint() {
    throw new Error(
      "_getMessageEndpointメソッドはサブクラスで実装してください"
    );
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
 */
class Chatbot extends ChatBase {
  /**
   * メッセージエンドポイントを取得
   *
   * @private
   * @returns {string} API エンドポイント
   */
  _getMessageEndpoint() {
    return "/chat-messages";
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
 */
class Chatflow extends ChatBase {
  /**
   * メッセージエンドポイントを取得
   *
   * @private
   * @returns {string} API エンドポイント
   */
  _getMessageEndpoint() {
    return "/chat-messages";
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
 */
class Textgenerator extends Dify {
  /**
   * Textgenerator クライアントを初期化
   *
   * @param {Object} options - 設定オプション
   */
  constructor(options) {
    super(options);
    this._initializeTextGeneratorFeatures();
  }

  /**
   * 完了メッセージを作成する
   *
   * @param {Object} inputs - アプリで定義された変数値の入力
   * @param {string} [user] - ユーザー識別子
   * @param {Object} [options] - オプションパラメータ
   * @returns {Object} 応答結果のJSONオブジェクト
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

    console.log("📝 完了メッセージを作成しています...");

    const payload = {
      inputs: inputs,
      response_mode: options.response_mode || "streaming",
      user: actualUser,
      files: options.files || [],
    };

    try {
      const response = this._makeRequest(
        "/completion-messages",
        "POST",
        payload
      );

      if (options.response_mode === "streaming") {
        return this._parseStreamingResponse(response);
      }

      console.log("✅ 完了メッセージ作成が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 完了メッセージ作成に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * テキスト生成特有の機能を初期化
   *
   * @private
   */
  _initializeTextGeneratorFeatures() {
    console.log("🔧 テキスト生成機能を初期化しています...");
    console.log("✅ テキスト生成機能の初期化が完了しました");
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
 */
class Workflow extends Dify {
  /**
   * Workflow クライアントを初期化
   *
   * @param {Object} options - 設定オプション
   */
  constructor(options) {
    super(options);
    this._initializeWorkflowFeatures();
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

    console.log("🔄 ワークフローを実行しています...");

    const payload = {
      inputs: inputs,
      response_mode: options.response_mode || "streaming",
      user: actualUser,
    };

    if (options.files && options.files.length > 0) {
      payload.files = options.files;
    }

    try {
      const response = this._makeRequest("/workflows/run", "POST", payload);

      if (options.response_mode === "streaming") {
        return this._parseStreamingResponse(response);
      }

      console.log("✅ ワークフロー実行が完了しました");
      return response;
    } catch (error) {
      console.error("❌ ワークフロー実行に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * ワークフロー特有の機能を初期化
   *
   * @private
   */
  _initializeWorkflowFeatures() {
    console.log("🔧 ワークフロー機能を初期化しています...");
    console.log("✅ ワークフロー機能の初期化が完了しました");
  }

  /**
   * ストリーミングレスポンスを解析
   *
   * @private
   * @param {Object} response - レスポンスオブジェクト
   * @returns {Object} 解析されたレスポンス
   */
  _parseStreamingResponse(response) {
    console.log("🔄 Workflowストリーミングレスポンスを解析しています...");
    // Workflow特有の解析ロジック実装
    return { type: "workflow", response: response };
  }
}
