require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const HF_TOKEN = process.env.HF_TOKEN;

const MAX_TOKENS = 400;
let requestCount = 0;
const DAILY_LIMIT = 300;

// Главная страница с формой
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>OGE AI</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px; }
          .container {
            max-width: 700px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          input {
            width: 100%;
            padding: 12px;
            font-size: 18px;
            border-radius: 8px;
            border: 1px solid #ccc;
            margin-bottom: 15px;
          }
          button {
            width: 100%;
            padding: 12px;
            font-size: 18px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }
          button:hover { background: #45a049; }
          .answer {
            margin-top: 25px;
            padding: 20px;
            background: #fafafa;
            border-radius: 10px;
            line-height: 1.6;
            font-size: 18px;
            white-space: pre-line;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Помощник по обществознанию (ОГЭ)</h2>
          <p>Введите термин или вопрос:</p>
          <input id="query" placeholder="Например: право, семья, экономика..." />
          <button onclick="send()">Получить ответ</button>
          <div id="result" class="answer"></div>
        </div>

        <script>
          async function send() {
            const q = document.getElementById("query").value;
            if (!q) return;

            document.getElementById("result").innerHTML = "Загрузка...";

            const res = await fetch("/search?q=" + encodeURIComponent(q));
            const data = await res.json();

            document.getElementById("result").innerHTML = data.answer;
          }
        </script>
      </body>
    </html>
  `);
});

// API /search
app.get("/search", async (req, res) => {
  if (requestCount >= DAILY_LIMIT) {
    return res.json({ answer: "Лимит тестирования на сегодня исчерпан." });
  }

  const query = req.query.q;
  if (!query) return res.json({ answer: "Введите запрос." });

  requestCount++;

  try {
    const hfResponse = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [
          {
            role: "system",
            content: "Ты помощник по обществознанию для подготовки к ОГЭ. Отвечай кратко, по делу. Если это термин — дай чёткое определение. Если это вопрос — объясни простыми словами. Старайся укладываться в 8–10 предложений."
          },
          { role: "user", content: query }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.4
      })
    });

    const data = await hfResponse.json();
    let text = data?.choices?.[0]?.message?.content || "Модель не вернула ответ.";

    if (text.length > 1500) text = text.substring(0, 1500) + "...";

    res.json({ answer: text });

  } catch (err) {
    res.json({ answer: "Ошибка сервера." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Сервер запущен на порту " + PORT));
