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

// Корневая страница
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>OGE API</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #fafafa; }
          h1 { color: #333; }
          p { color: #555; }
          code { background: #eee; padding: 4px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>OGE API работает</h1>
        <p>Используйте формат запроса:</p>
        <p><code>/search?q=ваш_запрос</code></p>
      </body>
    </html>
  `);
});

app.get("/search", async (req, res) => {
  if (requestCount >= DAILY_LIMIT) {
    return res.send(renderHTML("Лимит тестирования на сегодня исчерпан."));
  }

  const query = req.query.q;

  if (!query) {
    return res.send(renderHTML("Введите запрос."));
  }

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
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.4
      })
    });

    const data = await hfResponse.json();

    if (data.error) {
      return res.send(renderHTML("Ошибка модели: " + data.error.message));
    }

    let text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.send(renderHTML("Модель не вернула ответ."));
    }

    if (text.length > 1500) {
      text = text.substring(0, 1500) + "...";
    }

    res.send(renderHTML(text));

  } catch (err) {
    res.send(renderHTML("Ошибка сервера."));
  }
});

// Функция для красивого HTML-оформления
function renderHTML(answer) {
  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Ответ</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: #f4f4f4; }
          .box {
            background: white;
            padding: 25px;
            border-radius: 10px;
            max-width: 800px;
            margin: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            line-height: 1.6;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div class="box">${answer.replace(/\n/g, "<br>")}</div>
      </body>
    </html>
  `;
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
