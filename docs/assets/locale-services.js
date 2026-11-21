"use strict";

const zadServiceLocale = document.documentElement.lang.toLowerCase().split("-")[0] || "ar";

const zadServiceMessages = {
  en: {
    prayer: {
      Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha",
      choose: "Select a Saudi city from the list.", loading: "Loading prayer times",
      method: "Umm al-Qura", school: "Standard Asr calculation", clock: "24-hour format",
      failed: "Prayer times could not be verified. Try again or check the local timetable."
    },
    ask: {
      ibnBaz: "Sheikh Ibn Baz’s official website", ibnUthaymeen: "Sheikh Ibn Uthaymeen’s official website",
      fatwaAuthority: "Saudi Presidency of Scholarly Research and Ifta",
      trusted: "This answer is based on the cited sources.", details: "The ruling depends on the details.",
      clarify: "More details are needed", correction: "Verified clarification", answer: "Verified answer",
      excerpt: "Excerpt from a fatwa by", fullFatwa: "Read the full fatwa (Arabic)",
      audio: "Audio recording", written: "Written fatwa", resultCount: "results from original sources",
      empty: "No fatwas match these filters. Choose another scholar or topic.",
      scholars: "All scholars", topics: "All topics", scholarBaz: "Sheikh Abdul Aziz Ibn Baz",
      scholarUthaymeen: "Sheikh Muhammad Ibn Uthaymeen",
      purity: "Purification", prayer: "Prayer", zakat: "Zakat", fasting: "Fasting", pilgrimage: "Hajj and Umrah",
      partsStatus: "Verified answers were found for the parts of your question.", partsTitle: "Verified answers",
      clarifyIntent: "The answer depends on what you mean.", clarifyDetails: "This matter depends on the details.",
      noAnswer: "No verified answer was found for this question.", refine: "How can you narrow your question?",
      refineHint: "Name the topic and say what you want to know. If related questions appear here, you can select one.",
      https: "Open the site over HTTPS or on a local preview server to run the model.",
      noGPU: "AI source suggestions require a browser and device with WebGPU support.",
      check: "Checking device compatibility…",
      unavailable: "The model could not start. You can retry or continue searching the verified answers.",
      adapterTimeout: "The compatibility check took too long. You can try again.",
      gpu16: "The model requires WebGPU with 16-bit shader support. Verified answers are still available.",
      loadModel: "Downloading the AI model…", modelProgress: "Loading and preparing the model…",
      modelReady: "AI source suggestions are ready.", candidate: "These references may help with your question.",
      sources: "Related sources", startupTimeout: "The model took too long to download. You can try again.",
      webSearch: "Search this topic on Sheikh Ibn Baz’s website (Arabic)",
      officialLoading: "Searching Sheikh Ibn Baz’s official website…",
      officialExcerpt: "Excerpt from the beginning of Sheikh Abdul Aziz Ibn Baz’s answer (Arabic)",
      officialRead: "Read the full fatwa on the official website (Arabic)",
      relatedFatwas: "Related fatwas were found.", scholarResults: "Results from scholars’ websites",
      readContext: "Read the full question and answer at the source. For personal circumstances, consult a qualified scholar.",
      relatedOnline: "The official search found related fatwas.", bazResults: "Results from Sheikh Ibn Baz’s website",
      notEnough: "Open the closest fatwa to read the complete answer. The available excerpts are not enough to answer accurately.",
      noScholar: "The index did not have a matching fatwa by the named scholar.", officialSites: "Official websites",
      rephrase: "Rephrase the question or consult the official websites.",
      looking: "Looking for references that may help…",
      lookupTimeout: "Finding references took too long. You can try again.",
      lookupFailed: "The model could not suggest references. You can restart it.",
      enterQuestion: "Enter a question to look for an answer.",
      agentLooking: "Searching approved fatwa sites…",
      agentStatus: "Summary from the OpenAI assistant. Open the cited fatwas below.", agentTitle: "Answer from sources"
    }
  },
  fr: {
    prayer: {
      Fajr: "Fajr", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Icha",
      choose: "Choisissez une ville saoudienne dans la liste.", loading: "Chargement des horaires de prière",
      method: "Oumm al-Qoura", school: "Calcul standard de l’Asr", clock: "Format 24 heures",
      failed: "Impossible de vérifier les horaires. Réessayez ou consultez le calendrier local."
    },
    ask: {
      ibnBaz: "Site officiel du cheikh Ibn Baz", ibnUthaymeen: "Site officiel du cheikh Ibn Outhaymine",
      fatwaAuthority: "Présidence saoudienne de la recherche et de l’iftā’",
      trusted: "Cette réponse s’appuie sur les sources citées.", details: "L’avis dépend des détails.",
      clarify: "Précisions nécessaires", correction: "Rectification vérifiée", answer: "Réponse vérifiée",
      excerpt: "Extrait d’une fatwa de", fullFatwa: "Lire la fatwa complète (en arabe)",
      audio: "Enregistrement audio", written: "Fatwa écrite", resultCount: "résultats issus des sources originales",
      empty: "Aucune fatwa ne correspond à ces filtres. Changez de savant ou de sujet.",
      scholars: "Tous les savants", topics: "Tous les sujets", scholarBaz: "Cheikh Abdel Aziz Ibn Baz",
      scholarUthaymeen: "Cheikh Mohammed Ibn Outhaymine",
      purity: "Purification", prayer: "Prière", zakat: "Zakat", fasting: "Jeûne", pilgrimage: "Hajj et Omra",
      partsStatus: "Des réponses vérifiées sont disponibles pour les parties de votre question.", partsTitle: "Réponses vérifiées",
      clarifyIntent: "La réponse dépend de ce que vous voulez dire.", clarifyDetails: "Cette question dépend des circonstances.",
      noAnswer: "Aucune réponse vérifiée n’a été trouvée pour cette question.", refine: "Comment préciser votre question ?",
      refineHint: "Indiquez le sujet et ce que vous souhaitez savoir. Vous pouvez sélectionner une question proche si elle apparaît.",
      https: "Ouvrez le site en HTTPS ou sur un serveur local pour lancer le modèle.",
      noGPU: "Les suggestions de sources par IA nécessitent un appareil et un navigateur compatibles avec WebGPU.",
      check: "Vérification de la compatibilité…",
      unavailable: "Impossible de lancer le modèle. Réessayez ou consultez les réponses vérifiées.",
      adapterTimeout: "La vérification a pris trop de temps. Réessayez.",
      gpu16: "Le modèle nécessite WebGPU et le calcul 16 bits. Les réponses vérifiées restent accessibles.",
      loadModel: "Téléchargement du modèle d’IA…", modelProgress: "Chargement et préparation du modèle…",
      modelReady: "Les suggestions de sources par IA sont prêtes.", candidate: "Ces références peuvent vous aider.",
      sources: "Sources connexes", startupTimeout: "Le téléchargement a pris trop de temps. Réessayez.",
      webSearch: "Rechercher ce sujet sur le site du cheikh Ibn Baz (en arabe)",
      officialLoading: "Recherche sur le site officiel du cheikh Ibn Baz…",
      officialExcerpt: "Extrait du début de la réponse du cheikh Abdel Aziz Ibn Baz (en arabe)",
      officialRead: "Lire la fatwa complète sur le site officiel (en arabe)",
      relatedFatwas: "Des fatwas sur ce sujet ont été trouvées.", scholarResults: "Résultats des sites de savants",
      readContext: "Lisez la question et la réponse complètes dans la source. Consultez une personne qualifiée pour un cas personnel.",
      relatedOnline: "La recherche officielle a trouvé des fatwas connexes.", bazResults: "Résultats du site du cheikh Ibn Baz",
      notEnough: "Consultez la fatwa la plus proche pour lire la réponse complète. Les extraits ne suffisent pas pour répondre avec précision.",
      noScholar: "Aucune fatwa correspondante du savant cité ne figure dans l’index.", officialSites: "Sites officiels",
      rephrase: "Reformulez la question ou consultez les sites officiels.",
      looking: "Recherche de références utiles…",
      lookupTimeout: "La recherche a pris trop de temps. Réessayez.",
      lookupFailed: "Le modèle n’a pas pu suggérer de références. Vous pouvez le relancer.",
      enterQuestion: "Saisissez une question pour chercher une réponse.",
      agentLooking: "Recherche dans les sites de fatwas approuvés…",
      agentStatus: "Résumé de l’assistant OpenAI. Consultez les fatwas citées ci-dessous.", agentTitle: "Réponse issue des sources"
    }
  },
  ur: {
    prayer: {
      Fajr: "فجر", Dhuhr: "ظہر", Asr: "عصر", Maghrib: "مغرب", Isha: "عشاء",
      choose: "فہرست سے سعودی شہر منتخب کریں۔", loading: "نماز کے اوقات لوڈ ہو رہے ہیں",
      method: "اُم القریٰ", school: "عصر کا وقت جمہور کے حساب سے", clock: "۲۴ گھنٹے کا فارمیٹ",
      failed: "نماز کے اوقات کی تصدیق نہیں ہو سکی۔ دوبارہ کوشش کریں یا مقامی جدول دیکھیں۔"
    },
    ask: {
      ibnBaz: "شیخ ابن باز کی سرکاری ویب سائٹ", ibnUthaymeen: "شیخ ابن عثیمین کی سرکاری ویب سائٹ",
      fatwaAuthority: "سعودی ادارہ برائے علمی تحقیق و افتاء",
      trusted: "یہ جواب درج کردہ مآخذ پر مبنی ہے۔", details: "حکم کا انحصار صورتِ حال کی تفصیلات پر ہے۔",
      clarify: "مزید وضاحت درکار ہے", correction: "مستند تصحیح", answer: "مستند جواب",
      excerpt: "فتوے سے اقتباس", fullFatwa: "مکمل فتویٰ عربی میں پڑھیں",
      audio: "صوتی ریکارڈنگ", written: "تحریری فتویٰ", resultCount: "نتائج اصل مآخذ سے",
      empty: "ان اختیارات کے مطابق کوئی فتویٰ نہیں ملا۔ عالم یا موضوع بدل کر دیکھیں۔",
      scholars: "تمام علما", topics: "تمام موضوعات", scholarBaz: "شیخ عبد العزیز ابن باز",
      scholarUthaymeen: "شیخ محمد ابن عثیمین",
      purity: "طہارت", prayer: "نماز", zakat: "زکوٰۃ", fasting: "روزہ", pilgrimage: "حج اور عمرہ",
      partsStatus: "آپ کے سوال کے حصوں کے مستند جواب مل گئے ہیں۔", partsTitle: "مستند جوابات",
      clarifyIntent: "جواب کا انحصار آپ کی مراد پر ہے۔", clarifyDetails: "اس مسئلے کی تفصیلات درکار ہیں۔",
      noAnswer: "اس سوال کا مستند جواب نہیں ملا۔", refine: "اپنے سوال کو کیسے واضح کریں؟",
      refineHint: "موضوع اور اپنی مطلوبہ معلومات بتائیں۔ اگر متعلقہ سوالات دکھائی دیں تو ان میں سے ایک منتخب کریں۔",
      https: "ماڈل چلانے کے لیے سائٹ کو HTTPS یا مقامی پیش منظر سرور پر کھولیں۔",
      noGPU: "مصنوعی ذہانت سے مآخذ کی تجاویز کے لیے WebGPU والا آلہ اور براؤزر درکار ہے۔",
      check: "آلے کی مطابقت جانچی جا رہی ہے…",
      unavailable: "ماڈل نہیں چل سکا۔ دوبارہ کوشش کریں یا مستند جوابات میں تلاش کریں۔",
      adapterTimeout: "مطابقت کی جانچ میں بہت دیر ہوئی۔ دوبارہ کوشش کریں۔",
      gpu16: "ماڈل کو ۱۶ بٹ شیڈر کی سہولت والا WebGPU درکار ہے۔ مستند جوابات دستیاب ہیں۔",
      loadModel: "مصنوعی ذہانت کا ماڈل ڈاؤن لوڈ ہو رہا ہے…", modelProgress: "ماڈل لوڈ اور تیار ہو رہا ہے…",
      modelReady: "مصنوعی ذہانت سے مآخذ کی تجاویز تیار ہیں۔", candidate: "یہ مآخذ آپ کے سوال میں مدد کر سکتے ہیں۔",
      sources: "متعلقہ مآخذ", startupTimeout: "ماڈل کے ڈاؤن لوڈ میں بہت دیر ہوئی۔ دوبارہ کوشش کریں۔",
      webSearch: "شیخ ابن باز کی ویب سائٹ پر یہ موضوع عربی میں تلاش کریں",
      officialLoading: "شیخ ابن باز کی سرکاری ویب سائٹ پر تلاش جاری ہے…",
      officialExcerpt: "شیخ عبد العزیز ابن باز کے جواب کی ابتدا سے اقتباس (عربی)",
      officialRead: "سرکاری ویب سائٹ پر مکمل فتویٰ عربی میں پڑھیں",
      relatedFatwas: "موضوع سے متعلق فتاویٰ ملے ہیں۔", scholarResults: "علما کی ویب سائٹس کے نتائج",
      readContext: "اصل ماخذ میں سوال اور جواب مکمل پڑھیں۔ ذاتی حالات کے لیے کسی اہل عالم سے رجوع کریں۔",
      relatedOnline: "سرکاری تلاش میں متعلقہ فتاویٰ ملے۔", bazResults: "شیخ ابن باز کی ویب سائٹ کے نتائج",
      notEnough: "مکمل جواب کے لیے قریب ترین فتویٰ کھولیں۔ درست جواب کے لیے دستیاب اقتباسات ناکافی ہیں۔",
      noScholar: "درج عالم کا متعلقہ فتویٰ فہرست میں نہیں ملا۔", officialSites: "سرکاری ویب سائٹس",
      rephrase: "سوال کی عبارت بدلیں یا سرکاری ویب سائٹس دیکھیں۔",
      looking: "کارآمد مآخذ کی تلاش جاری ہے…",
      lookupTimeout: "مآخذ کی تلاش میں بہت دیر ہوئی۔ دوبارہ کوشش کریں۔",
      lookupFailed: "ماڈل مآخذ تجویز نہیں کر سکا۔ اسے دوبارہ چلا سکتے ہیں۔",
      enterQuestion: "جواب تلاش کرنے کے لیے اپنا سوال لکھیں۔",
      agentLooking: "منظور شدہ فتاویٰ کی ویب سائٹس میں تلاش جاری ہے…",
      agentStatus: "OpenAI معاون کا خلاصہ۔ اصل فتاویٰ نیچے کے مآخذ میں دیکھیں۔", agentTitle: "مآخذ سے جواب"
    }
  },
  zh: {
    prayer: {
      Fajr: "晨礼", Dhuhr: "晌礼", Asr: "晡礼", Maghrib: "昏礼", Isha: "宵礼",
      choose: "请从列表中选择一个沙特城市。", loading: "正在加载礼拜时间",
      method: "乌姆古拉计算法", school: "晡礼采用多数法学派的算法", clock: "24 小时制",
      failed: "无法核实礼拜时间。请重试或查阅当地时间表。"
    },
    ask: {
      ibnBaz: "谢赫伊本·巴兹官方网站", ibnUthaymeen: "谢赫伊本·欧赛敏官方网站",
      fatwaAuthority: "沙特学术研究与教法解答总署",
      trusted: "此答复依据所列来源。", details: "教法判断取决于具体情况。",
      clarify: "需要更多信息", correction: "经核实的澄清", answer: "经核实的答复",
      excerpt: "教法解答摘录，作者", fullFatwa: "阅读教法解答全文（阿拉伯语）",
      audio: "录音", written: "书面教法解答", resultCount: "条原始来源的结果",
      empty: "没有符合条件的教法解答。请选择其他学者或主题。",
      scholars: "所有学者", topics: "所有主题", scholarBaz: "谢赫阿卜杜勒·阿齐兹·伊本·巴兹",
      scholarUthaymeen: "谢赫穆罕默德·伊本·欧赛敏",
      purity: "洁净", prayer: "礼拜", zakat: "天课", fasting: "斋戒", pilgrimage: "朝觐与副朝",
      partsStatus: "已找到问题各部分的经核实答复。", partsTitle: "经核实的多项答复",
      clarifyIntent: "答复取决于你询问的具体内容。", clarifyDetails: "此事需要了解具体情况。",
      noAnswer: "未找到与此问题相符的经核实答复。", refine: "如何进一步说明你的问题？",
      refineHint: "说明你问的是哪件事，以及想知道什么。如果下方有相关问题，可以选一个。",
      https: "请通过 HTTPS 或本地预览服务器打开网站以运行模型。",
      noGPU: "AI 来源建议需要支持 WebGPU 的设备和浏览器。",
      check: "正在检查设备兼容性…",
      unavailable: "无法运行模型。你可以重试或继续查阅经核实的答复。",
      adapterTimeout: "兼容性检查超时。请重试。",
      gpu16: "模型需要支持 16 位着色器的 WebGPU。经核实的答复仍可查阅。",
      loadModel: "正在下载 AI 模型…", modelProgress: "正在加载和准备模型…",
      modelReady: "AI 来源建议已就绪。", candidate: "这些来源可能有助于解答你的问题。",
      sources: "相关来源", startupTimeout: "模型下载超时。请重试。",
      webSearch: "在谢赫伊本·巴兹的网站搜索此主题（阿拉伯语）",
      officialLoading: "正在搜索谢赫伊本·巴兹的官方网站…",
      officialExcerpt: "谢赫阿卜杜勒·阿齐兹·伊本·巴兹答复开头的摘录（阿拉伯语）",
      officialRead: "在官方网站阅读教法解答全文（阿拉伯语）",
      relatedFatwas: "找到了相关的教法解答。", scholarResults: "学者官方网站的结果",
      readContext: "请从来源阅读完整的问答。如涉及个人特殊情况，请咨询合格的学者。",
      relatedOnline: "官方搜索找到了相关教法解答。", bazResults: "谢赫伊本·巴兹网站的结果",
      notEnough: "请打开最相关的教法解答阅读全文。现有摘录不足以准确回答此问题。",
      noScholar: "索引中未找到该学者对此问题的解答。", officialSites: "官方网站",
      rephrase: "请换一种问法，或查阅官方网站。",
      looking: "正在查找有帮助的来源…",
      lookupTimeout: "查找来源超时。请重试。",
      lookupFailed: "模型未能推荐来源。你可以重新启动模型。",
      enterQuestion: "请输入要查询的问题。",
      agentLooking: "正在搜索经认可的教法解答网站…",
      agentStatus: "以下为 OpenAI 助手的摘要。请打开所列来源阅读原文。", agentTitle: "依据来源的答复"
    }
  }
};

function zadServiceText(group, key, fallback) {
  return zadServiceMessages[zadServiceLocale]?.[group]?.[key] ?? fallback;
}

// Translations of reviewed catalog answers. The original source URLs stay with
// the catalog record, and direct matching accepts only the listed questions.
const zadReviewedTranslations = {
  en: {
    ramadan_umrah_last_ten: {
      followUp: {ramadan_umrah: ["what about the last ten days", "and during the last ten days", "what about the last ten days of ramadan"]}
    }
  },
  fr: {
    ramadan_umrah_last_ten: {
      followUp: {ramadan_umrah: ["et pendant les dix derniers jours", "qu en est il des dix derniers jours", "et pendant les dix derniers jours du ramadan"]}
    }
  },
  ur: {
    pillars: {
      terms: ["ارکان اسلام", "اسلام کے ارکان"],
      sources: ["صحیح بخاری ۸"],
      forms: ["اسلام کے پانچ ارکان ہیں: شہادتین، نماز قائم کرنا، زکوٰۃ دینا، حج اور رمضان کے روزے رکھنا۔",
        "اسلام کے پانچ ارکان کیا ہیں", "اسلام کے ارکان کیا ہیں", "اسلام کے کتنے ارکان ہیں", "اسلام کے ارکان کتنے ہیں", "ارکان اسلام بتائیں"]
    },
    pillars_count: {
      terms: ["سات ارکان"],
      sources: ["صحیح بخاری ۸"],
      forms: ["اسلام کے ارکان پانچ ہیں۔ صحیح بخاری کی حدیث میں شہادتین، نماز قائم کرنا، زکوٰۃ دینا، حج اور رمضان کے روزے مذکور ہیں۔",
        "کیا اسلام کے سات ارکان ہیں", "اسلام کے سات ارکان کیا ہیں", "کیا اسلام کے 7 ارکان ہیں"]
    },
    hajj_ramadan: {
      terms: ["حج رمضان", "رمضان میں حج"],
      sources: ["ابن باز · حج کے طریقے (عربی)", "ابن باز · رمضان کا عمرہ فرض حج کی جگہ کافی نہیں (عربی)"],
      forms: ["حج کے مناسک رمضان میں ادا نہیں کیے جاتے۔ حج ذوالحجہ میں ہوتا ہے اور نو ذوالحجہ کو وقوفِ عرفہ کیا جاتا ہے۔ رمضان میں عمرہ کیا جا سکتا ہے، جس کا ثواب حج کے برابر ہے، مگر اس سے فرض حج ادا نہیں ہوتا۔",
        "کیا رمضان میں حج ہو سکتا ہے", "کیا رمضان میں حج کر سکتے ہیں", "کیا رمضان میں حج کیا جا سکتا ہے", "رمضان میں حج ہو سکتا ہے", "کیا حج رمضان میں ہوتا ہے", "کیا رمضان میں حج کرنا جائز ہے"]
    },
    ablution: {
      terms: ["وضو"],
      sources: ["قرآن · المائدہ ۵:۶", "صحیح بخاری ۱۵۹"],
      forms: ["حضرت عثمانؓ کی روایت میں وضو کا طریقہ یہ ہے: ہاتھ دھوئیں، کلی کریں اور ناک میں پانی لے کر صاف کریں، چہرہ اور بازو کہنیوں سمیت دھوئیں، سر کا مسح کریں اور پاؤں ٹخنوں سمیت دھوئیں۔",
        "وضو کیسے کریں", "وضو کرنے کا طریقہ کیا ہے", "وضو کا طریقہ بتائیں", "وضو کا طریقہ کیا ہے", "میں وضو کیسے کروں"]
    },
    khuff_method: {
      terms: ["موزوں پر مسح", "جرابوں پر مسح"],
      sources: ["ابن باز · جرابوں پر مسح کرنے کا طریقہ (عربی)", "ابن باز · مسح کتنی بار کیا جائے (عربی)", "ابن باز · موزوں اور جرابوں پر مسح کی شرائط (عربی)"],
      forms: ["وضو کی حالت میں پہنے گئے اور پاؤں کو ڈھانپنے والے موزوں یا جرابوں کے اوپر، وضو کے وقت ہر پاؤں پر ایک بار گیلے ہاتھ سے مسح کریں۔ دائیں پاؤں پر دائیں ہاتھ اور بائیں پاؤں پر بائیں ہاتھ سے مسح کریں۔",
        "موزوں پر مسح کیسے کریں", "جرابوں پر مسح کیسے کریں", "موزوں پر مسح کرنے کا طریقہ", "جرابوں پر مسح کرنے کا طریقہ کیا ہے", "موزوں پر مسح کیسے کیا جاتا ہے"]
    },
    newcomer_start: {
      terms: ["اسلام قبول", "مسلمان کیسے"],
      sources: ["زاد رہنما · شہادتین اور ابتدائی مراحل", "ابن باز · اسلام میں داخل ہونے کا طریقہ (عربی)"],
      forms: ["اگر آپ اسلام قبول کرنے کا فیصلہ کریں تو سمجھ بوجھ اور اخلاص کے ساتھ گواہی دیں کہ اللہ کے سوا کوئی عبادت کے لائق نہیں اور محمد اللہ کے رسول ہیں۔ پھر وضو اور پانچ وقت کی نماز سیکھنا شروع کریں۔ رہنما میں شہادتین کا مطلب اور ابتدائی مراحل درج ہیں۔",
        "اسلام کیسے قبول کریں", "مسلمان کیسے بنیں", "اسلام قبول کرنے کا طریقہ کیا ہے", "میں مسلمان کیسے بن سکتا ہوں", "میں مسلمان کیسے بن سکتی ہوں", "اسلام میں کیسے داخل ہوں"]
    },
    ramadan_umrah: {
      terms: ["رمضان میں عمرہ", "رمضان کا عمرہ"],
      sources: ["ابن باز · رمضان کا عمرہ فرض حج کی جگہ کافی نہیں (عربی)"],
      forms: ["رمضان میں عمرہ کیا جا سکتا ہے۔ صحیح حدیث کے مطابق اس کا ثواب حج کے برابر ہے۔ شیخ ابن باز نے واضح کیا کہ یہ ثواب کی برابری ہے اور اس سے فرض حج ادا نہیں ہوتا۔",
        "کیا رمضان میں عمرہ کر سکتے ہیں", "رمضان میں عمرہ کرنے کی فضیلت کیا ہے", "کیا رمضان میں عمرہ کرنا جائز ہے", "رمضان میں عمرہ ہو سکتا ہے"]
    },
    ramadan_umrah_last_ten: {
      terms: ["آخری عشرے میں عمرہ", "آخری دس دنوں میں عمرہ"],
      sources: ["ابن باز · عمرے کے لیے افضل اوقات (عربی)", "ابن باز · رمضان کا عمرہ فرض حج کی جگہ کافی نہیں (عربی)"],
      forms: ["رمضان کے آخری عشرے میں عمرہ کیا جا سکتا ہے۔ شیخ ابن باز کی رائے میں یہ عمرے کے لیے رمضان کا سب سے افضل وقت ہے۔ رمضان میں عمرے کی فضیلت ان دنوں کو بھی شامل ہے، اور فرض حج کی ذمہ داری اپنی جگہ برقرار ہے۔",
        "کیا رمضان کے آخری عشرے میں عمرہ کر سکتے ہیں", "رمضان کے آخری عشرے میں عمرے کی فضیلت کیا ہے"],
      followUp: {ramadan_umrah: ["اور آخری عشرے میں", "رمضان کے آخری دس دنوں میں کیا حکم ہے", "اور آخری دس دنوں میں", "آخری عشرے کا کیا حکم ہے"]}
    }
  },
  zh: {
    pillars: {
      terms: ["五功", "伊斯兰教的支柱"],
      sources: ["《布哈里圣训实录》第 8 条"],
      forms: ["伊斯兰教的五功是念证词、礼拜、缴纳天课、朝觐和在斋月封斋。",
        "伊斯兰教的五功是什么", "伊斯兰教有哪五功", "伊斯兰五功是什么", "伊斯兰教的五大支柱是什么", "伊斯兰教的五个支柱是什么", "伊斯兰教有几个支柱", "五功是什么"]
    },
    pillars_count: {
      terms: ["七大支柱", "七个支柱"],
      sources: ["《布哈里圣训实录》第 8 条"],
      forms: ["伊斯兰教有五功。《布哈里圣训实录》所载的五功是念证词、礼拜、缴纳天课、朝觐和在斋月封斋。",
        "伊斯兰教有七大支柱吗", "伊斯兰教有七个支柱吗", "伊斯兰教有七功吗"]
    },
    hajj_ramadan: {
      terms: ["斋月朝觐", "斋月进行朝觐", "在斋月朝觐"],
      sources: ["伊本·巴兹 · 朝觐的方式（阿拉伯语）", "伊本·巴兹 · 斋月副朝不能代替正朝（阿拉伯语）"],
      forms: ["正朝仪式在伊斯兰历的十二月举行，其中包括十二月初九在阿拉法特驻留。斋月可以进行副朝，奖赏等同于一次正朝，但斋月副朝不能代替有义务完成的正朝。",
        "斋月可以朝觐吗", "可以在斋月朝觐吗", "斋月可以进行朝觐吗", "可以在斋月进行朝觐吗", "斋月可以去朝觐吗", "朝觐在斋月举行吗", "斋月能正朝吗"]
    },
    ablution: {
      terms: ["小净", "小净的步骤"],
      sources: ["《古兰经》筵席章 5:6", "《布哈里圣训实录》第 159 条"],
      forms: ["按奥斯曼传述的小净做法，洗双手，漱口，吸水入鼻并排出；然后洗脸、洗双臂至肘、湿手抹头，再洗双脚至脚踝。",
        "如何做小净", "怎么做小净", "怎样做小净", "小净的步骤是什么", "小净怎么做", "小净的正确做法是什么"]
    },
    khuff_method: {
      terms: ["擦袜", "擦拭袜子", "抹袜"],
      sources: ["伊本·巴兹 · 擦袜的方式（阿拉伯语）", "伊本·巴兹 · 擦拭的次数（阿拉伯语）", "伊本·巴兹 · 擦袜的条件（阿拉伯语）"],
      forms: ["若在保持小净的状态下穿上能覆盖脚部的靴袜或袜子，再做小净时，可用湿手在袜子外面沿脚背各擦一次。用右手擦右脚、左手擦左脚。",
        "做小净时如何擦袜", "小净时怎么擦袜子", "小净时如何擦拭袜子", "如何在小净时擦袜子", "小净时怎样抹袜"]
    },
    newcomer_start: {
      terms: ["接受伊斯兰教", "成为穆斯林", "皈依伊斯兰教"],
      sources: ["扎德指南 · 清真言与入门步骤", "伊本·巴兹 · 如何接受伊斯兰教（阿拉伯语）"],
      forms: ["如果你选择接受伊斯兰教，请在理解其含义的基础上真诚宣读两句见证词：我作证，除安拉外，绝无应受崇拜者；我作证，穆罕默德是安拉的使者。随后可以开始学习小净和每日五番礼拜，相关步骤见入门指南。",
        "如何成为穆斯林", "怎样成为穆斯林", "如何接受伊斯兰教", "如何皈依伊斯兰教", "怎么成为穆斯林", "我想成为穆斯林该怎么做"]
    },
    ramadan_umrah: {
      terms: ["斋月副朝", "斋月做副朝", "在斋月进行副朝"],
      sources: ["伊本·巴兹 · 斋月副朝不能代替正朝（阿拉伯语）"],
      forms: ["可以在斋月进行副朝。可靠圣训提到斋月副朝的奖赏等同于一次正朝。伊本·巴兹解释说，这指奖赏相等，并不免除正朝义务。",
        "斋月可以做副朝吗", "斋月可以进行副朝吗", "可以在斋月做副朝吗", "斋月副朝有什么奖赏", "斋月可以副朝吗"]
    },
    ramadan_umrah_last_ten: {
      terms: ["斋月最后十天"],
      sources: ["伊本·巴兹 · 副朝的最佳时间（阿拉伯语）", "伊本·巴兹 · 斋月副朝不能代替正朝（阿拉伯语）"],
      forms: ["斋月最后十天可以进行副朝。伊本·巴兹认为这段时间是斋月里进行副朝的最佳时段。斋月副朝的奖赏也适用于这段时间，正朝的义务仍然存在。",
        "可以在斋月最后十天做副朝吗", "斋月最后十天可以做副朝吗", "斋月最后十天的副朝有什么奖赏"],
      followUp: {ramadan_umrah: ["斋月最后十天呢", "最后十天呢", "如果是在最后十天呢", "最后十天可以吗"]}
    }
  }
};

function applyZadReviewedTranslations(catalog) {
  for (const [language, records] of Object.entries(zadReviewedTranslations)) {
    for (const [id, translation] of Object.entries(records)) {
      const record = catalog[id];
      if (!record || !translation.forms) continue;
      record[language] = translation.forms;
      record.terms.push(...translation.terms);
      record.localizedSources ??= {};
      record.localizedSources[language] = record.sources.map(([label, url], index) => {
        if (id === "newcomer_start" && index === 0) {
          const root = zadServiceLocale === "ar" ? "../" : "../../";
          const folder = zadServiceLocale === language ? "../" : root + language + "/";
          url = folder + "discover/#discover-" + language + "-shahada";
        }
        return [translation.sources[index] || label, url];
      });
    }
  }
}
