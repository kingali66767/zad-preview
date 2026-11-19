// Each answer is a short summary of the named sources. Direct matches use complete question variants.
const hajjRitesSource = ["ابن باز · ما هي أنساك الحج؟", "https://binbaz.org.sa/fatwas/7201/ما-هي-انساك-الحج"];
const ramadanUmrahSource = ["ابن باز · عدم إجزاء العمرة في رمضان عن الحج", "https://binbaz.org.sa/fatwas/6252/عدم-اجزاء-العمرة-في-رمضان-عن-الحج"];
const becomingMuslimSource = ["ابن باز · الأمور التي يُدخل بها في الإسلام", "https://binbaz.org.sa/fatwas/1263/الامور-التي-يدخل-بها-في-الاسلام"];
const wipingCountSource = ["ابن باز · عدد المسح على الخفين", "https://binbaz.org.sa/fatwas/7784/عدد-المسح-على-الخفين"];

const footwearTerms = ["الخفين", "الخف", "الجوربين", "الجوارب", "الشراب"];
const khuffQuestions = forms => forms.flatMap(form => footwearTerms.map(term => form + " " + term));

const askEvidence = {
  newcomer_start: {
    title: "الدخول في الإسلام · Becoming Muslim",
    terms: ["الدخول في الإسلام", "أدخل الإسلام", "اعتناق الإسلام", "أعتنق الإسلام", "كيف أسلم", "become muslim", "convert to islam", "devenir musulman", "convertirse al islam"],
    sources: [
      ["دليل زاد · الشهادتان والخطوات الأولى", "../discover/#discover-ar-shahada"], becomingMuslimSource
    ],
    localizedSources: {
      en: [["Zad guide · The Shahada and first steps", "../discover/#discover-en-shahada"], becomingMuslimSource],
      fr: [["Guide Zad · La chahada et les premiers pas", "../discover/#discover-fr-shahada"], becomingMuslimSource],
      es: [["Guía de Zad · La shahada y los primeros pasos", "../discover/#discover-es-shahada"], becomingMuslimSource]
    },
    ar: ["إن اخترت اعتناق الإسلام، فانطق بالشهادتين عن فهم وصدق: أشهد أن لا إله إلا الله، وأشهد أن محمدًا رسول الله. ثم ابدأ بتعلّم الوضوء والصلوات الخمس. يشرح دليل زاد معنى الشهادتين والخطوات الأولى بعدهما.", "كيف أدخل الإسلام", "كيف أصبح مسلمًا", "كيف أعتنق الإسلام", "أنا غير مسلم وأريد الدخول في الإسلام، كيف أبدأ"],
    en: ["If you choose to become Muslim, say the testimony of faith sincerely and with understanding: I bear witness that none is worthy of worship except God, and I bear witness that Muhammad is the Messenger of God. Then begin learning how to perform wudu and the five daily prayers. The linked guide walks you through the first steps.", "how do i become muslim", "how can i convert to islam"],
    fr: ["Si vous choisissez d’embrasser l’islam, prononcez l’attestation de foi avec sincérité et en comprenant son sens : j’atteste que nul ne mérite d’être adoré en dehors de Dieu et que Muhammad est le messager de Dieu. Commencez ensuite à apprendre les ablutions et les cinq prières quotidiennes. Le guide présente les premières étapes.", "comment devenir musulman", "comment me convertir à l’islam"],
    es: ["Si decides abrazar el islam, pronuncia el testimonio de fe con sinceridad y comprensión: doy testimonio de que solo Dios merece ser adorado y de que Muhammad es Su mensajero. Después, empieza a aprender la ablución y las cinco oraciones diarias. La guía presenta los primeros pasos.", "cómo me convierto al islam", "cómo puedo hacerme musulmán"]
  },
  shahada: {
    title: "معنى الشهادتين · Testimony of faith",
    terms: ["الشهادتين", "الشهادة", "شهادة", "shahada", "shahadah", "chahada"],
    sources: [["صحيح البخاري ٨ · Sahih al-Bukhari 8", "https://sunnah.com/bukhari:8"]],
    ar: ["معنى الشهادتين إفراد الله بالعبادة والإقرار بأن محمدًا رسول الله.", "ما معنى الشهادتين", "ما معنى الشهادة في الإسلام", "ما معنى شهادة أن لا إله إلا الله وأن محمدا رسول الله"],
    en: ["The testimony of faith affirms that God alone is worthy of worship and that Muhammad is His messenger.", "what does the shahada mean", "what is the meaning of the shahada"],
    fr: ["La chahada atteste que Dieu seul mérite d’être adoré et que Muhammad est Son messager.", "que signifie la chahada", "quel est le sens de la chahada"],
    es: ["La shahada afirma que solo Dios merece ser adorado y que Muhammad es Su mensajero.", "qué significa la shahada", "cuál es el significado de la shahada"]
  },
  pillars: {
    title: "أركان الإسلام · Pillars of Islam",
    terms: ["أركان الإسلام", "أركان", "pillars", "piliers", "pilares"],
    sources: [["صحيح البخاري ٨ · Sahih al-Bukhari 8", "https://sunnah.com/bukhari:8"]],
    ar: ["أركان الإسلام المذكورة في الحديث هي الشهادتان، وإقامة الصلاة، وإيتاء الزكاة، والحج، وصوم رمضان.", "ما أركان الإسلام", "ما هي أركان الإسلام", "ما هي أركان الإسلام الخمسة", "كم أركان الإسلام", "عدد أركان الإسلام"],
    en: ["The five pillars are the testimony of faith, prayer, zakat, pilgrimage to Mecca and fasting during Ramadan.", "what are the five pillars of islam", "what are the pillars of islam"],
    fr: ["Les cinq piliers sont l’attestation de foi, la prière, la zakat, le pèlerinage à La Mecque et le jeûne du Ramadan.", "quels sont les cinq piliers de l’islam"],
    es: ["Los cinco pilares son el testimonio de fe, la oración, el zakat, la peregrinación a La Meca y el ayuno de Ramadán.", "cuáles son los cinco pilares del islam"]
  },
  pillars_count: {
    title: "عدد أركان الإسلام · Number of pillars",
    correction: true,
    terms: ["أركان الإسلام السبعة", "أركان الإسلام سبعة", "seven pillars"],
    sources: [["صحيح البخاري ٨ · Sahih al-Bukhari 8", "https://sunnah.com/bukhari:8"]],
    ar: ["أركان الإسلام خمسة. ثبت في صحيح البخاري أن النبي ﷺ ذكر الشهادتين، وإقامة الصلاة، وإيتاء الزكاة، والحج، وصوم رمضان.", "ما أركان الإسلام السبعة", "ما هي أركان الإسلام السبعة", "هل أركان الإسلام سبعة", "أركان الإسلام سبعة", "هل أركان الإسلام 7"],
    en: ["Islam has five pillars, as listed in the cited hadith: the testimony of faith, prayer, zakat, Hajj, and fasting Ramadan.", "what are the seven pillars of islam", "are there seven pillars of islam"],
    fr: ["L’islam compte cinq piliers, selon le hadith cité : l’attestation de foi, la prière, la zakat, le hajj et le jeûne du Ramadan.", "quels sont les sept piliers de l’islam", "y a t il sept piliers de l’islam"],
    es: ["El islam tiene cinco pilares según el hadiz citado: el testimonio de fe, la oración, el zakat, el hach y el ayuno de Ramadán.", "cuáles son los siete pilares del islam", "hay siete pilares del islam"]
  },
  hajj_time: {
    title: "وقت أداء الحج · When Hajj is performed",
    terms: ["الحج", "حج", "أحج", "عرفه", "hajj", "hach"],
    sources: [hajjRitesSource],
    ar: ["تُؤدّى مناسك الحج في أيامها من ذي الحجة، ومنها الوقوف بعرفة في اليوم التاسع من الشهر.", "متى يؤدى الحج", "متى يكون الحج", "في أي شهر يؤدى الحج", "في أي شهر الحج", "متى يقف الحجاج بعرفة"],
    en: ["The Hajj rites take place in Dhul-Hijjah, including standing at Arafat on the ninth day.", "when is hajj performed", "which month is hajj in"],
    fr: ["Les rites du hajj se déroulent en dhou al-hijja et comprennent la station à Arafat le neuvième jour.", "quand accomplit on le hajj", "quand a lieu le hajj"],
    es: ["Los ritos del hach se realizan en Dhul-Hiyya e incluyen la estancia en Arafat el noveno día.", "cuándo se realiza el hach", "en qué mes se realiza el hach"]
  },
  hajj_ramadan: {
    title: "الحج والعمرة في رمضان · Hajj and Umrah in Ramadan",
    correction: true,
    terms: ["الحج في رمضان", "حج رمضان", "أحج في رمضان", "hajj in ramadan", "hajj pendant le ramadan", "hach en ramadán"],
    sources: [hajjRitesSource, ramadanUmrahSource],
    ar: ["لا، لا يُؤدّى الحج في رمضان. مناسك الحج تُؤدّى في ذي الحجة، والوقوف بعرفة في اليوم التاسع منه. ويجوز أداء العمرة في رمضان، وهي تعدل حجة في الأجر، ولا تُسقط فريضة الحج.", "هل يجوز الحج في رمضان", "هل يصح الحج في رمضان", "هل يمكن الحج في رمضان", "الحج في رمضان", "هل الحج في رمضان جائز", "هل الحج في رمضان", "هل الحج يكون في رمضان", "هل يكون الحج في رمضان", "هل يؤدى الحج في رمضان", "هل أقدر أحج في رمضان", "أقدر أحج برمضان", "يصير أحج في رمضان", "هل يجوز أن أحج في رمضان", "هل يجوز الحج برمضان", "أليس الحج في رمضان", "الحج في رمضان صح", "كيف أحج في رمضان", "متى الحج في رمضان"],
    en: ["Hajj is performed in Dhul-Hijjah, with standing at Arafat on the ninth day. Umrah can be performed in Ramadan and carries the reward of a Hajj. The obligation to perform Hajj still stands.", "can i perform hajj in ramadan", "can you do hajj during ramadan", "is hajj in ramadan", "how do i perform hajj in ramadan"],
    fr: ["Le hajj a lieu en dhou al-hijja, avec la station à Arafat le neuvième jour. La omra peut se faire pendant le Ramadan et comporte la récompense d’un hajj. L’obligation du hajj demeure.", "peut on faire le hajj pendant le ramadan", "le hajj a t il lieu pendant le ramadan"],
    es: ["El hach se realiza en Dhul-Hiyya, con la estancia en Arafat el noveno día. Se puede hacer la umra en Ramadán y obtener la recompensa de un hach. La obligación de realizar el hach sigue vigente.", "se puede hacer el hach en ramadán", "puedo hacer el hach en ramadán"]
  },
  hajj_vow: {
    title: "نذر الحج وصيغته · Wording of a vow to perform Hajj",
    clarification: true,
    terms: ["نذرت أن أحج", "نذرت أحج", "نذر الحج", "نذرت الحج", "vowed to perform hajj", "vow to perform hajj", "vœu de faire le hajj", "voto de realizar el hach"],
    sources: [
      ["ابن باز · الفرق بين النذر بالشيء ومجرد النية به", "https://binbaz.org.sa/fatwas/10786/الفرق-بين-النذر-بالشيء-ومجرد-النية-به"],
      hajjRitesSource
    ],
    ar: ["ما صيغة النذر التي تلفّظت بها؟ وهل حددت وقتًا أو علّقته على شرط؟ اذكر اللفظ كما قلته عند سؤال جهة إفتاء، لأن الحكم يتوقف على هذه التفاصيل. وإذا قصدت وقت المناسك نفسها، فهي في ذي الحجة.", "نذرت أن أحج في رمضان هل يلزمني", "نذرت أحج في رمضان هل يلزمني الوفاء بالنذر", "نذرت الحج فما الحكم"],
    en: ["What exact words did you say? Did you set a time or attach a condition? Give that wording to a qualified scholar so they can advise on your case. The Hajj rites take place in Dhul-Hijjah.", "i vowed to perform hajj in ramadan what should i do"],
    fr: ["Quels mots exacts avez-vous prononcés ? Avez-vous fixé une date ou posé une condition ? Donnez ces précisions à une personne qualifiée avant de tirer une conclusion sur votre cas. Les rites du hajj ont lieu en dhou al-hijja.", "j’ai fait le vœu de faire le hajj pendant le ramadan que dois je faire"],
    es: ["¿Qué palabras exactas pronunciaste? ¿Fijaste una fecha o pusiste alguna condición? Explica estos detalles a una persona cualificada para que valore tu caso. Los ritos del hach se realizan en Dhul-Hiyya.", "hice un voto de realizar el hach en ramadán qué hago"]
  },
  ramadan_umrah: {
    title: "فضل العمرة في رمضان · Umrah in Ramadan",
    terms: ["العمرة في رمضان", "عمرة رمضان", "العمرة", "والعمرة", "اعتمر", "umrah", "omra", "umra"],
    sources: [ramadanUmrahSource],
    ar: ["نعم، تجوز العمرة في رمضان. وفي الحديث الصحيح أن العمرة في رمضان تعدل حجة. وبيّن الشيخ ابن باز أن ذلك في الأجر، وأنها لا تُجزئ عن الحج الواجب.", "هل يجوز أداء العمرة في رمضان", "هل يجوز العمرة في رمضان", "هل أقدر أعتمر في رمضان", "ما فضل العمرة في رمضان", "هل العمرة في رمضان تعدل حجة"],
    en: ["Umrah can be performed during Ramadan. The cited hadith promises the reward of a Hajj. Ibn Baz explains that obligatory Hajj still has to be performed.", "can i perform umrah in ramadan", "what is the reward for umrah in ramadan"],
    fr: ["La omra peut se faire pendant le Ramadan. Le hadith cité lui attribue la récompense d’un hajj. Ibn Baz explique que l’obligation du hajj demeure.", "peut on faire la omra pendant le ramadan"],
    es: ["Se puede hacer la umra durante Ramadán. El hadiz citado le atribuye la recompensa de un hach. Ibn Baz explica que sigue la obligación de realizar el hach.", "puedo hacer la umra en ramadán", "se puede hacer la umra en ramadán"]
  },
  ramadan_umrah_last_ten: {
    title: "العمرة في العشر الأواخر · Umrah in the last ten of Ramadan",
    terms: ["العمرة في العشر الأواخر", "عمرة العشر الأواخر", "أعتمر في العشر الأواخر", "umrah in the last ten", "omra pendant les dix derniers", "umra en los últimos diez"],
    sources: [
      ["ابن باز · أفضل أوقات العمرة", "https://binbaz.org.sa/fatwas/9552/افضل-اوقات-العمرة"],
      ramadanUmrahSource
    ],
    followUp: {
      ramadan_umrah: [
        "طيب وإذا كان في العشر الأواخر", "طيب في العشر الأواخر", "طيب وإذا كانت في العشر الأواخر",
        "وإذا كان في العشر الأواخر", "وإذا كانت في العشر الأواخر", "وإذا اعتمرت في العشر الأواخر",
        "وهل في العشر الأواخر", "في العشر الأواخر", "ماذا عن العشر الأواخر"
      ]
    },
    ar: ["تجوز العمرة في العشر الأواخر من رمضان، ورجّح الشيخ ابن باز أنها أفضل من العمرة في بقية الشهر. ويشملها فضل العمرة في رمضان، مع بقاء فريضة الحج على من وجبت عليه.", "هل يجوز أداء العمرة في العشر الأواخر من رمضان", "ما فضل العمرة في العشر الأواخر من رمضان", "هل العمرة في العشر الأواخر أفضل"],
    en: ["You can perform Umrah in the last ten days of Ramadan. Ibn Baz considered this part of the month the best time for it. The reward mentioned for Umrah in Ramadan also applies, and the obligation to perform Hajj still stands.", "can i perform umrah in the last ten days of ramadan"],
    fr: ["La omra peut se faire pendant les dix derniers jours du Ramadan. Ibn Baz considérait que c’était le meilleur moment du mois pour l’accomplir. Le mérite de la omra du Ramadan s’y applique et l’obligation du hajj demeure.", "peut on faire la omra pendant les dix derniers jours du ramadan"],
    es: ["Se puede hacer la umra en los últimos diez días de Ramadán. Ibn Baz consideraba que era el mejor momento del mes para hacerla. Se aplica el mérito de la umra en Ramadán y sigue vigente la obligación de hacer el hach.", "puedo hacer la umra en los últimos diez días de ramadán"]
  },
  umrah_hajj_obligation: {
    title: "هل تسقط العمرة فريضة الحج؟ · Umrah and the obligation of Hajj",
    correction: true,
    terms: ["تجزئ عن الحج", "تغني عن الحج", "بدل الحج", "تسقط فريضة الحج", "replace hajj"],
    sources: [ramadanUmrahSource],
    ar: ["لا، العمرة في رمضان لا تُجزئ عن فريضة الحج. شرح الشيخ ابن باز أن مُعادلتها للحج المذكورة في الحديث تتعلق بالأجر. ومن وجب عليه الحج بقي مطالبًا بأدائه.", "هل تجزئ العمرة في رمضان عن الحج", "هل العمرة في رمضان تغني عن الحج", "هل تكفي العمرة في رمضان عن الحج", "هل العمرة في رمضان تسقط فريضة الحج", "هل العمرة في رمضان تجزئ عن الحج", "هل تغني عمرة رمضان عن الحج", "هل العمرة في رمضان بدل الحج"],
    en: ["Umrah in Ramadan does not fulfil the obligation of Hajj. Ibn Baz explains that the hadith refers to the reward of Hajj.", "does umrah in ramadan replace hajj", "does ramadan umrah count as obligatory hajj"],
    fr: ["La omra pendant le Ramadan n’acquitte pas l’obligation du hajj. Ibn Baz explique que le hadith évoque la récompense du hajj.", "la omra du ramadan remplace t elle le hajj obligatoire"],
    es: ["La umra en Ramadán no cumple la obligación del hach. Ibn Baz explica que el hadiz se refiere a la recompensa del hach.", "la umra en ramadán sustituye al hach obligatorio"]
  },
  ablution: {
    title: "آية الوضوء وصفته · Ablution",
    terms: ["أتوضأ", "الوضوء", "وضوء", "تيمم", "التيمم", "wudu", "ablution", "ablutions", "ablución"],
    sources: [["المائدة ٦ · Qur’an 5:6", "https://quran.com/5/6"], ["صحيح البخاري ١٥٩ · Sahih al-Bukhari 159", "https://sunnah.com/bukhari:159"]],
    ar: ["في صفة الوضوء الواردة عن عثمان: يغسل المتوضئ كفّيه، ويتمضمض ويستنشق وينثر الماء، ويغسل وجهه ويديه إلى المرفقين، ويمسح رأسه، ويغسل رجليه إلى الكعبين.", "كيف أتوضأ", "كيف أتوضأ للصلاة", "ما طريقة الوضوء", "ما هي خطوات الوضوء", "ما صفة الوضوء"],
    en: ["In the documented example, wash the hands, rinse the mouth and nose, wash the face and arms through the elbows, wipe the head, and wash the feet through the ankles.", "how do i perform wudu", "how do i make wudu", "what are the steps of wudu"],
    fr: ["Dans le récit cité, on lave les mains, on rince la bouche et le nez, on lave le visage et les bras jusqu’aux coudes, on passe les mains mouillées sur la tête et on lave les pieds jusqu’aux chevilles.", "comment faire les ablutions", "quelles sont les étapes du wudu"],
    es: ["El relato citado describe lavarse las manos, enjuagarse la boca y la nariz, lavarse la cara y los brazos hasta los codos, pasarse las manos húmedas por la cabeza y lavarse los pies hasta los tobillos.", "cómo hago la ablución", "cuáles son los pasos del wudu"]
  },
  khuff_method: {
    title: "طريقة المسح على الخفين والجوارب · How to wipe over footwear in wudu",
    terms: [...khuffQuestions(["المسح على", "أمسح على"]), "الخفين", "الجوربين", "الجوارب", "wipe over socks", "wipe over khuffs"],
    sources: [
      ["ابن باز · كيفية المسح على الجوارب", "https://binbaz.org.sa/fatwas/20314/كيفية-المسح-على-الجوارب"],
      wipingCountSource,
      ["ابن باز · شروط المسح على الخفين أو الجوربين", "https://binbaz.org.sa/fatwas/12430/شروط-المسح-على-الخفين-او-الجوربين"]
    ],
    ar: [
      "في الوضوء، إذا لبست الخفين أو الجوربين الساترين على طهارة، امسح بيدك المبللة على أعلى كل قدم فوق الخف أو الجورب مرة واحدة. امسح اليمنى بيدك اليمنى واليسرى بيدك اليسرى، والمسح يكون على الظاهر.",
      ...khuffQuestions(["كيف أمسح على", "كيف المسح على", "طريقة المسح على", "ما طريقة المسح على", "كيفية المسح على", "ما كيفية المسح على", "صفة المسح على", "ما صفة المسح على"]),
      "كيف أمسح عالخفين", "كيف أمسح عالجوارب", "هل المسح على الخفين على الظاهر أم الباطن"
    ],
    en: ["If you put on the covering footwear while ritually pure, wipe once over the top of each foot during wudu. Use your wet right hand for the right foot and your left hand for the left foot.", "how do i wipe over socks during wudu", "how do i wipe over khuffs during wudu"],
    fr: ["Si vous avez enfilé des chaussettes couvrantes en état de pureté rituelle, passez une fois la main humide sur le dessus de chaque pied pendant les ablutions. Utilisez la main droite pour le pied droit, et la gauche pour le pied gauche.", "comment essuyer les chaussettes pendant les ablutions"],
    es: ["Si te pusiste los calcetines que cubren los pies en estado de pureza ritual, pasa una vez la mano húmeda por la parte superior de cada pie al hacer la ablución. Usa la mano derecha para el pie derecho y la izquierda para el izquierdo.", "cómo paso la mano sobre los calcetines durante la ablución"]
  },
  khuff_count: {
    title: "عدد مرات المسح على الخفين · Number of wipes over footwear",
    terms: khuffQuestions(["عدد مرات المسح على", "كم مرة أمسح على"]),
    sources: [wipingCountSource],
    ar: [
      "بحسب فتوى الشيخ ابن باز، يمسح المتوضئ كل خف مرة واحدة، ولا حاجة إلى تكرار المسح ثلاث مرات.",
      ...khuffQuestions(["كم مرة أمسح على", "كم عدد مرات المسح على", "عدد مرات المسح على"]),
      "هل أمسح على الخفين ثلاث مرات", "أمسح على الخفين مرة أو ثلاث"
    ],
    en: ["According to Ibn Baz, wipe each khuff once during wudu. There is no need to repeat the wipe three times.", "how many times should i wipe over khuffs", "do i wipe over khuffs three times"],
    fr: ["Selon Ibn Baz, un passage de la main sur chaque khuff suffit pendant les ablutions. Il est inutile de répéter le geste trois fois.", "combien de fois passer la main sur les khuffs"],
    es: ["Según Ibn Baz, basta con pasar la mano una vez por cada khuff (calzado que cubre el pie) durante la ablución. No hace falta hacerlo tres veces.", "cuántas veces debo pasar la mano sobre los khuff"]
  },
  khuff_duration: {
    title: "مدة المسح على الخفين والجوارب · Time limit for wiping over footwear",
    terms: khuffQuestions(["مدة المسح على", "عدد أيام المسح على", "يبدأ المسح على"]),
    sources: [
      ["ابن باز · وقت بدء المسح على الخفين", "https://binbaz.org.sa/fatwas/12763/وقت-بدء-المسح-على-الخفين"],
      ["ابن باز · المسح على الشراب", "https://binbaz.org.sa/fatwas/3666/المسح-على-الشراب"]
    ],
    ar: [
      "مدة المسح يوم وليلة للمقيم، وثلاثة أيام بلياليها للمسافر. وبحسب فتوى الشيخ ابن باز تبدأ من أول مسح بعد الحدث، لا من وقت اللبس.",
      ...khuffQuestions(["كم مدة المسح على", "مدة المسح على", "ما مدة المسح على", "متى يبدأ المسح على", "متى تبدأ مدة المسح على"]),
      "كم مدة المسح على الخفين للمسافر", "كم مدة المسح على الخفين للمقيم"
    ],
    en: ["The time limit is one day and night for a resident and three days and nights for a traveller. Ibn Baz starts the period at the first wipe after wudu has been broken.", "how long can i wipe over socks during wudu"],
    fr: ["La durée est d’un jour et d’une nuit pour le résident et de trois jours et trois nuits pour le voyageur. Selon Ibn Baz, elle commence au premier essuyage après la perte des ablutions.", "combien de temps peut on essuyer les chaussettes pendant les ablutions"],
    es: ["El plazo es de un día y una noche para el residente y de tres días y tres noches para el viajero. Según Ibn Baz, empieza con el primer pasado de la mano después de perder la ablución.", "cuánto tiempo puedo pasar la mano sobre los calcetines durante la ablución"]
  },
  khuff_conditions: {
    title: "شروط المسح على الخفين والجوارب · Conditions for wiping over footwear",
    terms: [...khuffQuestions(["شروط المسح على"]), "لبستهما على غير طهارة"],
    sources: [
      ["ابن باز · شروط المسح على الخفين أو الجوربين", "https://binbaz.org.sa/fatwas/12430/شروط-المسح-على-الخفين-او-الجوربين"],
      ["ابن باز · المسح على الشراب", "https://binbaz.org.sa/fatwas/3666/المسح-على-الشراب"]
    ],
    ar: [
      "من شروط المسح عند الشيخ ابن باز أن تلبس الخفين أو الجوربين على طهارة، وأن يسترا القدمين مع الكعبين. ويكون المسح في الوضوء من الحدث الأصغر وفي المدة المحددة.",
      ...khuffQuestions(["ما شروط المسح على", "شروط المسح على"]),
      "هل يجوز لبس الخفين بدون وضوء ثم المسح عليهما"
    ],
    en: ["According to Ibn Baz, the footwear must be put on in a state of ritual purity and cover the feet including the ankles. Wiping applies in wudu after minor ritual impurity, within the time limit.", "what are the conditions for wiping over socks"],
    fr: ["Selon Ibn Baz, les chaussettes doivent être enfilées en état de pureté rituelle et couvrir les pieds jusqu’aux chevilles incluses. L’essuyage s’applique aux ablutions après une impureté mineure, pendant la durée prévue.", "quelles sont les conditions pour essuyer les chaussettes"],
    es: ["Según Ibn Baz, hay que ponerse los calcetines en estado de pureza ritual y deben cubrir los pies y los tobillos. Pasar la mano sobre ellos se aplica en la ablución tras una impureza ritual menor, dentro del plazo establecido.", "cuáles son las condiciones para pasar la mano sobre los calcetines"]
  },
  missed_prayer: {
    title: "الصلاة عند النوم أو النسيان · Missed prayer due to sleep or forgetfulness",
    terms: ["نسيت الصلاة", "نمت عن الصلاة", "فاتتني", "نسيان الصلاة", "forgot to pray", "missed prayer", "oublié", "olvidé"],
    sources: [["صحيح البخاري ٥٩٧ · Sahih al-Bukhari 597", "https://sunnah.com/bukhari:597"], ["صحيح مسلم ٦٨٤ أ · Sahih Muslim 684a", "https://sunnah.com/muslim:684a"]],
    ar: ["من نسي الصلاة يصليها حين يذكرها، ومن نام عنها يصليها حين يستيقظ، كما ورد في الحديثين المرتبطين.", "ماذا أفعل إذا نسيت الصلاة", "إذا نمت عن الصلاة ماذا أفعل", "ماذا أفعل إذا نسيت صلاة أو نمت عنها"],
    en: ["If you miss a prayer because you forgot it or were asleep, pray when you remember it or wake up.", "what if i forgot to pray", "what if i missed a prayer because i was asleep"],
    fr: ["Si l’on manque une prière par oubli ou parce qu’on dormait, on l’accomplit dès qu’on s’en souvient ou dès le réveil.", "que faire si j’ai oublié de prier", "que faire si j’ai manqué une prière parce que je dormais"],
    es: ["Si se pierde una oración por olvido o por estar dormido, se realiza al recordarla o al despertar.", "qué hago si olvidé rezar", "qué hago si perdí una oración por estar dormido"]
  },
  fasting_forgetful: {
    title: "الأكل أو الشرب نسيانًا في الصيام · Forgetting during a fast",
    terms: ["الصيام", "الصوم", "صائم", "صمت", "fasting", "fast", "jeûne", "ayuno", "ayunaba"],
    sources: [["صحيح البخاري ١٩٣٣ · Sahih al-Bukhari 1933", "https://sunnah.com/bukhari:1933"]],
    ar: ["إذا أكل الصائم أو شرب ناسيًا فليتم صومه، كما جاء في حديث أبي هريرة في المصدر.", "هل يبطل صومي إذا أكلت ناسيا"],
    en: ["The cited hadith tells a fasting person who forgets and eats or drinks to complete the fast.", "what if i forget and eat while fasting", "what if i forget and drink while fasting"],
    fr: ["Le hadith cité demande à la personne qui mange ou boit par oubli de poursuivre son jeûne.", "que faire si je mange par oubli pendant le jeûne"],
    es: ["El hadiz citado indica que quien come o bebe por olvido mientras ayuna debe continuar su ayuno.", "qué hago si comí por olvido mientras ayunaba"]
  },
  zakat_charity: {
    title: "الزكاة والصدقة التطوعية · Zakat and voluntary charity",
    terms: ["الزكاة", "زكاة", "الصدقة", "صدقه", "zakat", "sadaqa", "charity", "aumône", "caridad"],
    sources: [["التوبة ٦٠ · Qur’an 9:60", "https://quran.com/9/60"], ["صحيح البخاري ٨ · Sahih al-Bukhari 8", "https://sunnah.com/bukhari:8"], ["صحيح البخاري ١٤١٧ · Sahih al-Bukhari 1417", "https://sunnah.com/bukhari:1417"]],
    ar: ["الزكاة واجبة عند تحقق شروطها ولها مصارف محددة. والمقصود هنا بالصدقة التطوّعية البذل المستحب، ولو كان قليلًا.", "ما الفرق بين الزكاة والصدقة", "وش الفرق بين الزكاة والصدقة", "ايش الفرق بين الزكاة والصدقة", "ما الفرق بين الزكاة والصدقة التطوعية"],
    en: ["Zakat is obligatory when its conditions are met and has specified recipients. Voluntary charity is encouraged, even in small amounts.", "what is the difference between zakat and sadaqah", "what is the difference between zakat and charity"],
    fr: ["La zakat est obligatoire lorsque ses conditions sont remplies et concerne des bénéficiaires définis. L’aumône volontaire est encouragée, même si elle est modeste.", "quelle est la différence entre la zakat et l’aumône"],
    es: ["El zakat es obligatorio cuando se cumplen sus condiciones y tiene beneficiarios definidos. Se anima a dar caridad voluntaria incluso en cantidades pequeñas.", "cuál es la diferencia entre el zakat y la caridad"]
  },
  zakat_debt_land: {
    title: "الزكاة مع وجود دين أو أرض · Zakat when debts or land are involved",
    clarification: true,
    terms: ["علي دين", "زكاة الأرض", "زكاة الأراضي", "زكاة المال مع وجود دين", "zakat on land", "zakat with debt", "zakat sur un terrain", "zakat sobre un terreno"],
    sources: [
      ["ابن باز · حكم إخراج الزكاة إذا كان عليك دين", "https://binbaz.org.sa/fatwas/5726/حكم-اخراج-الزكاة-اذا-كان-عليكم-دين"],
      ["ابن باز · حكم الزكاة في الأرض غير المعدة للبيع", "https://binbaz.org.sa/fatwas/5808/حكم-الزكاة-في-الارض-غير-المعدة-للبيع"]
    ],
    ar: ["هل تقصد زكاة المال الذي عندك مع وجود دين عليك، أم زكاة الأرض نفسها؟ إذا كانت المسألة عن الأرض، فاذكر نوعها وهل هي للتجارة أو للسكن أو للاستعمال. وعند مراجعة جهة إفتاء، وضّح هل الدين عليك أم لك، وما المال الذي تسأل عن زكاته.", "هل تجب علي زكاة المال إذا علي دين وعندي أرض", "هل تجب علي الزكاة إذا علي دين ولدي أرض", "علي دين وعندي أرض كيف أعرف زكاتي"],
    en: ["Are you asking about zakat on the money you hold while owing a debt, or about zakat on the land itself? If the question concerns land, explain whether it is held for trade, housing, or another use. Tell a qualified scholar what asset you mean and whether you owe the debt or someone owes it to you.", "do i owe zakat if i have a debt and own land"],
    fr: ["La question porte-t-elle sur la zakat de votre argent alors que vous avez une dette, ou sur celle du terrain lui-même ? Précisez si le terrain est destiné à la revente, à l’habitation ou à un autre usage. Un spécialiste aura besoin de savoir quel bien est concerné et qui doit la dette à qui.", "dois je payer la zakat si j’ai une dette et un terrain"],
    es: ["¿Preguntas por el zakat del dinero que tienes mientras debes una deuda, o por el del propio terreno? Indica si el terreno se destina a la venta, a la vivienda o a otro uso. Al consultar a un especialista, explica de qué bien se trata y si tú debes el dinero o alguien te lo debe.", "debo pagar el zakat si tengo una deuda y un terreno"]
  },
  after_prayer: {
    title: "التسبيح بعد الصلاة · Remembrance after prayer",
    terms: ["بعد الصلاة", "بعد التسليم", "أذكار", "اذكار", "after prayer", "dhikr", "après la prière", "después de rezar"],
    sources: [["صحيح مسلم ٥٩٧ أ · Sahih Muslim 597a", "https://sunnah.com/muslim:597a"]],
    ar: ["من الذكر الوارد بعد الصلاة: التسبيح والتحميد والتكبير، كلٌّ ثلاثًا وثلاثين مرة، ثم إتمام المائة بالتهليل بالصيغة المذكورة في الحديث.", "ما عدد التسبيح بعد الصلاة", "كم مرة أسبح بعد الصلاة", "ما ذكر التسبيح بعد الصلاة"],
    en: ["One documented form after prayer is to say Subhan Allah, Alhamdulillah and Allahu Akbar 33 times each, then complete the hundred with the testimony of God’s oneness as worded in the hadith.", "how many times do i say tasbih after prayer"],
    fr: ["Une formule rapportée consiste à dire Subhan Allah, Alhamdulillah et Allahu Akbar 33 fois chacun après la prière, puis à compléter la centaine par la formule d’unicité donnée dans le hadith.", "combien de fois dire subhan allah après la prière"],
    es: ["Una forma documentada tras la oración es decir Subhan Allah, Alhamdulillah y Allahu Akbar 33 veces cada uno y completar cien con la fórmula de unicidad que recoge el hadiz.", "cuántas veces digo subhan allah después de rezar"]
  },
  quran_recitation: {
    title: "مهارة قراءة القرآن ومشقّتها · Qur’an recitation",
    terms: ["القرآن", "قرآن", "تلاوة", "quran", "qur an", "coran", "corán"],
    sources: [["صحيح مسلم ٧٩٨ أ · Sahih Muslim 798a", "https://sunnah.com/muslim:798a"]],
    ar: ["ذكر الحديث فضل الماهر بالقرآن، وأن من يقرؤه ويتتعتع فيه وهو عليه شاق له أجران.", "هل أؤجر على قراءة القرآن مع صعوبة التلاوة", "ما أجر من يقرأ القرآن بصعوبة"],
    en: ["The hadith describes the merit of skilled Qur’an recitation and says a person who recites with difficulty receives two rewards.", "what if i find reciting the quran difficult"],
    fr: ["Le hadith mentionne le mérite de la récitation maîtrisée et indique que la personne qui récite avec difficulté reçoit deux récompenses.", "quel mérite a la récitation difficile du coran"],
    es: ["El hadiz menciona el mérito de recitar con soltura y afirma que quien recita con dificultad recibe dos recompensas.", "qué recompensa tiene quien recita el corán con dificultad"]
  }
};
