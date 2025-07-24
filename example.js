// audio-to-textの例
// このコードは、Google Apps ScriptでDify APIを使用して音声ファイルをテキストに変換する例です。
function audioExample() {
  const audioExampleChatBot = new Chatbot({
    apiKey: PropertiesService.getScriptProperties().getProperty("DIFY_API_KEY"),
    user: "audioExample",
    baseUrl: "https://api.dify.ai/v1"
  });
  const audiofile = DriveApp.getFilesByName("testAudio.m4a").next();
  const audioBlob = audiofile.getBlob().setContentType("audio/m4a");
  const response = audioExampleChatBot.audioToText(audioBlob);
  Logger.log(response.text);
}
