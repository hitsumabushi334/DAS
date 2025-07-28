/**
 * Difyインスタンスを取得する
 * @param {Object} config - 設定オブジェクト
 * @param {string} config.apiKey - DifyのAPIキー
 * @param {string} config.baseUrl - DifyのベースURL
 * @param {string} config.user - ユーザー識別子
 * @returns {Dify} Difyクラスのインスタンス
 */
function getDify({ apiKey, baseUrl, user }) {
  return new Dify({ apiKey, baseUrl, user });
}

/**
 * Chatbotインスタンスを取得する
 * @param {Object} config - 設定オブジェクト
 * @param {string} config.apiKey - DifyのAPIキー
 * @param {string} config.baseUrl - DifyのベースURL
 * @param {string} config.user - ユーザー識別子
 * @returns {Chatbot} Chatbotクラスのインスタンス
 */
function getChatbot({ apiKey, baseUrl, user }) {
  return new Chatbot({ apiKey, baseUrl, user });
}

/**
 * Chatflowインスタンスを取得する
 * @param {Object} config - 設定オブジェクト
 * @param {string} config.apiKey - DifyのAPIキー
 * @param {string} config.baseUrl - DifyのベースURL
 * @param {string} config.user - ユーザー識別子
 * @returns {Chatflow} Chatflowクラスのインスタンス
 */
function getChatflow({ apiKey, baseUrl, user }) {
  return new Chatflow({ apiKey, baseUrl, user });
}
/**
 * Workflowインスタンスを取得する
 * @param {Object} config - 設定オブジェクト
 * @param {string} config.apiKey - DifyのAPIキー
 * @param {string} config.baseUrl - DifyのベースURL
 * @param {string} config.user - ユーザー識別子
 * @returns {Workflow} Workflowクラスのインスタンス
 */
function getWorkflow({ apiKey, baseUrl, user }) {
  return new Workflow({ apiKey, baseUrl, user });
}
/**
 * Textgeneratorインスタンスを取得する
 * @param {Object} config - 設定オブジェクト
 * @param {string} config.apiKey - DifyのAPIキー
 * @param {string} config.baseUrl - DifyのベースURL
 * @param {string} config.user - ユーザー識別子
 * @returns {Textgenerator} Textgeneratorクラスのインスタンス
 */
function getTextgenerator({ apiKey, baseUrl, user }) {
  return new Textgenerator({ apiKey, baseUrl, user });
}
