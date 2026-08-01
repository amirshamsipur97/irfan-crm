"use client";

import { useEffect, useState } from "react";
import { Surface } from "@/components/shell/AppChrome";

type Lang = "fa" | "en" | "ru";

const LANGS: { key: Lang; label: string }[] = [
  { key: "fa", label: "فارسی" },
  { key: "en", label: "English" },
  { key: "ru", label: "Русский" },
];

const STORE_KEY = "crm-help-lang";

interface Step {
  title: string;
  desc: string;
}
interface Card {
  title: string;
  body: string;
}
interface Dict {
  heroTitle: string;
  heroSub: string;
  funnelTitle: string;
  steps: Step[];
  boardsTitle: string;
  cards: Card[];
  mathTitle: string;
  mathPrice: string;
  mathPercent: string;
  mathTarget: string;
  mathParts: string;
  mathComplete: string;
  mathInvoice: string;
  rolesTitle: string;
  roleCols: [string, string];
  roles: [string, string][];
  tipsTitle: string;
  tips: string[];
}

const DICT: Record<Lang, Dict> = {
  fa: {
    heroTitle: "راهنمای استفاده از CRM",
    heroSub:
      "کل سیستم یک داستان واحد را دنبال می‌کند: از ثبت لید تا وصول پیش‌پرداخت و ارسال فاکتور به شرکت سازنده. هر بورد یک مرحله از همین مسیر است.",
    funnelTitle: "گردش کار فروش",
    steps: [
      { title: "لید", desc: "سرنخ جدید ثبت می‌شود: فرم سایت، تبلیغات، معرفی همکار." },
      { title: "مخاطب = تقاضا", desc: "با Move to contact مشتری همراه خواسته و بودجه‌اش ثبت می‌شود." },
      { title: "پیشنهادها", desc: "برای هر مشتری یک یا چند پیشنهاد قیمت‌گذاری‌شده می‌سازید." },
      { title: "معامله", desc: "پیشنهاد پذیرفته‌شده با Move to deal به بورد Deals می‌رود." },
      { title: "پیش‌پرداخت", desc: "درصد، مبلغ محاسبه‌شده و پرداخت‌های Part 1, Part 2 تا تکمیل." },
      { title: "فاکتور", desc: "بعد از تکمیل، فاکتور را برای شرکت سازنده بفرستید و علامت بزنید." },
    ],
    boardsTitle: "بوردها",
    cards: [
      { title: "Leads", body: "فقط ثبت سرنخ: نام، تلفن با کد کشور، ایمیل، منبع و توضیح. وقتی مشتری جدی شد دکمهٔ Move to contact را بزنید." },
      { title: "Contacts", body: "تقاضای مشتری: نوع ملک، متراژ، بودجه و منطقه. مدارک (پاسپورت و…) در کشوی هر ردیف بارگذاری می‌شود و از همان‌جا پیشنهاد جدید می‌سازید. هر مخاطب یک کد یکتای C-0001 دارد." },
      { title: "Offers", body: "ستون اول خودِ مشتری است و از Contacts انتخاب می‌شود. شرکت سازنده، نوع و متراژ و قیمت پیشنهاد را پر کنید؛ ستون vs budget می‌گوید در بودجه هست یا نه. با پذیرش مشتری، Move to deal را بزنید." },
      { title: "Deals", body: "پیشنهادهای پذیرفته‌شده. درصد پیش‌پرداخت را تنظیم کنید (از پیش‌فرض شرکت پر می‌شود)، پرداخت‌ها را در پنل Payments به‌صورت Part ثبت کنید و بعد از Complete دکمهٔ Send invoice to developer را بزنید." },
      { title: "Accounts (شرکت‌ها)", body: "شرکت‌های سازنده. ستون Downpayment % درصد مرسوم هر شرکت است و موقع پذیرش پیشنهاد خودکار روی معامله می‌نشیند." },
      { title: "Viewings و Activities", body: "بازدیدها را با تاریخ و وضعیت برنامه‌ریزی کنید؛ تماس‌ها، جلسه‌ها و یادداشت‌ها را با دکمهٔ + روی تایم‌لاین هر ردیف ثبت کنید." },
      { title: "پیام‌ها", body: "آیکن صندوق در نوار بالا: گفتگوی مستقیم با اعضای تیم، با نشان تعداد نخوانده. ارسال با Enter." },
      { title: "نوتیفیکیشن‌ها", body: "زنگ نوار بالا: واگذاری ردیف‌ها، تغییر استیج و رویدادهای رزرو. پیام‌ها این‌جا تکرار نمی‌شوند." },
    ],
    mathTitle: "حساب پیش‌پرداخت (مثال)",
    mathPrice: "قیمت پیشنهاد",
    mathPercent: "درصد پیش‌پرداخت",
    mathTarget: "مبلغ پیش‌پرداخت",
    mathParts: "پرداخت‌ها",
    mathComplete: "تکمیل شد",
    mathInvoice: "ارسال فاکتور به شرکت",
    rolesTitle: "نقش‌ها و دسترسی‌ها",
    roleCols: ["نقش", "دسترسی"],
    roles: [
      ["Developer", "کنترل کامل سیستم: تنظیمات، نقش‌ها، حذف‌ها"],
      ["CEO", "دسترسی کامل کسب‌وکار: عملیات، مالی، تیم"],
      ["Media", "ویرایش همهٔ بوردهای کاری، بدون دادهٔ مالی"],
      ["Manager", "مدیریت فروش: ویرایش همهٔ بوردهای کاری"],
      ["Agent", "کار روی لیدها و معامله‌های خودش؛ بقیه فقط‌خواندنی"],
      ["Finance", "تراکنش‌ها، پرداخت‌ها و کمیسیون‌ها"],
    ],
    tipsTitle: "نکته‌ها",
    tips: [
      "هر مخاطب یک کد یکتا مثل C-0001 دارد؛ افراد هم‌نام هرگز با هم اشتباه نمی‌شوند.",
      "با تکمیل پیش‌پرداخت، نشان سبز Deal done روی لید، مخاطب و پیشنهادِ همان مشتری می‌نشیند.",
      "بیشتر ویرایش‌ها یک پیام تأیید با دکمهٔ Undo دارند.",
      "دکمه‌های Search و Person و Filter در بالای هر بورد نتیجه‌ها را محدود می‌کنند.",
      "عضو جدید خودش ثبت‌نام می‌کند؛ ادمین در صفحهٔ Team تأیید می‌کند و رمز موقت یک‌بارمصرف تحویل می‌دهد.",
    ],
  },
  en: {
    heroTitle: "How to use this CRM",
    heroSub:
      "The whole system follows one story: from capturing a lead to collecting the downpayment and invoicing the developer. Every board is one step of that path.",
    funnelTitle: "The sales flow",
    steps: [
      { title: "Lead", desc: "A new enquiry arrives: website form, ads, or a referral." },
      { title: "Contact = Demand", desc: "Move to contact stores the client with what they want and their budget." },
      { title: "Offers", desc: "Build one or more priced offers for each client." },
      { title: "Deal", desc: "The accepted offer moves to the Deals board via Move to deal." },
      { title: "Downpayment", desc: "Percent, computed amount, and Part 1, Part 2 payments until complete." },
      { title: "Invoice", desc: "Once complete, send the invoice to the developer and mark it." },
    ],
    boardsTitle: "The boards",
    cards: [
      { title: "Leads", body: "Capture only: name, phone with country code, email, source and notes. When the client is serious, press Move to contact." },
      { title: "Contacts", body: "The client's demand: property type, size, budget, area. Upload documents from the row's drawer and create a new sales offer right there. Every contact carries a unique C-0001 code." },
      { title: "Offers", body: "The first column IS the client, picked from Contacts. Fill the developer, offer type, size and price; vs budget shows whether it fits. When the client accepts, press Move to deal." },
      { title: "Deals", body: "Accepted offers. Set the downpayment percent (prefilled from the developer), record Part payments in the Payments panel, and after Complete press Send invoice to developer." },
      { title: "Accounts (developers)", body: "The developer companies. The Downpayment % column is each company's customary rate — it prefills the deal when an offer is accepted." },
      { title: "Viewings & Activities", body: "Schedule property viewings with date and status; log calls, meetings and notes with the + button on any row's timeline." },
      { title: "Messages", body: "The inbox icon in the top bar: direct chat with teammates, with an unread badge. Enter sends." },
      { title: "Notifications", body: "The top-bar bell: row assignments, stage moves and reservation events. Messages never repeat here." },
    ],
    mathTitle: "Downpayment maths (example)",
    mathPrice: "Offer price",
    mathPercent: "Downpayment %",
    mathTarget: "Downpayment",
    mathParts: "Payments",
    mathComplete: "Complete",
    mathInvoice: "Send invoice to developer",
    rolesTitle: "Roles & access",
    roleCols: ["Role", "Access"],
    roles: [
      ["Developer", "Full system control: settings, roles, deletes"],
      ["CEO", "Full business access: operations, finance, team"],
      ["Media", "Edits all work boards, no financial data"],
      ["Manager", "Sales management: edits all work boards"],
      ["Agent", "Works own leads and deals; team read-only"],
      ["Finance", "Transactions, payments and commissions"],
    ],
    tipsTitle: "Tips",
    tips: [
      "Every contact gets a unique code like C-0001 — same-named people never mix.",
      "When a downpayment completes, the green Deal done badge appears on that client's lead, contact and offer.",
      "Most edits show a confirmation toast with Undo.",
      "Search, Person and Filter at the top of every board narrow the results.",
      "New members sign up themselves; an admin approves them on the Team page and hands over a one-time temporary password.",
    ],
  },
  ru: {
    heroTitle: "Как пользоваться этой CRM",
    heroSub:
      "Вся система следует одной истории: от захвата лида до сбора первоначального взноса и счёта застройщику. Каждая доска — это один шаг этого пути.",
    funnelTitle: "Процесс продажи",
    steps: [
      { title: "Лид", desc: "Поступает новый запрос: форма сайта, реклама или рекомендация." },
      { title: "Контакт = запрос", desc: "Move to contact сохраняет клиента вместе с его пожеланиями и бюджетом." },
      { title: "Предложения", desc: "Для каждого клиента создаётся одно или несколько предложений с ценой." },
      { title: "Сделка", desc: "Принятое предложение переходит на доску Deals через Move to deal." },
      { title: "Первый взнос", desc: "Процент, рассчитанная сумма и платежи Part 1, Part 2 до полного сбора." },
      { title: "Счёт", desc: "После завершения отправьте счёт застройщику и отметьте это." },
    ],
    boardsTitle: "Доски",
    cards: [
      { title: "Leads", body: "Только захват: имя, телефон с кодом страны, email, источник и заметки. Когда клиент серьёзен — нажмите Move to contact." },
      { title: "Contacts", body: "Запрос клиента: тип недвижимости, площадь, бюджет, район. Документы загружаются в панели строки, там же создаётся новое предложение. У каждого контакта уникальный код C-0001." },
      { title: "Offers", body: "Первая колонка — это сам клиент, выбранный из Contacts. Заполните застройщика, тип, площадь и цену; vs budget показывает, вписывается ли предложение в бюджет. При согласии клиента нажмите Move to deal." },
      { title: "Deals", body: "Принятые предложения. Установите процент взноса (заполняется по умолчанию от застройщика), фиксируйте платежи Part в панели Payments, а после Complete нажмите Send invoice to developer." },
      { title: "Accounts (застройщики)", body: "Компании-застройщики. Колонка Downpayment % — обычная ставка каждой компании; она автоматически подставляется в сделку." },
      { title: "Viewings и Activities", body: "Планируйте показы с датой и статусом; фиксируйте звонки, встречи и заметки кнопкой + на таймлайне строки." },
      { title: "Сообщения", body: "Значок входящих в верхней панели: прямой чат с коллегами, со счётчиком непрочитанных. Enter отправляет." },
      { title: "Уведомления", body: "Колокольчик в верхней панели: назначения строк, смены этапов и события брони. Сообщения здесь не дублируются." },
    ],
    mathTitle: "Расчёт первого взноса (пример)",
    mathPrice: "Цена предложения",
    mathPercent: "Процент взноса",
    mathTarget: "Первый взнос",
    mathParts: "Платежи",
    mathComplete: "Завершено",
    mathInvoice: "Отправить счёт застройщику",
    rolesTitle: "Роли и доступ",
    roleCols: ["Роль", "Доступ"],
    roles: [
      ["Developer", "Полный контроль системы: настройки, роли, удаления"],
      ["CEO", "Полный бизнес-доступ: операции, финансы, команда"],
      ["Media", "Редактирует все рабочие доски, без финансовых данных"],
      ["Manager", "Управление продажами: редактирует все рабочие доски"],
      ["Agent", "Работает со своими лидами и сделками; остальное только чтение"],
      ["Finance", "Транзакции, платежи и комиссии"],
    ],
    tipsTitle: "Советы",
    tips: [
      "У каждого контакта уникальный код вида C-0001 — тёзки никогда не перепутаются.",
      "Когда взнос собран, зелёный значок Deal done появляется на лиде, контакте и предложении этого клиента.",
      "Большинство правок показывают подтверждение с кнопкой Undo.",
      "Search, Person и Filter вверху каждой доски сужают результаты.",
      "Новые участники регистрируются сами; админ подтверждает их на странице Team и передаёт одноразовый временный пароль.",
    ],
  },
};

const STEP_COLORS = ["#579bfc", "#00a0a0", "#a25ddc", "#00c875", "#fdab3d", "#e8853d"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 pb-[12px] pt-[32px] font-display text-[20px] font-medium leading-[28px] tracking-[-0.2px] text-ink">
      {children}
    </h2>
  );
}

export function HelpGuide() {
  const [lang, setLang] = useState<Lang>("fa");

  // restore the reader's language after mount — reading localStorage during
  // render would make the server and client HTML disagree, so this one-time
  // sync from an external store has to live in an effect
  useEffect(() => {
    const stored = window.localStorage.getItem(STORE_KEY) as Lang | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored && LANGS.some((l) => l.key === stored)) setLang(stored);
  }, []);

  const pick = (l: Lang) => {
    setLang(l);
    window.localStorage.setItem(STORE_KEY, l);
  };

  const t = DICT[lang];
  const rtl = lang === "fa";

  return (
    <Surface>
      <div className="thin-scroll h-full overflow-y-auto bg-white">
        <div className="mx-auto max-w-[980px] px-[32px] pb-[64px] pt-[28px]" dir={rtl ? "rtl" : "ltr"}>
          {/* language switch */}
          <div className="flex justify-end gap-[6px]" dir="ltr">
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => pick(l.key)}
                className={`h-[32px] rounded-[16px] px-[14px] font-sans text-[13.5px] transition-colors ${
                  lang === l.key
                    ? "bg-teal-deep text-white"
                    : "bg-canvas text-ink hover:bg-[var(--hover-ghost)]"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* hero */}
          <h1 className="m-0 pt-[8px] font-display text-[30px] font-medium leading-[40px] tracking-[-0.4px] text-ink">
            {t.heroTitle}
          </h1>
          <p className="m-0 max-w-[640px] pt-[8px] font-sans text-[15px] leading-[24px] text-ink-muted">
            {t.heroSub}
          </p>

          {/* funnel diagram */}
          <SectionTitle>{t.funnelTitle}</SectionTitle>
          <div className="rounded-[12px] border border-line bg-canvas p-[20px]">
            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
              {t.steps.map((s, i) => (
                <div
                  key={s.title}
                  className="relative flex gap-[12px] rounded-[10px] border border-line bg-white p-[14px]"
                >
                  <span
                    className="flex size-[30px] shrink-0 items-center justify-center rounded-full font-sans text-[14px] font-semibold text-white"
                    style={{ backgroundColor: STEP_COLORS[i] }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-[14.5px] font-semibold leading-[21px] text-ink">
                      {s.title}
                    </span>
                    <span className="block pt-[2px] font-sans text-[13px] leading-[19px] text-ink-muted">
                      {s.desc}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {/* the same flow as one line, for the shape of it */}
            <div className="mt-[16px] flex flex-wrap items-center gap-[6px]" >
              {t.steps.map((s, i) => (
                <span key={s.title} className="flex items-center gap-[6px]">
                  <span
                    className="rounded-[12px] px-[10px] py-[3px] font-sans text-[12.5px] font-medium text-white"
                    style={{ backgroundColor: STEP_COLORS[i] }}
                  >
                    {s.title}
                  </span>
                  {i < t.steps.length - 1 && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="#676879"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={rtl ? "rotate-180" : ""}
                      aria-hidden
                    >
                      <path d="M4 2.5L9 7l-5 4.5" />
                    </svg>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* downpayment example */}
          <SectionTitle>{t.mathTitle}</SectionTitle>
          <div className="rounded-[12px] border border-line bg-white p-[20px]">
            <div className="flex flex-wrap items-center gap-[10px] font-sans text-[14px] text-ink">
              <span className="rounded-[8px] bg-canvas px-[12px] py-[6px]">
                {t.mathPrice}: <b>100,000 OMR</b>
              </span>
              <span className="text-ink-muted">×</span>
              <span className="rounded-[8px] bg-canvas px-[12px] py-[6px]">
                {t.mathPercent}: <b>20%</b>
              </span>
              <span className="text-ink-muted">=</span>
              <span className="rounded-[8px] bg-cyan-tint px-[12px] py-[6px]">
                {t.mathTarget}: <b>20,000 OMR</b>
              </span>
            </div>
            <div className="pt-[16px]">
              <p className="m-0 pb-[6px] font-sans text-[13px] text-ink-muted">{t.mathParts}</p>
              <div className="flex h-[14px] w-full max-w-[520px] overflow-hidden rounded-[7px] bg-line-soft">
                <span className="h-full w-[25%] bg-[#00a0a0]" title="Part 1 — 5,000" />
                <span className="h-full w-[75%] bg-[#00c875]" title="Part 2 — 15,000" />
              </div>
              <div className="flex max-w-[520px] justify-between pt-[6px] font-sans text-[12.5px] text-ink-muted">
                <span>Part 1 · 5,000</span>
                <span>Part 2 · 15,000</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-[10px] pt-[14px]">
              <span className="rounded-[12px] bg-[#00c875] px-[10px] py-[3px] font-sans text-[12.5px] font-medium text-white">
                ✓ {t.mathComplete}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#676879"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={rtl ? "rotate-180" : ""}
                aria-hidden
              >
                <path d="M4 2.5L9 7l-5 4.5" />
              </svg>
              <span className="rounded-[6px] bg-[#fdab3d] px-[12px] py-[5px] font-sans text-[13px] font-medium text-white">
                {t.mathInvoice}
              </span>
            </div>
          </div>

          {/* boards */}
          <SectionTitle>{t.boardsTitle}</SectionTitle>
          <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
            {t.cards.map((c) => (
              <div key={c.title} className="rounded-[12px] border border-line bg-white p-[16px]">
                <p className="m-0 font-sans text-[15px] font-semibold leading-[22px] text-ink">
                  {c.title}
                </p>
                <p className="m-0 pt-[4px] font-sans text-[13.5px] leading-[21px] text-ink-muted">
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          {/* roles */}
          <SectionTitle>{t.rolesTitle}</SectionTitle>
          <div className="overflow-hidden rounded-[12px] border border-line">
            <table className="w-full border-collapse font-sans text-[13.5px]">
              <thead>
                <tr>
                  {t.roleCols.map((h) => (
                    <th
                      key={h}
                      className={`border-b border-line bg-canvas px-[14px] py-[9px] font-semibold text-ink-muted ${rtl ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.roles.map(([role, access]) => (
                  <tr key={role} className="border-b border-line-soft last:border-b-0">
                    <td className="w-[150px] px-[14px] py-[8px] font-medium text-ink">{role}</td>
                    <td className="px-[14px] py-[8px] text-ink-muted">{access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* tips */}
          <SectionTitle>{t.tipsTitle}</SectionTitle>
          <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
            {t.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-[8px] font-sans text-[13.5px] leading-[21px] text-ink">
                <span className="mt-[7px] size-[6px] shrink-0 rounded-full bg-teal-deep" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Surface>
  );
}
