/**
 * DAS (Dify Application Script) - Chatbot Class
 * Google Apps Script から Dify API を簡単に呼び出すためのライブラリ
 */

/**
 * Chatbotクラス - Difyのチャットボット機能へのアクセス
 */
class Chatbot {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.dify.ai/v1';
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
      throw new Error('query と user は必須パラメータです');
    }
    
    options = options || {};
    
    const payload = {
      query: query,
      user: user,
      inputs: options.inputs || {},
      response_mode: options.response_mode || 'blocking',
      auto_generate_name: options.auto_generate_name !== false
    };
    
    if (options.conversation_id) {
      payload.conversation_id = options.conversation_id;
    }
    
    if (options.files) {
      payload.files = options.files;
    }
    
    // ストリーミングモードの場合
    if (payload.response_mode === 'streaming') {
      return this._sendStreamingMessage(payload, options);
    }
    
    // ブロッキングモードの場合
    return this._makeRequest('/chat-messages', 'POST', payload);
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
      throw new Error('user は必須パラメータです');
    }
    
    options = options || {};
    
    const params = {
      user: user,
      limit: options.limit || 20,
      sort_by: options.sort_by || '-updated_at'
    };
    
    if (options.last_id) {
      params.last_id = options.last_id;
    }
    
    const queryString = Object.keys(params).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    
    return this._makeRequest('/conversations?' + queryString, 'GET');
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
      throw new Error('conversationId と user は必須パラメータです');
    }
    
    options = options || {};
    
    const params = { user: user };
    if (options.first_id) params.first_id = options.first_id;
    if (options.limit) params.limit = options.limit;
    
    const queryString = Object.keys(params).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    
    return this._makeRequest('/conversations/' + conversationId + '/messages?' + queryString, 'GET');
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
      throw new Error('conversationId, name, user は必須パラメータです');
    }
    
    const payload = {
      name: name,
      user: user
    };
    
    return this._makeRequest('/conversations/' + conversationId, 'PATCH', payload);
  }

  /**
   * 会話を削除する
   * @param {string} conversationId - 会話ID
   * @param {string} user - ユーザー識別者
   * @returns {Object} 削除結果
   */
  deleteConversation(conversationId, user) {
    if (!conversationId || !user) {
      throw new Error('conversationId と user は必須パラメータです');
    }
    
    const params = { user: user };
    const queryString = Object.keys(params).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    }).join('&');
    
    return this._makeRequest('/conversations/' + conversationId + '?' + queryString, 'DELETE');
  }

  /**
   * ファイルをアップロードする
   * @param {Blob} file - アップロードするファイル
   * @param {string} user - ユーザー識別子
   * @returns {Object} アップロード結果
   */
  uploadFile(file, user) {
    if (!file || !user) {
      throw new Error('file と user は必須パラメータです');
    }
    
    const formData = {
      'file': file,
      'user': user
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.apiKey
      },
      payload: formData
    };
    
    const response = UrlFetchApp.fetch(this.baseUrl + '/files/upload', options);
    
    if (response.getResponseCode() !== 200 && response.getResponseCode() !== 201) {
      throw new Error('ファイルアップロードエラー: ' + response.getContentText());
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
      throw new Error('messageId, rating, user は必須パラメータです');
    }
    
    if (rating !== 'like' && rating !== 'dislike') {
      throw new Error('rating は "like" または "dislike" である必要があります');
    }
    
    const payload = {
      rating: rating,
      user: user
    };
    
    return this._makeRequest('/messages/' + messageId + '/feedbacks', 'POST', payload);
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
      throw new Error('user は必須パラメータです');
    }
    
    options = options || {};
    
    if (!options.message_id && !options.text) {
      throw new Error('message_id または text のいずれかが必要です');
    }
    
    const payload = {
      user: user,
      streaming: options.streaming || false
    };
    
    if (options.message_id) {
      payload.message_id = options.message_id;
    }
    
    if (options.text) {
      payload.text = options.text;
    }
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch(this.baseUrl + '/text-to-audio', requestOptions);
    
    if (response.getResponseCode() !== 200) {
      throw new Error('テキスト音声変換エラー: ' + response.getContentText());
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
      throw new Error('file と user は必須パラメータです');
    }
    
    const formData = {
      'file': file,
      'user': user
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.apiKey
      },
      payload: formData
    };
    
    const response = UrlFetchApp.fetch(this.baseUrl + '/audio-to-text', options);
    
    if (response.getResponseCode() !== 200) {
      throw new Error('音声テキスト変換エラー: ' + response.getContentText());
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
      throw new Error('taskId と user は必須パラメータです');
    }
    
    const payload = { user: user };
    
    return this._makeRequest('/chat-messages/' + taskId + '/stop', 'POST', payload);
  }

  /**
   * ストリーミングメッセージを送信する (内部メソッド)
   * @private
   * @param {Object} payload - リクエストボディ
   * @param {Object} options - オプション (コールバック関数含む)
   * @returns {Object} ストリーミング処理の状況
   */
  _sendStreamingMessage(payload, options) {
    const url = this.baseUrl + '/chat-messages';
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    try {
      const response = UrlFetchApp.fetch(url, requestOptions);
      const responseCode = response.getResponseCode();
      
      if (responseCode !== 200) {
        const errorText = response.getContentText();
        let errorInfo;
        try {
          errorInfo = JSON.parse(errorText);
        } catch (e) {
          errorInfo = { message: errorText };
        }
        
        const error = new Error('API エラー (HTTP ' + responseCode + '): ' + 
                               (errorInfo.message || errorInfo.error || errorText));
        
        if (options.onError) {
          options.onError(error);
        } else {
          throw error;
        }
        return { success: false, error: error.message };
      }
      
      // ストリーミングレスポンスを処理
      const responseText = response.getContentText();
      return this._parseStreamingResponse(responseText, options);
      
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      } else {
        throw new Error('ストリーミングリクエストエラー: ' + error.message);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * ストリーミングレスポンスを解析する (内部メソッド)
   * @private
   * @param {string} responseText - SSE形式のレスポンステキスト
   * @param {Object} options - コールバック関数
   * @returns {Object} 解析結果
   */
  _parseStreamingResponse(responseText, options) {
    const events = [];
    let completeAnswer = '';
    let conversationId = null;
    let messageId = null;
    
    try {
      // SSE形式のデータを行ごとに分割
      const lines = responseText.split('\n');
      let currentEvent = {};
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') {
          // 空行はイベントの区切り
          if (currentEvent.data) {
            try {
              const eventData = JSON.parse(currentEvent.data);
              events.push(eventData);
              
              // 各イベントタイプに応じた処理
              if (eventData.event === 'message') {
                completeAnswer = eventData.answer || '';
                conversationId = eventData.conversation_id;
                messageId = eventData.message_id;
              } else if (eventData.event === 'message_replace') {
                completeAnswer = eventData.answer || '';
              } else if (eventData.event === 'message_end') {
                conversationId = eventData.conversation_id;
                messageId = eventData.message_id;
              }
              
              // onChunkコールバックを呼び出し
              if (options.onChunk) {
                options.onChunk(eventData);
              }
              
            } catch (parseError) {
              console.warn('SSEイベントの解析エラー:', parseError.message);
            }
          }
          currentEvent = {};
        } else if (line.startsWith('data: ')) {
          currentEvent.data = line.substring(6);
        } else if (line.startsWith('event: ')) {
          currentEvent.event = line.substring(7);
        }
      }
      
      // 完了時のコールバック
      const result = {
        success: true,
        answer: completeAnswer,
        conversation_id: conversationId,
        message_id: messageId,
        events: events
      };
      
      if (options.onComplete) {
        options.onComplete(result);
      }
      
      return result;
      
    } catch (error) {
      const errorResult = {
        success: false,
        error: 'ストリーミングレスポンス解析エラー: ' + error.message
      };
      
      if (options.onError) {
        options.onError(new Error(errorResult.error));
      }
      
      return errorResult;
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
    
    const options = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + this.apiKey,
        'Content-Type': 'application/json'
      }
    };
    
    if (payload && method !== 'GET') {
      options.payload = JSON.stringify(payload);
    }
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (responseCode < 200 || responseCode >= 300) {
        let errorInfo;
        try {
          errorInfo = JSON.parse(responseText);
        } catch (e) {
          errorInfo = { message: responseText };
        }
        
        throw new Error('API エラー (HTTP ' + responseCode + '): ' + 
                       (errorInfo.message || errorInfo.error || responseText));
      }
      
      return JSON.parse(responseText);
      
    } catch (error) {
      if (error.message.indexOf('API エラー') === 0) {
        throw error;
      }
      throw new Error('リクエスト実行エラー: ' + error.message);
    }
  }
}