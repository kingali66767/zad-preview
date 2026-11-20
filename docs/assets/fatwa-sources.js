// Official archives. Excerpts appear only for approved full-question matches.
const fatwaScholars = {
  "ibn-baz": "الشيخ عبد العزيز بن باز",
  "ibn-uthaymeen": "الشيخ محمد بن صالح العثيمين"
};

const fatwaSources = [
  {"id": "baz-2243", "title": "الصواب في عدد مسح الرأس أثناء الوضوء", "url": "https://binbaz.org.sa/fatwas/2243/%D8%A7%D9%84%D8%B5%D9%88%D8%A7%D8%A8-%D9%81%D9%8A-%D8%B9%D8%AF%D8%AF-%D9%85%D8%B3%D8%AD-%D8%A7%D9%84%D8%B1%D8%A7%D8%B3-%D8%A7%D8%AB%D9%86%D8%A7%D8%A1-%D8%A7%D9%84%D9%88%D8%B6%D9%88%D8%A1", "category": "الطهارة", "tags": ["مسح الرأس", "كم مرة امسح راسي", "عدد مسح الراس"], "scholar": "ibn-baz", "format": "written", "excerpt": {"text": "الصواب: مرة واحدة، كان النبي يمسح مسحة واحدة", "questions": ["كم مرة يمسح الرأس في الوضوء", "كم مرة امسح راسي في الوضوء", "ما عدد مسح الرأس في الوضوء"]}},
  {"id": "baz-1548", "title": "بيان كيفية التيمم", "url": "https://binbaz.org.sa/fatwas/1548/%D8%A8%D9%8A%D8%A7%D9%86-%D9%83%D9%8A%D9%81%D9%8A%D8%A9-%D8%A7%D9%84%D8%AA%D9%8A%D9%85%D9%85", "category": "الطهارة", "tags": ["التيمم", "اتيمم", "تيمم"], "scholar": "ibn-baz", "format": "written", "excerpt": {"text": "المشروع ضربة واحدة للوجه والكفين، وصفة ذلك أنه يضرب التراب بيديه ضربة واحدة، ثم يمسح بهما وجهه وكفيه", "questions": ["ما كيفية التيمم", "كيف أتيمم", "ما صفة التيمم", "كيف يكون التيمم"]}},
  {
    id: "baz-20314",
    title: "كيفية المسح على الجوارب",
    url: "https://binbaz.org.sa/fatwas/20314/كيفية-المسح-على-الجوارب",
    category: "الطهارة",
    tags: ["المسح على الخفين", "المسح على الجوارب", "المسح على الجوربين", "المسح على الشراب", "الخفين", "الجوربين"],
    scholar: "ibn-baz",
    format: "written"
  },
  {
    id: "baz-12763",
    title: "وقت بدء المسح على الخفين",
    url: "https://binbaz.org.sa/fatwas/12763/وقت-بدء-المسح-على-الخفين",
    category: "الطهارة",
    tags: ["مدة المسح على الخفين", "مدة المسح على الجوارب", "مدة المسح على الجوربين", "وقت المسح على الخفين"],
    scholar: "ibn-baz",
    format: "written"
  },
  {
    id: "baz-12430",
    title: "شروط المسح على الخفين أو الجوربين",
    url: "https://binbaz.org.sa/fatwas/12430/شروط-المسح-على-الخفين-او-الجوربين",
    category: "الطهارة",
    tags: ["شروط المسح على الخفين", "شروط المسح على الجوارب", "شروط المسح على الجوربين", "لبست الجوربين", "لبست الخفين"],
    scholar: "ibn-baz",
    format: "written"
  },
  {
    id: "baz-1643",
    title: "كيفية قضاء من نام عن الوتر أو نسيه",
    url: "https://binbaz.org.sa/fatwas/1643/كيفية-قضاء-من-نام-عن-الوتر-او-نسيه",
    category: "الصلاة",
    tags: ["قضاء الوتر", "نمت عن الوتر", "نسيت الوتر", "الوتر"],
    scholar: "ibn-baz",
    format: "written",
    excerpt: {
      text: "وإذا فاته الوتر؛ يسن له أن يصلي في الضحى ما يقابل ذلك، لكن يشفع صلاته، ولا يوتر",
      questions: ["كيف أقضي الوتر إذا نمت عنه", "كيف أقضي الوتر إذا نسيته", "نمت عن الوتر كيف أقضيه", "نسيت الوتر كيف أقضيه"]
    }
  },
  {"id": "baz-4190", "title": "الحكم إذا شكَّ المصلي في عدد الركعات", "url": "https://binbaz.org.sa/fatwas/4190/%D8%A7%D9%84%D8%AD%D9%83%D9%85-%D8%A7%D8%B0%D8%A7-%D8%B4%D9%83-%D8%A7%D9%84%D9%85%D8%B5%D9%84%D9%8A-%D9%81%D9%8A-%D8%B9%D8%AF%D8%AF-%D8%A7%D9%84%D8%B1%D9%83%D8%B9%D8%A7%D8%AA", "category": "الصلاة", "tags": ["سجود السهو", "عدد الركعات", "شكيت في الركعات", "شك المصلي"], "scholar": "ibn-baz", "format": "written"},
  {"id": "baz-5008", "title": "حكم الجلوس في الصلاة عند العجز عند أداء بعض الأركان", "url": "https://binbaz.org.sa/fatwas/5008/%D8%AD%D9%83%D9%85-%D8%A7%D9%84%D8%AC%D9%84%D9%88%D8%B3-%D9%81%D9%8A-%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9-%D8%B9%D9%86%D8%AF-%D8%A7%D9%84%D8%B9%D8%AC%D8%B2-%D8%B9%D9%86%D8%AF-%D8%A7%D8%AF%D8%A7%D8%A1-%D8%A8%D8%B9%D8%B6-%D8%A7%D9%84%D8%A7%D8%B1%D9%83%D8%A7%D9%86", "category": "الصلاة", "tags": ["الجلوس في الصلاة", "الصلاه جالسا", "صلاة المريض", "مريض"], "scholar": "ibn-baz", "format": "written"},
  {"id": "baz-5326", "title": "مقدار زكاة الفطر", "url": "https://binbaz.org.sa/fatwas/5326/%D9%85%D9%82%D8%AF%D8%A7%D8%B1-%D8%B2%D9%83%D8%A7%D8%A9-%D8%A7%D9%84%D9%81%D8%B7%D8%B1", "category": "الزكاة", "tags": ["زكاة الفطر", "زكاه الفطر", "مقدار الفطر", "صدقة الفطر"], "scholar": "ibn-baz", "format": "written", "excerpt": {"text": "فالحاصل: أن الزكاة صاع فقط من قوت البلد", "questions": ["كم مقدار زكاة الفطر", "ما مقدار زكاة الفطر"]}},
  {"id": "baz-6020", "title": "حكم صوم من أكل أو شرب ناسياً في رمضان", "url": "https://binbaz.org.sa/fatwas/6020/%D8%AD%D9%83%D9%85-%D8%B5%D9%88%D9%85-%D9%85%D9%86-%D8%A7%D9%83%D9%84-%D8%A7%D9%88-%D8%B4%D8%B1%D8%A8-%D9%86%D8%A7%D8%B3%D9%8A%D8%A7-%D9%81%D9%8A-%D8%B1%D9%85%D8%B6%D8%A7%D9%86", "category": "الصيام", "tags": ["ناسي وأنا صايم", "اكلت ناسي", "شربت ناسي", "ناسيا في رمضان", "الاكل نسيانا", "صوم من اكل", "اكلت ناسيا", "اكلت ناسيًا وانا صائم"], "scholar": "ibn-baz", "format": "written", "excerpt": {"text": "إذا أكل الصائم أو شرب ناسياً في رمضان أو في قضاء رمضان أو في النذر أو في الكفارات، فصومه صحيح، يكمله ولا شيء عليه", "questions": ["ما حكم من أكل أو شرب ناسيا في رمضان", "ماذا أفعل إذا أكلت ناسيا وأنا صائم", "إذا شربت ناسيا وأنا صائم ماذا أفعل"]}},
  {"id": "baz-1792", "title": "حكم صيام النفل قبل صيام قضاء الفرض", "url": "https://binbaz.org.sa/fatwas/1792/%D8%AD%D9%83%D9%85-%D8%B5%D9%8A%D8%A7%D9%85-%D8%A7%D9%84%D9%86%D9%81%D9%84-%D9%82%D8%A8%D9%84-%D8%B5%D9%8A%D8%A7%D9%85-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A7%D9%84%D9%81%D8%B1%D8%B6", "category": "الصيام", "tags": ["صيام النفل", "قضاء الصيام", "قضاء رمضان", "التطوع قبل القضاء"], "scholar": "ibn-baz", "format": "written"},
  {"id": "baz-6660", "title": "ما كيفية استيفاء السعي بين الصفا والمروة؟", "url": "https://binbaz.org.sa/fatwas/6660/%D9%85%D8%A7-%D9%83%D9%8A%D9%81%D9%8A%D8%A9-%D8%A7%D8%B3%D8%AA%D9%8A%D9%81%D8%A7%D8%A1-%D8%A7%D9%84%D8%B3%D8%B9%D9%8A-%D8%A8%D9%8A%D9%86-%D8%A7%D9%84%D8%B5%D9%81%D8%A7-%D9%88%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%A9", "category": "الحج والعمرة", "tags": ["السعي", "الصفا والمروة", "كيف اسعى"], "scholar": "ibn-baz", "format": "written"},
  {"id": "uth-015596aa", "title": "الصفة المجزئة والكاملة في الوضوء والغسل", "url": "https://binothaimeen.net/ar/voice_library/lessonDetails/%D9%81%D8%B1%D9%88%D8%B6%20%D8%A7%D9%84%D9%88%D8%B6%D9%88%D8%A1%20%D9%88%D8%B5%D9%81%D8%AA%D9%87%20/%D8%A7%D9%84%D8%B5%D9%81%D8%A9%20%D8%A7%D9%84%D9%85%D8%AC%D8%B2%D8%A6%D8%A9%20%D9%88%D8%A7%D9%84%D9%83%D8%A7%D9%85%D9%84%D8%A9%20%D9%81%D9%8A%20%D8%A7%D9%84%D9%88%D8%B6%D9%88%D8%A1%20%D9%88%D8%A7%D9%84%D8%BA%D8%B3%D9%84/015596aa-d811-496a-bbc9-e2dae823a42d", "category": "الطهارة", "tags": ["الوضوء", "وضوء", "اتوضا", "صفة الوضوء", "الغسل"], "scholar": "ibn-uthaymeen", "format": "audio"},
  {"id": "uth-01aadcc4", "title": "سها ما سببه قبل السلام وبعده فما هو موضع سجود السهو؟", "url": "https://binothaimeen.net/ar/voice_library/lessonDetails/%D8%B3%D8%AC%D9%88%D8%AF%20%D8%A7%D9%84%D8%B3%D9%87%D9%88%20/%D8%B3%D9%87%D8%A7%20%D9%85%D8%A7%20%D8%B3%D8%A8%D8%A8%D9%87%20%D9%82%D8%A8%D9%84%20%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D9%88%D8%A8%D8%B9%D8%AF%D9%87%20%D9%81%D9%85%D8%A7%20%D9%87%D9%88%20%D9%85%D9%88%D8%B6%D8%B9%20%D8%B3%D8%AC%D9%88%D8%AF%20%D8%A7%D9%84%D8%B3%D9%87%D9%88%D8%9F/01aadcc4-e836-4614-b2ca-ea3a952a33af", "category": "الصلاة", "tags": ["سجود السهو", "قبل السلام", "بعد السلام", "سها"], "scholar": "ibn-uthaymeen", "format": "audio"},
  {"id": "uth-02283496", "title": "هل يجزئ غسل الجنابة عن الوضوء؟", "url": "https://binothaimeen.net/ar/voice_library/lessonDetails/%D8%A7%D9%84%D8%BA%D8%B3%D9%84/%D9%87%D9%84%20%D9%8A%D8%AC%D8%B2%D8%A6%20%D8%BA%D8%B3%D9%84%20%D8%A7%D9%84%D8%AC%D9%86%D8%A7%D8%A8%D8%A9%20%D8%B9%D9%86%20%D8%A7%D9%84%D9%88%D8%B6%D9%88%D8%A1%D8%9F/02283496-2f85-4423-b5f4-4f94951feefa", "category": "الطهارة", "tags": ["غسل الجنابة", "الغسل عن الوضوء", "الجنابة"], "scholar": "ibn-uthaymeen", "format": "audio"},
  {"id": "uth-02512aba", "title": "كان يخرج زكاة الفطر نقداً فهل يلزمه إخراجها مرة أخرى؟", "url": "https://binothaimeen.net/ar/voice_library/lessonDetails/%D8%B2%D9%83%D8%A7%D8%A9%20%D8%A7%D9%84%D9%81%D8%B7%D8%B1/%D9%83%D8%A7%D9%86%20%D9%8A%D8%AE%D8%B1%D8%AC%20%D8%B2%D9%83%D8%A7%D8%A9%20%D8%A7%D9%84%D9%81%D8%B7%D8%B1%20%D9%86%D9%82%D8%AF%D8%A7%D9%8B%20%D9%81%D9%87%D9%84%20%D9%8A%D9%84%D8%B2%D9%85%D9%87%20%D8%A5%D8%AE%D8%B1%D8%A7%D8%AC%D9%87%D8%A7%20%D9%85%D8%B1%D8%A9%20%D8%A3%D8%AE%D8%B1%D9%89%D8%9F/02512aba-0b7f-409a-9059-1dcd7a71239b", "category": "الزكاة", "tags": ["زكاة الفطر", "صدقة الفطر", "زكاة الفطر نقدا", "زكاة الفطر فلوس"], "scholar": "ibn-uthaymeen", "format": "audio"},
  {"id": "uth-0584df8b", "title": "استغرق شوال في قضاء رمضان فهل يصوم الست في ذي القعدة؟", "url": "https://binothaimeen.net/ar/voice_library/lessonDetails/%D8%B5%D9%88%D9%85%20%D8%A7%D9%84%D8%AA%D8%B7%D9%88%D8%B9/%D8%A7%D8%B3%D8%AA%D8%BA%D8%B1%D9%82%20%D8%B4%D9%88%D8%A7%D9%84%20%D9%81%D9%8A%20%D9%82%D8%B6%D8%A7%D8%A1%20%D8%B1%D9%85%D8%B6%D8%A7%D9%86%20%D9%81%D9%87%D9%84%20%D9%8A%D8%B5%D9%88%D9%85%20%D8%A7%D9%84%D8%B3%D8%AA%20%D9%81%D9%8A%20%D8%B0%D9%8A%20%D8%A7%D9%84%D9%82%D8%B9%D8%AF%D8%A9%D8%9F/0584df8b-673b-4136-be37-57ed75b579cb", "category": "الصيام", "tags": ["ست شوال", "قضاء رمضان", "صيام الست", "ست من شوال", "الست من شوال"], "scholar": "ibn-uthaymeen", "format": "audio"},
  {"id": "uth-0739d6c3", "title": "حكم التسمية عند الوضوء", "url": "https://binothaimeen.net/ar/voice_library/lessonDetails/%D9%81%D8%B1%D9%88%D8%B6%20%D8%A7%D9%84%D9%88%D8%B6%D9%88%D8%A1%20%D9%88%D8%B5%D9%81%D8%AA%D9%87%20/%D8%AD%D9%83%D9%85%20%D8%A7%D9%84%D8%AA%D8%B3%D9%85%D9%8A%D8%A9%20%D8%B9%D9%86%D8%AF%20%D8%A7%D9%84%D9%88%D8%B6%D9%88%D8%A1/0739d6c3-a940-4711-a3da-04e594478d60", "category": "الطهارة", "tags": ["التسمية عند الوضوء", "البسملة في الوضوء", "اسم الله قبل الوضوء"], "scholar": "ibn-uthaymeen", "format": "audio"},
  {"id": "uth-0750b285", "title": "زكاة المال المفقود والمنسي", "url": "https://binothaimeen.net/ar/voice_library/lessonDetails/%D8%B2%D9%83%D8%A7%D8%A9%20%D8%A7%D9%84%D9%86%D9%82%D8%AF%D9%8A%D9%86/%D8%B2%D9%83%D8%A7%D8%A9%20%D8%A7%D9%84%D9%85%D8%A7%D9%84%20%D8%A7%D9%84%D9%85%D9%81%D9%82%D9%88%D8%AF%20%D9%88%D8%A7%D9%84%D9%85%D9%86%D8%B3%D9%8A/0750b285-191d-4d58-ad78-c556979ece6b", "category": "الزكاة", "tags": ["زكاة المال المفقود", "زكاة المال المنسي", "زكاة المال"], "scholar": "ibn-uthaymeen", "format": "audio"}
];
