"use strict";

// A direct match requires all of a rule's concepts and a recognized vocabulary
// for the whole request. A topic match alone is only a reason to ask for clarity.
const intentWords = {
  ar: {
    request: "هل|ما|ماهي|كم|وش|ايش|شنو|شلون|كيف|وين|متى|ممكن|يمدي|ابي|ابغى|ابغا|ودي|اريد|اعرف|معرفه|استفسار|سؤال|عندي سؤال|انا|يا ليت|يا شيخ|لو سمحت|لو تكرمت|من فضلك|السلام عليكم|ورحمه الله وبركاته|بالله|مشكور|طيب|فعلا|هي|هو|يكون|يتم|ذلك|هذه|هذا|اللي|الي|ارجو|اشرح|تعلم|اتعلم|افهم",
    placeTime: "في|ب|فوق|وقت|اثناء|خلال|فترة|شهر|يوم|اي|لما|هل يكون",
    permitted: "يجوز|جائز|يصح|يصير|يمكن|ممكن|اقدر|تقدر|استطيع|يصلح|ينفع|نقدر|صح|يؤدى|اؤدي|اداء|يتادى|ادّيه|نعمل|اسوي|ابغى|اريد|ودي|يصير لي|هل",
    hajj: "الحج|حج|احج|نحج|للحج|الحجه|حجه الاسلام|مناسك الحج",
    ramadan: "رمضان|برمضان|شهر الصيام",
    hajjWhen: "متى|في اي شهر|في اي يوم|موعد|وقت|توقيت|يوم عرفه|عرفه|ذي الحجه|ذو الحجه",
    umrah: "العمرة|عمره|عمرتي|اعتمر|اعتمرت|نعتمر|الاعتمار",
    reward: "فضل|ثواب|اجر|الاجر|الفضل|الثواب|تعدل|تعادل|مثل|تساوي|يساوي",
    replacement: "تجزئ|تجزي|تجزيني|تغني|تكفي|تكفيني|تعوض|تعوضني|تقوم مقام|تغنيني|بدل|بديل|تعفيني|تسقط|تحل محل",
    obligation: "الفريضه|الفريضه الواجبه|فريضه الحج|حجه الاسلام|الحج الواجب|فرض|فريضه|الفرض|الواجب",
    sameTime: "فيه|في ذلك الشهر|بهالشهر|في هالشهر|في نفس الشهر",
    lastTen: "العشر الاواخر|اخر عشر ليالي|اواخر رمضان",
    wudu: "الوضوء|وضوء|الوضو|وضوي|وضوئي|اتوضا|اتوضا للصلاه",
    shoes: "الخف|خف|الخفين|خفين|خفه|عالخفين|عالخف|بالخفين|الشراب|شراب|عالشراب|بالشراب|شرابي|جورب|الجورب|الجوربين|جوربين|الجوارب|جوارب|عالجوارب|عالجورب|بالجوارب",
    wipe: "المسح|مسح|امسح|يمسح|نمسح|تمسح|ماسح|امسحهم|المسحه|يمسحون",
    steps: "كيف|كيفيه|شلون|الطريقه|طريقه|الصفه|صفه|وش اسوي|عمل|خطوات|الخطوات|اسوي|ابدا|ابدأ|ابدي|الترتيب|ترتيب|وين ابدا",
    wipePlace: "ظاهر|الظاهر|باطن|الباطن|فوق|تحت|اعلى|اسفل|وجه|الوجه|الكف|يد|يدي|القدم|قدم|اليد|الكفين|اليمنى|اليسرى|الرجل|رجولي|اليمين|اليسار|ولا|او|ام",
    wipeTime: "مده|المده|ساعه|ساعات|كم يوم|ايام|متى|متي|وقت|الوقت|تبدا|يبدا|ابتداء|البدايه|بدء|يطول|يطوّل|صلاحية|التوقيت|استمر",
    journey: "المقيم|مقيم|للمقيم|المسافر|مسافر|للمسافر|السفر|بسفر|بالسفر|سفري|مسافرون|وانا مسافر|مقيم ومسافر",
    wipeCount: "مره|مرات|عدد|العدد|مسحات|مسحه|مسحتين|الثلاث|مرتين|اثنتين|واحده|وحده|ثلاث|ثلاثا|٣|3|ثلاث مرات|مسحه واحده",
    condition: "شروط|الشروط|شرط|متى يجوز|متى يصح|حكم|هل يجوز|هل يصح",
    wear: "لبس|لبست|البس|لبسهما|لابس|يلبس|لباس|اللبس|ارتداء|لبسته|لبستهم|لبسه|لابسه",
    purity: "الطهاره|طهاره|الوضوء|وضوء|بدون|غير|بلا|على طهاره|قبل الوضوء",
    faith: "الاسلام|اسلام|بالاسلام|للاسلام",
    convert: "الدخول|دخول|ادخل|دخلت|يسلم|اسلم|اعتنق|اعتناق|اعتنقت|اهتدي|اتعرف على|التعرف على|اتعلم عن|التعلم عن",
    newMuslim: "اصير مسلم|اصبح مسلم|اصير مسلمه|اصبح مسلمه",
    invitation: "قال|قول|اقول|انطق|النطق|نطق|الفهم|للمبتدئين|غير مسلم|غير مسلمه|مسلم جديد|مسلمه جديده|البدايه|ابدى|نبتدي|نتعلم|الاول|اولا|الاساسيات|الاساسيه|بداية",
    testimony: "شهاده|الشهاده|الشهادتين|الشهادتان",
    meaning: "معنى|المعنى|تعني|يعني|يعنيه|معناه|المقصود|مقصود|تفسير",
    pillars: "اركان|الاركان|ركن",
    count: "عدد|العدد|كم عدد",
    seven: "سبعه|السبعه|سبع|7",
    five: "خمسه|الخمس|الخمسه|خمس|5",
    prayer: "الصلاه|صلاه|صلاتي|الفجر|العشاء|العصر|الظهر|المغرب",
    prayerReason: "نسيت|نسيتها|نسيان|ناسي|نمت|نايم|نايمه|النوم|نوم|غلبني النوم|عن النوم|فاتتني بالنوم",
    makeUp: "اقضي|اقضى|اقضيه|اقضيها|قضاء|القضاء|قضاؤها|فاتتني|افعل|اسوي|اعمل|اصليها|اصلي|صلاتها",
    fasting: "الصيام|الصوم|صايم|صائما|صايمه|صائم|صيامي|صومي|صمت|صيام|صوم",
    consumed: "اكل|اكلت|اكلتُ|الاكل|شرب|شربت|الشرب|اشرب|اكلت شي",
    forgot: "ناسي|ناسيا|ناسيه|نسيانا|نسيان|نسيت|نسي|ناس",
    fastResult: "يفطر|افطر|مفطر|يبطل|باطل|يكمل|صحيح|صحه|اكمل|اتم|افعل|اسوي|حكم|الحكم",
    zakat: "الزكاه|زكاه|ازكي|ازكيها|زكاتها|زكاتي|الزكاة|زكاة",
    charity: "الصدقه|صدقه|التطوعيه|التطوع",
    difference: "الفرق|فرق|تفرق|يختلف|تختلف|اختلاف|الاختلاف|نفس|مثل",
    address: "في|ب|عن|على|ان|مع|من|الى|ل|لها|له|لو|للتو|بين|و|او|ان|انا|حين|اذا|صحيح|بس|عنها|منها|فيها|لهم|لاني"
  },
  en: {
    request: "do|does|did|can|i|you|we|one|the|a|an|is|are|it|how|what|when|which|many|please|would|could|should|may|know|tell|me|like|want|to|s|really|anybody|someone",
    address: "of|in|during|on|at|over|into|from|about|and|or",
    permitted: "can|do|possible|allowed|permissible|may|perform|performed|take place|happen",
    hajj: "hajj|haj|major pilgrimage",
    ramadan: "ramadan|ramadhan|month of fasting",
    placeTime: "month|holy month|this month",
    hajjWhen: "when|which month|month|date|timing",
    umrah: "umrah|umra|minor pilgrimage",
    reward: "reward|rewards|merit|worth|equal|equivalent",
    replacement: "replace|fulfill|fulfil|count as|count towards|substitute|satisfy|be enough",
    obligation: "obligatory|required|duty|obligation",
    wudu: "wudu|wudhu|ablution|ablutions",
    shoes: "sock|socks|khuffs|khuff|footwear",
    wipe: "wipe|wiping|wipes",
    steps: "how|step|steps|perform|make|learn|method|instructions",
    wipePlace: "top|bottom|upper|under|above|surface",
    wipeTime: "how long|hours|day|days|duration|time limit|start|begins",
    journey: "travel|traveling|travelling|traveler|traveller|resident|residents",
    wipeCount: "one|once|twice|three|times|wipes",
    condition: "condition|conditions|requirements|rules",
    faith: "islam|muslim",
    convert: "convert|become a muslim|became muslim|embrace|come to islam|enter islam|new to islam|new muslim|new as a muslim",
    invitation: "start|begin|beginner|where|first|belief",
    testimony: "shahada|shahadah|testimony of faith|testimony",
    meaning: "mean|meaning|means|stand for",
    pillars: "pillars|pillar",
    seven: "seven|7",
    five: "five|5"
  },
  fr: {
    request: "peut|peux|puis|on|il|je|est|ce|que|quel|quels|quelle|quelles|a|t|en|faire|suis|voudrais|veux|savoir|comment|veut|svp|merci|moi",
    address: "du|de|des|d|le|la|l|les|dans|au|ou|a|et|se|fait|pendant",
    hajj: "hajj|hadj|grand pelerinage",
    permitted: "peut|possible|permis|autorise|accomplir|faire|avoir lieu|a lieu",
    ramadan: "ramadan|ramadhan|mois du ramadan",
    placeTime: "mois|ce mois",
    hajjWhen: "quand|quel mois|date|moment|periode",
    umrah: "omra|umra|umrah|oumra",
    reward: "recompense|valeur|egal|equivaut|equivalent",
    replacement: "remplace|remplacer|acquitte|acquitter|suffit|suffisant",
    obligation: "obligatoire|obligation|devoir",
    wudu: "wudu|ablution|ablutions",
    shoes: "chaussette|chaussettes|khuff|khuffs",
    wipe: "essuyer|essuyage|essuie",
    steps: "comment|faire|fais|effectuer|effectue|etapes|methode|accomplir|debuter|etape",
    wipeTime: "temps|duree|combien de temps|heures",
    faith: "islam|musulman|musulmane",
    convert: "convertir|conversion|devenir|deviens|embrasser|entrer|nouveau musulman|nouvelle musulmane",
    invitation: "commencer|demarrer|debuter|debute|debutant|debutante|debut|nouveau|nouvelle",
    testimony: "chahada|shahada|shahadah|attestation|attestation de foi",
    meaning: "sens|signifie|signification|dire",
    pillars: "pilier|piliers",
    seven: "sept|7",
    five: "cinq|5"
  },
  es: {
    request: "se|es|puede|puedo|pueden|uno|una|yo|tu|que|cual|cuales|como|cuando|hay|cuantos|cuantas|quiero|quisiera|saber|gracias|por favor|debo|debe|me",
    address: "del|de|el|la|los|las|a|al|y|o|en|durante|entre|para",
    hajj: "hach|hajj|hayy|peregrinacion mayor",
    permitted: "puedo|puede|posible|permitido|permitida|realizar|realiza|hacer|hace|ocurre",
    ramadan: "ramadan|ramadhan",
    placeTime: "mes|este mes",
    hajjWhen: "cuando|cual mes|fecha|mes|momento",
    umrah: "umra|umrah|omra",
    reward: "recompensa|merito|valor|equivale|equivalente",
    replacement: "reemplaza|reemplazar|sustituye|sustituir|cumple|cumplir|basta|suficiente",
    obligation: "obligatorio|obligatoria|obligacion|deber",
    wudu: "wudu|ablucion|abluciones",
    shoes: "calcetines|calcetin|medias|khuff",
    wipe: "paso|pasar|pasando|frotar|froto|limpiar",
    steps: "como|hago|hacer|realizar|aprendo|aprender|metodo|pasos|paso",
    wipeTime: "cuanto tiempo|tiempo|duracion|horas|dia|dias",
    faith: "islam|musulman|musulmana",
    convert: "convertir|convertirme|conversion|hacerme musulman|ser musulman|ser musulmana|aceptar|abrazar|nuevo musulman|nueva musulmana",
    invitation: "empiezo|empezar|comienzo|comenzar|inicio|principiante|primeros|pasos|primero",
    testimony: "shahada|shahadah|testimonio|testimonio de fe",
    meaning: "significa|significado|quiere decir",
    pillars: "pilar|pilares",
    seven: "siete|7",
    five: "cinco|5"
  }
};

// Languages can share subject definitions and override the supported intents.
// The optional groups add phrasing without turning a keyword into a verdict.
const commonIntentRules = [
  ["umrah_hajj_obligation", ["umrah", "ramadan", "hajj", "replacement"], ["obligation", "placeTime", "permitted", "reward"]],
  ["ramadan_umrah", ["umrah", "ramadan", "reward"], ["hajj", "placeTime", "permitted"]],
  ["ramadan_umrah", ["umrah", "ramadan", "permitted"], ["placeTime", "reward", "hajj"]],
  ["hajj_ramadan", ["hajj", "ramadan", "permitted"], ["placeTime", "hajjWhen"]],
  ["hajj_time", ["hajj", "hajjWhen"], ["permitted", "placeTime"]],
  ["khuff_duration", ["shoes", "wipe", "wipeTime"], ["journey", "placeTime", "wudu", "permitted"]],
  ["khuff_conditions", ["shoes", "wipe", "condition"], ["wudu", "placeTime", "permitted"]],
  ["khuff_method", ["shoes", "wipe", "steps"], ["wipePlace", "wudu", "placeTime", "permitted"]],
  ["ablution", ["wudu", "steps"], ["placeTime", "prayer", "permitted"]],
  ["newcomer_start", ["faith", "convert"], ["invitation", "steps", "testimony"]],
  ["shahada", ["testimony", "meaning"], ["faith"]],
  ["pillars_count", ["pillars", "faith", "seven"], ["meaning", "count"]],
  ["pillars", ["pillars", "faith"], ["meaning", "five", "count"]]
];

const arabicIntentRules = [
  ["ramadan_umrah_last_ten", ["umrah", "lastTen"], ["ramadan", "placeTime", "reward", "permitted"]],
  ["newcomer_start", ["newMuslim"], ["faith", "invitation", "steps", "testimony"]],
  ["khuff_count", ["shoes", "wipe", "wipeCount"], ["wipePlace", "wudu", "placeTime", "permitted"]],
  ["khuff_method", ["shoes", "wipe", "wipePlace"], ["steps", "wudu", "placeTime", "permitted"]],
  ["khuff_conditions", ["shoes", "wipe", "wear", "purity"], ["condition", "permitted"]],
  ["missed_prayer", ["prayer", "prayerReason"], ["makeUp", "placeTime"]],
  ["fasting_forgetful", ["fasting", "consumed", "forgot"], ["fastResult", "placeTime", "ramadan"]],
  ["zakat_charity", ["zakat", "charity", "difference"], []]
];

const intentTopics = [
  {topic: "khuff", groups: ["shoes", "wipe"], ids: ["khuff_method", "khuff_duration", "khuff_conditions"],
    prompt: "هل تقصد طريقة المسح، أو مدته، أو شروط جوازه؟ اختر الجزء المطلوب."},
  {topic: "ramadan_umrah", groups: ["umrah"], ids: ["ramadan_umrah", "umrah_hajj_obligation"],
    prompt: "هل تسأل عن جواز العمرة في رمضان وفضلها، أم عن إجزائها عن فريضة الحج؟"},
  {topic: "hajj", groups: ["hajj"], ids: ["hajj_time", "hajj_ramadan"],
    prompt: "هل تسأل عن وقت أداء المناسك، أم عن حكمٍ يتعلق بالإحرام أو الاستطاعة؟"},
  {topic: "ablution", groups: ["wudu"], ids: ["ablution"],
    prompt: "هل تسأل عن خطوات الوضوء، أم عن حالة تؤثر في صحته؟"},
  {topic: "prayer", groups: ["prayer"], ids: ["missed_prayer"],
    prompt: "هل تتعلق المسألة بصفة الصلاة، أو وقتها، أو قضاء صلاة فاتتك؟"},
  {topic: "fasting", groups: ["fasting"], ids: ["fasting_forgetful"],
    prompt: "هل تتعلق المسألة بما وقع أثناء الصيام، أم بوجوب الصيام أو قضائه؟"},
  {topic: "zakat", groups: ["zakat"], ids: ["zakat_charity"],
    prompt: "هل تسأل عن مالٍ تدخره، أم عن مال التجارة، أم عن نوعٍ آخر من الزكاة؟"},
  {topic: "pillars", groups: ["pillars", "faith"], ids: ["pillars"],
    prompt: "هل تسأل عن عدد الأركان، أم عن معنى ركنٍ بعينه؟"}
];

const guardedIntents = {
  vow: "نذر|نذرت|انذر|نذري|النذر|انذرت|كفاره نذر|vow|vowed|voeu|voto",
  money: "علي دين|عليّ دين|علي دَين|ديني|ديون|قرض|مديون|مديونية|دين قديم|دين واجب|عندي دين|عندي دَين|تقسيط|debt|loan|dette|deuda",
  land: "ارض|اراضي|قطعه|عقار|عقارات|land|property|terrain|terreno",
  personal: "جرح|جروح|نزف|ينزف|نزيف|الجرح|جبيره|الجبيره|الجباير|طبيب|الطبيب|عملية|العمليه|مريض|مرض|المرض|حامل|يؤذيني|دم|شفاف|الجنابه|جنابه|حيض|الحيض|نفاس|الثوب الممزق|تمزق|ممزق|انتهت المده|انتهاء المده|مناعتي|دواء|الدواء|مضاد|طواف القدوم|المحرم|نية الحج|نيه الاحرام|الاحرام|احرم|ساعه الرحله|متعمد|متعمدا|عمدا|بالقصد|اجبر|اجبار|force|forced|forcing|coerce|coerced|coercing|injury|wound|bleeding|doctor|surgery|injured|ihram|deliberately|on purpose|blessure|medecin|forcee|herida|cirugia|medico|intencionalmente"
};

const caseReferral = {
  ar: "يتعلّق السؤال بتفصيل قد يغيّر الحكم. صف الحالة لجهة إفتاء موثوقة كي تراجع تفاصيلها.",
  en: "A detail in your question may change the ruling. Share the circumstances with a qualified religious adviser.",
  fr: "Un détail de votre situation peut changer la réponse. Présentez votre cas à une autorité religieuse qualifiée.",
  es: "Un detalle de tu caso puede cambiar la respuesta. Describe la situación a una autoridad religiosa cualificada."
};

let compiledQuestionIntents;
let compiledIntentGuards;

function compileQuestionIntents() {
  return Object.fromEntries(Object.entries(intentWords).map(([language, groups]) => {
    const terms = Object.fromEntries(Object.entries(groups).map(([group, raw]) =>
      [group, raw.split("|").map(normalizeQuestion)]));
    const rules = [...(language === "ar" ? arabicIntentRules : []), ...commonIntentRules]
      .filter(([, required]) => required.every(group => terms[group]))
      .map(([id, required, optional]) => ({
        id,
        required: required.map(group => terms[group]),
        vocabulary: new Set([...required, ...optional, "request", "address"]
          .flatMap(group => (terms[group] || []).flatMap(phrase => phrase.split(" "))))
      }));
    return [language, {terms, rules}];
  }));
}

function isIntentPhrasePresent(key, phrases) {
  return (phrases || []).some(phrase => key.includes(" " + phrase + " "));
}

function questionLanguage(key) {
  if (/\p{Script=Han}/u.test(key)) return "zh";
  if (/\p{Script=Arabic}/u.test(key)) {
    return /[ٹڈڑپچژگںھہےک]/u.test(key) ||
      (typeof zadServiceLocale === "string" && zadServiceLocale === "ur") ? "ur" : "ar";
  }
  if (/\b(puis|peut|peux|quels|quelles|veut|est|pendant|devenir|quand|comment|combien|voudrais|veux)\b/.test(key)) return "fr";
  if (/\b(puede|puedo|cual|cuales|quiero|convertirme|es posible|que|como|cuando|cuanto|cuantos|cuantas|hacer|hacerme|empiezo|si|soy)\b/.test(key)) return "es";
  return "en";
}

function hasSupportedPolarity(normalized, rule, language) {
  if (language !== "ar") return true;
  let key = " " + normalized + " ";
  if (rule.id === "newcomer_start") {
    key = key.replace(/ غير مسلم(?:ه)?(?= )/g, " ");
  }
  if (rule.id === "khuff_conditions") {
    key = key.replace(/ (?:بدون|بلا|غير) (?:وضوء|الوضوء|طهاره|الطهاره)(?= )/g, " ");
  }
  if (rule.id === "khuff_method") {
    key = key.replace(/ ولا (?:من )?(?:فوق|تحت|الظاهر|الباطن)(?= )/g, " ");
  }
  return !isIntentPhrasePresent(key, ["غير", "بدون", "بلا", "ولا", "لا", "لم", "لن"]);
}

function resolveQuestionIntent(question, previousTopic) {
  compiledQuestionIntents ||= compileQuestionIntents();
  compiledIntentGuards ||= Object.fromEntries(Object.entries(guardedIntents).map(([name, raw]) =>
    [name, raw.split("|").map(normalizeQuestion)]));
  const normalized = normalizeQuestion(question);
  if (!normalized) return null;
  const language = questionLanguage(normalized);
  const compiled = compiledQuestionIntents[language];
  if (!compiled) return null;
  const {terms, rules} = compiled;
  const key = " " + normalized + " ";
  const topic = intentTopics.find(entry => entry.groups.every(group => isIntentPhrasePresent(key, terms[group])));
  const has = group => isIntentPhrasePresent(key, terms[group]);
  const guarded = name => isIntentPhrasePresent(key, compiledIntentGuards[name]);

  if (language === "ar" && has("hajj") && guarded("vow")) {
    return {kind: "answer", id: "hajj_vow", language};
  }
  if (language === "ar" && has("zakat") && guarded("money") && guarded("land")) {
    return {kind: "answer", id: "zakat_debt_land", language};
  }
  const religiousScope = topic || has("faith") || has("testimony")
    || (has("wipe") && isIntentPhrasePresent(key, ["الجبيره", "جبيره", "الجباير"]));
  if (religiousScope && (guarded("personal") || guarded("vow") || (has("zakat") && guarded("money")))) {
    return {kind: "refer", topic: topic?.topic, ids: [], language,
      prompt: caseReferral[language]};
  }

  const words = normalized.split(" ");
  if (words.length <= 45) {
    const match = rules.find(rule => rule.required.every(group => isIntentPhrasePresent(key, group))
      && hasSupportedPolarity(normalized, rule, language)
      && words.every(word => rule.vocabulary.has(word)
        || (language === "ar" && word.startsWith("و") && rule.vocabulary.has(word.slice(1)))));
    if (match) return {kind: "answer", id: match.id, language};

    if (language === "ar" && ["hajj_ramadan", "ramadan_umrah"].includes(previousTopic) && has("sameTime")
      && has("umrah") && has("hajj") && has("replacement")) {
      const duration = terms.sameTime.find(phrase => isIntentPhrasePresent(key, [phrase]));
      return resolveQuestionIntent(key.replace(" " + duration + " ", " في رمضان ").trim());
    }
  }

  if (topic && language === "ar") {
    return {kind: "clarify", topic: topic.topic, ids: topic.ids, prompt: topic.prompt, language};
  }
  return null;
}
