/**
 * ChatBase クラス - Difyのチャット系API共通機能（Chatbot/Chatflow用）
 *
 * @author DAS Project
 * @version 3.0.0
 */

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
        error.message,
      );
      throw error;
    }
  }

  /**
   * 会話履歴一覧を取得
   *
   * @param {string} [user] - ユーザー識別子
   * @param {Object} [options] - ページネーションオプション
   * @returns {Object} 会話リストのJSONオブジェクト
   */
  getConversations(user, options = {}) {
    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(
      `📋 会話履歴一覧を取得しています... [${this.constructor.name}]`,
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

  /**
   * 会話のメッセージ履歴を取得
   *
   * @param {string} conversationId - 会話ID
   * @param {string} [user] - ユーザー識別子
   * @param {Object} [options] - 取得オプション
   * @returns {Object} メッセージリストのJSONオブジェクト
   */
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

  /**
   * 会話名を変更または自動生成
   *
   * @param {string} conversationId - 会話ID
   * @param {string} [name] - 新しい会話名
   * @param {string} [user] - ユーザー識別子
   * @param {boolean} [autoGenerate] - 自動生成フラグ
   * @returns {Object} 更新結果のJSONオブジェクト
   */
  renameConversation(conversationId, name, user, autoGenerate = false) {
    if (!conversationId) {
      throw new Error("会話IDは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(`✏️ 会話名を変更しています... (ID: ${conversationId})`);

    const payload = {
      name: name,
      auto_generate: autoGenerate,
      user: actualUser,
    };

    try {
      const response = this._makeRequest(
        `/conversations/${conversationId}/name`,
        "POST",
        payload,
      );
      console.log("✅ 会話名の変更が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 会話名の変更に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * 会話を削除
   *
   * @param {string} conversationId - 会話ID
   * @param {string} [user] - ユーザー識別子
   * @returns {Object} 削除結果のJSONオブジェクト
   */
  deleteConversation(conversationId, user) {
    if (!conversationId) {
      throw new Error("会話IDは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(`🗑️ 会話を削除しています... (ID: ${conversationId})`);

    const payload = { user: actualUser };

    try {
      const response = this._makeRequest(
        `/conversations/${conversationId}`,
        "DELETE",
        payload,
      );
      console.log("✅ 会話の削除が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 会話の削除に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * フィードバックを送信
   *
   * @param {string} messageId - メッセージID
   * @param {string} rating - 評価 ('like' または 'dislike')
   * @param {string} [user] - ユーザー識別子
   * @param {string} [content] - フィードバック内容
   * @returns {Object} 送信結果のJSONオブジェクト
   */
  sendFeedback(messageId, rating, user, content) {
    if (!messageId) {
      throw new Error("メッセージIDは必須です");
    }

    if (!rating || !["like", "dislike"].includes(rating)) {
      throw new Error('評価は "like" または "dislike" を指定してください');
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(`👍 フィードバックを送信しています... (評価: ${rating})`);

    const payload = {
      rating: rating,
      user: actualUser,
    };

    if (content) {
      payload.content = content;
    }

    try {
      const response = this._makeRequest(
        `/messages/${messageId}/feedbacks`,
        "POST",
        payload,
      );
      console.log("✅ フィードバックの送信が完了しました");
      return response;
    } catch (error) {
      console.error("❌ フィードバックの送信に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * テキストを音声に変換
   *
   * @param {string} [user] - ユーザー識別子
   * @param {Object} options - 変換オプション
   * @returns {Object} 音声データのJSONオブジェクト
   */
  textToAudio(user, options = {}) {
    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    if (!options.text && !options.message_id) {
      throw new Error("テキストまたはメッセージIDのいずれかが必須です");
    }

    console.log("🔊 テキスト音声変換を実行しています...");

    const payload = {
      user: actualUser,
    };

    if (options.text) {
      payload.text = options.text;
    } else if (options.message_id) {
      payload.message_id = options.message_id;
    }

    try {
      const response = this._makeRequest("/text-to-audio", "POST", payload);
      console.log("✅ テキスト音声変換が完了しました");
      return response;
    } catch (error) {
      console.error("❌ テキスト音声変換に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * 音声をテキストに変換
   *
   * @param {Blob} file - 音声ファイル
   * @param {string} [user] - ユーザー識別子
   * @returns {Object} 変換されたテキストのJSONオブジェクト
   */
  audioToText(file, user) {
    if (!file) {
      throw new Error("音声ファイルは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log("🎙️ 音声テキスト変換を実行しています...");

    const formData = {
      file: file,
      user: actualUser,
    };

    try {
      const response = this._makeRequest("/audio-to-text", "POST", formData);
      console.log("✅ 音声テキスト変換が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 音声テキスト変換に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * 生成停止
   *
   * @param {string} taskId - タスクID
   * @param {string} [user] - ユーザー識別子
   * @returns {Object} 停止結果のJSONオブジェクト
   */
  stopGeneration(taskId, user) {
    if (!taskId) {
      throw new Error("タスクIDは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(`⏹️ 生成を停止しています... (タスクID: ${taskId})`);

    const payload = {
      user: actualUser,
    };

    try {
      const response = this._makeRequest(
        `/chat-messages/${taskId}/stop`,
        "POST",
        payload,
      );
      console.log("✅ 生成停止が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 生成停止に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * アプリのWebApp設定を取得
   *
   * @returns {Object} WebApp設定情報のJSONオブジェクト
   */
  getAppSite() {
    return this.getWebAppSettings();
  }

  /**
   * アプリのメタ情報を取得
   *
   * @returns {Object} メタ情報のJSONオブジェクト
   */
  getAppMeta() {
    const cacheKey = "app-meta";
    const cached = this._getCachedResponse(cacheKey);
    if (cached) {
      console.log("ℹ️ キャッシュからメタ情報を取得しました");
      return cached;
    }

    console.log("🔍 メタ情報を取得しています...");

    try {
      const response = this._makeRequest("/meta", "GET");
      this._setCachedResponse(cacheKey, response);
      console.log("✅ メタ情報の取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ メタ情報の取得に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * 推奨質問を取得
   *
   * @param {string} messageId - メッセージID
   * @param {string} [user] - ユーザー識別子
   * @returns {Object} 推奨質問リストのJSONオブジェクト
   */
  getSuggestedQuestions(messageId, user) {
    if (!messageId) {
      throw new Error("メッセージIDは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(`💡 推奨質問を取得しています... (メッセージID: ${messageId})`);

    const queryParams = {
      user: actualUser,
    };

    try {
      const response = this._makeRequest(
        `/messages/${messageId}/suggested`,
        "GET",
        queryParams,
      );
      console.log("✅ 推奨質問の取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 推奨質問の取得に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * フィードバック一覧を取得
   *
   * @param {Object} [options] - 取得オプション
   * @returns {Object} フィードバック一覧のJSONオブジェクト
   */
  getAppFeedbacks(options = {}) {
    console.log("📊 フィードバック一覧を取得しています...");

    const queryParams = {
      page: options.page || 1,
      limit: options.limit || 20,
    };

    try {
      const response = this._makeRequest("/feedbacks", "GET", queryParams);
      console.log("✅ フィードバック一覧の取得が完了しました");
      return response;
    } catch (error) {
      console.error(
        "❌ フィードバック一覧の取得に失敗しました:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * 会話変数を取得
   *
   * @param {string} conversationId - 会話ID
   * @param {string} [user] - ユーザー識別子
   * @returns {Object} 会話変数のJSONオブジェクト
   */
  getConversationVariables(conversationId, user) {
    if (!conversationId) {
      throw new Error("会話IDは必須です");
    }

    const actualUser = user || this.user;
    if (!actualUser) {
      throw new Error("ユーザー識別子は必須です");
    }

    console.log(`📋 会話変数を取得しています... (ID: ${conversationId})`);

    const queryParams = {
      user: actualUser,
    };

    try {
      const response = this._makeRequest(
        `/conversations/${conversationId}/variables`,
        "GET",
        queryParams,
      );
      console.log("✅ 会話変数の取得が完了しました");
      return response;
    } catch (error) {
      console.error("❌ 会話変数の取得に失敗しました:", error.message);
      throw error;
    }
  }

  /**
   * チャット系機能を初期化（内部メソッド）
   *
   * @private
   */
  _initializeChatFeatures() {
    try {
      console.log("🔧 チャット系機能を初期化しています...");

      // 基底クラスの初期化に加えて、チャット系特有の設定を行う
      // ここでは主に機能フラグの確認とログ出力を行う

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
      "_getMessageEndpointメソッドはサブクラスで実装してください",
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
      "_parseStreamingResponseメソッドはサブクラスで実装してください",
    );
  }
}
