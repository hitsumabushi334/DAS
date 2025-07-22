/**
 * DAS (Dify Application Script) - Chatbot Class
 * Google Apps Script から Dify API を簡単に呼び出すためのライブラリ
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
 * Chatbotクラス - Difyのチャットボット機能へのアクセス
 */
class Chatbot {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "https://api.dify.ai/v1";

    // リクエストキャッシュ (GETリクエスト用)
    this._cache = {};
    this._cacheTimeout = 5 * 60 * 1000; // 5分間のキャッシュ

    // レート制限 (1分間に60リクエスト)
    this._rateLimitRequests = [];
    this._rateLimitWindow = 60 * 1000; // 1分間
    this._rateLimitMax = 60; // 最大60リクエスト
  }

  /**
   * メッセージを送信する
   * @param {string} query - ユーザー入力/質問内容
   * @param {string} user - ユーザー識別子
   * @param {Object} options - オプションパラメータ
   * @param {Object} options.inputs - アプリによって定義された変数値
   * @param {string} options.response_mode - 応答モード ('streaming' または 'blocking')
   * @param {string} options.conversation_id - 会話ID (続きの会話の場合)
   * @param {Array} options.files - ファイルリスト
   * @param {boolean} options.auto_generate_name - タイトル自動生成 (デフォルト: true)
   * @param {Function} options.onChunk - ストリーミング時のチャンクごとのコールバック関数
   * @param {Function} options.onComplete - ストリーミング完了時のコールバック関数
   * @param {Function} options.onError - エラー発生時のコールバック関数
   * @returns {Object} チャットボットからの応答 (blocking) または処理状況 (streaming)
   */
  sendMessage(query, user, options) {
    if (!query || !user) {
      throw new Error(`query と user は必須パラメータです`);
    }

    options = options || {};

    const payload = {
      query: query,
      user: user,
      inputs: options.inputs || {},
      response_mode: options.response_mode || "blocking",
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
    return this._makeRequest("/chat-messages", "POST", payload);
  }

  /**
   * 会話リストを取得する
   * @param {string} user - ユーザー識別子
   * @param {Object} options - オプションパラメータ
   * @param {string} options.last_id - 現在のページの最後の記録のID
   * @param {number} options.limit - 返す記録数 (デフォルト: 20, 最大: 100)
   * @param {string} options.sort_by - ソートフィールド (デフォルト: '-updated_at')
   * @returns {Object} 会話リスト
   */
  getConversations(user, options) {
    if (!user) {
      throw new Error(`user は必須パラメータです`);
    }

    options = options || {};

    const params = {
      user: user,
      limit: options.limit || 20,
      sort_by: options.sort_by || "-updated_at",
    };

    if (options.last_id) {
      params.last_id = options.last_id;
    }

    const queryString = this._buildQueryString(params);

    return this._makeRequest("/conversations?" + queryString, "GET");
  }

  /**
   * 会話履歴メッセージを取得する
   * @param {string} conversationId - 会話ID
   * @param {string} user - ユーザー識別子
   * @param {Object} options - オプションパラメータ
   * @param {string} options.first_id - 最初のメッセージID
   * @param {number} options.limit - 返すメッセージ数
   * @returns {Object} 会話履歴メッセージ
   */
  getConversationMessages(conversationId, user, options) {
    if (!conversationId || !user) {
      throw new Error(`conversationId と user は必須パラメータです`);
    }

    options = options || {};

    const params = { user: user };
    if (options.first_id) params.first_id = options.first_id;
    if (options.limit) params.limit = options.limit;

    const queryString = this._buildQueryString(params);

    return this._makeRequest(
      "/conversations/" + conversationId + "/messages?" + queryString,
      "GET",
    );
  }

  /**
   * 会話の名前を変更する
   * @param {string} conversationId - 会話ID
   * @param {string} name - 新しい会話名
   * @param {string} user - ユーザー識別子
   * @returns {Object} 更新結果
   */
  renameConversation(conversationId, name, user) {
    if (!conversationId || !name || !user) {
      throw new Error(`conversationId, name, user は必須パラメータです`);
    }

    const payload = {
      name: name,
      user: user,
    };

    return this._makeRequest(
      "/conversations/" + conversationId,
      "PATCH",
      payload,
    );
  }

  /**
   * 会話を削除する
   * @param {string} conversationId - 会話ID
   * @param {string} user - ユーザー識別者
   * @returns {Object} 削除結果
   */
  deleteConversation(conversationId, user) {
    if (!conversationId || !user) {
      throw new Error(`conversationId と user は必須パラメータです`);
    }

    const params = { user: user };
    const queryString = this._buildQueryString(params);

    return this._makeRequest(
      "/conversations/" + conversationId + "?" + queryString,
      "DELETE",
    );
  }

  /**
   * ファイルをアップロードする
   * @param {Blob} file - アップロードするファイル
   * @param {string} user - ユーザー識別子
   * @returns {Object} アップロード結果
   */
  uploadFile(file, user) {
    if (!file || !user) {
      throw new Error(`file と user は必須パラメータです`);
    }

    // ファイルサイズ検証 (50MB制限)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.getSize && file.getSize() > MAX_FILE_SIZE) {
      throw new Error(
        `ファイルサイズが制限を超えています。最大サイズ: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
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
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `ファイルアップロードエラー: ${errorInfo.message || errorInfo.error || response.getContentText()}`,
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * メッセージにフィードバックを送信する
   * @param {string} messageId - メッセージID
   * @param {string} rating - 評価 ('like' または 'dislike')
   * @param {string} user - ユーザー識別者
   * @returns {Object} フィードバック結果
   */
  sendFeedback(messageId, rating, user) {
    if (!messageId || !rating || !user) {
      throw new Error(`messageId, rating, user は必須パラメータです`);
    }

    if (rating !== "like" && rating !== "dislike") {
      throw new Error(`rating は "like" または "dislike" である必要があります`);
    }

    const payload = {
      rating: rating,
      user: user,
    };

    return this._makeRequest(
      "/messages/" + messageId + "/feedbacks",
      "POST",
      payload,
    );
  }

  /**
   * テキストから音声に変換する
   * @param {string} user - ユーザー識別子
   * @param {Object} options - オプションパラメータ
   * @param {string} options.message_id - メッセージID (優先)
   * @param {string} options.text - 音声生成コンテンツ
   * @param {boolean} options.streaming - ストリーミング応答 (デフォルト: false)
   * @returns {Blob} 音声ファイル
   */
  textToAudio(user, options) {
    if (!user) {
      throw new Error(`user は必須パラメータです`);
    }

    options = options || {};

    if (!options.message_id && !options.text) {
      throw new Error(`message_id または text のいずれかが必要です`);
    }

    const payload = {
      user: user,
      streaming: options.streaming || false,
    };

    if (options.message_id) {
      payload.message_id = options.message_id;
    }

    if (options.text) {
      payload.text = options.text;
    }

    const requestOptions = {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(
      this.baseUrl + "/text-to-audio",
      requestOptions,
    );

    if (response.getResponseCode() !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `テキスト音声変換エラー: ${errorInfo.message || errorInfo.error || response.getContentText()}`,
      );
    }

    return response.getBlob();
  }

  /**
   * 音声からテキストに変換する
   * @param {Blob} file - 音声ファイル
   * @param {string} user - ユーザー識別子
   * @returns {Object} テキスト変換結果
   */
  audioToText(file, user) {
    if (!file || !user) {
      throw new Error(`file と user は必須パラメータです`);
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
      options,
    );

    if (response.getResponseCode() !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `音声テキスト変換エラー: ${errorInfo.message || errorInfo.error || response.getContentText()}`,
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * メッセージ生成を停止する
   * @param {string} taskId - タスクID
   * @param {string} user - ユーザー識別者
   * @returns {Object} 停止結果
   */
  stopGeneration(taskId, user) {
    if (!taskId || !user) {
      throw new Error(`taskId と user は必須パラメータです`);
    }

    const payload = { user: user };

    return this._makeRequest(
      "/chat-messages/" + taskId + "/stop",
      "POST",
      payload,
    );
  }

  /**
   * クエリ文字列を生成する (内部メソッド)
   * @private
   * @param {Object} params - パラメータオブジェクト
   * @returns {string} クエリ文字列
   */
  _buildQueryString(params) {
    return Object.keys(params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
      )
      .join("&");
  }

  /**
   * ストリーミングレスポンスを解析する (内部メソッド)
   * @private
   * @param {object} responseText - SSE形式のレスポンステキスト
   * @returns {Object} 解析結果
   */
  _parseStreamingResponse(response) {
    const responseCode = response.getResponseCode();

    if (responseCode === HTTP_STATUS.OK) {
      Logger.log("API call successful");

      const content = response.getContentText();
      const chunks = content.split("\n\n");
      let answer = "";

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        if (chunk.startsWith("data: ")) {
          try {
            const json = JSON.parse(chunk.substring(6));
            switch (json.event) {
              case "workflow_started":
                Logger.log("workflow_started");
                break;
              case "workflow_finished":
                Logger.log("workflow_finished");
                break;
              case "node_finished":
                Logger.log("node_finished");
                if (json.data.title == "終了") {
                  answer = json.data.outputs.text;
                }
                break;
              default:
                Logger.log(
                  "Event: " + json.event + ", title: " + json.data.title,
                );
            }
          } catch (e) {
            Logger.log("Error parsing JSON: " + e.toString());
          }
        }
      }
    } else {
      Logger.log("Error message: " + response.getContentText());
      throw new Error(
        `ストリーミングAPIエラー (HTTP ${responseCode}): ${response.getContentText()}`,
      );
    }
    return { answer: answer };
  }

  /**
   * HTTPリクエストを実行する (内部メソッド)
   * @private
   * @param {string} endpoint - APIエンドポイント
   * @param {string} method - HTTPメソッド
   * @param {Object} payload - リクエストボディ
   * @returns {Object} レスポンス
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
        `レート制限に達しました。${this._rateLimitWindow / 1000}秒間に${this._rateLimitMax}リクエストを超えています`,
      );
    }

    // 現在のリクエストを記録
    this._rateLimitRequests.push(now);
  }
}
