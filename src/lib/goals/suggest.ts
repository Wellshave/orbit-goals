import type { T } from "@/lib/i18n";
import type { GoalFormat, RoutinePeriod } from "@/lib/types";
import type { CategoryKey } from "./formats";

export interface Suggestion {
  format: GoalFormat;
  icon?: string;
  category?: CategoryKey;
  /** Hoeveelheid bij "iets bereiken" (bijv. 21,1 km) of target bij "een getal halen". */
  quantity?: number;
  unit?: string;
  quantityLabel?: string;
  successCriteria?: string;
  eventDate?: string;
  startValue?: number;
  valueKind?: "number" | "time";
  targetTimeS?: number;
  direction?: "higher" | "lower";
  habit?: { times: number; period: RoutinePeriod };
  routine?: { name: string; times: number; period: RoutinePeriod; unit: string };
  milestones?: { name: string; value?: number }[];
}

const WORD_NUM: Record<string, number> = { een: 1, één: 1, one: 1, twee: 2, two: 2, drie: 3, three: 3, vier: 4, four: 4, vijf: 5, five: 5, zes: 6, six: 6, zeven: 7, seven: 7, acht: 8, eight: 8, negen: 9, nine: 9, tien: 10, ten: 10 };
const MONTHS: Record<string, number> = { januari: 1, january: 1, februari: 2, february: 2, maart: 3, march: 3, april: 4, mei: 5, may: 5, juni: 6, june: 6, juli: 7, july: 7, augustus: 8, august: 8, september: 9, oktober: 10, october: 10, november: 11, december: 12 };

const parseNum = (s: string) => { const n = Number(s.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const numOrWord = (s: string) => (s in WORD_NUM ? WORD_NUM[s] : parseNum(s));
const fmtKm = (n: number) => String(n).replace(".", ",");

/** Herkent een datum die de gebruiker zelf in de titel typt ("11 oktober 2026", "11-10-2026"). Er worden geen data verzonnen. */
function findDate(text: string): string | undefined {
  const a = text.match(/\b(\d{1,2})\s+([a-zé]+)\s+(\d{4})\b/);
  if (a && MONTHS[a[2]]) return `${a[3]}-${String(MONTHS[a[2]]).padStart(2, "0")}-${a[1].padStart(2, "0")}`;
  const b = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (b) return `${b[3]}-${b[2].padStart(2, "0")}-${b[1].padStart(2, "0")}`;
  return undefined;
}

function category(text: string): CategoryKey | undefined {
  if (/(marathon|hardlo|rennen|\brun|fiets|zwem|sport|fitness|gym|trainen|afvallen|gezond|wandel|\bkm\b|kilometer|triatlon|triathlon|yoga)/.test(text)) return "sport";
  if (/(medit|slapen|slaap|rust|mindful|welzijn|stress|dankbaar)/.test(text)) return "wellbeing";
  if (/(lezen|boek lezen|cursus|certificaat|diploma|examen|studie|leren|taal|rijbewijs|opleiding|\bread)/.test(text)) return "learning";
  if (/(schrijven|boek schrijven|schilder|muziek|gitaar|piano|creatie|podcast|tekenen)/.test(text)) return "creativity";
  if (/(sparen|spaar|schuld|aflossen|beleggen|budget)/.test(text)) return "money";
  if (/(omzet|revenue|€|euro|marge|winst)/.test(text)) return "revenue";
  if (/(klanttevreden|klanten|nps|reviews?|retentie|herhaalaankoop|reactietijd|klantenservice|support)/.test(text)) return "customers";
  if (/(creators?|influencers?|campagne|content|ads|advert|roas|video|posts?|social|marketing|conversie)/.test(text)) return "marketing";
  if (/(leads|deals|sales|verkoop|offertes)/.test(text)) return "sales";
  if (/(webshop|product|lanceren|launch|introduc|feature|release)/.test(text)) return "product";
  if (/(verhuiz|logistiek|voorraad|proces|operations|levertijd|magazijn)/.test(text)) return "operations";
  return undefined;
}

function sportIcon(text: string): string {
  if (/fiets|bike|cycl/.test(text)) return "bike";
  if (/gym|fitness|kracht|dumbbell/.test(text)) return "dumbbell";
  return "run";
}

/**
 * Stelt op basis van de titel een doelvorm en startwaarden voor. Dit is altijd een voorstel:
 * de wizard toont het expliciet en neemt niets over zonder klik van de gebruiker.
 */
export function suggestFromTitle(raw: string, t: T): Suggestion | null {
  const text = raw.toLowerCase().trim();
  if (text.length < 4) return null;
  const cat = category(text);
  const eventDate = findDate(text);

  // 1. Gewoonte: "drie keer per week hardlopen", "iedere werkdag mediteren"
  const freq = text.match(/(\d+|een|één|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:x|keer|maal|times)?\s*(?:per|a|each|every)\s*(dag|day|week|maand|month)/);
  const everyDay = /(elke|iedere|every)\s+(werk)?dag|dagelijks|daily|every (work)?day/.test(text);
  if (freq || everyDay) {
    const period: RoutinePeriod = freq ? (/(dag|day)/.test(freq[2]) ? "day" : /(maand|month)/.test(freq[2]) ? "month" : "week") : /werkdag|workday/.test(text) ? "week" : "day";
    const times = freq ? numOrWord(freq[1]) : /werkdag|workday/.test(text) ? 5 : 1;
    return { format: "habit", icon: cat === "sport" ? sportIcon(text) : cat === "learning" ? "book" : cat === "wellbeing" ? "heart" : "repeat", category: cat ?? "growth", habit: { times: Number.isFinite(times) && times > 0 ? times : 3, period } };
  }

  // 2. Verbeteren: "halve marathon binnen twee uur", "reactietijd verlagen naar vier uur", "conversie verhogen naar 5%"
  const within = text.match(/(?:binnen|onder|within|under|sub)\s*(?:de\s*)?(\d+[.,]?\d*|een|één|twee|drie|vier|vijf|zes|two|three|four|five)\s*(uur|u\b|hours?|minuten|min|minutes?)/);
  const toward = text.match(/(verlagen|verminderen|omlaag|reduce|lower|verhogen|verbeteren|omhoog|increase|improve|raise)[^0-9€]*?(?:naar|tot|to)\s*(€)?\s*(\d+[.,]?\d*|een|één|twee|drie|vier|vijf|zes|zeven|acht|negen|tien)\s*(%|procent|uur|hours?|minuten|min)?/);
  if (within || toward || /(verbeteren|sneller|persoonlijk record|\bpr\b|verlagen|verhogen|improve|faster)/.test(text)) {
    const s: Suggestion = { format: "improvement", icon: cat === "sport" ? sportIcon(text) : "trend", category: cat ?? "growth", eventDate };
    if (within) {
      const n = numOrWord(within[1]);
      const mult = /uur|u\b|hour/.test(within[2]) ? 3600 : 60;
      s.valueKind = "time"; s.targetTimeS = Math.round(n * mult); s.direction = "lower"; s.icon = cat === "sport" ? sportIcon(text) : "timer";
    } else if (toward) {
      const lower = /(verlagen|verminderen|omlaag|reduce|lower)/.test(toward[1]);
      const n = numOrWord(toward[3]);
      s.direction = lower ? "lower" : "higher";
      if (toward[4] && /uur|hour|min/.test(toward[4])) { s.valueKind = "time"; s.targetTimeS = Math.round(n * (/uur|hour/.test(toward[4]) ? 3600 : 60)); s.icon = "timer"; }
      else { s.valueKind = "number"; s.quantity = n; s.unit = toward[2] ? "€" : toward[4] ? "%" : ""; }
    }
    return s;
  }

  // 3. Een getal halen: "€3.000.000 omzet", "25 actieve creators", "90% klanttevredenheid"
  const euro = text.match(/€\s*(\d[\d.,]*)\s*(k|mln|miljoen|m\b)?/);
  const percent = text.match(/(\d+[.,]?\d*)\s*(%|procent)/);
  const counted = text.match(/^(?:ik wil\s+)?(\d[\d.,]*)\s+([a-zà-ÿ'’-]+(?:\s+[a-zà-ÿ'’-]+)?)/);
  const isSportDistance = /(\d+[.,]?\d*)\s*(km|kilometer)/.test(text) || /marathon/.test(text);
  if (!isSportDistance && (euro || percent || counted)) {
    if (euro) {
      const mult = euro[2] ? (/k/.test(euro[2]) ? 1_000 : 1_000_000) : 1;
      return { format: "numeric_target", icon: "goal", category: cat ?? "revenue", quantity: parseNum(euro[1]) * mult, unit: "€", startValue: 0 };
    }
    if (percent) return { format: "numeric_target", icon: "goal", category: cat, quantity: parseNum(percent[1]), unit: "%" };
    if (counted) {
      const words = counted[2].split(/\s+/);
      return { format: "numeric_target", icon: "goal", category: cat, quantity: parseNum(counted[1]), unit: words[words.length - 1], startValue: 0 };
    }
  }

  // 4. Project: "een webshop lanceren", "kantoorverhuizing afronden"
  if (/(lanceren|launch|introduceren|introduce|verhuiz|opleveren|deliver|bouwen|build|migratie|migrat|implementeren|implement|afronden|uitrollen|roll ?out|herontwerp|redesign|webshop|website)/.test(text) && cat !== "sport") {
    return {
      format: "project", icon: "project", category: cat ?? "product", eventDate,
      milestones: ["plan", "prepare", "build", "test", "deliver"].map((k) => ({ name: t(`wizard.suggest.project.${k}`) })),
    };
  }

  // 5. Iets bereiken: sportevenement met afstand, certificaat, boek
  if (cat === "sport" || isSportDistance) {
    const km = text.match(/(\d+[.,]?\d*)\s*(km|kilometer)/);
    const distance = /halve marathon|half marathon/.test(text) ? 21.1 : /marathon/.test(text) ? 42.195 : km ? parseNum(km[1]) : undefined;
    const s: Suggestion = { format: "achievement", icon: sportIcon(text), category: "sport", eventDate };
    if (distance && distance > 0) {
      s.quantity = distance; s.unit = "km"; s.quantityLabel = t("wizard.distance");
      s.successCriteria = t("wizard.suggest.finishDistance", { d: fmtKm(distance) });
      const steps = [5, 10, 15, 18, 21.1, 25, 30, 35].filter((v) => v < distance - 0.05);
      s.milestones = [
        { name: t("wizard.suggest.firstWeek"), value: Math.min(3, Math.round(distance / 4)) || 1 },
        ...steps.map((v, i) => ({ name: i === 0 ? t("wizard.suggest.kmComfortable", { d: fmtKm(v) }) : t("wizard.suggest.kmRun", { d: fmtKm(v) }), value: v })),
        { name: /halve marathon|half marathon/.test(text) ? t("wizard.suggest.halfDone") : t("wizard.suggest.distanceDone", { d: fmtKm(distance) }), value: distance },
      ].filter((m, i, arr) => arr.findIndex((x) => x.value === m.value) === i);
      s.routine = { name: t("wizard.suggest.training"), times: 3, period: "week", unit: "km" };
    }
    return s;
  }
  if (/(certificaat|certificate|diploma|examen|exam|rijbewijs|licen)/.test(text)) {
    return { format: "achievement", icon: "cap", category: "learning", eventDate, milestones: ["enroll", "study", "mock", "pass"].map((k) => ({ name: t(`wizard.suggest.cert.${k}`) })) };
  }
  if (/(boek schrijven|write a book|boek afmaken|manuscript)/.test(text)) {
    return { format: "achievement", icon: "book", category: "creativity", eventDate, milestones: ["outline", "draft", "edit", "publish"].map((k) => ({ name: t(`wizard.suggest.book.${k}`) })) };
  }
  return cat ? { format: "achievement", category: cat, eventDate } : null;
}
