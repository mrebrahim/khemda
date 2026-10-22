/**
 * تحليل العنوان المكتوب بالإيد.
 *
 * العناوين مكتوبة بأشكال مختلفة: «١١٥ ش الطابونة د٥» و«115 شارع
 * الطابونه الدور الخامس» و«شارع الأمل متفرع من شارع الحبيبي».
 * الدالة دي بتطلّع منهم: الشارع، رقم البيت، الدور، والشارع الأصلي
 * اللي الشارع ده متفرع منه — عشان نقدر نجمع الشوارع المتجاورة.
 */

export type ParsedAddress = {
  /** اسم الشارع للعرض — زي «شارع الطابونة» */
  street: string | null;
  /** مفتاح التجميع — نفس الشارع بأي طريقة كتابة بيدّي نفس المفتاح */
  streetKey: string | null;
  /** الشارع الكبير اللي ده متفرع منه، لو مكتوب */
  parent: string | null;
  parentKey: string | null;
  /** رقم البيت */
  house: number | null;
  /** الدور */
  floor: number | null;
  /** الباقي: علامات مميزة زي «جمب صيدلية المروة» */
  landmark: string | null;
};

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** بيحوّل الأرقام العربية لإنجليزية عشان الحساب يشتغل */
export function latinDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

/** بيوحّد شكل الحروف عشان «الطابونه» و«الطابونة» يبقوا واحد */
export function normalize(input: string): string {
  return latinDigits(input)
    .replace(/[ًٌٍَُِّْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[–—]/g, "-")
    .replace(/-/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

const FLOOR_WORDS: Record<string, number> = {
  "الاول": 1,
  "الارضي": 0,
  "التاني": 2,
  "الثاني": 2,
  "التالت": 3,
  "الثالث": 3,
  "الرابع": 4,
  "الخامس": 5,
  "السادس": 6,
  "السابع": 7,
  "التامن": 8,
  "الثامن": 8,
  "التاسع": 9,
  "العاشر": 10,
};

const STREET_WORDS = new Set(["ش", "شارع", "حاره", "حارت"]);

/** كلمات بتقول إن اسم الشارع خلص */
const STOP = new Set([
  "من",
  "متفرع",
  "بجوار",
  "جمب",
  "امام",
  "قدام",
  "خلف",
  "عند",
  "ناصيه",
  "بعد",
  "الدور",
  "د",
  "اول",
  "تاني",
  "ثاني",
  "تالت",
  "خلف",
  "وراء",
  "قريب",
  "محل",
  "تفرع",
  "ناحيه",
  "طول",
  "صيدليه",
  "جامع",
  "كنيسه",
  "قهوه",
  "ارض",
  "عزبه",
  "منشيه",
  "حي",
  "الموازي",
  "موازي",
  "مدينه",
  "ترعه",
  "بارك",
  "شريفه",
  "الشريفه",
]);

/**
 * بياخد كلمات اسم الشارع لحد ما يلاقي كلمة بتقول إن الاسم خلص.
 * «عبد» بتتحسب مع اللي بعدها كلمة واحدة، عشان «عبد العليم عبد
 * اللطيف» ما يتقطعش في النص.
 */
function cleanTail(words: string[]): string[] {
  const out: string[] = [];
  let units = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (STOP.has(w) || STREET_WORDS.has(w)) break;
    if (/^\(|\)$|^-$|^\/$/.test(w)) break;

    out.push(w);
    if (w === "عبد" && words[i + 1] && !STOP.has(words[i + 1])) {
      out.push(words[i + 1]);
      i++;
    }
    units++;
    if (units >= 3) break;
  }
  return out;
}

/** بياخد اسم الشارع اللي بعد كلمة «ش» أو «شارع» أو «حارة» */
function streetAt(words: string[], i: number): { name: string; next: number } | null {
  const head = words[i];
  if (!STREET_WORDS.has(head)) return null;

  // «ش3» و«ش 3» — شوارع مرقّمة
  const rest = words.slice(i + 1);
  if (rest.length === 0) return null;

  const picked = cleanTail(rest);
  if (picked.length === 0) return null;

  const kind = head === "حاره" || head === "حارت" ? "حارة" : "شارع";
  return { name: `${kind} ${picked.join(" ")}`, next: i + 1 + picked.length };
}

/**
 * مفتاح التجميع. الشارع الواحد بيتكتب بأشكال كتير —
 * «ابو طالب» و«ابوطالب»، «محمد عبد اللطيف» و«محمد عبداللطيف» —
 * فبنشيل المسافات ونوحّد «عبد ال» و«ابو ال» عشان كلهم يدّوا مفتاح واحد.
 */
export function streetKeyOf(name: string | null): string | null {
  if (!name) return null;
  const key = normalize(name)
    .replace(/^(شارع|حاره|ش)\s+/, "")
    .replace(/^ال/, "")
    .replace(/\s+/g, "")
    .replace(/عبدال/g, "عبد")
    .replace(/ابوال/g, "ابو")
    .trim();
  return key || null;
}

export function parseAddress(raw: string | null | undefined): ParsedAddress {
  const empty: ParsedAddress = {
    street: null,
    streetKey: null,
    parent: null,
    parentKey: null,
    house: null,
    floor: null,
    landmark: null,
  };
  if (!raw || !raw.trim()) return empty;

  let text = normalize(raw);

  // اللي بين قوسين وصف مكان، مش جزء من اسم الشارع
  const notes: string[] = [];
  text = text
    .replace(/\(([^)]*)\)/g, (_m, inner: string) => {
      notes.push(String(inner).trim());
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();

  // الدور: «د٥» أو «د ٣» أو «الدور الرابع» أو «الدور 5»
  let floor: number | null = null;
  const floorWord = text.match(/الدور\s+([^\s]+)/);
  if (floorWord) {
    const w = floorWord[1];
    floor = FLOOR_WORDS[w] ?? (/^\d+$/.test(w) ? Number(w) : null);
    if (floor !== null) text = text.replace(floorWord[0], " ");
  }
  if (floor === null) {
    const floorShort = text.match(/(^|\s)د\s?(\d{1,2})(\s|$)/);
    if (floorShort) {
      floor = Number(floorShort[2]);
      text = text.replace(floorShort[0], " ");
    }
  }

  // رقم البيت: رقم في أول العنوان قبل اسم الشارع
  let house: number | null = null;
  const lead = text.match(/^(\d{1,4})\s*(?=ش|شارع|حاره|حارت|[^\d\s])/);
  if (lead) {
    house = Number(lead[1]);
    text = text.slice(lead[0].length).trim();
  }

  // الشوارع المرقّمة: «ش3» أو «ش 3»
  text = text.replace(/(^|\s)(ش|شارع)(\d+)/g, "$1$2 $3");

  const words = text.split(" ").filter(Boolean);

  // شارع البيت هو اللي جاي بعد رقم البيت على طول — سواء مكتوب
  // قبله «ش» أو «حارة» ولا مكتوب من غير أي كلمة.
  let street: string | null = null;
  let afterStreet = 0;

  const first = streetAt(words, 0);
  if (first) {
    street = first.name;
    afterStreet = first.next;
  } else {
    const picked = cleanTail(words);
    if (picked.length > 0) {
      street = picked.join(" ");
      afterStreet = picked.length;
    } else {
      // أول شارع مكتوب في أي مكان
      for (let i = 0; i < words.length; i++) {
        const hit = streetAt(words, i);
        if (hit) {
          street = hit.name;
          afterStreet = hit.next;
          break;
        }
      }
    }
  }

  // الشارع الكبير: اللي بعد «من» أو «متفرع من»
  let parent: string | null = null;
  const tail = words.slice(afterStreet);
  for (let i = 0; i < tail.length; i++) {
    if (tail[i] !== "من") continue;
    const hit = streetAt(tail, i + 1);
    if (hit) {
      parent = hit.name;
      break;
    }
    const picked = cleanTail(tail.slice(i + 1));
    if (picked.length > 0) parent = picked.join(" ");
    break;
  }

  // لو مفيش «من» بس العنوان فيه شارع تاني، نعتبره الشارع الكبير
  if (!parent) {
    for (let i = afterStreet; i < words.length; i++) {
      const hit = streetAt(words, i);
      if (hit) {
        parent = hit.name;
        break;
      }
    }
  }

  const landmarkWords = words.slice(afterStreet).filter((w) => w !== "من" && w !== "متفرع");
  const landmark = [landmarkWords.join(" "), ...notes].filter(Boolean).join(" • ") || null;

  const streetK = streetKeyOf(street);
  const parentK = streetKeyOf(parent);

  return {
    street,
    streetKey: streetK,
    parent: parentK && parentK !== streetK ? parent : null,
    parentKey: parentK && parentK !== streetK ? parentK : null,
    house,
    floor,
    landmark,
  };
}

/** ترتيب: البيوت بالرقم، واللي من غير رقم في الآخر */
export function byHouse(
  a: { house?: number | null },
  b: { house?: number | null },
): number {
  const x = a.house ?? null;
  const y = b.house ?? null;
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x - y;
}

/**
 * ترتيب الشوارع بحيث الشارع الكبير يجي ورا بعضه مع المتفرّع منه،
 * فالخادم يمشي خط واحد.
 */
export function clusterKey(g: { key: string; parentKey: string | null }): string {
  return `${g.parentKey ?? g.key}|${g.parentKey ? "1" : "0"}|${g.key}`;
}
