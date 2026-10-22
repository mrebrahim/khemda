import "server-only";

/**
 * التحدي والمهمة اللي بيتطلبوا من الولد بعد ما يمسح كود الصندوق.
 *
 * الملف ده سيرفر بس — الإجابات الصح مش بتنزل للمتصفح خالص،
 * عشان الولد ما يقدرش يشوفها من كود الصفحة.
 */

/* ── ١) التحدي: لازم يعدّيه عشان يفتح الصندوق ───────────── */

export type Question = {
  /** مفتاح ثابت — بيتبعت للمتصفح بدل الإجابة */
  key: string;
  kind: "faith" | "riddle";
  q: string;
  choices: readonly string[];
  /** رقم الإجابة الصح في choices */
  answer: number;
  /** كلمة حلوة بعد الإجابة الصح */
  note?: string;
};

/**
 * أسئلة الإيمان: حاجات أساسية بيعرفها ولد إعدادي من مدارس
 * الأحد. بعدنا عن أي رقم فيه خلاف بين المراجع.
 */
const FAITH: readonly Question[] = [
  {
    key: "f_gospels",
    kind: "faith",
    q: "الأناجيل كام إنجيل؟",
    choices: ["٣", "٤", "٧"],
    answer: 1,
    note: "متى ومرقس ولوقا ويوحنا 📖",
  },
  {
    key: "f_disciples",
    kind: "faith",
    q: "تلاميذ المسيح كانوا كام؟",
    choices: ["٧", "١٠", "١٢"],
    answer: 2,
  },
  {
    key: "f_sacraments",
    kind: "faith",
    q: "أسرار الكنيسة كام سر؟",
    choices: ["٥", "٧", "٩"],
    answer: 1,
    note: "المعمودية والميرون والتناول والتوبة ومسحة المرضى والزيجة والكهنوت ✨",
  },
  {
    key: "f_mark",
    kind: "faith",
    q: "مين اللي بشّر بالمسيحية في مصر وأسّس الكنيسة القبطية؟",
    choices: ["مار مرقس الرسول", "القديس بولس", "القديس بطرس"],
    answer: 0,
  },
  {
    key: "f_first_miracle",
    kind: "faith",
    q: "أول معجزة عملها السيد المسيح كانت فين؟",
    choices: ["في عرس قانا الجليل", "على بحر طبرية", "في أورشليم"],
    answer: 0,
    note: "حوّل الماء لخمر 🍇",
  },
  {
    key: "f_bethlehem",
    kind: "faith",
    q: "السيد المسيح اتولد فين؟",
    choices: ["الناصرة", "بيت لحم", "أورشليم"],
    answer: 1,
  },
  {
    key: "f_psalms",
    kind: "faith",
    q: "سفر المزامير فيه كام مزمور؟",
    choices: ["١٠٠", "١٥٠", "٢٠٠"],
    answer: 1,
  },
  {
    key: "f_stephen",
    kind: "faith",
    q: "مين أول شهيد في المسيحية؟",
    choices: ["القديس استفانوس", "القديس مار جرجس", "القديس مينا"],
    answer: 0,
  },
  {
    key: "f_jonah",
    kind: "faith",
    q: "يونان النبي فضل في بطن الحوت كام يوم؟",
    choices: ["يوم واحد", "٣ أيام", "٧ أيام"],
    answer: 1,
  },
  {
    key: "f_lords_prayer",
    kind: "faith",
    q: "الصلاة اللي علّمها المسيح لتلاميذه بتبدأ إزاي؟",
    choices: ["قدوس قدوس قدوس", "أبانا الذي في السموات", "السلام لكِ يا مريم"],
    answer: 1,
  },
  {
    key: "f_goliath",
    kind: "faith",
    q: "مين اللي غلب جليات الجبار وهو لسه صغير؟",
    choices: ["شمشون", "داود", "يوشع"],
    answer: 1,
    note: "بمقلاع وخمس حجارة 🪨",
  },
  {
    key: "f_redsea",
    kind: "faith",
    q: "مين اللي شقّ البحر الأحمر وعدّى بشعب الله؟",
    choices: ["إبراهيم", "موسى النبي", "إيليا"],
    answer: 1,
  },
  {
    key: "f_noah",
    kind: "faith",
    q: "مين اللي بنى الفلك ونجّى الحيوانات من الطوفان؟",
    choices: ["نوح", "لوط", "يعقوب"],
    answer: 0,
  },
  {
    key: "f_resurrection",
    kind: "faith",
    q: "المسيح قام من الأموات في اليوم الكام؟",
    choices: ["اليوم التاني", "اليوم التالت", "اليوم السابع"],
    answer: 1,
    note: "الحقيقة هي قام 🌅",
  },
  {
    key: "f_lent",
    kind: "faith",
    q: "الصوم الكبير مدته كام يوم في كنيستنا؟",
    choices: ["٤٠ يوم", "٥٥ يوم", "٦٠ يوم"],
    answer: 1,
  },
  {
    key: "f_trinity",
    kind: "faith",
    q: "«باسم الآب والابن و…» — كمّل",
    choices: ["الروح القدس", "الملائكة", "القديسين"],
    answer: 0,
  },
  {
    key: "f_annunciation",
    kind: "faith",
    q: "مين الملاك اللي بشّر العذراء مريم؟",
    choices: ["ميخائيل", "غبريال", "رافائيل"],
    answer: 1,
  },
  {
    key: "f_bible_parts",
    kind: "faith",
    q: "الكتاب المقدس بينقسم لكام عهد؟",
    choices: ["عهدين", "٣ عهود", "٤ عهود"],
    answer: 0,
    note: "العهد القديم والعهد الجديد 📖",
  },
];

/** ألغاز خفيفة — مش كل مرة سؤال دين، عشان يفضل ممتع */
const RIDDLES: readonly Question[] = [
  {
    key: "r_candle",
    kind: "riddle",
    q: "كل ما تاخد منه، يكبر. إيه هو؟",
    choices: ["الشمعة", "الحفرة", "الكتاب"],
    answer: 1,
  },
  {
    key: "r_shadow",
    kind: "riddle",
    q: "بيمشي معاك في الشمس ويسيبك في الضلمة. مين؟",
    choices: ["صاحبك", "ضلّك", "صوتك"],
    answer: 1,
  },
  {
    key: "r_12",
    kind: "riddle",
    q: "لو عندك ١٢ شمعة وطفيت ٤، هيفضل عندك كام في الآخر؟",
    choices: ["٤", "٨", "١٢"],
    answer: 0,
    note: "اللي طفيوهم بس همّ اللي هيفضلوا — الباقي هيخلص 🕯️",
  },
  {
    key: "r_month",
    kind: "riddle",
    q: "كام شهر في السنة فيه ٢٨ يوم؟",
    choices: ["شهر واحد", "كلهم", "شهرين"],
    answer: 1,
  },
  {
    key: "r_updown",
    kind: "riddle",
    q: "بيطلع ومابينزلش أبدًا. إيه هو؟",
    choices: ["سنّك", "المطر", "الأسانسير"],
    answer: 0,
  },
  {
    key: "r_hole",
    kind: "riddle",
    q: "أنا مليان حروف من غير ما أتكلم. إيه أنا؟",
    choices: ["الكتاب", "الراديو", "التليفون"],
    answer: 0,
  },
];

const ALL_QUESTIONS: readonly Question[] = [...FAITH, ...RIDDLES];

const BY_KEY = new Map(ALL_QUESTIONS.map((q) => [q.key, q]));

/** السؤال من غير الإجابة — ده اللي بينزل للمتصفح */
export type PublicQuestion = {
  key: string;
  kind: Question["kind"];
  q: string;
  choices: readonly string[];
};

function strip(q: Question): PublicQuestion {
  return { key: q.key, kind: q.kind, q: q.q, choices: q.choices };
}

/** بيختار سؤال عشوائي، وبيتجنّب اللي الولد جاوبه غلط دلوقتي */
export function pickQuestion(exclude: readonly string[] = []): PublicQuestion {
  const pool = ALL_QUESTIONS.filter((q) => !exclude.includes(q.key));
  const list = pool.length > 0 ? pool : ALL_QUESTIONS;
  return strip(list[Math.floor(Math.random() * list.length)]);
}

export type AnswerCheck = { ok: boolean; note?: string };

export function checkAnswer(key: string, choice: number): AnswerCheck {
  const q = BY_KEY.get(key);
  if (!q) return { ok: false };
  return q.answer === choice ? { ok: true, note: q.note } : { ok: false };
}

/* ── ٢) مهمة البيت: بونص بيتأكّد من والديه ──────────────── */

export type HomeMission = {
  key: string;
  icon: string;
  label: string;
  /** شرح بسيط للولد */
  how: string;
  bonusXp: number;
};

/**
 * كل المهمات بتقول «والديك» ومابتسمّيش بابا أو ماما —
 * فيه ولاد فقدوا واحد منهم، والمهمة لازم تفضل حلوة لكل ولد.
 * وكلها جوّه البيت ومن غير تصوير ولا خروج.
 */
export const HOME_MISSIONS: readonly HomeMission[] = [
  {
    key: "help",
    icon: "🤝",
    label: "ساعد والديك في حاجة",
    how: "شيل معاهم، رتّب السفرة، اغسل الأطباق — أي حاجة تريّحهم النهارده.",
    bonusXp: 4,
  },
  {
    key: "love",
    icon: "❤️",
    label: "قول لوالديك «بحبك»",
    how: "روح لهم وقولها في وشهم، مش رسالة. ولو عندك إخوات قولها لهم كمان.",
    bonusXp: 3,
  },
  {
    key: "room",
    icon: "🧹",
    label: "روّق أوضتك",
    how: "رتّب سريرك ومكتبك وشيل اللي على الأرض، من غير ما حد يقولك.",
    bonusXp: 4,
  },
  {
    key: "sibling",
    icon: "🧒",
    label: "اعمل حاجة حلوة لأخوك أو أختك",
    how: "ذاكر معاه، إلعب معاه اللي هو عايزه، أو سيبله اللي بتتخانقوا عليه.",
    bonusXp: 3,
  },
  {
    key: "pray",
    icon: "🙏",
    label: "صلّي مع والديك",
    how: "اقرا مزمور أو صلّوا مع بعض قبل النوم.",
    bonusXp: 3,
  },
  {
    key: "sorry",
    icon: "🕊️",
    label: "صالح حد زعلان منك",
    how: "لو زعّلت حد في البيت، روح اعتذر من غير ما تستنى هو يبدأ.",
    bonusXp: 4,
  },
];

const MISSION_BY_KEY = new Map(HOME_MISSIONS.map((m) => [m.key, m]));

export function missionOf(key: string): HomeMission | null {
  return MISSION_BY_KEY.get(key) ?? null;
}

/** تلات مهمات يختار منهم — بتتغيّر كل مرة */
export function pickMissions(count = 3): HomeMission[] {
  const pool = [...HOME_MISSIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
