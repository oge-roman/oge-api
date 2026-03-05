require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

const HF_TOKEN = process.env.HF_TOKEN;

// Ограничение по длине ответа
const MAX_TOKENS = 400;

// Простейший лимит на количество запросов (на сервер)
let requestCount = 0;
const DAILY_LIMIT = 300; // пока тестируем

app.get("/search", async (req, res) => {
  if (requestCount >= DAILY_LIMIT) {
    return res.json({
      answer: "Лимит тестирования на сегодня исчерпан."
    });
  }

  const query = req.query.q;

  if (!query) {
    return res.json({ answer: "Введите запрос" });
  }

  requestCount++;

  try {
    const hfResponse = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
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
              content: `
Ты помощник по обществознанию для подготовки к ОГЭ.
Отвечай кратко, по делу.
Если это термин — дай чёткое определение.
Если это вопрос — объясни простыми словами.
Старайся укладываться в 8–10 предложений.
`
            },
            {
              role: "user",
              content: query
            }
          ],
          max_tokens: MAX_TOKENS,
          temperature: 0.4
        })
      }
    );

    const data = await hfResponse.json();

    if (data.error) {
      return res.json({ answer: "Ошибка модели: " + data.error.message });
    }

    let text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.json({ answer: "Модель не вернула ответ" });
    }

    // Подстраховка по длине
    if (text.length > 1500) {
      text = text.substring(0, 1500) + "...";
    }

    res.json({ answer: text });

  } catch (err) {
    res.json({ answer: "Ошибка сервера" });
  }
});

app.listen(3001, () => {
  console.log("Сервер запущен на http://localhost:3001");
});