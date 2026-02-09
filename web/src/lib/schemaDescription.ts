export type ColumnDescription = {
  field: string;
  label: string;
  type: "string" | "number" | "date" | "boolean";
  description: string;
  aliases: string[];
};

export type TableSchema = {
  title: string;
  description: string;
  /**
   * Поле даты по умолчанию для относительных временных запросов,
   * если пользователь не уточнил, по какой именно дате фильтровать.
   */
  defaultDateField?: string;
  defaultDateFieldDescription?: string;
  columns: ColumnDescription[];
};

export type SchemaDescription = {
  clients: TableSchema;
  contacts: TableSchema;
  tenders: TableSchema;
};

export const schemaDescription: SchemaDescription = {
  clients: {
    title: "Клиенты (clients)",
    description:
      "Справочник клиентов компании: базовая информация о компаниях, с которыми ведётся работа.",
    columns: [
      {
        field: "mgc_client",
        label: "Название клиента",
        type: "string",
        description:
          "Официальное название клиента (компании). По этому полю клиента проще всего искать и связывать с другими данными.",
        aliases: ["клиент", "компания", "название клиента", "бренд"],
      },
      {
        field: "Ul",
        label: "Юридическое лицо клиента",
        type: "string",
        description:
          "Юридическое лицо клиента (ООО/АО и т.п.), если отличается от брендового названия.",
        aliases: ["юрлицо", "юр лицо", "юридическое лицо"],
      },
      {
        field: "Client_category",
        label: "Категория/направление клиента",
        type: "string",
        description:
          "Категория или направление клиента (чем занимается клиент, сегмент рынка).",
        aliases: ["категория клиента", "направление клиента", "отрасль"],
      },
      {
        field: "description",
        label: "Дополнительная информация о клиенте",
        type: "string",
        description:
          "Свободный текст с дополнительной информацией о клиенте (комментарии, заметки).",
        aliases: ["описание", "комментарий", "заметки"],
      },
      {
        field: "top_30",
        label: "Входит в топ‑30 клиентов",
        type: "boolean",
        description:
          "Признак, входит ли клиент в топ‑30 ключевых клиентов компании.",
        aliases: ["топ 30", "ключевой клиент", "strategic client"],
      },
      {
        field: "id_pf",
        label: "ID клиента в Planfix",
        type: "string",
        description:
          "Уникальный идентификатор клиента в системе Planfix (используется для связей).",
        aliases: ["id клиента", "id planfix", "ид клиента"],
      },
      {
        field: "Inn",
        label: "ИНН клиента",
        type: "string",
        description:
          "ИНН юридического лица клиента. Можно использовать для точного сопоставления.",
        aliases: ["инн", "налоговый номер"],
      },
      {
        field: "pf_client",
        label: "Название клиента в Planfix",
        type: "string",
        description:
          "Как клиент называется в Planfix (может отличаться от mgc_client).",
        aliases: ["название в planfix", "имя в планфикс"],
      },
    ],
  },

  contacts: {
    title: "Контакты (contacts)",
    description:
      "Контактные лица по клиентам: люди, с которыми идёт коммуникация.",
    columns: [
      {
        field: "id_pf",
        label: "ID контакта в Planfix",
        type: "string",
        description:
          "Уникальный идентификатор контакта в Planfix (для технических связей).",
        aliases: ["id контакта", "id_pf контакта"],
      },
      {
        field: "gender",
        label: "Пол контакта",
        type: "string",
        description:
          "Пол контактного лица (женский/мужской). Может использоваться для сегментации.",
        aliases: ["пол", "gender"],
      },
      {
        field: "site",
        label: "Сайт контакта",
        type: "string",
        description:
          "Персональный сайт или сайт компании, связанный с контактом.",
        aliases: ["сайт", "website"],
      },
      {
        field: "name",
        label: "Имя и фамилия контакта",
        type: "string",
        description:
          "Полное имя контактного лица (ФИО). Основное поле для обращения к человеку.",
        aliases: ["имя", "фамилия", "фио", "контакт"],
      },
      {
        field: "phone",
        label: "Телефон контакта",
        type: "string",
        description:
          "Основной телефонный номер контакта (для связи с человеком).",
        aliases: ["телефон", "номер телефона", "mobile"],
      },
      {
        field: "e-mail",
        label: "E‑mail контакта",
        type: "string",
        description:
          "Адрес электронной почты контактного лица (для деловой переписки).",
        aliases: ["email", "почта", "электронная почта"],
      },
      {
        field: "work_position",
        label: "Должность контакта",
        type: "string",
        description:
          "Должность контакта в компании‑клиенте (например: маркетинг‑директор).",
        aliases: ["должность", "position", "роль"],
      },
      {
        field: "company",
        label: "Компания контакта",
        type: "string",
        description:
          "Компания, в которой работает контакт (должна совпадать с названием клиента).",
        aliases: ["компания", "клиент контакта", "организация"],
      },
      {
        field: "telegram",
        label: "Telegram контакта",
        type: "string",
        description:
          "Ссылка или ник в Telegram для связи с контактом.",
        aliases: ["телеграм", "tg", "telegram"],
      },
      {
        field: "date_birth",
        label: "Дата рождения контакта",
        type: "date",
        description:
          "Дата рождения контактного лица (может использоваться для поздравлений и сегментации).",
        aliases: ["дата рождения", "др", "birthday"],
      },
      {
        field: "adress",
        label: "Адрес контакта",
        type: "string",
        description:
          "Почтовый или физический адрес, связанный с контактом.",
        aliases: ["адрес", "address"],
      },
    ],
  },

  tenders: {
    title: "Тендеры (tenders)",
    description:
      "Лог всех тендеров и проектов: суммы, даты, статусы, источники и связи с клиентами.",
    /**
     * ВАЖНОЕ ПРАВИЛО ДЛЯ ИИ:
     * Если пользователь просит «тендеры за прошлый месяц/год/период»
     * и НЕ уточняет, по какой именно дате фильтровать (старт/дэдлайн/конец),
     * то по умолчанию нужно использовать поле tender_start (дата начала тендера).
     */
    defaultDateField: "tender_start",
    defaultDateFieldDescription:
      "Если в запросе есть период времени по тендерам (например: «за прошлый месяц», «за 2024 год») без уточнения конкретного типа даты, интерпретируй это как фильтр по tender_start — дате начала тендера.",
    columns: [
      {
        field: "id_pf",
        label: "ID тендера в Planfix",
        type: "string",
        description:
          "Уникальный идентификатор тендера в Planfix (техническое поле).",
        aliases: ["id тендера", "id_pf тендера"],
      },
      {
        field: "agency",
        label: "Агентство",
        type: "string",
        description:
          "Агентство, которое играло тендер (кто участвовал от агентской стороны).",
        aliases: ["агентство", "agency"],
      },
      {
        field: "client",
        label: "Клиент тендера",
        type: "string",
        description:
          "Название клиента (компании), по которому проходил тендер.",
        aliases: ["клиент", "компания клиента", "заказчик"],
      },
      {
        field: "project",
        label: "Проект / канал тендера",
        type: "string",
        description:
          "Проект или канал, по которому игрался тендер (например: digital, ТВ, PR).",
        aliases: ["проект", "канал", "направление тендера"],
      },
      {
        field: "client_category",
        label: "Категория клиента",
        type: "string",
        description:
          "Категория или направление клиента, для которого проводился тендер.",
        aliases: ["категория клиента", "отрасль клиента"],
      },
      {
        field: "tender_ist",
        label: "Источник тендера",
        type: "string",
        description:
          "Откуда стало известно о тендере (источник: рекомендация, площадка, холодный заход и т.п.).",
        aliases: ["источник тендера", "канал привлечения тендера"],
      },
      {
        field: "tender_budget",
        label: "Бюджет тендера",
        type: "number",
        description:
          "Суммарный бюджет тендера в деньгах (рубли). Ключевое числовое поле для аналитики.",
        aliases: ["бюджет", "сумма тендера", "объём тендера"],
      },
      {
        field: "tender_start",
        label: "Дата начала тендера",
        type: "date",
        description:
          "Дата старта тендера (когда начался процесс). По умолчанию используется для фильтрации по периодам, если пользователь не уточнил конкретное поле даты.",
        aliases: ["старт тендера", "начало тендера", "tender start"],
      },
      {
        field: "tender_dl",
        label: "Дэдлайн тендера",
        type: "date",
        description:
          "Дэдлайн (крайний срок, к которому нужно было подать материалы/предложение).",
        aliases: ["дэдлайн", "дл", "срок сдачи", "deadline"],
      },
      {
        field: "tender_end",
        label: "Дата окончания тендера",
        type: "date",
        description:
          "Дата, когда тендер завершился (последний день тендера).",
        aliases: ["конец тендера", "окончание тендера"],
      },
      {
        field: "tender_status",
        label: "Статус тендера",
        type: "string",
        description:
          "Статус тендера: выигран, проигран, ждём ответа, подготовка КП и т.п.",
        aliases: ["статус", "результат тендера", "stage"],
      },
      {
        field: "tender_KP_start",
        label: "Начало подготовки КП",
        type: "date",
        description:
          "Дата начала подготовки коммерческого предложения по тендеру.",
        aliases: ["старт КП", "начало КП", "kp start"],
      },
      {
        field: "tender_KP_end",
        label: "Окончание подготовки КП",
        type: "date",
        description:
          "Дата завершения подготовки коммерческого предложения по тендеру.",
        aliases: ["финиш КП", "окончание КП", "kp end"],
      },
    ],
  },
};

