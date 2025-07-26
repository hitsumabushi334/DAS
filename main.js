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
class Chatbot {
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
   * メッセージを送信する
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
   *
   * **blocking モード (デフォルト) の戻り値:**
   * ```json
   * {
   *   "event": "message",
   *   "task_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "message_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "conversation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "mode": "chat",
   *   "answer": "完全な回答テキスト",
   *   "metadata": {
   *     "usage": {
   *       "prompt_tokens": 100,
   *       "completion_tokens": 50,
   *       "total_tokens": 150
   *     },
   *     "retriever_resources": []
   *   },
   *   "created_at": 1705395332
   * }
   * ```
   *
   * **streaming モードの戻り値:**
   * ```json
   * {
   *   "answer": "結合された完全な回答テキスト",
   *   "conversation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "message_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "task_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "workflow_run_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "metadata": {
   *     "usage": { "prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150 },
   *     "retriever_resources": []
   *   },
   *   "created_at": "1705395332",
   *   "audio": null,
   *   "file_id": "",
   *   "file_url": "",
   *   "workflow_output": {},
   *   "node_outputs": []
   * }
   * ```
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
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.last_id] - 現在のページの最後の記録のID (任意, UUID形式, デフォルト: null)
   * @param {number} [options.limit] - 返す記録数 (任意, デフォルト: 20, 最小: 1, 最大: 100)
   * @param {string} [options.sort_by] - ソートフィールド (任意, デフォルト: '-updated_at', 利用可能な値：created_at, -created_at, updated_at, -updated_at)
   *
   * @returns {Object} 会話リスト - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "limit": 20,
   *   "has_more": false,
   *   "data": [
   *     {
   *       "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "name": "会話名",
   *       "inputs": {},
   *       "status": "normal",
   *       "introduction": "会話の紹介文",
   *       "created_at": 1705395332,
   *       "updated_at": 1705395332
   *     }
   *   ]
   * }
   * ```
   */
  getConversations(user, options) {
    user = user || this.user;

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
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.first_id] - 現在のページの最初のチャット記録のID (任意, UUID形式, デフォルト: null)
   * @param {number} [options.limit] - 返すメッセージ数 (任意, デフォルト: 20)
   *
   * @returns {Object} 会話履歴メッセージ - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "limit": 20,
   *   "has_more": false,
   *   "data": [
   *     {
   *       "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "conversation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "inputs": {},
   *       "query": "ユーザーの質問内容",
   *       "answer": "AIの回答内容",
   *       "message_files": [
   *         {
   *           "id": "file-id",
   *           "type": "image",
   *           "url": "https://example.com/file.png",
   *           "belongs_to": "user"
   *         }
   *       ],
   *       "feedback": {
   *         "rating": "like"
   *       },
   *       "retriever_resources": [],
   *       "agent_thoughts": [],
   *       "created_at": 1705395332
   *     }
   *   ]
   * }
   * ```
   */
  getConversationMessages(conversationId, user, options) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    options = options || {};

    const params = { user: user, conversation_id: conversationId };
    if (options.first_id) params.first_id = options.first_id;
    if (options.limit) params.limit = options.limit;

    const queryString = this._buildQueryString(params);

    return this._makeRequest("/messages?" + queryString, "GET");
  }

  /**
   * 会話の名前を変更する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [name] - 新しい会話名 (任意, auto_generateがtrueの場合は省略可)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {boolean} [autoGenerate] - タイトル自動生成フラグ (任意, デフォルト: false)
   * @returns {Object} 更新結果
   * ```json
   * {
    "id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
    "name": "Chat vs AI",
    "inputs": {},
    "introduction": "",
    "created_at": 1705569238,
    "updated_at": 1705569238
    }
   * ```
   */
  renameConversation(conversationId, name, user, autoGenerate) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    if (!name && !autoGenerate) {
      throw new Error(`name または autoGenerate のいずれかが必要です`);
    }

    const payload = {
      user: user,
    };

    if (name) {
      payload.name = name;
    }

    if (autoGenerate) {
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
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @returns {Object} 削除結果
   * ```json
   * {
   *   "result": "success"
   * }
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
   * @param {Blob} file - アップロードするファイル (必須, 最大サイズ: 50MB)
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
        `ファイルアップロードエラー: ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * メッセージにフィードバックを送信する
   * @param {string} messageId - メッセージID (必須, UUID形式)
   * @param {string} [rating] - 評価 ( 任意, 高評価：'like'、低評価：'dislike'、取り消し：'null')
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {string} [content] - メッセージフィードバックの具体的な内容。(任意)
   *
   * @returns {Object} フィードバック結果 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "result": "success"
   * }
   * ```
   */
  sendFeedback(messageId, rating, user, content) {
    user = user || this.user;
    if (!messageId) {
      throw new Error(`messageIdは必須パラメータです`);
    }

    rating = rating || "null"; // デフォルトは取り消し
    if (rating !== "like" && rating !== "dislike" && rating !== "null") {
      throw new Error(
        `rating は "like" または "dislike"または "null" である必要があります`
      );
    }

    const payload = {
      rating: rating,
      user: user,
    };

    if (content && typeof content === "string") {
      content = content.trim();
      payload.content = content;
    }

    return this._makeRequest(
      "/messages/" + messageId + "/feedbacks",
      "POST",
      payload
    );
  }

  /**
   * テキストから音声に変換する
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.message_id] - メッセージID (任意, UUID形式, 優先的に使用される)
   * @param {string} [options.text] - 音声生成コンテンツ (任意, message_idが指定されていない場合は必須)
   * @param {boolean} [options.streaming] - ストリーミング応答 (任意, デフォルト: false)
   * @returns {Blob} 音声ファイル
   * ```json
   * {
  "Content-Type": "audio/wav"
   * }
  ```
   */

  textToAudio(user, options) {
    user = user || this.user;
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
      },
      payload: payload,
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(
      this.baseUrl + "/text-to-audio",
      requestOptions
    );

    if (response.getResponseCode() !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `テキスト音声変換エラー: ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }

    return response.getBlob();
  }

  /**
   * 音声からテキストに変換する
   * @param {Blob} file - 音声ファイル (必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @returns {Object} テキスト変換結果
   * ```json
   * {
   *   "text": "変換されたテキスト内容",
   * }
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

    if (response.getResponseCode() !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `音声テキスト変換エラー: ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * メッセージ生成を停止する
   * @param {string} taskId - タスクID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @returns {Object} 停止結果
   * ```json
   * {
   *  "result": "success"
   *}
   * ```
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
   * Todo: こここから実装に問題がないか確認する
   * WebApp設定を取得する
   *
   * @returns {Object} WebApp UI設定情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "title": "アプリタイトル",
   *   "chat_color_theme": "#1C64F2",
   *   "chat_color_theme_inverted": false,
   *   "icon_type": "emoji",
   *   "icon": "🤖",
   *   "description": "アプリの説明",
   *   "copyright": "Copyright info",
   *   "privacy_policy": "Privacy policy URL",
   *   "custom_disclaimer": "Custom disclaimer",
   *   "default_language": "ja-JP",
   *   "show_workflow_steps": true,
   *   "use_icon_as_answer_icon": false
   * }
   * ```
   */
  getAppSite() {
    return this._makeRequest("/site", "GET");
  }

  /**
   * アプリケーションのパラメータ情報を取得する
   *
   * @returns {Object} 機能・入力パラメータ情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "opening_statement": "オープニングメッセージ",
   *   "suggested_questions": ["推奨質問1", "推奨質問2"],
   *   "suggested_questions_after_answer": {
   *     "enabled": true
   *   },
   *   "speech_to_text": {
   *     "enabled": false
   *   },
   *   "text_to_speech": {
   *     "enabled": false,
   *     "voice": "default",
   *     "language": "ja-JP",
   *     "autoPlay": "disabled"
   *   },
   *   "file_upload": {
   *     "image": {
   *       "enabled": true,
   *       "number_limits": 3,
   *       "transfer_methods": ["local_file"]
   *     }
   *   },
   *   "system_parameters": {
   *     "file_size_limit": 52428800,
   *     "image_file_size_limit": 10485760
   *   }
   * }
   * ```
   */
  getAppParameters() {
    return this._makeRequest("/parameters", "GET");
  }

  /**
   * アプリケーションのメタ情報を取得する
   *
   * @returns {Object} ツールアイコンメタ情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "tool_icons": {
   *     "tool_name": "icon_url_or_data"
   *   }
   * }
   * ```
   */
  getAppMeta() {
    return this._makeRequest("/meta", "GET");
  }

  /**
   * アプリケーションの基本情報を取得する
   *
   * @returns {Object} アプリケーション基本情報 - 以下の構造のJSONオブジェクト
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
   * メッセージの推奨質問を取得する
   * @param {string} messageId - メッセージID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} 推奨質問リスト - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "result": "success",
   *   "data": [
   *     "関連する質問1",
   *     "関連する質問2",
   *     "関連する質問3"
   *   ]
   * }
   * ```
   */
  getSuggestedQuestions(messageId, user) {
    user = user || this.user;
    if (!messageId) {
      throw new Error(`messageIdは必須パラメータです`);
    }

    const params = { user: user };
    const queryString = this._buildQueryString(params);

    return this._makeRequest(
      "/messages/" + messageId + "/suggested?" + queryString,
      "GET"
    );
  }

  /**
   * アプリのフィードバック情報を取得する
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {number} [options.page] - ページ番号 (任意, デフォルト: 1)
   * @param {number} [options.limit] - 1ページあたりの件数 (任意, デフォルト: 20)
   * @returns {Object} フィードバック情報リスト
   * ```json
   *     {
    "data": [
        {
            "id": "8c0fbed8-e2f9-49ff-9f0e-15a35bdd0e25",
            "app_id": "f252d396-fe48-450e-94ec-e184218e7346",
            "conversation_id": "2397604b-9deb-430e-b285-4726e51fd62d",
            "message_id": "709c0b0f-0a96-4a4e-91a4-ec0889937b11",
            "rating": "like",
            "content": "message feedback information-3",
            "from_source": "user",
            "from_end_user_id": "74286412-9a1a-42c1-929c-01edb1d381d5",
            "from_account_id": null,
            "created_at": "2025-04-24T09:24:38",
            "updated_at": "2025-04-24T09:24:38"
        }
    ]
    }
  * ```
   */
  getAppFeedbacks(options) {
    options = options || {};

    const params = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const queryString =
      Object.keys(params).length > 0
        ? "?" + this._buildQueryString(params)
        : "";

    return this._makeRequest("/app/feedbacks" + queryString, "GET");
  }

  /**
   * 会話変数を取得する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.last_id] - 現在のページの最後の記録ID (任意, UUID形式, デフォルト: null)
   * @param {number} [options.limit] - 返す記録数 (任意, デフォルト: 20, 最小: 1, 最大: 100)
   * @param {string} [options.variable_name] - 変数名フィルタ (任意)
   * @returns {Object} 会話変数データ
   * ```json
   * {
  "limit": 100,
  "has_more": false,
  "data": [
    {
      "id": "variable-uuid-1",
      "name": "customer_name",
      "value_type": "string",
      "value": "John Doe",
      "description": "会話から抽出された顧客名",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    },
    {
      "id": "variable-uuid-2",
      "name": "order_details",
      "value_type": "json",
      "value": "{\"product\":\"Widget\",\"quantity\":5,\"price\":19.99}",
      "description": "顧客の注文詳細",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    }
  ]
}
   * ```
   */
  getConversationVariables(conversationId, user, options) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    options = options || {};

    const params = { user: user };
    if (options.last_id) params.last_id = options.last_id;
    if (options.limit) params.limit = options.limit;
    if (options.variable_name) params.variable_name = options.variable_name;

    const queryString = this._buildQueryString(params);

    return this._makeRequest(
      "/conversations/" + conversationId + "/variables?" + queryString,
      "GET"
    );
  }

  /**
   * アプリケーション機能の有効状態を初期化時に取得・保存する (内部メソッド)
   * @private
   */
  _initializeAppFeatures() {
    try {
      const appParams = this.getAppParameters();

      // 各機能の有効状態をプロパティに保存
      this.features = {
        speechToText:
          appParams.speech_to_text && appParams.speech_to_text.enabled,
        textToSpeech:
          appParams.text_to_speech && appParams.text_to_speech.enabled,
        suggestedQuestionsAfterAnswer:
          appParams.suggested_questions_after_answer &&
          appParams.suggested_questions_after_answer.enabled,
      };
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

      // 推奨質問も保存
      this.suggestedQuestions = appParams.suggested_questions || [];

      // オープニングステートメントも保存
      this.openingStatement = appParams.opening_statement || "";
    } catch (error) {
      // 初期化時のエラーは警告として記録し、デフォルト値を設定
      Logger.log(
        "アプリケーション機能の初期化中にエラーが発生しました: " + error.message
      );
      this.features = {
        speechToText: false,
        textToSpeech: false,
        suggestedQuestionsAfterAnswer: false,
      };
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
      this.suggestedQuestions = [];
      this.openingStatement = "";
    }
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
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
  }

  /**
   * ストリーミングレスポンスを解析する (内部メソッド)
   * @private
   * @param {object} response - SSE形式のレスポンス
   * @returns {Object} 解析結果
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
        workflow_run_id: workflowRunId,
        metadata: metadata,
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
}

/**
 * Chatflowクラス - Difyのチャットフロー機能へのアクセス
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
 * @property {object} fileUpload - ファイルアップロード機能の有効状態
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
class Chatflow {
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
   * メッセージを送信する
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
   *
   * **blocking モード (デフォルト) の戻り値:**
   * ```json
   * {
   *   "event": "message",
   *   "task_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "message_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "conversation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "mode": "chat",
   *   "answer": "完全な回答テキスト",
   *   "metadata": {
   *     "usage": {
   *       "prompt_tokens": 100,
   *       "completion_tokens": 50,
   *       "total_tokens": 150
   *     },
   *     "retriever_resources": []
   *   },
   *   "created_at": 1705395332
   * }
   * ```
   *
   * **streaming モードの戻り値:**
   * ```json
   * {
   *   "answer": "結合された完全な回答テキスト",
   *   "conversation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "message_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "task_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "workflow_run_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *   "metadata": {
   *     "usage": { "prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150 },
   *     "retriever_resources": []
   *   },
   *   "created_at": "1705395332",
   *   "audio": null,
   *   "file_id": "",
   *   "file_url": "",
   *   "workflow_output": {},
   *   "node_outputs": []
   * }
   * ```
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
   * @param {string} [user] - ユーザー識別子 (任意)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.last_id] - 現在のページの最後の記録のID (任意, UUID形式, デフォルト: null)
   * @param {number} [options.limit] - 返す記録数 (任意, デフォルト: 20, 最小: 1, 最大: 100)
   * @param {string} [options.sort_by] - ソートフィールド (任意, デフォルト: '-updated_at', 利用可能な値：created_at, -created_at, updated_at, -updated_at)
   *
   * @returns {Object} 会話リスト - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "limit": 20,
   *   "has_more": false,
   *   "data": [
   *     {
   *       "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "name": "会話名",
   *       "inputs": {},
   *       "status": "normal",
   *       "introduction": "会話の紹介文",
   *       "created_at": 1705395332,
   *       "updated_at": 1705395332
   *     }
   *   ]
   * }
   * ```
   */
  getConversations(user, options) {
    user = user || this.user;

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
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.first_id] - 現在のページの最初のチャット記録のID (任意, UUID形式, デフォルト: null)
   * @param {number} [options.limit] - 返すメッセージ数 (任意, デフォルト: 20)
   *
   * @returns {Object} 会話履歴メッセージ - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "limit": 20,
   *   "has_more": false,
   *   "data": [
   *     {
   *       "id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "conversation_id": "3c90c3cc-0d44-4b50-8888-8dd25736052a",
   *       "inputs": {},
   *       "query": "ユーザーの質問内容",
   *       "answer": "AIの回答内容",
   *       "message_files": [
   *         {
   *           "id": "file-id",
   *           "type": "image",
   *           "url": "https://example.com/file.png",
   *           "belongs_to": "user"
   *         }
   *       ],
   *       "feedback": {
   *         "rating": "like"
   *       },
   *       "retriever_resources": [],
   *       "agent_thoughts": [],
   *       "created_at": 1705395332
   *     }
   *   ]
   * }
   * ```
   */
  getConversationMessages(conversationId, user, options) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    options = options || {};

    const params = { user: user, conversation_id: conversationId };
    if (options.first_id) params.first_id = options.first_id;
    if (options.limit) params.limit = options.limit;

    const queryString = this._buildQueryString(params);

    return this._makeRequest("/messages?" + queryString, "GET");
  }

  /**
   * 会話の名前を変更する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [name] - 新しい会話名 (任意, auto_generateがtrueの場合は省略可)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {boolean} [autoGenerate] - タイトル自動生成フラグ (任意, デフォルト: false)
   * @returns {Object} 更新結果
   * ```json
   * {
    "id": "cd78daf6-f9e4-4463-9ff2-54257230a0ce",
    "name": "Chat vs AI",
    "inputs": {},
    "introduction": "",
    "created_at": 1705569238,
    "updated_at": 1705569238
    }
   * ```
   */
  renameConversation(conversationId, name, user, autoGenerate) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    if (!name && !autoGenerate) {
      throw new Error(`name または autoGenerate のいずれかが必要です`);
    }

    const payload = {
      user: user,
    };

    if (name) {
      payload.name = name;
    }

    if (autoGenerate) {
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
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @returns {Object} 削除結果
   * ```json
   * {
   *   "result": "success"
   * }
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
   * @param {Blob} file - アップロードするファイル (必須, 最大サイズ: 50MB)
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
        `ファイルアップロードエラー: ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * メッセージにフィードバックを送信する
   * @param {string} messageId - メッセージID (必須, UUID形式)
   * @param {string} [rating] - 評価 ( 任意, 高評価：'like'、低評価：'dislike'、取り消し：'null')
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {string} [content] - メッセージフィードバックの具体的な内容。(任意)
   *
   * @returns {Object} フィードバック結果 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "result": "success"
   * }
   * ```
   */
  sendFeedback(messageId, rating, user, content) {
    user = user || this.user;
    if (!messageId) {
      throw new Error(`messageIdは必須パラメータです`);
    }
    rating = rating || "null"; // デフォルトは取り消し
    if (rating !== "like" && rating !== "dislike" && rating !== "null") {
      throw new Error(
        `rating は "like" または "dislike"または "null" である必要があります`
      );
    }

    const payload = {
      rating: rating,
      user: user,
    };

    if (content && typeof content === "string") {
      content = content.trim();
      payload.content = content;
    }

    return this._makeRequest(
      "/messages/" + messageId + "/feedbacks",
      "POST",
      payload
    );
  }

  /**
   * テキストから音声に変換する
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.message_id] - メッセージID (任意, UUID形式, 優先的に使用される)
   * @param {string} [options.text] - 音声生成コンテンツ (任意, message_idが指定されていない場合は必須)
   * @param {boolean} [options.streaming] - ストリーミング応答 (任意, デフォルト: false)
   * @returns {Blob} 音声ファイル
   * ```json
   * {
  "Content-Type": "audio/wav"
   * }
  ```
   */

  textToAudio(user, options) {
    user = user || this.user;
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
      },
      payload: payload,
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(
      this.baseUrl + "/text-to-audio",
      requestOptions
    );

    if (response.getResponseCode() !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `テキスト音声変換エラー: ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }

    return response.getBlob();
  }

  /**
   * 音声からテキストに変換する
   * @param {Blob} file - 音声ファイル (必須)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @returns {Object} テキスト変換結果
   * ```json
   * {
   *   "text": "変換されたテキスト内容",
   * }
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

    if (response.getResponseCode() !== HTTP_STATUS.OK) {
      let errorInfo;
      try {
        errorInfo = JSON.parse(response.getContentText());
      } catch (e) {
        errorInfo = { message: response.getContentText() };
      }
      throw new Error(
        `音声テキスト変換エラー: ${
          errorInfo.message || errorInfo.error || response.getContentText()
        }`
      );
    }

    return JSON.parse(response.getContentText());
  }

  /**
   * メッセージ生成を停止する
   * @param {string} taskId - タスクID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @returns {Object} 停止結果
   * ```json
   * {
   *  "result": "success"
   *}
   * ```
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
   * @returns {Object} WebApp UI設定情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "title": "アプリタイトル",
   *   "chat_color_theme": "#1C64F2",
   *   "chat_color_theme_inverted": false,
   *   "icon_type": "emoji",
   *   "icon": "🤖",
   *   "description": "アプリの説明",
   *   "copyright": "Copyright info",
   *   "privacy_policy": "Privacy policy URL",
   *   "custom_disclaimer": "Custom disclaimer",
   *   "default_language": "ja-JP",
   *   "show_workflow_steps": true,
   *   "use_icon_as_answer_icon": false
   * }
   * ```
   */
  getAppSite() {
    return this._makeRequest("/site", "GET");
  }

  /**
   * アプリケーションのパラメータ情報を取得する
   *
   * @returns {Object} 機能・入力パラメータ情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "opening_statement": "オープニングメッセージ",
   *   "suggested_questions": ["推奨質問1", "推奨質問2"],
   *   "suggested_questions_after_answer": {
   *     "enabled": true
   *   },
   *   "speech_to_text": {
   *     "enabled": false
   *   },
   *   "text_to_speech": {
   *     "enabled": false,
   *     "voice": "default",
   *     "language": "ja-JP",
   *     "autoPlay": "disabled"
   *   },
   *   "file_upload": {
   *     "image": {
   *       "enabled": true,
   *       "number_limits": 3,
   *       "transfer_methods": ["local_file"]
   *     }
   *   },
   *   "system_parameters": {
   *     "file_size_limit": 52428800,
   *     "image_file_size_limit": 10485760
   *   }
   * }
   * ```
   */
  getAppParameters() {
    return this._makeRequest("/parameters", "GET");
  }

  /**
   * アプリケーションのメタ情報を取得する
   *
   * @returns {Object} ツールアイコンメタ情報 - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "tool_icons": {
   *     "tool_name": "icon_url_or_data"
   *   }
   * }
   * ```
   */
  getAppMeta() {
    return this._makeRequest("/meta", "GET");
  }

  /**
   * アプリケーションの基本情報を取得する
   *
   * @returns {Object} アプリケーション基本情報 - 以下の構造のJSONオブジェクト
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
   * メッセージの推奨質問を取得する
   * @param {string} messageId - メッセージID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   *
   * @returns {Object} 推奨質問リスト - 以下の構造のJSONオブジェクト
   * ```json
   * {
   *   "result": "success",
   *   "data": [
   *     "関連する質問1",
   *     "関連する質問2",
   *     "関連する質問3"
   *   ]
   * }
   * ```
   */
  getSuggestedQuestions(messageId, user) {
    user = user || this.user;
    if (!messageId) {
      throw new Error(`messageIdは必須パラメータです`);
    }

    const params = { user: user };
    const queryString = this._buildQueryString(params);

    return this._makeRequest(
      "/messages/" + messageId + "/suggested?" + queryString,
      "GET"
    );
  }

  /**
   * アプリのフィードバック情報を取得する
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {number} [options.page] - ページ番号 (任意, デフォルト: 1)
   * @param {number} [options.limit] - 1ページあたりの件数 (任意, デフォルト: 20)
   * @returns {Object} フィードバック情報リスト
   * ```json
   *     {
    "data": [
        {
            "id": "8c0fbed8-e2f9-49ff-9f0e-15a35bdd0e25",
            "app_id": "f252d396-fe48-450e-94ec-e184218e7346",
            "conversation_id": "2397604b-9deb-430e-b285-4726e51fd62d",
            "message_id": "709c0b0f-0a96-4a4e-91a4-ec0889937b11",
            "rating": "like",
            "content": "message feedback information-3",
            "from_source": "user",
            "from_end_user_id": "74286412-9a1a-42c1-929c-01edb1d381d5",
            "from_account_id": null,
            "created_at": "2025-04-24T09:24:38",
            "updated_at": "2025-04-24T09:24:38"
        }
    ]
    }
  * ```
   */
  getAppFeedbacks(options) {
    options = options || {};

    const params = {};
    if (options.page) params.page = options.page;
    if (options.limit) params.limit = options.limit;

    const queryString =
      Object.keys(params).length > 0
        ? "?" + this._buildQueryString(params)
        : "";

    return this._makeRequest("/app/feedbacks" + queryString, "GET");
  }

  /**
   * 会話変数を取得する
   * @param {string} conversationId - 会話ID (必須, UUID形式)
   * @param {string} [user] - ユーザー識別子 (任意, 未指定時はクラスのuserプロパティを使用)
   * @param {Object} [options] - オプションパラメータ (任意)
   * @param {string} [options.last_id] - 現在のページの最後の記録ID (任意, UUID形式, デフォルト: null)
   * @param {number} [options.limit] - 返す記録数 (任意, デフォルト: 20, 最小: 1, 最大: 100)
   * @param {string} [options.variable_name] - 変数名フィルタ (任意)
   * @returns {Object} 会話変数データ
   * ```json
   * {
  "limit": 100,
  "has_more": false,
  "data": [
    {
      "id": "variable-uuid-1",
      "name": "customer_name",
      "value_type": "string",
      "value": "John Doe",
      "description": "会話から抽出された顧客名",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    },
    {
      "id": "variable-uuid-2",
      "name": "order_details",
      "value_type": "json",
      "value": "{\"product\":\"Widget\",\"quantity\":5,\"price\":19.99}",
      "description": "顧客の注文詳細",
      "created_at": 1650000000000,
      "updated_at": 1650000000000
    }
  ]
}
   * ```
   */
  getConversationVariables(conversationId, user, options) {
    user = user || this.user;
    if (!conversationId) {
      throw new Error(`conversationIdは必須パラメータです`);
    }

    options = options || {};

    const params = { user: user };
    if (options.last_id) params.last_id = options.last_id;
    if (options.limit) params.limit = options.limit;
    if (options.variable_name) params.variable_name = options.variable_name;

    const queryString = this._buildQueryString(params);

    return this._makeRequest(
      "/conversations/" + conversationId + "/variables?" + queryString,
      "GET"
    );
  }

  /**
   * アプリケーション機能の有効状態を初期化時に取得・保存する (内部メソッド)
   * @private
   */
  _initializeAppFeatures() {
    try {
      const appParams = this.getAppParameters();

      // 各機能の有効状態をプロパティに保存
      this.features = {
        speechToText:
          appParams.speech_to_text && appParams.speech_to_text.enabled,
        textToSpeech:
          appParams.text_to_speech && appParams.text_to_speech.enabled,
        suggestedQuestionsAfterAnswer:
          appParams.suggested_questions_after_answer &&
          appParams.suggested_questions_after_answer.enabled,
      };
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

      // 推奨質問も保存
      this.suggestedQuestions = appParams.suggested_questions || [];

      // オープニングステートメントも保存
      this.openingStatement = appParams.opening_statement || "";
    } catch (error) {
      // 初期化時のエラーは警告として記録し、デフォルト値を設定
      Logger.log(
        "アプリケーション機能の初期化中にエラーが発生しました: " + error.message
      );
      this.features = {
        speechToText: false,
        textToSpeech: false,
        suggestedQuestionsAfterAnswer: false,
      };
      this.fileUpload = {
        image: {},
        document: {},
        video: {},
        audio: {},
      };
      // ユーザー入力フォームの構成もデフォルト値を設定
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
   * クエリ文字列を生成する (内部メソッド)
   * @private
   * @param {Object} params - パラメータオブジェクト
   * @returns {string} クエリ文字列
   */
  _buildQueryString(params) {
    return Object.keys(params)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join("&");
  }

  /**
   * ストリーミングレスポンスを解析する (内部メソッド)
   * @private
   * @param {object} response - SSE形式のレスポンス
   * @returns {Object} 解析結果
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
}
