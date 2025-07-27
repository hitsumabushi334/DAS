// audio-to-textの例
// このコードは、Google Apps ScriptでDify APIを使用して音声ファイルをテキストに変換する例です。
function audioExample() {
  const audioExampleChatBot = new Chatbot({
    apiKey: PropertiesService.getScriptProperties().getProperty("DIFY_API_KEY"),
    user: "audioExample",
    baseUrl: "https://api.dify.ai/v1",
  });
  const audiofile = DriveApp.getFilesByName("testAudio.m4a").next();
  const audioBlob = audiofile.getBlob().setContentType("audio/m4a");
  const response = audioExampleChatBot.audioToText(audioBlob);
  Logger.log(response.text);
}

// TTSを用いてテキストジェネレータークラスで音声ファイルを生成し、Google Driveに保存する例
function textToSpeechExample() {
  const apiKey = PropertiesService.getScriptProperties().getProperty(
    "DIFY_TEXTGEN_API_KEY"
  );
  if (!apiKey) {
    throw new Error("DIFY_TEXTGEN_API_KEY が設定されていません");
  }

  const textGenerator = new Textgenerator({
    apiKey: apiKey,
    user: "textToSpeechExample",
    baseUrl: "https://api.dify.ai/v1",
  });
  const text = "こんにちは、これは音声合成のテストです。";

  try {
    const audioBlob = textGenerator.textToAudio({
      text: text,
    });

    // 適切なファイル名と拡張子を設定
    audioBlob.setName(`tts_${new Date().getTime()}.wav`);

    // Google Driveに保存
    const file = DriveApp.createFile(audioBlob);
    Logger.log("音声ファイルが作成されました: " + file.getUrl());
  } catch (error) {
    Logger.log("音声ファイルの作成に失敗しました: " + error.message);
    throw error;
  }
}

function testWorkflowProperty(){
  const workflow = new Workflow({
    apiKey: PropertiesService.getScriptProperties().getProperty("DIFY_WORKFLOW_API_KEY"),
    user: "testUser",
    baseUrl: "https://api.dify.ai/v1",
  });
  Logger.log(workflow.fileUpload.image);

}
