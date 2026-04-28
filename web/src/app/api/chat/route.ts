import { NextResponse } from "next/server";
import { getDbRowsByRequest } from "@/lib/dbTable";

type ChatRole = "user" | "ai";

type ChatMessage = {
  role: ChatRole;
  text: string;
};

type ChatBody = {
  message?: string;
  history?: ChatMessage[];
};

type QueryPlanRequest = {
  table: "tenders" | "clients" | "contacts" | "active_list" | string;
  description?: string;
  filters?: { field: string; operator: string; value: unknown }[];
  sort?: { field: string; direction?: "asc" | "desc" } | null;
  limit?: number;
  columns?: string[];
};

type QueryPlan = {
  clarificationQuestion?: string;
  requests?: QueryPlanRequest[];
};

type SupportedTable = "tenders" | "clients" | "contacts" | "active_list";

const TABLES: SupportedTable[] = ["tenders", "clients", "contacts", "active_list"];

const KNOWN_AGENCIES = [
  "AGM",
  "MGCom",
  "MGrowth",
  "Артикс",
  "E-Promo",
  "i-Media",
  "Data Stories",
] as const;

const KNOWN_PROJECTS = [
  "project",
  "performance",
  "Аудит Контекст и Медиа рекламы",
  "анализ",
  "Performance, SEO (Биплан)",
  "аналитика",
  "Media, SMM",
  "Таргетированная реклама",
  "инфлюенс",
  "Блогеры",
  "ASO",
  "отбор",
  "медийная РК",
  "Стратегия",
  "AppsFlyer",
  "Performance + Медийка",
  "Продакшн",
  "Mobile (ПКО)",
  "Проведение охватной РК в Digital + альтернативы",
  "Медийная РК (Атопутешествия)",
  "Метрика Про",
  "APP",
  "Media (СНГ)",
  "ORM (Софт)",
  "2ГИС",
  "Медиатендер",
  "Perfomance (ПКО)",
  "Digital (медийка)",
  "Яндекс Метрика ПРО",
  "BI-платформа",
  "Лидогенерация",
  "Контекстная реклама (Биллинг)",
  "Mobile",
  "медийка",
  "Авито",
  "Креатив",
  "Охватная кампания",
  "Performance WEB + Mobile",
  "Аудит",
  "nonmedia",
  "Adjust",
  "Альтернативные площадки",
  "Блогеры и PR",
  "ecom",
  "retail",
  "Performance (ЖК Alia)",
  "Биллинг",
  "OLV",
  "target",
  "Маркетплейсы",
  "OLV (Преролы у блогеров)",
  "AppMetrica и Varioqube (Дата Сторис)",
  "In-app",
  "Соцсети",
  "Telegram Ads (ПКО)",
  "Прайс-площадки (ЦИАН)",
  "Комлекс",
  "Performace",
  "Медийка",
  "SMM",
  "Digital",
  "CPA",
  "SEO",
  "Мобильное приложение Банка и ASO",
  "BTL",
  "smarttv",
  "SEO и Rich-контент",
  "Баинг",
  "Self-service DSP (in-app)",
  "Influence, SMM, ORM",
  "DSP, Таргетинг на заданные ЦА",
  "СРА",
  "ПКО",
  "CRM",
  "YouTube и Telegram",
  "Self-сервис DSP (in-web) (ПКО)",
  "директ",
  "Performance, Биллинг",
  "Digital-продвижение проекта River Park Кутузовский",
  "Performance+медийка",
  "Performance (ПКО)",
  "Performance",
  "eCom",
  "Telegram",
  "Исследования",
  "Геосервисы",
  "озон",
  "Vk Ads",
  "Performance (Биллинг) (RFI)",
  "CPA (HR Лидген)",
  "360",
  "Создание баннеров",
  "Media",
  "SERM/ORM",
  "Контекст",
] as const;

const ALLOWED_OPERATORS = new Set([
  "eq",
  "ilike",
  "contains",
  "in",
  "gte",
  "lte",
  "gt",
  "lt",
]);

const FIELD_ALIASES: Record<SupportedTable, Record<string, string>> = {
  tenders: {
    "агентство": "agency",
    agency_name: "agency",
    agencies: "agency",
    budget: "tender_budget",
    amount: "tender_budget",
    company: "client",
    client_name: "client",
    customer: "client",
    name: "client",
    status: "tender_status",
    source: "tender_ist",
    start: "tender_start",
    start_date: "tender_start",
    date_start: "tender_start",
    end: "tender_end",
    end_date: "tender_end",
    deadline: "tender_dl",
    dl: "tender_dl",
    kp_start: "tender_kp_start",
    kp_end: "tender_kp_end",
  },
  clients: {
    client: "mgc_client",
    company: "mgc_client",
    category: "client_category",
    direction: "client_category",
    pf_id: "id_pf",
  },
  contacts: {
    client: "company",
    position: "work_position",
    email: "e-mail",
    mail: "e-mail",
  },
  active_list: {
    "агентство": "agency",
    agency_name: "agency",
    agencies: "agency",
    department: "front",
    agency_department: "front",
    client_name: "client",
  },
};

const ALLOWED_FIELDS: Record<SupportedTable, Set<string>> = {
  tenders: new Set([
    "agency",
    "client",
    "project",
    "tender_ist",
    "tender_budget",
    "tender_start",
    "tender_end",
    "tender_dl",
    "tender_status",
    "tender_kp_start",
    "tender_kp_end",
    "allocates",
    "manager",
  ]),
  clients: new Set([
    "id",
    "mgc_client",
    "pf_client",
    "id_pf",
    "pf_id",
    "client_category",
    "description",
    "top_30",
    "ul",
    "inn",
  ]),
  contacts: new Set([
    "id",
    "name",
    "company",
    "work_position",
    "site",
    "phone",
    "e-mail",
    "telegram",
    "gender",
    "date_birth",
    "adress",
  ]),
  active_list: new Set([
    "id",
    "agency",
    "client",
    "alt_client",
    "front",
    "domain",
  ]),
};

function normalizeTable(value: unknown): SupportedTable {
  const v = String(value ?? "").trim().toLowerCase();
  if (TABLES.includes(v as SupportedTable)) return v as SupportedTable;
  if (v.includes("tender")) return "tenders";
  if (v.includes("contact")) return "contacts";
  if (v.includes("active")) return "active_list";
  return "clients";
}

function normalizeField(table: SupportedTable, field: unknown): string {
  const raw = String(field ?? "").trim();
  const low = raw.toLowerCase();
  return FIELD_ALIASES[table][low] ?? raw;
}

function normalizeOperator(op: unknown): string {
  const candidate = String(op ?? "").trim().toLowerCase();
  if (ALLOWED_OPERATORS.has(candidate)) return candidate;
  return "contains";
}

function normalizePlanRequest(request: QueryPlanRequest) {
  const table = normalizeTable(request.table);
  const allowedFields = ALLOWED_FIELDS[table];
  const filters = Array.isArray(request.filters)
    ? request.filters
        .map((f) => {
          const rawField = String(f.field ?? "").trim().toLowerCase();
          const isAgencyFieldHint =
            rawField.includes("агент") || rawField.includes("agency");
          const field = isAgencyFieldHint ? "agency" : normalizeField(table, f.field);
          if (!allowedFields.has(field)) return null;
          let operator = normalizeOperator(f.operator);
          let value: unknown = f.value;
          if (field === "agency") {
            // Для агентств используем contains, чтобы совпадало по частичному названию.
            operator = "contains";
          }
          if (operator === "in" && !Array.isArray(value)) {
            value = String(value ?? "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
          }
          return { field, operator, value };
        })
        .filter((f): f is { field: string; operator: string; value: unknown } =>
          Boolean(f?.field),
        )
    : [];

  const sort = request.sort?.field
    ? (() => {
        const normalizedSortField = normalizeField(table, request.sort?.field);
        if (!allowedFields.has(normalizedSortField)) return undefined;
        return {
          field: normalizedSortField,
          direction: request.sort?.direction === "asc" ? "asc" : "desc",
        };
      })()
    : undefined;

  const columns = Array.isArray(request.columns)
    ? request.columns
        .map((c) => normalizeField(table, c))
        .filter((c) => Boolean(c) && allowedFields.has(c))
    : undefined;

  const limit =
    typeof request.limit === "number" && request.limit > 0
      ? request.limit
      : undefined;

  return {
    table,
    description: request.description,
    filters,
    sort,
    columns,
    limit,
  };
}

function isMaxBudgetTenderQuestion(text: string): boolean {
  const q = text.toLowerCase();
  const asksTender = /тендер/.test(q);
  const asksMaxBudget =
    /сам(ым|ой)\s+больш(им|ой)\s+бюджет/.test(q) ||
    /максимальн\w*\s+бюджет/.test(q) ||
    /наибольш\w*\s+бюджет/.test(q);
  return asksTender && asksMaxBudget;
}

function getTopBudgetLimit(text: string): number | null {
  const q = text.toLowerCase();
  if (!/топ/.test(q) || !/бюджет/.test(q) || !/тендер/.test(q)) return null;
  const m = q.match(/топ[-\s]*(\d{1,2})/);
  if (m) return Math.min(Math.max(Number(m[1]), 1), 50);
  return 10;
}

function isAverageBudgetQuestion(text: string): boolean {
  const q = text.toLowerCase();
  return /средн\w*\s+бюджет/.test(q) && /тендер/.test(q);
}

function isWonBudgetShareQuestion(text: string): boolean {
  const q = text.toLowerCase();
  return (
    (/дол\w+/.test(q) || /процент/.test(q) || /%/.test(q)) &&
    /выигран/.test(q) &&
    /бюджет/.test(q)
  );
}

function isWonTendersPercentQuestion(text: string): boolean {
  const q = text.toLowerCase();
  const asksPercent = /процент|дол\w+|конверси\w+|win\s*rate/.test(q);
  const asksWon = /выигран|выигрыш|сыгран/.test(q);
  const asksTenders = /тендер/.test(q);
  return asksPercent && asksWon && asksTenders;
}

function isTenderPeriodQuestion(text: string): boolean {
  const q = text.toLowerCase();
  const asksTenders = /тендер/.test(q);
  const asksPeriod =
    /за\s+\d{4}/.test(q) ||
    /за\s+(период|месяц|квартал|год)/.test(q) ||
    /последн\w+\s+\d*\s*(дн|недел|месяц|квартал|год)/.test(q) ||
    /с\s+\d{4}-\d{2}-\d{2}\s+по\s+\d{4}-\d{2}-\d{2}/.test(q);
  return asksTenders && asksPeriod;
}

function parseBudgetValueFromRow(row: Record<string, unknown>): number {
  const direct = row["tender_budget"];
  const fallbackKey = Object.keys(row).find((k) =>
    k.toLowerCase().includes("budget"),
  );
  const raw = direct ?? (fallbackKey ? row[fallbackKey] : undefined);
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const normalized = raw
      .replace(/[₽\s]/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    return Number(normalized);
  }
  return Number.NaN;
}

function detectAgencyFromText(text: string): string | null {
  const q = text.toLowerCase();
  for (const agency of KNOWN_AGENCIES) {
    const a = agency.toLowerCase();
    if (q.includes(a)) return agency;
    if (agency === "Data Stories") {
      if (q.includes("datastories") || q.includes("data stories")) return agency;
    }
  }
  return null;
}

function normalizeSearchText(s: string): string {
  return s
    .toLowerCase()
    .replace(/["'#]/g, " ")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectProjectFromText(text: string): string | null {
  const q = normalizeSearchText(text);
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const project of KNOWN_PROJECTS) {
    const p = normalizeSearchText(project);
    if (!p) continue;
    if (q.includes(p) && p.length > bestLen) {
      bestMatch = project;
      bestLen = p.length;
    }
  }
  if (bestMatch) return bestMatch;

  // Эвристика: фраза после "по ...", если это не похоже на период/статус.
  const byMatch = q.match(/\bпо\s+([a-zа-я0-9+/\- ]{3,60})/i);
  if (byMatch) {
    const candidate = byMatch[1].trim();
    if (
      !/(период|год|месяц|квартал|клиент|агентств|бюджет|статус)/.test(candidate)
    ) {
      return candidate;
    }
  }
  return null;
}

function buildDiagnosticsMarkdown(executed: Array<{
  request: {
    table: string;
    filters?: { field: string; operator: string; value: unknown }[];
    sort?: { field: string; direction?: "asc" | "desc" } | undefined;
    limit?: number;
  };
  rowCount: number;
  error?: string;
}>): string {
  const lines: string[] = [
    "",
    "---",
    "### Диагностика запроса",
  ];
  executed.forEach((item, idx) => {
    const filtersText =
      item.request.filters && item.request.filters.length > 0
        ? item.request.filters
            .map((f) => `${f.field} ${f.operator} ${JSON.stringify(f.value)}`)
            .join("; ")
        : "нет";
    const sortText = item.request.sort
      ? `${item.request.sort.field} ${item.request.sort.direction ?? "desc"}`
      : "нет";
    lines.push(
      `- ${idx + 1}. table=\`${item.request.table}\`, rows=${item.rowCount}, limit=${item.request.limit ?? "—"}, sort=${sortText}, filters=${filtersText}${item.error ? `, error=${item.error}` : ""}`,
    );
  });
  return lines.join("\n");
}

const PLANNER_PROMPT = `
Ты планировщик SQL-подобных выборок для BI/CRM.
Верни строго JSON формата:
{
  "clarificationQuestion": "строка или пусто",
  "requests": [
    {
      "table": "tenders|clients|contacts|active_list",
      "description": "зачем эта выборка",
      "filters": [{ "field":"...", "operator":"eq|ilike|contains|in|gte|lte|gt|lt", "value":"..." }],
      "sort": { "field":"...", "direction":"asc|desc" },
      "limit": 50
    }
  ]
}
Правила:
- Если вопрос неоднозначен и нельзя сделать качественный вывод — задай clarificationQuestion, requests можно оставить пустым.
- Если вопрос ясный — clarificationQuestion не добавляй.
- Используй только таблицы: tenders, clients, contacts, active_list.
- Для поиска клиента используй contains/ilike по полям:
  tenders.client, clients.mgc_client, clients.pf_client, active_list.client, active_list.alt_client, contacts.company.
- Если в запросе встречаются агентства из списка [AGM, MGCom, MGrowth, Артикс, E-Promo, i-Media, Data Stories], обязательно добавляй фильтр agency contains "<название агентства>".
- Если в запросе встречается проект/направление, добавляй фильтр project contains "<значение проекта>".
- Для "выигранных/сыгранных" тендеров используй tender_status in ["Выигран тендер","Размещается","Выиграли"].
- Для "проигранных" используй tender_status in ["Проигран тендер"].
- Для вопросов про процент/долю выигранных тендеров рассчитывай метрику по количеству, а не по бюджету.
- Для "прошедших" без уточнения — ориентируйся на завершенные/состоявшиеся статусы и/или даты завершения.
- Если пользователь спрашивает "тендеры за период/за год/за месяц/с ... по ...", фильтрация по дате должна идти только по полю tender_start.
- Можно формировать несколько requests, если нужен кросс-табличный ответ.
- Не добавляй limit, если пользователь явно не просит ограничение.
- Для вопроса "тендер с самым большим бюджетом" обязательно: table=tenders, sort={field:"tender_budget",direction:"desc"}, limit=1.
`.trim();

const ANALYST_PROMPT = `
Ты — аналитический ассистент для внутренней BI/CRM-системы, работающий с данными о тендерах, клиентах, активных списках и контактах.

Твоя задача:
- Отвечать только на основе данных из БД.
- Анализировать тендеры, клиентов, бюджеты, направления, контакты и их взаимосвязи.
- Подтверждать каждый вывод цифрами, датами, названиями и другими фактическими данными.
- Уметь отвечать как на точечные вопросы, так и на аналитические запросы по нескольким клиентам, направлениям и периодам.
- В ответах можно использовать markdown-таблицы, списки и структурированные выводы.
- Если вопрос неоднозначен, задавать уточняющий вопрос.
- Если данных недостаточно, прямо говорить об этом.

Стиль ответа:
- Пиши как аналитик.
- Отвечай подробно, но без воды.
- Сначала давай краткий вывод, затем таблицу или список фактов, затем аналитический комментарий.
- Если уместно, показывай расчеты, группировки, фильтры по году, бюджету, направлению, статусу, клиенту.
- Если вопрос про "обычно", делай вывод на основе исторических данных из БД и явно это отмечай.

Источники данных:
- tenders
- clients
- active_list
- contacts

Главные принципы:
- Не использовать внешние знания для фактов.
- Не выдумывать данные, связи и значения.
- Не делать вид, что в БД есть связи, если их нет.
- Все связи между таблицами строятся по названию клиента и его вариантам написания.
- Если клиент может быть найден в нескольких таблицах, сопоставляй записи по смысловому названию.

Формат ответа:
1. Короткий вывод.
2. Таблица с фактами.
3. Аналитический комментарий.
4. При необходимости — уточняющий вопрос.

Правило по бюджету тендера:
- Если вопрос про максимальный/самый большой бюджет, учитывай только строки, где tender_budget задан и является числом > 0.
- Если часть строк без бюджета, прямо укажи, что они исключены из расчета.
`.trim();

function extractJsonObject(text: string): string {
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) return markdownMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

function asYaRole(role: ChatRole): "user" | "assistant" {
  return role === "ai" ? "assistant" : "user";
}

async function callYandex(messages: { role: string; text: string }[], maxTokens = 1400) {
  const apiKey = process.env.YANDEX_GPT_API_KEY;
  const folderId = process.env.YANDEX_GPT_FOLDER_ID;
  const modelUri =
    process.env.YANDEX_GPT_MODEL_URI ||
    (folderId ? `gpt://${folderId}/yandexgpt/latest` : undefined);

  if (!apiKey || !folderId || !modelUri) {
    throw new Error("YANDEX_GPT_MISSING_ENV");
  }

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
          temperature: 0.1,
          maxTokens,
        },
        messages,
      }),
    },
  );

  if (!yaRes.ok) {
    const raw = await yaRes.text().catch(() => "");
    throw new Error(`YANDEX_GPT_ERROR:${yaRes.status}:${raw}`);
  }

  const data = (await yaRes.json()) as {
    result?: { alternatives?: { message?: { text?: string } }[] };
  };
  const content = data.result?.alternatives?.[0]?.message?.text?.trim();
  if (!content) {
    throw new Error("YANDEX_GPT_EMPTY");
  }
  return content;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ChatBody;
  const history = Array.isArray(body.history) ? body.history : [];
  const latestMessage = String(body.message ?? "").trim();

  if (!latestMessage && history.length === 0) {
    return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
  }

  const historyWithoutDupLatest =
    latestMessage &&
    history.length > 0 &&
    history[history.length - 1].role === "user" &&
    history[history.length - 1].text.trim() === latestMessage
      ? history.slice(0, -1)
      : history;

  const recentHistory = historyWithoutDupLatest.slice(-10);
  const llmHistory = recentHistory.map((m) => ({
    role: asYaRole(m.role),
    text: m.text,
  }));

  try {
    const planRaw = await callYandex(
      [
        { role: "system", text: PLANNER_PROMPT },
        ...llmHistory,
        { role: "user", text: latestMessage },
      ],
      900,
    );

    let plan: QueryPlan = {};
    try {
      plan = JSON.parse(extractJsonObject(planRaw)) as QueryPlan;
    } catch {
      plan = {};
    }

    const requests = Array.isArray(plan.requests) ? plan.requests : [];

    if ((!requests.length || requests.every((r) => !r?.table)) && plan.clarificationQuestion) {
      return NextResponse.json({ reply: plan.clarificationQuestion });
    }

    const normalizedRequests = requests.slice(0, 6).map(normalizePlanRequest);
    const agencyFromMessage = detectAgencyFromText(latestMessage);
    const projectFromMessage = detectProjectFromText(latestMessage);
    const tenderPeriodIntent = isTenderPeriodQuestion(latestMessage);
    const maxBudgetIntent = isMaxBudgetTenderQuestion(latestMessage);
    const topBudgetLimit = getTopBudgetLimit(latestMessage);
    const averageBudgetIntent = isAverageBudgetQuestion(latestMessage);
    const wonBudgetShareIntent = isWonBudgetShareQuestion(latestMessage);
    const wonTendersPercentIntent = isWonTendersPercentQuestion(latestMessage);

    if (maxBudgetIntent || topBudgetLimit || averageBudgetIntent || wonBudgetShareIntent) {
      // Для бюджетных метрик считаем по полной доступной выборке.
      const tendersIdx = normalizedRequests.findIndex((r) => r.table === "tenders");

      if (tendersIdx >= 0) {
        const base = normalizedRequests[tendersIdx];
        const baseFilters = Array.isArray(base.filters) ? base.filters : [];
        const withoutAgencyFilter = baseFilters.filter(
          (f) => String(f.field).toLowerCase() !== "agency",
        );
        const agencyFilter = agencyFromMessage
          ? [{ field: "agency", operator: "contains", value: agencyFromMessage }]
          : [];
        normalizedRequests[tendersIdx] = {
          ...base,
          filters: [...withoutAgencyFilter, ...agencyFilter],
          sort: { field: "tender_budget", direction: "desc" },
          limit: undefined,
        };
      } else {
        const agencyFilter = agencyFromMessage
          ? [{ field: "agency", operator: "contains", value: agencyFromMessage }]
          : [];
        normalizedRequests.unshift({
          table: "tenders",
          description: "Надежная выборка тендеров по бюджету",
          filters: agencyFilter,
          sort: { field: "tender_budget", direction: "desc" },
          limit: undefined,
          columns: undefined,
        });
      }
    }

    if (wonTendersPercentIntent) {
      const tendersIdx = normalizedRequests.findIndex((r) => r.table === "tenders");
      if (tendersIdx >= 0) {
        const base = normalizedRequests[tendersIdx];
        const baseFilters = Array.isArray(base.filters) ? base.filters : [];
        const nonStatusFilters = baseFilters.filter(
          (f) => String(f.field).toLowerCase() !== "tender_status",
        );
        normalizedRequests[tendersIdx] = {
          ...base,
          filters: nonStatusFilters,
          sort: base.sort ?? undefined,
          limit: undefined,
        };
      } else {
        normalizedRequests.unshift({
          table: "tenders",
          description: "Расчет процента выигранных тендеров по количеству",
          filters: [],
          sort: undefined,
          limit: undefined,
          columns: undefined,
        });
      }
    }

    if (agencyFromMessage) {
      for (const req of normalizedRequests) {
        if (req.table !== "tenders" && req.table !== "active_list") continue;
        const filters = Array.isArray(req.filters) ? req.filters : [];
        req.filters = [
          ...filters.filter((f) => String(f.field).toLowerCase() !== "agency"),
          { field: "agency", operator: "contains", value: agencyFromMessage },
        ];
      }
    }

    if (projectFromMessage) {
      for (const req of normalizedRequests) {
        if (req.table !== "tenders") continue;
        const filters = Array.isArray(req.filters) ? req.filters : [];
        req.filters = [
          ...filters.filter((f) => String(f.field).toLowerCase() !== "project"),
          { field: "project", operator: "contains", value: projectFromMessage },
        ];
      }
    }

    if (tenderPeriodIntent) {
      for (const req of normalizedRequests) {
        if (req.table !== "tenders" || !req.filters?.length) continue;
        req.filters = req.filters.map((f) => {
          const field = String(f.field).toLowerCase();
          const isDateOperator =
            f.operator === "gte" ||
            f.operator === "lte" ||
            f.operator === "gt" ||
            f.operator === "lt" ||
            f.operator === "eq";
          if (
            isDateOperator &&
            (field === "tender_end" ||
              field === "tender_dl" ||
              field === "tender_kp_start" ||
              field === "tender_kp_end")
          ) {
            return { ...f, field: "tender_start" };
          }
          return f;
        });
      }
    }

    const executed = await Promise.all(
      normalizedRequests.map(async (request) => {
        const result = await getDbRowsByRequest({
          table: request.table,
          filters: request.filters,
          sort: request.sort ?? undefined,
          columns: request.columns ?? undefined,
          limit: request.limit,
        });
        return {
          request,
          rowCount: result.rows.length,
          error: result.error,
          rows: result.rows,
        };
      }),
    );
    const diagnostics = buildDiagnosticsMarkdown(executed);

    if (maxBudgetIntent) {
      const tenderDataset = executed.find((x) => x.request.table === "tenders");
      if (tenderDataset?.error) {
        return NextResponse.json({
          reply: `Не удалось получить данные по тендерам из БД: ${tenderDataset.error}`,
        });
      }
      if (!tenderDataset || tenderDataset.rows.length === 0) {
        return NextResponse.json({
          reply: "В выборке нет тендеров для расчета максимального бюджета.",
        });
      }
      const ranked = (tenderDataset?.rows ?? [])
        .map((r) => {
          const asNum = parseBudgetValueFromRow(r);
          return { row: r, budget: asNum };
        })
        .filter((x) => Number.isFinite(x.budget) && x.budget > 0)
        .sort((a, b) => b.budget - a.budget);

      if (ranked.length > 0) {
        const top = ranked[0];
        const client = String(top.row["client"] ?? "—");
        const agency = String(top.row["agency"] ?? "—");
        const status = String(top.row["tender_status"] ?? "—");
        const start = String(top.row["tender_start"] ?? "—");
        const end = String(top.row["tender_end"] ?? "—");
        const excluded = (tenderDataset?.rows.length ?? 0) - ranked.length;
        const fmt = new Intl.NumberFormat("ru-RU");
        const budgetText = `${fmt.format(Math.round(top.budget))} ₽`;

        const reply = [
          `Тендер с максимальным бюджетом найден: **${client}** (${agency}) — **${budgetText}**.`,
          "",
          "| Клиент | Агентство | Бюджет | Статус | Дата начала | Дата окончания |",
          "|---|---:|---:|---|---|---|",
          `| ${client} | ${agency} | ${budgetText} | ${status} | ${start} | ${end} |`,
          "",
          `В расчёт вошли только записи, где \`tender_budget\` задан и больше 0. Исключено записей без валидного бюджета: **${excluded < 0 ? 0 : excluded}**.`,
        ].join("\n");

        return NextResponse.json({ reply: `${reply}${diagnostics}` });
      }
      return NextResponse.json({
        reply:
          `Не удалось определить максимум: у ${tenderDataset.rows.length} найденных тендеров отсутствует валидный бюджет (поле \`tender_budget\` пустое/нечисловое).${diagnostics}`,
      });
    }

    if (topBudgetLimit) {
      const tenderDataset = executed.find((x) => x.request.table === "tenders");
      if (tenderDataset?.error) {
        return NextResponse.json({
          reply: `Не удалось получить данные по тендерам из БД: ${tenderDataset.error}`,
        });
      }
      if (!tenderDataset || tenderDataset.rows.length === 0) {
        return NextResponse.json({
          reply: "В выборке нет тендеров для построения топа по бюджету.",
        });
      }
      const ranked = (tenderDataset?.rows ?? [])
        .map((r) => {
          const asNum = parseBudgetValueFromRow(r);
          return { row: r, budget: asNum };
        })
        .filter((x) => Number.isFinite(x.budget) && x.budget > 0)
        .sort((a, b) => b.budget - a.budget)
        .slice(0, topBudgetLimit);
      if (ranked.length > 0) {
        const fmt = new Intl.NumberFormat("ru-RU");
        const rows = ranked
          .map((x, i) => {
            const c = String(x.row["client"] ?? "—");
            const a = String(x.row["agency"] ?? "—");
            const s = String(x.row["tender_status"] ?? "—");
            return `| ${i + 1} | ${c} | ${a} | ${fmt.format(Math.round(x.budget))} ₽ | ${s} |`;
          })
          .join("\n");
        const reply = [
          `Найден топ-${ranked.length} тендеров по бюджету.`,
          "",
          "| # | Клиент | Агентство | Бюджет | Статус |",
          "|---:|---|---|---:|---|",
          rows,
          "",
          "В рейтинг включены только записи с валидным `tender_budget` > 0.",
        ].join("\n");
        return NextResponse.json({ reply: `${reply}${diagnostics}` });
      }
      return NextResponse.json({
        reply:
          `Не удалось построить топ-${topBudgetLimit}: у ${tenderDataset.rows.length} найденных тендеров отсутствует валидный бюджет (поле \`tender_budget\` пустое/нечисловое).${diagnostics}`,
      });
    }

    if (averageBudgetIntent) {
      const tenderDataset = executed.find((x) => x.request.table === "tenders");
      if (tenderDataset?.error) {
        return NextResponse.json({
          reply: `Не удалось получить данные по тендерам из БД: ${tenderDataset.error}`,
        });
      }
      if (!tenderDataset || tenderDataset.rows.length === 0) {
        return NextResponse.json({
          reply: "В выборке нет тендеров для расчета среднего бюджета.",
        });
      }
      const values = (tenderDataset?.rows ?? [])
        .map((r) => parseBudgetValueFromRow(r))
        .filter((x) => Number.isFinite(x) && x > 0);
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const excluded = (tenderDataset?.rows.length ?? 0) - values.length;
        const fmt = new Intl.NumberFormat("ru-RU");
        const reply = [
          `Средний бюджет тендера: **${fmt.format(Math.round(avg))} ₽**.`,
          "",
          "| Метрика | Значение |",
          "|---|---:|",
          `| Количество тендеров в расчете | ${values.length} |`,
          `| Суммарный бюджет | ${fmt.format(Math.round(sum))} ₽ |`,
          `| Средний бюджет | ${fmt.format(Math.round(avg))} ₽ |`,
          "",
          `Исключено записей без валидного бюджета: **${excluded < 0 ? 0 : excluded}**.`,
        ].join("\n");
        return NextResponse.json({ reply: `${reply}${diagnostics}` });
      }
      return NextResponse.json({
        reply:
          `Не удалось рассчитать средний бюджет: у ${tenderDataset.rows.length} найденных тендеров отсутствует валидный бюджет (поле \`tender_budget\` пустое/нечисловое).${diagnostics}`,
      });
    }

    if (wonBudgetShareIntent) {
      const tenderDataset = executed.find((x) => x.request.table === "tenders");
      if (tenderDataset?.error) {
        return NextResponse.json({
          reply: `Не удалось получить данные по тендерам из БД: ${tenderDataset.error}`,
        });
      }
      if (!tenderDataset || tenderDataset.rows.length === 0) {
        return NextResponse.json({
          reply: "В выборке нет тендеров для расчета доли выигранных по бюджету.",
        });
      }
      const parsed = (tenderDataset?.rows ?? [])
        .map((r) => {
          const budget = parseBudgetValueFromRow(r);
          const status = String(r["tender_status"] ?? "");
          return { budget, status };
        })
        .filter((x) => Number.isFinite(x.budget) && x.budget > 0);
      if (parsed.length > 0) {
        const total = parsed.reduce((s, x) => s + x.budget, 0);
        const won = parsed
          .filter((x) =>
            ["Выигран тендер", "Размещается", "Выиграли"].includes(x.status),
          )
          .reduce((s, x) => s + x.budget, 0);
        const share = total > 0 ? (won / total) * 100 : 0;
        const fmt = new Intl.NumberFormat("ru-RU");
        const reply = [
          `Доля выигранных по бюджету: **${share.toFixed(1)}%**.`,
          "",
          "| Показатель | Значение |",
          "|---|---:|",
          `| Бюджет выигранных | ${fmt.format(Math.round(won))} ₽ |`,
          `| Общий бюджет (валидный) | ${fmt.format(Math.round(total))} ₽ |`,
          `| Доля | ${share.toFixed(1)}% |`,
          "",
          "Статусы, считающиеся выигранными: `Выигран тендер`, `Размещается`, `Выиграли`.",
        ].join("\n");
        return NextResponse.json({ reply: `${reply}${diagnostics}` });
      }
      return NextResponse.json({
        reply:
          `Не удалось рассчитать долю выигранных по бюджету: у ${tenderDataset.rows.length} найденных тендеров отсутствует валидный бюджет (поле \`tender_budget\` пустое/нечисловое).${diagnostics}`,
      });
    }

    if (wonTendersPercentIntent) {
      const tenderDataset =
        executed.find(
          (x) =>
            x.request.table === "tenders" &&
            !(x.request.filters ?? []).some(
              (f) => String(f.field).toLowerCase() === "tender_status",
            ),
        ) ?? executed.find((x) => x.request.table === "tenders");
      if (tenderDataset?.error) {
        return NextResponse.json({
          reply: `Не удалось получить данные по тендерам из БД: ${tenderDataset.error}`,
        });
      }
      if (!tenderDataset || tenderDataset.rows.length === 0) {
        return NextResponse.json({
          reply: "В выборке нет тендеров для расчета процента выигранных.",
        });
      }

      const rows = tenderDataset.rows;
      const WON_STATUSES = new Set(["Выигран тендер", "Размещается", "Выиграли"]);
      const LOST_STATUSES = new Set(["Проигран тендер"]);

      const wonCount = rows.filter((r) =>
        WON_STATUSES.has(String(r["tender_status"] ?? "").trim()),
      ).length;
      const lostCount = rows.filter((r) =>
        LOST_STATUSES.has(String(r["tender_status"] ?? "").trim()),
      ).length;
      const totalCount = rows.length;
      const decidedCount = wonCount + lostCount;
      const winRateAll = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;
      const winRateDecided = decidedCount > 0 ? (wonCount / decidedCount) * 100 : 0;

      const reply = [
        `Процент выигранных тендеров: **${winRateAll.toFixed(1)}%** (по всем тендерам в выборке).`,
        "",
        "| Метрика | Значение |",
        "|---|---:|",
        `| Всего тендеров | ${totalCount} |`,
        `| Выигранные (включая \`Размещается\`, \`Выиграли\`) | ${wonCount} |`,
        `| Проигранные | ${lostCount} |`,
        `| Win rate по всем | ${winRateAll.toFixed(1)}% |`,
        `| Win rate по решенным (won/lost) | ${winRateDecided.toFixed(1)}% |`,
        "",
        "Базовая метрика считается по количеству: `выигранные / все`. Дополнительно показан показатель по решенным тендерам.",
      ].join("\n");

      return NextResponse.json({ reply: `${reply}${diagnostics}` });
    }

    if (!executed.length) {
      return NextResponse.json({
        reply:
          "Недостаточно контекста для точного ответа. Уточните, пожалуйста: клиент, период, направление или статус тендера.",
      });
    }

    const evidencePayload = {
      userQuestion: latestMessage,
      extractedDatasets: executed,
      importantNote:
        "Можно использовать только данные из extractedDatasets. Если чего-то нет, прямо говори об ограничениях.",
    };

    const finalReply = await callYandex(
      [
        { role: "system", text: ANALYST_PROMPT },
        {
          role: "user",
          text:
            `Вопрос пользователя:\n${latestMessage}\n\n` +
            `Данные из БД (JSON):\n${JSON.stringify(evidencePayload)}`,
        },
      ],
      1800,
    );

    return NextResponse.json({
      reply: `${finalReply}${diagnostics}`,
    });
  } catch (error) {
    console.error("Ошибка в API /api/chat (YandexGPT):", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("YANDEX_GPT_MISSING_ENV")
            ? "YandexGPT не настроен. Добавьте YANDEX_GPT_API_KEY и YANDEX_GPT_FOLDER_ID."
            : "Ошибка при обращении к ИИ-ассистенту.",
      },
      { status: 500 },
    );
  }
}

