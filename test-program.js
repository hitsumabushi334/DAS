// フォーマッターテスト用のJavaScriptファイル
const util = require("util");

function greet(name, age = 20) {
  return `こんにちは、${name}さん（${age}歳）！今日も良い一日を！`;
}

function formatDate(date = new Date()) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("ja-JP", options);
}

function calculate(a, b, operation = "add") {
  switch (operation) {
    case "add":
      return a + b;
    case "subtract":
      return a - b;
    case "multiply":
      return a * b;
    case "divide":
      return b !== 0 ? a / b : "エラー：ゼロ除算";
    default:
      return "不明な演算";
  }
}

class TaskManager {
  constructor() {
    this.tasks = [];
  }
  addTask(task) {
    this.tasks.push({ id: Date.now(), task: task, completed: false });
  }
  completeTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.completed = true;
  }
  getTasks() {
    return this.tasks.filter((t) => !t.completed);
  }
}

async function processData(data) {
  try {
    const processed = await Promise.all(
      data.map(async (item) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return item * 2;
      })
    );
    return processed;
  } catch (error) {
    console.error("データ処理エラー:", error);
    throw error;
  }
}

function main() {
  console.log("=== プログラム実行開始 ===");
  console.log(`実行時刻: ${formatDate()}`);
  console.log(greet("山田太郎", 25));

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = numbers.map((n) => calculate(n, 2, "multiply"));
  console.log("掛け算結果:", results);

  const taskManager = new TaskManager();
  taskManager.addTask("フォーマッターのテスト");
  taskManager.addTask("コードの整形確認");
  console.log("タスク一覧:", taskManager.getTasks());

  processData([1, 2, 3, 4, 5])
    .then((result) => {
      console.log("非同期処理結果:", result);
    })
    .catch((err) => {
      console.error("エラー発生:", err);
    });
}

if (require.main === module) {
  main();
}

module.exports = { greet, calculate, TaskManager, processData };
