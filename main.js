/**
 * DAS (Dify Application Script) - Chatbot Class
 * Google Apps Script から Dify API を簡単に呼び出すためのライブラリ
 */

/**
 * Chatbotクラス - Difyのチャットボット機能へのアクセス
 */
function Chatbot(apiKey, baseUrl) {
  this.apiKey = apiKey;
  this.baseUrl = baseUrl || "https://api.dify.ai/v1";
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
 * @returns {Object} チャットボットからの応答
 */
Chatbot.prototype.sendMessage = function (query, user, options) {
  if (!query || !user) {
    throw new Error("query と user は必須パラメータです");
  }

  // Google Apps Script環境ではストリーミングモードはサポートされていません
  if (options && options.response_mode === "streaming") {
    throw new Error(
      "Google Apps Script環境ではストリーミングモードはサポートされていません。response_modeを省略するかblockingを指定してください。",
    );
  }

  var payload = {
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

  return this._makeRequest("/chat-messages", "POST", payload);
};

/**
 * 会話リストを取得する
 * @param {string} user - ユーザー識別子
 * @param {Object} options - オプションパラメータ
 * @param {string} options.last_id - 現在のページの最後の記録のID
 * @param {number} options.limit - 返す記録数 (デフォルト: 20, 最大: 100)
 * @param {string} options.sort_by - ソートフィールド (デフォルト: '-updated_at')
 * @returns {Object} 会話リスト
 */
Chatbot.prototype.getConversations = function (user, options) {
  if (!user) {
    throw new Error("user は必須パラメータです");
  }

  var params = {
    user: user,
    limit: options.limit || 20,
    sort_by: options.sort_by || "-updated_at",
  };

  if (options.last_id) {
    params.last_id = options.last_id;
  }

  var queryString = Object.keys(params)
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    })
    .join("&");

  return this._makeRequest("/conversations?" + queryString, "GET");
};

/**
 * 会話履歴メッセージを取得する
 * @param {string} conversationId - 会話ID
 * @param {string} user - ユーザー識別子
 * @param {Object} options - オプションパラメータ
 * @param {string} options.first_id - 最初のメッセージID
 * @param {number} options.limit - 返すメッセージ数
 * @returns {Object} 会話履歴メッセージ
 */
Chatbot.prototype.getConversationMessages = function (
  conversationId,
  user,
  options,
) {
  if (!conversationId || !user) {
    throw new Error("conversationId と user は必須パラメータです");
  }

  var params = { user: user };
  if (options.first_id) params.first_id = options.first_id;
  if (options.limit) params.limit = options.limit;

  var queryString = Object.keys(params)
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    })
    .join("&");

  return this._makeRequest(
    "/conversations/" + conversationId + "/messages?" + queryString,
    "GET",
  );
};

/**
 * 会話の名前を変更する
 * @param {string} conversationId - 会話ID
 * @param {string} name - 新しい会話名
 * @param {string} user - ユーザー識別子
 * @returns {Object} 更新結果
 */
Chatbot.prototype.renameConversation = function (conversationId, name, user) {
  if (!conversationId || !name || !user) {
    throw new Error("conversationId, name, user は必須パラメータです");
  }

  var payload = {
    name: name,
    user: user,
  };

  return this._makeRequest(
    "/conversations/" + conversationId,
    "PATCH",
    payload,
  );
};

/**
 * 会話を削除する
 * @param {string} conversationId - 会話ID
 * @param {string} user - ユーザー識別者
 * @returns {Object} 削除結果
 */
Chatbot.prototype.deleteConversation = function (conversationId, user) {
  if (!conversationId || !user) {
    throw new Error("conversationId と user は必須パラメータです");
  }

  var params = { user: user };
  var queryString = Object.keys(params)
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    })
    .join("&");

  return this._makeRequest(
    "/conversations/" + conversationId + "?" + queryString,
    "DELETE",
  );
};

/**
 * ファイルをアップロードする
 * @param {Blob} file - アップロードするファイル
 * @param {string} user - ユーザー識別子
 * @returns {Object} アップロード結果
 */
Chatbot.prototype.uploadFile = function (file, user) {
  if (!file || !user) {
    throw new Error("file と user は必須パラメータです");
  }

  var formData = {
    file: file,
    user: user,
  };

  var options = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + this.apiKey,
    },
    payload: formData,
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(this.baseUrl + "/files/upload", options);

  if (
    response.getResponseCode() !== 200 &&
    response.getResponseCode() !== 201
  ) {
    throw new Error("ファイルアップロードエラー: " + response.getContentText());
  }

  return JSON.parse(response.getContentText());
};

/**
 * メッセージにフィードバックを送信する
 * @param {string} messageId - メッセージID
 * @param {string} rating - 評価 ('like' または 'dislike')
 * @param {string} user - ユーザー識別者
 * @returns {Object} フィードバック結果
 */
Chatbot.prototype.sendFeedback = function (messageId, rating, user) {
  if (!messageId || !rating || !user) {
    throw new Error("messageId, rating, user は必須パラメータです");
  }

  if (rating !== "like" && rating !== "dislike") {
    throw new Error('rating は "like" または "dislike" である必要があります');
  }

  var payload = {
    rating: rating,
    user: user,
  };

  return this._makeRequest(
    "/messages/" + messageId + "/feedbacks",
    "POST",
    payload,
  );
};

/**
 * テキストから音声に変換する
 * @param {string} user - ユーザー識別子
 * @param {Object} options - オプションパラメータ
 * @param {string} options.message_id - メッセージID (優先)
 * @param {string} options.text - 音声生成コンテンツ
 * @param {boolean} options.streaming - ストリーミング応答 (デフォルト: false)
 * @returns {Blob} 音声ファイル
 */
Chatbot.prototype.textToAudio = function (user, options) {
  if (!user) {
    throw new Error("user は必須パラメータです");
  }

  if (!options.message_id && !options.text) {
    throw new Error("message_id または text のいずれかが必要です");
  }

  var payload = {
    user: user,
    streaming: options.streaming || false,
  };

  if (options.message_id) {
    payload.message_id = options.message_id;
  }

  if (options.text) {
    payload.text = options.text;
  }

  var requestOptions = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + this.apiKey,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(
    this.baseUrl + "/text-to-audio",
    requestOptions,
  );

  if (response.getResponseCode() !== 200) {
    throw new Error("テキスト音声変換エラー: " + response.getContentText());
  }

  return response.getBlob();
};

/**
 * 音声からテキストに変換する
 * @param {Blob} file - 音声ファイル
 * @param {string} user - ユーザー識別子
 * @returns {Object} テキスト変換結果
 */
Chatbot.prototype.audioToText = function (file, user) {
  if (!file || !user) {
    throw new Error("file と user は必須パラメータです");
  }

  var formData = {
    file: file,
    user: user,
  };

  var options = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + this.apiKey,
    },
    payload: formData,
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(this.baseUrl + "/audio-to-text", options);

  if (response.getResponseCode() !== 200) {
    throw new Error("音声テキスト変換エラー: " + response.getContentText());
  }

  return JSON.parse(response.getContentText());
};

/**
 * メッセージ生成を停止する
 * @param {string} taskId - タスクID
 * @param {string} user - ユーザー識別者
 * @returns {Object} 停止結果
 */
Chatbot.prototype.stopGeneration = function (taskId, user) {
  if (!taskId || !user) {
    throw new Error("taskId と user は必須パラメータです");
  }

  var payload = { user: user };

  return this._makeRequest(
    "/chat-messages/" + taskId + "/stop",
    "POST",
    payload,
  );
};

/**
 * HTTPリクエストを実行する (内部メソッド)
 * @private
 * @param {string} endpoint - APIエンドポイント
 * @param {string} method - HTTPメソッド
 * @param {Object} payload - リクエストボディ
 * @returns {Object} レスポンス
 */
Chatbot.prototype._makeRequest = function (endpoint, method, payload) {
  var url = this.baseUrl + endpoint;

  var options = {
    method: method,
    headers: {
      Authorization: "Bearer " + this.apiKey,
    },
    muteHttpExceptions: true,
  };

  if (payload && method !== "GET") {
    options.headers["Content-Type"] = "application/json";
    options.payload = JSON.stringify(payload);
  }

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();

    if (responseCode < 200 || responseCode >= 300) {
      var errorInfo;
      try {
        errorInfo = JSON.parse(responseText);
      } catch (e) {
        errorInfo = { message: responseText };
      }

      var safeErrorMessage = (
        errorInfo.message ||
        errorInfo.error ||
        responseText
      ).replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");

      throw new Error(
        "API エラー (HTTP " + responseCode + "): " + safeErrorMessage,
      );
    }

    return JSON.parse(responseText);
  } catch (error) {
    if (error.message.indexOf("API エラー") === 0) {
      throw error;
    }
    throw new Error("リクエスト実行エラー: " + error.message);
  }
};
