// Each answer is a short summary of the named sources. Direct matches use complete question variants.
const askEvidence = {
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
  ablution: {
    title: "آية الوضوء وصفته · Ablution",
    terms: ["أتوضأ", "الوضوء", "وضوء", "تيمم", "التيمم", "wudu", "ablution", "ablutions", "ablución"],
    sources: [["المائدة ٦ · Qur’an 5:6", "https://quran.com/5/6"], ["صحيح البخاري ١٥٩ · Sahih al-Bukhari 159", "https://sunnah.com/bukhari:159"]],
    ar: ["في صفة الوضوء الواردة عن عثمان: يغسل المتوضئ كفّيه، ويتمضمض ويستنشق وينثر الماء، ويغسل وجهه ويديه إلى المرفقين، ويمسح رأسه، ويغسل رجليه إلى الكعبين.", "كيف أتوضأ", "كيف أتوضأ للصلاة", "ما طريقة الوضوء", "ما هي خطوات الوضوء", "ما صفة الوضوء"],
    en: ["In the documented example, wash the hands, rinse the mouth and nose, wash the face and arms through the elbows, wipe the head, and wash the feet through the ankles.", "how do i perform wudu", "how do i make wudu", "what are the steps of wudu"],
    fr: ["Dans le récit cité, on lave les mains, on rince la bouche et le nez, on lave le visage et les bras jusqu’aux coudes, on passe les mains mouillées sur la tête et on lave les pieds jusqu’aux chevilles.", "comment faire les ablutions", "quelles sont les étapes du wudu"],
    es: ["El relato citado describe lavarse las manos, enjuagarse la boca y la nariz, lavarse la cara y los brazos hasta los codos, pasarse las manos húmedas por la cabeza y lavarse los pies hasta los tobillos.", "cómo hago la ablución", "cuáles son los pasos del wudu"]
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
