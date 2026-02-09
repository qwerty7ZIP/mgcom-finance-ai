import { NextResponse } from "next/server";

const systemPrompt = `
Ты — внутренний ассистент для финансовой команды. Пользователь описывает на русском языке,
какую таблицу он хочет видеть по данным компании.

Доступные таблицы:
- clients: информация о клиентах (названия, менеджеры, статусы);
- contacts: контактные данные лиц;
- tenders: лог всех тендеров (суммы, даты, результаты).

КОНТЕКСТ И ПРЕЕМСТВЕННОСТЬ:
- Пользователь может делать уточняющие запросы. Например:
  1. "Покажи клиентов Газпрома" -> ты выбираешь таблицу clients и фильтр по названию.
  2. "А теперь отсортируй по выручке" -> ты должен ПОМНИТЬ, что сейчас выбрана таблица clients и фильтр по Газпрому, и просто ДОБАВИТЬ поле "sort" в JSON.
- Если новый запрос полностью меняет тему, начинай заново.
- Всегда старайся сохранять текущую таблицу ("table"), если пользователь явно не просит другую.

ТВОЯ ЗАДАЧА — вернуть СТРУКТУРУ ЗАПРОСА в JSON.

Формат ответа (строго JSON):
{
  "message": "короткий комментарий к действию на русском языке",
  "tableRequest": {
    "table": "clients|contacts|tenders",
    "description": "описание для заголовка",
    "filters": [
      {
        "field": "имя колонки",
        "operator": "eq|gte|lte|contains|between|in",
        "value": "значение"
      }
    ],
    "columns": ["имя_колонки_1", "..."],
    "sort": {
      "field": "имя колонки",
      "direction": "asc|desc"
    },
    "limit": 200
  }
}

ВАЖНОЕ ПРАВИЛО ПО КОЛОНКАМ:
- Поле "columns" используй ТОЛЬКО если пользователь прямо просит: "покажи только [названия колонок]".
- В ОСТАЛЬНЫХ СЛУЧАЯХ НЕ ВКЛЮЧАЙ поле "columns", чтобы показать ВСЕ колонки.

Если запрос нечёткий, всё равно заполни поля максимально разумно.
Отвечай этим JSON. Ты можешь добавить немного текста вокруг JSON, если нужно.
`;

const enhancedSystemPrompt = `${systemPrompt}

ДОПОЛНИТЕЛЬНОЕ ОПИСАНИЕ СХЕМЫ ДАННЫХ:
1) Таблица clients (клиенты):
- mgc_client — название клиента (компании). Синонимы: клиент, компания, название клиента, бренд.
- Ul — юридическое лицо клиента.
- Client_category — категория/направление клиента (отрасль, сегмент).
- description — дополнительная информация о клиенте.
- top_30 — признак, входит ли клиент в топ‑30.
- id_pf — ID клиента в Planfix.
- Inn — ИНН клиента.
- pf_client — название клиента в Planfix.

2) Таблица contacts (контакты):
- name — имя и фамилия контакта (ФИО).
- company — компания (клиент) контакта.
- phone — телефон.
- e-mail — почта.
- work_position — должность.
- а также дополнительные поля: gender, telegram, date_birth, adress.

3) Таблица tenders (тендеры):
- client — клиент (название компании).
- tender_budget — бюджет тендера в рублях.
- tender_start — дата начала тендера.
- tender_end — дата окончания тендера.
- tender_dl — дэдлайн.
- tender_status — статус тендера (выигран, проигран, ждём ответа, подготовка КП и т.п.).
- tender_KP_start / tender_KP_end — даты начала и окончания подготовки КП.

ФИЛЬТРАЦИЯ ПО АГЕНТСТВУ:
- Если пользователь явно спрашивает «тендеры какого-то агентства» или упоминает агентство (например:
  «покажи тендеры агентства i-Media», «тендеры нашего агентства ...»),
  используй поле "agency" для фильтрации.
- В таком случае добавь фильтр вида:
  {
    "field": "agency",
    "operator": "contains",
    "value": "<название_агентства_из_запроса>"
  }

ОСОБО ВАЖНО ДЛЯ ТЕНДЕРОВ:
- Если пользователь просит "тендеры за прошлый месяц/год/период" и НЕ уточняет, по какой дате фильтровать,
  то по умолчанию используй поле "tender_start" (дата начала тендера) и оператор "gte" и/или "lte"
  с датами в формате "YYYY-MM-DD".

ПРИМЕР:
- Запрос: "Покажи тендеры за прошлый месяц" ->
  "table": "tenders",
  "filters": [
    {
      "field": "tender_start",
      "operator": "gte",
      "value": "2024-01-01"
    }
  ]

ОПЕРАТОРЫ:
- В поле "operator" используй только eq, gte, lte, gt, lt, contains — без between и in.
`;

type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

type ChatBody = {
  message?: string;
  history?: ChatMessage[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ChatBody;
  const history = body.history || [];
  const latestMessage = body.message || "";

  if (!latestMessage && history.length === 0) {
    return NextResponse.json(
      { error: "Пустой запрос" },
      { status: 400 },
    );
  }

  // Формируем список сообщений для YandexGPT
  const yaMessages = [
    { role: "system", text: enhancedSystemPrompt },
    ...history.map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      text: m.text,
    })),
  ];

  // Если передано отдельное сообщение (не в истории), добавляем его
  if (latestMessage) {
    yaMessages.push({ role: "user", text: latestMessage });
  }

  const apiKey = process.env.YANDEX_GPT_API_KEY;
  const folderId = process.env.YANDEX_GPT_FOLDER_ID;
  const modelUri =
    process.env.YANDEX_GPT_MODEL_URI ||
    (folderId
      ? `gpt://${folderId}/yandexgpt/latest`
      : undefined);

      console.log("YANDEX_ENV_DEBUG", {
        hasKey: !!apiKey,
        hasFolder: !!folderId,
        modelUri,
      });
      
  if (!apiKey || !folderId || !modelUri) {
    // Локальная заглушка
    return NextResponse.json({
      reply: "Заглушка: YandexGPT не настроен. Отображаю тестовые данные.",
      data: {
        tableRequest: {
          table: "clients",
          description: "Тестовая таблица (режим офлайн)",
          filters: [],
          columns: [],
          sort: null,
          limit: 100,
        }
      }
    },
      { status: 200 },
    );
  }

  try {
    const yaRes = await fetch(
      "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Api-Key ${apiKey}`,
        },
        body: JSON.stringify({
          modelUri,
          completionOptions: {
            stream: false,
            temperature: 0.2,
            maxTokens: 1000,
          },
          messages: yaMessages,
        }),
      },
    );

    if (!yaRes.ok) {
      const raw = await yaRes.text().catch(() => "");
      console.error("YandexGPT error:", yaRes.status, raw);
      let errorMsg = "Ошибка при обращении к YandexGPT";
      try {
        const errData = JSON.parse(raw);
        if (errData.error?.message) {
          errorMsg = `YandexGPT: ${errData.error.message}`;
        }
      } catch {
        // Игнорируем ошибку парсинга
      }
      return NextResponse.json(
        { error: errorMsg, status: yaRes.status },
        { status: 500 },
      );
    }

    const data = (await yaRes.json()) as {
      result?: { alternatives?: { message?: { text?: string } }[] };
    };

    const content =
      data.result?.alternatives?.[0]?.message?.text?.trim() || "";

    if (!content) {
      return NextResponse.json(
        { error: "Пустой ответ от YandexGPT" },
        { status: 502 },
      );
    }

    // Извлекаем JSON из текста (на случай, если модель добавила markdown-разметку или текст вокруг)
    function extractJson(text: string): string {
      // 1. Пытаемся найти блоки кода ```json ... ``` или ``` ... ```
      const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        return markdownMatch[1].trim();
      }

      // 2. Если блоков нет, ищем границы первого '{' и последнего '}'
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end >= start) {
        return text.substring(start, end + 1);
      }

      return text.trim();
    }

    const cleanContent = extractJson(content);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error("JSON parse error from YandexGPT. Content:", content);
      console.error("Cleaned content try:", cleanContent);
      return NextResponse.json(
        {
          error: "Не удалось распарсить JSON от YandexGPT",
          raw: content,
        },
        { status: 502 },
      );
    }

    // Нормализация относительных периодов (например, "прошлый месяц")
    try {
      const text = latestMessage.toLowerCase();
      const tr = parsed?.tableRequest;

      const askedForTenders =
        tr?.table === "tenders" ||
        text.includes("тендер");

      const askedForLastMonth = text.includes("прошлый месяц");

      if (askedForTenders && askedForLastMonth) {
        const now = new Date();
        const year =
          now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const monthIndex = (now.getMonth() - 1 + 12) % 12; // 0-11

        const from = new Date(year, monthIndex, 1);
        const to = new Date(year, monthIndex + 1, 0); // последний день предыдущего месяца

        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate(),
          ).padStart(2, "0")}`;

        const fromStr = fmt(from);
        const toStr = fmt(to);

        parsed.tableRequest = {
          ...(tr || {}),
          table: "tenders",
          filters: [
            {
              field: "tender_start",
              operator: "gte",
              value: fromStr,
            },
            {
              field: "tender_start",
              operator: "lte",
              value: toStr,
            },
          ],
        };
      }
    } catch (e) {
      console.error("Ошибка при нормализации относительных периодов:", e);
    }

    return NextResponse.json({
      reply: content, // Полный текст ответа для чата
      data: parsed, // Распарсенный (и нормализованный) JSON для таблицы
    });
  } catch (error) {
    console.error("Ошибка в API /api/chat (YandexGPT):", error);
    return NextResponse.json(
      { error: "Ошибка при обращении к YandexGPT" },
      { status: 500 },
    );
  }
}

