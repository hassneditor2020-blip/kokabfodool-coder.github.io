import {read} from './profile-state.js?v=2';

export const ageGroups = ['3-5', '6-7', '8-10'];

// Each entry ends at the last level that teaches the listed skills.
// Keep the level numbers stable so existing stars and saved rounds keep their meaning.
const curriculum = {
  'vowel-drive': {
    '3-5': [3, 'اسمع الحرف واختر باب الحركة', 'Listen and choose the vowel gate'],
    '6-7': [15, 'ميّز الحركات وأكمل الحركة الناقصة واقرأ السكون', 'Distinguish vowels, fill in the missing vowel and read sukūn'],
  },
  'letter-match': {
    '3-5': [4, 'طابق الحروف بصور مألوفة', 'Match letters with familiar pictures'],
    '6-7': [12, 'طابق الأصوات ومواضع الحروف والكلمات', 'Match sounds, letter positions and words'],
  },
  'letter-hunt': {
    '3-5': [4, 'اكتشف الحرف الأول بمساعدة الصورة', 'Find the first letter with picture clues'],
    '6-7': [15, 'ميّز مواضع الحروف وأكمل الكلمات', 'Recognize letter positions and complete words'],
  },
  counting: {
    '3-5': [2, 'عدّ المجموعات حتى 10', 'Count groups up to 10'],
    '6-7': [18, 'اجمع واطرح ورتّب الأعداد', 'Add, subtract and order numbers'],
    '8-10': [21, 'اضرب واقسم وحلّ مسائل من خطوتين', 'Multiply, divide and solve two-step problems'],
  },
  'english-abc': {
    '3-5': [4, 'تعرّف إلى الحروف الإنجليزية', 'Recognize English letters'],
    '6-7': [15, 'طابق الحروف بأصواتها وابنِ كلمات قصيرة', 'Match letters to sounds and build short words'],
  },
  memory: {
    '3-5': [3, 'احفظ أماكن 4 إلى 8 بطاقات', 'Remember 4 to 8 cards'],
    '6-7': [6, 'احفظ أماكن 10 إلى 14 بطاقة', 'Remember 10 to 14 cards'],
    '8-10': [14, 'طابق صورًا مع أسمائها واستخداماتها وأصواتها', 'Match pictures to names, uses and sounds'],
  },
  trace: {
    '3-5': [2, 'تتبّع الحروف الأولى فوق النموذج', 'Trace the first letters over a guide'],
    '6-7': [10, 'تدرّب على كتابة حروف وأعداد أكثر', 'Practise tracing more letters and numbers'],
    '8-10': [13, 'اسمع كلمات عربية واكتبها كاملة', 'Listen and write whole Arabic words'],
  },
  'robo-lab': {
    '3-5': [2, 'صنّف الصور وتعرّف إلى مواطن الحيوانات', 'Sort pictures and identify animal habitats'],
    '6-7': [10, 'تعرّف إلى الضوء والمادة والطقس والطاقة', 'Explore light, matter, weather and energy'],
    '8-10': [15, 'نفّذ تجربة، وسجّل القياسات واستدلّ بها', 'Run a test, record measurements and explain the results'],
  },
  puzzle: {
    '3-5': [4, 'ركّب صورًا من 4 أو 6 قطع', 'Rebuild pictures with 4 or 6 pieces'],
    '6-7': [7, 'ركّب صورًا من 9 قطع', 'Rebuild 9-piece pictures'],
    '8-10': [12, 'ركّب الصور ودوّر القطع لتلائم أماكنها', 'Rebuild pictures and rotate pieces to fit'],
  },
  'sound-quiz': {
    '3-5': [3, 'تعرّف إلى أصوات الحيوانات والحديقة', 'Recognize animal and garden sounds'],
    '6-7': [10, 'ميّز أصوات البيت والطريق والطبيعة', 'Tell apart household, street and nature sounds'],
  },
  'fudool-shop': {
    '6-7': [15, 'اجمع الأسعار وادفع بالعملات', 'Add prices and pay with coins'],
    '8-10': [18, 'قارن العروض وراجع الفاتورة واحسب الباقي', 'Compare deals, check receipts and calculate change'],
  },
  'word-factory': {
    '6-7': [15, 'رتّب الحروف لتكوين أسماء الصور', 'Arrange letters to spell picture names'],
  },
  'lumaa-clock': {
    '6-7': [10, 'اقرأ الساعة من العقارب', 'Read the hands of an analogue clock'],
    '8-10': [12, 'احسب وقت الوصول والمدة بين توقيتين', 'Calculate arrival times and elapsed minutes'],
  },
  'code-robo': {
    '3-5': [5, 'حرّك روبو على شبكة صغيرة', 'Move Robo on a small grid'],
    '6-7': [12, 'رتّب أوامر الاتجاه على مسارات أطول', 'Sequence direction commands on longer paths'],
    '8-10': [22, 'خطّط حول الحواجز وأصلح الأوامر الخاطئة', 'Plan around obstacles and debug commands'],
  },
  'world-mishaal': {
    '6-7': [15, 'تعرّف إلى الأعلام والبلدان والمعالم', 'Recognize flags, countries and landmarks'],
    '8-10': [17, 'استخدم الاتجاهات ومقياس الخريطة', 'Use compass directions and map scale'],
  },
  'planet-engineer': {
    '3-5': [5, 'تعرّف إلى الأشكال والأنماط البسيطة', 'Recognize shapes and simple patterns'],
    '6-7': [15, 'قارن الأضلاع وأكمل الأنماط', 'Compare sides and complete patterns'],
    '8-10': [17, 'احسب المساحة والمحيط واختر تصميمًا ضمن القيود', 'Calculate area and perimeter, and design within constraints'],
  },
  'healthy-hero': {
    '3-5': [4, 'اختر عادات يومية مألوفة', 'Choose familiar daily habits'],
    '6-7': [10, 'حلّ مواقف تتعلق بالسلامة والمشاعر', 'Work through safety and feelings scenarios'],
  },
  'space-journey': {
    '6-7': [15, 'تعرّف إلى الكواكب والنجوم ورواد الفضاء', 'Explore planets, stars and astronauts'],
    '8-10': [17, 'خطّط لرحلة فضائية باستخدام الوقت والموارد', 'Plan space missions using time and resources'],
  },
  'spot-differences': {
    '3-5': [5, 'اكتشف الفروق على شبكة من 9 مربعات', 'Spot changes on a 9-cell grid'],
    '6-7': [10, 'قارن صورتين على شبكة من 16 مربعًا', 'Compare two pictures on 16-cell grids'],
    '8-10': [15, 'ابحث عن فروق متعددة بين 25 مربعًا', 'Find multiple differences among 25 cells'],
  },
  'grand-challenge': {
    '6-7': [13, 'اجمع واطرح ورتّب الأعداد', 'Add, subtract and order numbers'],
    '8-10': [21, 'استخدم الضرب والمنطق لحل تحديات مركّبة', 'Use multiplication and logic to solve combined challenges'],
  },
};

export function pathsForGame(id) {
  let first = 1;
  return Object.entries(curriculum[id] ?? {}).map(([age, [last, ar, en]]) => {
    const path = {age, first, last, ar, en};
    first = last + 1;
    return path;
  });
}

export const gameCounts = new Map(Object.keys(curriculum).map(id => [id, pathsForGame(id).at(-1).last]));

export function ageLabel(age, ar) {
  const span = age.replace('-', '–');
  return ar ? '\u2066' + span + '\u2069 سنوات' : 'Ages ' + span;
}

export const agePreferenceKey = id => id === 'default'
  ? 'fudool-age-journey-v1'
  : 'fudool-profile-v1:' + id + ':age';

export function recommendedAge(profile) {
  const preference = read(agePreferenceKey(profile.id));
  return ageGroups.includes(preference) ? preference : profile.age;
}

export function includesLevel(path, index) {
  return index >= path.first - 1 && index < path.last;
}

export function nextPathLevel(path, scores) {
  for (let index = path.first - 1; index < path.last; index++) {
    if (!scores[index]) return index;
  }
  return path.first - 1;
}
