/**
 * DAS (Dify Application Script) - Textgenerator Class
 * Google Apps Script から Dify Text Generation API を簡単に呼び出すためのライブラリ
 */

/**
 * Textgeneratorクラス - Difyのテキスト生成機能へのアクセス
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
 * @property {Object} fileUpload - ファイルアップロード設定 (初期化時に取得)
 * @property {Object} systemParameters - システムパラメータ (初期化時に取得)
 * @property {Object} userInput - ユーザー入力フォーム設定 (初期化時に取得)
 */
class Textgenerator {
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
   * 完了メッセージを作成する
   * @param {Object} inputs - アプリで定義された変数値の入力 (必須)
   * @param {string} inputs.query - 入力テキスト、処理される内容 (必須)
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.response_mode] - 応答モード (任意, 'streaming' または 'blocking', デフォルト: 'streaming')
   * @param {Array<object>} [options.files] - ファイルリスト (任意) - Vision機能が有効な場合のみ
   *
   * @returns {Object} 応答モードによって異なる構造のJSONオブジェクト
   *
   * **blocking モードの戻り値:**
   * ```json
   * {
   *   "event": "message",
   *   "message_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "mode": "completion",
   *   "answer": "完全な応答内容",
   *   "metadata": {
   *     "usage": {
   *       "prompt_tokens": 123,
   *       "completion_tokens": 456,
   *       "total_tokens": 579,
   *       "total_price": "0.00123",
   *       "currency": "USD",
   *       "latency": 1.23
   *     },
   *     "retriever_resources": []
   *   },
   *   "created_at": 1705395332
   * }
   * ```
   *
   * **streaming モードの戻り値:**
   * ストリーミングイベントを解析して結合された結果を返します
   * ```json
   * {
   *   "message_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "task_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "status": "succeeded",
   *   "answer": "結合されたテキスト出力",
   *   "combined_text": "結合されたテキスト出力",
   *   "text_chunks": [
   *     {
   *       "text": "テキストフラグメント",
   *       "created_at": 1705395332
   *     }
   *   ],
   *   "metadata": {
   *     "usage": {...},
   *     "retriever_resources": []
   *   },
   *   "audio": "Base64エンコードされたMP3音声データまたはnull"
   * }
   * ```
   */
  createCompletionMessage(inputs, user, options) {
    user = user || this.user;
    if (!inputs || !inputs.query) {
      throw new Error(`inputs.queryは必須パラメータです`);
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
      const url = this.baseUrl + "/completion-messages";
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
    return this._makeRequest("/completion-messages", "POST", payload);
  }

  /**
   * 完了メッセージの生成を停止する
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
  stopCompletionTask(taskId, user) {
    user = user || this.user;
    if (!taskId) {
      throw new Error(`taskIdは必須パラメータです`);
    }

    const payload = { user: user };

    return this._makeRequest(
      "/completion-messages/" + taskId + "/stop",
      "POST",
      payload
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
   *   "default_language": "ja-JP"
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
        "アプリケーション機能の初期化中にエラーが発生しました: " + error.message
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
   * ファイルをアップロードする (テキストジェネレーター用)
   * @param {Blob} file - アップロードするファイル (必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} アップロード結果 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "name": "example.png",
   *   "size": 1048576,
   *   "extension": "png",
   *   "mime_type": "image/png",
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

    // ファイルサイズ検証 (システムパラメータに基づく制限)
    const imageFileLimit = this.systemParameters.image_file_size_limit || 10; // MB
    const MAX_FILE_SIZE = imageFileLimit * 1024 * 1024;
    if (file.getSize && file.getSize() > MAX_FILE_SIZE) {
      throw new Error(
        `ファイルサイズが制限を超えています。最大サイズ: ${imageFileLimit}MB`
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
   * テキストを音声に変換する
   * @param {Object} options - 変換オプション (必須)
   * @param {string} [options.message_id] - メッセージID (任意, UUID形式, textより優先)
   * @param {string} [options.text] - 音声生成コンテンツ (任意, message_idが指定されていない場合は必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Blob} 音声ファイル (MP3またはWAV形式)
   */
  textToAudio(options, user) {
    user = user || this.user;
    if (!options) {
      throw new Error(`optionsは必須パラメータです`);
    }
    if (!options.message_id && !options.text) {
      throw new Error(`message_idまたはtextのいずれかは必須パラメータです`);
    }

    const payload = {
      user: user,
    };

    if (options.message_id) {
      payload.message_id = options.message_id;
    }
    if (options.text) {
      payload.text = options.text;
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

    if (responseCode !== 200) {
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
   * ストリーミングレスポンスを解析する (内部メソッド)
   * @param {HTTPResponse} response - UrlFetchAppからのレスポンス
   * @returns {Object} 解析された結果
   * @private
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
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
  }
}
