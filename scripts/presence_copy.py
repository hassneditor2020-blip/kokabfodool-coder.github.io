"""Bilingual editorial copy and topic links for Kokab Fodool."""

BRAND = {
    'ar': 'كوكب فضول',
    'en': 'Kokab Fodool',
}
DESCRIPTION = {
    'ar': 'كوكب فضول منصة تعليمية رقمية للأطفال من 3 إلى 10 سنوات، تجمع بين الحلقات التعليمية والألعاب المتدرجة حسب العمر وأوراق العمل.',
    'en': 'Kokab Fodool is a digital learning platform for children aged 3 to 10, with educational episodes, age-based games and printable worksheets.',
}

# Each entry contains a title, search description, sections and relevant internal resources.
PAGES = {
    'learn': (
        ('دليل التعلم للأطفال', 'أنشطة تجمع بين الفيديو واللعب وأوراق العمل لتعلّم الحروف والأرقام والعلوم للأطفال من 3 إلى 10 سنوات.',
         [
             ('اختر نشاطًا يناسب العمر', 'في عمر 3–5 سنوات، ابدأ بصورة وصوت وسؤال واحد. في عمر 6–7 سنوات، اطلب من الطفل أن يشرح اختياره أو يكتب مثالًا. في عمر 8–10 سنوات، جرّب مسألة متعددة الخطوات أو تجربة يتوقع الطفل نتيجتها.'),
             ('اربط المشاهدة بالتجربة', 'شاهدوا حلقة قصيرة. أوقفوا المشاهدة عند الفكرة الرئيسة واسألوا الطفل عمّا لاحظه. اختاروا لعبة على المهارة نفسها، ثم استخدموا ورقة عمل أو نشاطًا منزليًا للتحقق من فهمه.'),
         ]),
        ('Children’s learning guide', 'Combine episodes, age-based games and worksheets to explore letters, numbers and science with children aged 3 to 10.',
         [
             ('Choose a task by age and confidence', 'At ages 3–5, start with a picture, a sound and one question. At ages 6–7, ask the child to explain a choice or write an example. At ages 8–10, use a multi-step problem or ask for a prediction before an experiment.'),
             ('Move from watching to doing', 'Watch one short episode and pause at its main idea. Ask what the child noticed, choose a game on the same skill and finish with a worksheet or a simple activity at home.'),
         ]),
        ['learn/arabic-letters', 'learn/arabic-vowels', 'learn/early-math', 'learn/english-for-kids', 'learn/simple-science', 'games', 'grown-ups'],
    ),
    'learn/arabic-letters': (
        ('تعليم الحروف العربية للأطفال', 'ابدأ بصوت الحرف العربي وكلمة مصوّرة، ثم تدرّب على موضع الحرف وكتابته بلعبة وورقة مناسبة.',
         [
             ('اسمع الصوت ثم ابحث عنه', 'اعرض صورة أسد وصورة بطة. قل أَسَد وبَطَّة بوضوح. اطلب من الطفل أن يختار الصورة التي تبدأ بـ«أَ»، ثم دعه يقول الكلمة بنفسه. انتقل إلى حرف ثانٍ عندما يستطيع تمييز الأول في أكثر من كلمة.'),
             ('لاحِظ موضع الحرف', 'مع الطفل القادر على قراءة كلمات قصيرة، قارن الباء في بَطَّة وحَبْل وكِتاب. اطلب منه أن يشير إلى موقع الباء أولًا، ثم ينسخ كلمة واحدة على سطر.'),
             ('راجع بعد الكتابة', 'استخدم ورقة الحرف للانتقال من النموذج إلى السطر المنقّط ثم السطر الفارغ. اسأل الطفل أي جزء كتب بسهولة وأي جزء يريد إعادته.'),
         ]),
        ('Teaching Arabic letters to children', 'Start with an Arabic letter sound and a picture word, then practise letter position and handwriting with a game and a worksheet.',
         [
             ('Listen for the first sound', 'Show pictures of a lion and a duck. Say أَسَد (asad) and بَطَّة (baṭṭa). Ask which picture begins with أَ, then let the child say the word. Check the sound using a second word before moving on.'),
             ('Look for the letter in a word', 'With early readers, look for the letter ب in بَطَّة, حَبْل and كِتاب. Ask where it appears before tracing or copying one of the words.'),
             ('Review the writing', 'Use a letter worksheet to move from a model to the dotted line and then an empty line. Ask the learner which part felt easy and which part they want to try again.'),
         ]),
        ['series/arabic-letters', 'games/letter-match', 'games/letter-hunt', 'games/trace', 'grown-ups/practice/arabic-letters', 'learn/arabic-vowels'],
    ),
    'learn/arabic-vowels': (
        ('تعليم الحروف بالحركات للأطفال', 'فرّق بين الفتحة والكسرة والضمة من خلال السماع والكلمات المصوّرة والتدريب في سيارة الحركات.',
         [
             ('قارن حركة واحدة في كل مرة', 'اعرض بَ وبِ وبُ. قل المقاطع ببطء، وأشر إلى الحركة في كل مقطع. اطلب من الطفل أن يشير إلى بَ بعد سماعه، ثم اربطه بكلمة بَطَّة. جرّب بِ في بِنت وبُ في بُرتقال.'),
             ('أكمل حركة في كلمة مألوفة', 'بعد أن يميّز الطفل الأصوات، اعرض كلمة بَطَّة ثم أعد كتابتها بحذف فتحة الباء. اطلب منه تحديد الحركة التي سمعها. يصلح نشاط المطابقة للأصغر، وإكمال الحركة الناقصة لمن يقرأ كلمات قصيرة.'),
             ('جرّب السكون في كلمة', 'قارن صوت الحركة القصيرة بحرف عليه السكون ضمن كلمة مثل شَمْس. انطق الكلمة كاملة واشرح أن الميم الساكنة تتبع الشين المفتوحة في النطق.'),
         ]),
        ('Teaching Arabic short vowels', 'Teach fatḥa, kasra and ḍamma through listening, picture words and steering to the correct gate in the vowel game.',
         [
             ('Compare one vowel at a time', 'Show بَ, بِ and بُ. Say each sound slowly and point to its mark. Ask the child to find بَ after hearing it, and link it to بَطَّة (duck). Use بِ in بِنت and بُ in بُرتقال for the other sounds.'),
             ('Fill a gap in a familiar word', 'Show بَطَّة and then write the word again with the first vowel mark removed. Ask the child to name the mark they heard. Sound matching works for younger learners; filling the gap suits early readers.'),
             ('Hear sukūn within a word', 'Say شَمْس (sun). The mīm is marked with sukūn and has no short vowel of its own. Listen to the whole word before looking at the marks.'),
         ]),
        ['games/vowel-drive', 'series/arabic-letters', 'grown-ups/arabic-letter-sounds', 'learn/arabic-letters'],
    ),
    'learn/early-math': (
        ('تعليم الأرقام والجمع والطرح للأطفال', 'أنشطة بالأشياء والصور لتعلّم العدّ والجمع والطرح، مع ألعاب الأرقام ومتجر فضول وأوراق عمل قابلة للطباعة.',
         [
             ('عدّ الأشياء بلمسها', 'ضع 5 مكعبات متباعدة. يلمس الطفل مكعبًا في كل مرة ويعدّ حتى 5. أعد ترتيب المكعبات واطلب منه التحقق مما إذا كان العدد قد تغيّر.'),
             ('مثّل الجمع والطرح', 'ضع 4 مكعبات بجانب 3 مكعبات واكتب 4 + 3 = 7. ارفع مكعبين من المجموعة ثم اطلب من الطفل كتابة 7 − 2 = 5 وشرح ما تعنيه كل قيمة.'),
             ('احسب المجموع والباقي', 'اشتروا على الورق سلعتين بسعر 6 و7. اجمع السعرين ثم احسب الباقي من 20. يستطيع الطفل التحقق بالعدّ تصاعديًا من 13 إلى 20 أو بالطرح.'),
         ]),
        ('Teaching numbers, addition and subtraction', 'Use objects and pictures to build counting and arithmetic skills, then practise with Fudool Market, number games and worksheets.',
         [
             ('Touch each object as you count', 'Set out 5 blocks. Ask the child to touch one block per count. Rearrange the same blocks and ask the child to check whether the total has changed.'),
             ('Model addition and subtraction', 'Put 4 blocks next to 3 blocks and write 4 + 3 = 7. Remove two blocks, then ask the child to write 7 − 2 = 5 and explain what each number represents.'),
             ('Find the total and change', 'Make a paper shop with two prices, 6 and 7. Add the prices, then find the change from 20. The child can count on from 13 to 20 to check the result.'),
         ]),
        ['series/arabic-numbers', 'games/counting', 'games/fudool-shop', 'games/grand-challenge', 'grown-ups/practice/arabic-numbers'],
    ),
    'learn/english-for-kids': (
        ('أنشطة الحروف والأرقام الإنجليزية في المنزل', 'أنشطة تبدأ بصورة وكلمة إنجليزية ثم تربط الحرف بصوته، وتدرب الطفل على نطق الأعداد ومطابقتها.',
         [
             ('اربط الحرف بالصوت والصورة', 'ضع صورة تفاحة مع A وكرة مع B. قل apple وball، ثم اطلب من الطفل مطابقة الصوت الأول بالصورة. استخدم كلمتين مألوفتين قبل إضافة خيارات أكثر.'),
             ('طابق شكلَي الحرف', 'اكتب A وa على بطاقتين، ثم B وb. يطابق الطفل الشكل الكبير والصغير لكل حرف، ثم يبحث عنهما داخل كلمة مألوفة.'),
             ('اسمع العدد ومثّله', 'قل one أو two أو three واطلب من الطفل وضع العدد الذي سمعه من المكعبات. قل العدد مجددًا بعد أن يعدّ المجموعة، ثم اربطه بشكل الرقم.'),
         ]),
        ('English letters and numbers activities for children', 'Connect familiar English words with letter sounds and practise saying and matching numbers in short games.',
         [
             ('Connect the letter, sound and picture', 'Put an apple picture next to A and a ball next to B. Say apple and ball, then ask the child to match each first sound to its picture. Add more examples once the first two are familiar.'),
             ('Pair uppercase and lowercase', 'Write A and a on separate cards, then B and b. Ask the child to pair both forms of each letter and find them in a familiar word.'),
             ('Hear a number and build it', 'Say one, two or three and ask the child to place that many blocks. Count the blocks together and pair the spoken number with its numeral.'),
         ]),
        ['series/english-fun', 'games/english-abc', 'grown-ups/practice/english-letters', 'grown-ups/practice/english-numbers'],
    ),
    'learn/simple-science': (
        ('تجارب علمية بسيطة للأطفال', 'جرّب أثر درجة حرارة الماء على ذوبان الثلج، وقارن النتائج مع مختبر روبو وسلسلة العلوم.',
         [
             ('توقّع ثم اختبر', 'استخدم كوبين متماثلين وقطعتين متقاربتين من الثلج. ضع كمية متساوية من ماء الثلاجة في كوب وماء بدرجة حرارة الغرفة في الآخر. اطلب من الطفل توقّع أي قطعة ستذوب أولًا.'),
             ('غيّر عاملًا واحدًا', 'ابدأ المؤقّت بعد وضع الثلج في الكوبين. قارن الحجم بعد دقيقة وسجّل الملاحظة. كرّر النشاط باستخدام كوبين متطابقين في المرتين كي يكون اختلاف حرارة الماء هو ما تختبره.'),
             ('اشرح النتيجة بما لاحظته', 'اطلب من الطفل أن يكمل الجملة «لاحظت أن…». يستطيع الأكبر سنًا تسجيل الزمن في جدول ومقارنة النتائج بين المحاولات. جرّبوا الخطوات أولًا في المحاكاة على الشاشة.'),
         ]),
        ('Simple science experiments for children', 'Test how water temperature affects melting ice and compare results with Robo Lab and the science series.',
         [
             ('Predict and test', 'Use two matching cups and two similar ice cubes. Put equal amounts of fridge-cold water and room-temperature water in the cups. Ask which cube the child expects to melt first.'),
             ('Change one thing at a time', 'Start a timer after adding the ice. Compare the cube sizes after a minute, and record what you see. Use the same cups and amounts when you repeat the test so water temperature is the factor being compared.'),
             ('Explain the result from the evidence', 'Ask the child to finish the sentence “I observed that…”. Older children can record the times in a table and compare trials. You can try the same steps first in the in-game simulation.'),
         ]),
        ['series/robo', 'games/robo-lab', 'series/what-if', 'games/space-journey', 'grown-ups'],
    ),
    'terms': (
        ('شروط استخدام كوكب فضول', 'شروط استخدام الألعاب ومشاهدة الحلقات وتنزيل التطبيق واستعمال أوراق العمل من كوكب فضول.',
         [
             ('الاستخدام التعليمي', 'الموقع والألعاب وأوراق العمل مخصّصة للتعلّم في المنزل أو الصف. يمكن للعائلة والمعلم طباعة الأوراق للأنشطة التعليمية. تواصل معنا إذا أردت إعادة نشر المحتوى أو استخدام العلامة والشخصيات في مشروع آخر.'),
             ('تحميل التطبيق', 'استخدم رابط Android الموجود في صفحة التطبيق الرسمية. يراجع البالغ طلب التثبيت، ويمكنه تقييد الروابط الخارجية وفق إعدادات الجهاز. تظل شروط خدمات المشاهدة الخارجية مرتبطة بتلك الخدمات.'),
         ]),
        ('Terms of use', 'Terms for using the games, watching episodes, downloading the Android app and printing Kokab Fodool worksheets.',
         [
             ('Learning at home and in class', 'The site, games and worksheets support learning at home and in class. Families and teachers can print the worksheets for their activities. Contact us before republishing material or using the brand or characters in another project.'),
             ('Downloading the app', 'Use the download shown on the official Android page. An adult can review the installation request and manage external links using the device settings. External viewing services apply their own terms.'),
         ]),
        ['privacy', 'app', 'content-policy', 'contact'],
    ),
    'contact': (
        ('تواصل مع كوكب فضول', 'قناة التواصل الرسمية لأهالي الأطفال والمعلمين لإرسال ملاحظة عن لعبة أو حلقة أو ورقة عمل.',
         [
             ('للأهالي والمعلمين', 'يمكن للبالغين مراسلة الحساب الرسمي على إنستغرام. عند الإبلاغ عن خلل تقني، اذكر اسم اللعبة أو رابط الحلقة ونوع الجهاز وإصدار التطبيق. تجنّب إرسال أسماء الأطفال أو صورهم أو معلومات المدرسة.'),
         ]),
        ('Contact Kokab Fodool', 'The official contact for parents and teachers to share feedback about a game, episode or worksheet.',
         [
             ('For parents and teachers', 'Adults can message the official Instagram account. When reporting a technical issue, include the game name or episode link, device type and app version. Leave out children’s names, photos and school information.'),
         ]),
        ['privacy', 'faq', 'about'],
    ),
    'content-policy': (
        ('سياسة المحتوى التعليمي', 'كيف تُنظّم كوكب فضول الحلقات والألعاب وأوراق العمل بحسب المهارة والعمر وكيف يمكن الإبلاغ عن خطأ.',
         [
             ('المهارة قبل ترتيب المستويات', 'تعرض صفحات الألعاب المهارات ومسارات العمر بحسب محتوى اللعبة. يمكن اختيار مسار أقرب إلى مستوى الطفل. تُقدَّم الحروف والحركات في مساراتها المبكرة، وتُخصَّص المسائل المركّبة والتجارب لمسارات أكبر عند ملاءمتها.'),
             ('أمثلة وتعليمات قابلة للمراجعة', 'تُعرض الحروف مع كلمات مصوّرة، وتُكتب الأعداد بشكل واضح، وتُبيّن المحاكاة أي نتائج توضيحية. أبلغنا باسم الجولة إذا لاحظت نطقًا غير دقيق أو سؤالًا يحتمل إجابتين.'),
         ]),
        ('Educational content policy', 'How Kokab Fodool organises episodes, games and worksheets by skill and age, and how to report a content issue.',
         [
             ('Match the task to the learner', 'Game pages show skills and age paths according to the material. Families can choose the path that fits the learner. Early paths focus on letter and vowel recognition, while suitable older paths use multi-step problems and experiments.'),
             ('Examples and instructions are reviewable', 'Letters appear alongside picture words, numbers stay legible, and simulations label illustrative results. Share the round name if you notice unclear pronunciation or a question with more than one valid answer.'),
         ]),
        ['about', 'learn', 'grown-ups', 'contact'],
    ),
    'faq': (
        ('الأسئلة الشائعة عن كوكب فضول', 'إجابات عن الأعمار المناسبة، تشغيل الألعاب دون إنترنت، مشاهدة الحلقات وحفظ التقدم في كوكب فضول.',
         [
             ('كيف أختار مستوى البداية؟', 'افتح اللعبة واختر الفئة العمرية المعروضة. يبدأ الطفل من أول مستوى في المسار الذي اختاره، ويمكنه استكمال ما حفظه على الجهاز.'),
             ('هل تعمل الألعاب دون اتصال؟', 'يضم تطبيق Android الألعاب والملفات اللازمة لها. من المتصفح، نزّل حزمة الألعاب من خيار اللعب دون إنترنت قبل قطع الاتصال. تحتاج الحلقات والروابط الخارجية إلى الإنترنت.'),
             ('كيف أطبع ورقة أو أطلب مساعدة؟', 'اختر ورقة من قسم الأهالي والمعلمين وافتح نسخة الطباعة أو PDF. يستطيع البالغ مراسلة الحساب الرسمي عند الحاجة إلى مساعدة.'),
         ]),
        ('Frequently asked questions', 'Answers about age paths, offline play, watching episodes and saving progress on Kokab Fodool.',
         [
             ('How do I pick a starting level?', 'Open a game and choose one of its age paths. Play starts at the first level in that path, and a learner can continue from progress saved on that device.'),
             ('Do the games work offline?', 'The Android app includes the games and the files they need. In the browser, download the offline game pack before going offline. Episodes and external links require an internet connection.'),
             ('How do I print a worksheet or get help?', 'Select a worksheet in the parents and teachers section and open its printer-friendly page or PDF. An adult can contact the official account for help.'),
         ]),
        ['games', 'app', 'grown-ups', 'contact'],
    ),
}

# Visible instructions for each game, followed by related lessons or printables.
GAMES = {
    'vowel-drive': (
        'استمع إلى المقطع، ثم حرّك السيارة إلى الباب الذي يعرض الحركة الصحيحة واضغط «انطلق». في المراحل التالية أكمل الحركة الناقصة في كلمة.',
        'Listen to the syllable, steer to the gate with the matching vowel and press Drive. Later rounds ask you to fill the missing vowel in a word.',
        ['learn/arabic-vowels', 'series/arabic-letters', 'grown-ups/practice/arabic-letters'],
    ),
    'letter-match': (
        'قل اسم الصورة بصوت واضح. اختر الحرف الذي تسمعه في بدايتها، ثم جرّب تحديد الصوت في مواضع أخرى من الكلمة.',
        'Say the picture word aloud. Match its first sound to an Arabic letter, then look for sounds at other positions in later rounds.',
        ['learn/arabic-letters', 'series/arabic-letters', 'grown-ups/practice/arabic-letters'],
    ),
    'letter-hunt': (
        'اقرأ الكلمة المصوّرة وابحث عن الموضع الذي يطلبه السؤال. اختر الحرف المنشود، ثم اقرأ الكلمة كاملة.',
        'Read the picture word and look at the position named in the question. Choose the letter and say the full word.',
        ['learn/arabic-letters', 'series/arabic-letters', 'grown-ups/practice/arabic-letters'],
    ),
    'counting': (
        'المس كل عنصر مرة أثناء العدّ، ثم اختر الرقم أو ناتج المسألة. استخدم مجموعات العناصر لفهم الجمع والطرح قبل الانتقال إلى الضرب والقسمة.',
        'Tap each object once as you count, then choose the total. Use groups to reason through addition and subtraction before moving to multiplication and division.',
        ['learn/early-math', 'series/arabic-numbers', 'grown-ups/practice/arabic-numbers'],
    ),
    'english-abc': (
        'اقرأ الحرف بالإنجليزية وطابقه مع الصورة أو شكله الصغير. في الجولات المتدرّجة اختر الأحرف التي تكوّن الكلمة.',
        'Recognise the English letter and match it to a picture or its lowercase form. In later rounds, choose the letters that make the word.',
        ['learn/english-for-kids', 'series/english-fun', 'grown-ups/practice/english-letters'],
    ),
    'memory': (
        'عاين البطاقات أولًا ثم ابدأ المطابقة. اقلب بطاقتين في كل محاولة. في المراحل المتقدمة طابق الصور بالأسماء أو الأصوات أو الأشياء المرتبطة بها.',
        'Preview the cards, then start matching. Turn over two at a time. Later decks pair pictures with names, sounds or objects used together.',
        ['series/guess', 'games/sound-quiz', 'learn'],
    ),
    'trace': (
        'ابدأ من علامة الكتابة واتبع النموذج بإصبعك أو بالفأرة. في الإملاء استمع إلى الكلمة، اكتبها على اللوحة، ثم تحقّق من كتابتك وراجع النموذج.',
        'Follow the starting marker and guide with a finger or mouse. In dictation, listen to the word, write it on the board, then check it and review the model.',
        ['learn/arabic-letters', 'grown-ups/practice/arabic-letters', 'series/arabic-letters'],
    ),
    'robo-lab': (
        'صنّف الصور في الجولات الأولى. عند دخول المحاكاة، اضبط الأدوات وتوقّع النتيجة، ثم اختبرها وسجّل ما لاحظته.',
        'Classify pictures in the early rounds. In simulations, set up the equipment, predict a result, then test and record what you observe.',
        ['learn/simple-science', 'series/robo', 'series/what-if'],
    ),
    'puzzle': (
        'لاحظ الصورة المرجعية، ثم انقل القطع إلى مواضعها. في المستويات الأعلى دوّر القطعة حتى يتطابق اتجاهها مع الصورة.',
        'Study the reference picture and move the pieces into place. On later levels, rotate pieces to match the picture’s orientation.',
        ['series/short-stories', 'games/spot-differences', 'learn'],
    ),
    'sound-quiz': (
        'اضغط الاستماع، ثم اختر الصورة التي تناسب الصوت. أعد المقطع إذا احتجت إلى ملاحظة اختلاف بين صوتين.',
        'Play the sound, then choose the picture that fits. Listen again to notice differences between similar sounds.',
        ['series/guess', 'games/memory', 'learn'],
    ),
    'fudool-shop': (
        'أضف السلع المطلوبة إلى السلة واقرأ أسعارها. اختر العملات المناسبة للدفع أو لإعادة الباقي. في جولات أخرى قارن عروضًا أو راجع سعرًا في فاتورة.',
        'Put the requested products in the basket and read their prices. Choose coins to pay or give change. Other rounds compare offers or check a receipt.',
        ['learn/early-math', 'games/counting', 'grown-ups/practice/arabic-numbers'],
    ),
    'word-factory': (
        'سمِّ الصورة، ثم رتّب الأحرف من اليمين إلى اليسار لتكوين الكلمة. اقرأ الكلمة قبل الانتقال إلى الصورة التالية.',
        'Name the picture, then arrange the Arabic letters from right to left. Read the completed word before moving on.',
        ['learn/arabic-letters', 'series/arabic-letters', 'grown-ups/practice/arabic-letters'],
    ),
    'lumaa-clock': (
        'لاحظ العقرب القصير أولًا، ثم اقرأ الدقائق من العقرب الطويل. في المراحل الأعلى استخدم توقيتين لحساب مدة الرحلة أو وقت الوصول.',
        'Read the short hand first, then use the long hand to find the minutes. In later rounds, calculate an arrival time or elapsed time.',
        ['learn/early-math', 'games/counting', 'grown-ups/practice/arabic-numbers'],
    ),
    'code-robo': (
        'رتّب أزرار الاتجاه في برنامج قصير ثم شغّله. إذا وقف روبو عند حاجز، راجع خطوة واحدة في كل مرة وعدّل الأمر الذي يوقف المسار.',
        'Arrange direction buttons into a short program, then run it. If Robo stops at an obstacle, check the commands one at a time and fix the instruction.',
        ['series/robo', 'games/space-journey', 'learn/simple-science'],
    ),
    'world-mishaal': (
        'طابق العلم أو المعلم بالبلد، ثم افحص الاتجاهات على الخريطة. في المستويات المتقدمة استخدم مقياس الرسم للمقارنة بين مسافتين.',
        'Match flags and landmarks to countries, then explore directions on a map. Later levels use map scale to compare distances.',
        ['series/mishal', 'games/planet-engineer', 'learn'],
    ),
    'planet-engineer': (
        'لاحظ شكل القطع وعد أضلاعها، ثم أكمل النمط. راجع شروط التصميم قبل اختيار الإجابة في مسائل المساحة والمحيط.',
        'Look at the pieces and count their sides, then complete the pattern. Check the design constraints before choosing an answer for area or perimeter.',
        ['learn/early-math', 'series/robo', 'games/space-journey'],
    ),
    'healthy-hero': (
        'تأمل الموقف واختر العادة أو التصرف الأنسب. اقرأ الشرح بعد الإجابة، وقل أين يمكنك تطبيق الفكرة في يومك.',
        'Read the situation and choose a suitable habit or action. After seeing the explanation, think of where to use the idea in your own day.',
        ['series/short-stories', 'series/mishal', 'grown-ups'],
    ),
    'space-journey': (
        'تعرّف إلى الكواكب وحركة الأجرام في الجولات الأولى. في المهمات المتقدمة قارن الوقت والوقود قبل إطلاق المسبار على المسار المختار.',
        'Explore planets and their movement in early rounds. In advanced missions, compare time and fuel before sending the probe along your chosen route.',
        ['series/what-if', 'learn/simple-science', 'games/robo-lab'],
    ),
    'spot-differences': (
        'قارن المواضع المتقابلة في الصورتين. اضغط المكان الذي تغيّر فيه العنصر في الصورة الثانية، وتابع عدّ الاختلافات حتى تكتمل الجولة.',
        'Compare corresponding positions in both pictures. Tap each changed cell in the second image and keep track of the differences you find.',
        ['series/guess', 'games/puzzle', 'learn'],
    ),
    'grand-challenge': (
        'اقرأ المطلوب وحدّد العملية الأولى. احتفظ بناتجها ثم استخدمه في الخطوة التالية، وتحقق من أن الإجابة تناسب السؤال.',
        'Read what the problem asks and pick the first operation. Use that result in the next step, then check that the answer fits the question.',
        ['learn/early-math', 'games/counting', 'grown-ups/practice/arabic-numbers'],
    ),
}

SERIES_RESOURCES = {
    'arabic-letters': ['learn/arabic-letters', 'games/letter-match', 'games/trace', 'grown-ups/practice/arabic-letters'],
    'arabic-numbers': ['learn/early-math', 'games/counting', 'grown-ups/practice/arabic-numbers'],
    'english-fun': ['learn/english-for-kids', 'games/english-abc', 'grown-ups/practice/english-numbers'],
    'robo': ['learn/simple-science', 'games/robo-lab'],
    'guess': ['games/spot-differences', 'games/memory'],
    'what-if': ['learn/simple-science', 'games/space-journey'],
    'mishal': ['games/world-mishaal', 'grown-ups'],
    'short-stories': ['games/puzzle', 'grown-ups'],
}
