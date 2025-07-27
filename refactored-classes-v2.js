/**
 * DAS (Dify Application Script) - Refactored Classes v2
 * sendMessageメソッドも統合したさらに高度なリファクタリング版
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
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * BaseChatクラス - Difyのチャット系API共通機能
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
 * @property {Object} features - アプリケーション機能の有効状態
 * @property {boolean} features.speechToText - 音声認識機能の有効状態
 * @property {boolean} features.textToSpeech - 音声合成機能の有効状態
 * @property {boolean} features.fileUpload - ファイルアップロード機能の有効状態
 * @property {boolean} features.suggestedQuestionsAfterAnswer - 回答後推奨質問機能の有効状態
 * @property {Object} userInput - ユーザー入力フォーム構成
 * @property {Array} userInput.text_input - テキスト入力項目
 * @property {Array} userInput.paragraph - 段落入力項目
 * @property {Array} userInput.select - 選択入力項目
 * @property {Object} systemParameters - システムパラメータ
 * @property {number} systemParameters.file_size_limit - ファイルサイズ制限 (バイト)
 * @property {number} systemParameters.image_file_size_limit - 画像ファイルサイズ制限 (バイト)
 * @property {Array<string>} suggestedQuestions - 推奨質問リスト
 * @property {string} openingStatement - オープニングメッセージ
 */
class BaseChat {
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
   * メッセージを送信する（テンプレートメソッド）
   * @param {string} query - ユーザー入力/質問内容 (必須)
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {Object} [options.inputs] - アプリによって定義された変数値 (任意, デフォルト: {})
   * @param {string} [options.response_mode] - 応答モード (任意, 'streaming' または 'blocking', デフォルト: 'streaming')
   * @param {string} [options.conversation_id] - 会話ID (任意, UUID形式, 続きの会話の場合に指定)
   * @param {Array<object>} [options.files] - ファイルリスト (任意)
   * @param {string} [options.files[].type] - ファイルタイプ (必須, 現在は'image'のみの対応)
   * @param {string} [options.files[].transfer_method] - ファイル転送方法,画像URLの場合はremote_url / ファイルアップロードの場合はlocal_file )
   * @param {string} [options.files[].url] - ファイルURL (任意, transfer_methodがremote_urlの場合に指定)
   * @param {string} [options.files[].upload_file_id] - ファイルID (任意, transfer_methodがlocal_fileの場合に指定.事前にuploadFileでアップロードしたファイルのID)
   * @param {boolean} [options.auto_generate_name] - タイトル自動生成 (任意, デフォルト: true)
   *
   * @returns {Object} 応答モードによって異なる構造のJSONオブジェクト
   */
  sendMessage(query, user, options) {
    user = user || this.user;
    if (!query) {
      throw new Error(`queryは必須パラメータです`);
    }

    options = options || {};

    const payload = {
      query: query,
      user: user,
      inputs: options.inputs || {},
      response_mode: options.response_mode || "streaming",
      auto_generate_name: options.auto_generate_name !== false,
    };

    if (options.conversation_id) {
      payload.conversation_id = options.conversation_id;
    }

    if (options.files) {
      payload.files = options.files;
    }

    // ストリーミングモードの場合
    if (payload.response_mode === "streaming") {
      // ストリーミング用の特別な処理
      const url = this.baseUrl + "/chat-messages";
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
      return this._parseStreamingResponse(response);
    }

    // ブロッキングモードの場合
    return this._makeRequest("/chat-messages", "POST", payload);
  }

  /**
   * ストリーミングレスポンスを解析する (抽象メソッド)
   * サブクラスで実装必須
   * @param {HTTPResponse} response - UrlFetchAppからのレスポンス
   * @returns {Object} 解析された結果
   * @protected
   */
  _parseStreamingResponse(response) {
    throw new Error(
      "_parseStreamingResponseメソッドはサブクラスで実装してください"
    );
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

    return this._makeRequest(
      endpoint + queryString,
      "GET"
    );
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
   * ファイルをアップロードする
   * @param {Blob} file - アップロードするファイル (必須)
   * @param {string} [user] - ユーザー識別子 (任意)
   *
   * @returns {Object} アップロード結果
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
        `ファイルサイズが制限を超えています。最大サイズ: ${MAX_FILE_SIZE / (1024 * 1024)
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
        `ファイルアップロードエラー (HTTP ${response.getResponseCode()}): ${errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }

    return JSON.parse(response.getContentText());
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
   * テキストを音声に変換する
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} options - 変換オプション (必須)
   * @param {string} [options.text] - 音声生成コンテンツ (任意, message_idが指定されていない場合は必須)
   * @param {string} [options.message_id] - メッセージID (任意, UUID形式, textより優先)
   *
   * @returns {Object} 音声データ
   */
  textToAudio(user, options) {
    user = user || this.user;
    if (!options) {
      throw new Error(`optionsは必須パラメータです`);
    }
    if (!options.text && !options.message_id) {
      throw new Error(`textまたはmessage_idのいずれかは必須パラメータです`);
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
        `音声変換エラー (HTTP ${responseCode}): ${errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }

    return JSON.parse(response.getContentText());
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
        `音声変換エラー (HTTP ${responseCode}): ${errorInfo.message || errorInfo.error || "不明なエラー"
        }`
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * メッセージ生成を停止する
   * @param {string} taskId - タスクID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意)
   *
   * @returns {Object} 停止結果
   */
  stopGeneration(taskId, user) {
    user = user || this.user;
    if (!taskId) {
      throw new Error(`taskIdは必須パラメータです`);
    }

    const payload = { user: user };

    return this._makeRequest(
      "/chat-messages/" + taskId + "/stop",
      "POST",
      payload
    );
  }

  /**
   * WebApp設定を取得する
   *
   * @returns {Object} WebApp設定情報
   */
  getAppSite() {
    return this._makeRequest("/site", "GET");
  }

  /**
   * アプリケーションのパラメータ情報を取得する
   *
   * @returns {Object} パラメータ情報
   */
  getAppParameters() {
    return this._makeRequest("/parameters", "GET");
  }

  /**
   * アプリケーションのメタ情報を取得する
   *
   * @returns {Object} メタ情報
   */
  getAppMeta() {
    return this._makeRequest("/meta", "GET");
  }

  /**
   * アプリケーションの基本情報を取得する
   *
   * @returns {Object} アプリケーション基本情報
   */
  getAppInfo() {
    return this._makeRequest("/info", "GET");
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
   * アプリケーション機能の初期化（内部メソッド）
   * @private
   */
  _initializeAppFeatures() {
    try {
      const appSite = this.getAppSite();
      const appParameters = this.getAppParameters();

      // 機能有効状態の取得
      this.features = {
        speechToText:
          appParameters.speech_to_text && appParameters.speech_to_text.enabled,
        textToSpeech:
          appParameters.text_to_speech && appParameters.text_to_speech.enabled,
        suggestedQuestionsAfterAnswer:
          appParameters.suggested_questions_after_answer &&
          appParameters.suggested_questions_after_answer.enabled,
      };

      // ユーザー入力フォームの構成の設定も保存
      this.userInput = {
        text_input:
          appParameters.user_input_form.filter((param) => {
            return param["text-input"];
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
      this.fileUpload = {
        image: appParameters.file_upload.image || {},
        document: appParameters.file_upload.document || {},
        video: appParameters.file_upload.video || {},
        audio: appParameters.file_upload.audio || {},
      };
      // 推奨質問とオープニングメッセージも取得・保存
      this.suggestedQuestions = appSite.suggested_questions || [];
      this.openingStatement = appSite.opening_statement || "";
    } catch (error) {
      // 初期化時のエラーは警告として記録し、デフォルト値を設定
      Logger.log(
        "アプリケーション機能の初期化中にエラーが発生しました: " + error.message
      );

      // 成功時と同じプロパティ構造に合わせる
      this.features = {
        speechToText: false,
        textToSpeech: false,
        fileUpload: false,
        suggestedQuestionsAfterAnswer: false,
      };
      this.userInput = {
        text_input: [],
        paragraph: [],
        select: [],
      };
      this.systemParameters = {};
      this.suggestedQuestions = [];
      this.openingStatement = "";
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
        `レート制限に達しました。${this._rateLimitWindow / 1000}秒間に${this._rateLimitMax
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
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
  }
}

/**
 * Chatbotクラス - Difyのチャットボット機能へのアクセス
 * BaseChatクラスを継承し、Chatbot特有のストリーミング処理を実装
 */
class Chatbot extends BaseChat {
  constructor(options) {
    super(options);
  }

  /**
   * ストリーミングレスポンスを解析する (内部メソッド)
   * Chatbot特有のイベント処理を実装
   * @param {HTTPResponse} response - UrlFetchAppからのレスポンス
   * @returns {Object} 解析された結果
   * @protected
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
        `ストリーミングAPIエラー (HTTP ${responseCode}): ${errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }
  }
}

/**
 * Chatflowクラス - Difyのチャットフロー機能へのアクセス
 * BaseChatクラスを継承し、Chatflow特有のワークフローイベント処理を実装
 */
class Chatflow extends BaseChat {
  constructor(options) {
    super(options);
  }

  /**
   * ストリーミングレスポンスを解析する (内部メソッド)
   * Chatflow特有のワークフローイベント処理を実装
   * @param {HTTPResponse} response - UrlFetchAppからのレスポンス
   * @returns {Object} 解析された結果
   * @protected
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
        `ストリーミングAPIエラー (HTTP ${responseCode}): ${errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }
  }
}
