import {activeProfile} from './profile-state.js';

const catalogURL = '/stories/catalog.json';
const android = /FudoolAndroidUnified/.test(navigator.userAgent);
const localKey = 'fudool-pages-v1:' + activeProfile().id;
const root = document.querySelector('[data-library], [data-reader]');

function readProgress() {
    try { return JSON.parse(localStorage.getItem(localKey) || '{}') || {}; }
    catch { return {}; }
}
const progress = readProgress();

function record(id) {
    return progress[id] ||= {};
}

function update(id, changes) {
    Object.assign(record(id), changes);
    try { localStorage.setItem(localKey, JSON.stringify(progress)); }
    catch { /* The session still works when storage is blocked. */ }
}

function node(tag, text = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}

function button(text, handler) {
    const element = node('button', text);
    element.type = 'button';
    element.addEventListener('click', handler);
    return element;
}

function storyPath(id) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw Error('Unknown story');
    return '/stories/' + id + '/';
}

async function data(path) {
    const response = await fetch(path);
    if (!response.ok) throw Error('Story is unavailable');
    return response.json();
}

function library(catalog) {
    const filters = document.querySelector('[data-filters]');
    const summary = document.querySelector('[data-summary]');
    const render = () => {
        const {search, age, status} = Object.fromEntries(new FormData(filters));
        const query = search.normalize('NFC').trim().toLowerCase();
        const stories = catalog.stories.filter(story =>
            (!age || Number(age) === story.ageMin) &&
            (!status || record(story.id)[status]) &&
            (!query || [story.titleAr, story.theme, ...story.characters].join(' ').normalize('NFC').toLowerCase().includes(query)));
        root.replaceChildren();
        const all = Object.values(progress);
        const completed = all.filter(item => item.completed).length;
        const stars = completed + 2 * all.filter(item => item.quizPassed).length;
        const badge = [[50, 'شهادة قارئ كوكب فضول'], [25, 'بطل القراءة'], [10, 'المستكشف'], [5, 'القارئ الصغير']]
            .find(([threshold]) => completed >= threshold);
        summary.textContent = `نجوم القراءة: ${stars} · القصص المكتملة: ${completed}${badge ? ' · ' + badge[1] : ''}`;
        if (!stories.length) {
            root.append(node('p', query || status ? 'لا توجد قصص مطابقة.' : 'قصص جديدة في الطريق!'));
        }
        for (const story of stories) {
            const card = node('article');
            card.className = 'pages-card';
            const body = node('div');
            const link = node('a', story.titleAr);
            link.href = storyPath(story.id);
            const title = node('h2');
            title.append(link);
            const image = node('img');
            image.src = link.href + story.cover;
            image.alt = '';
            image.loading = 'lazy';
            const saved = record(story.id);
            const favorite = button('المفضلة', () => {
                update(story.id, {favorite: !saved.favorite});
                if (status === 'favorite') render();
                else favorite.setAttribute('aria-pressed', String(saved.favorite));
            });
            favorite.setAttribute('aria-pressed', String(Boolean(saved.favorite)));
            body.append(title, node('p', `${story.ageMin}–${story.ageMax} سنوات · ${story.pageCount} صفحات · ${story.readingMinutes} د`),
                node('p', story.educationalValue),
                node('p', saved.completed ? 'اكتملت القراءة' : saved.page > 0 ? `تابع من صفحة ${saved.page + 1}` : ''), favorite);
            card.append(image, body);
            root.append(card);
        }
    };
    filters.addEventListener('input', render);
    filters.addEventListener('submit', event => event.preventDefault());
    render();
}

function quiz(story) {
    if (!story.questions.length) return;
    const form = node('form');
    form.className = 'pages-quiz';
    form.append(node('h2', 'ماذا تذكّرت من القصة؟'));
    const result = node('p');
    result.className = 'pages-notice';
    result.setAttribute('role', 'status');
    for (const [index, question] of story.questions.entries()) {
        const field = node('fieldset');
        field.append(node('legend', question.question));
        for (const [choice, option] of question.options.entries()) {
            const input = node('input');
            input.type = 'radio';
            input.name = String(index);
            input.value = String(choice);
            input.required = true;
            const label = node('label');
            label.append(input, node('span', option));
            field.append(label);
        }
        form.append(field);
    }
    const submit = node('button', 'تحقّق من إجاباتي');
    form.append(submit, result);
    form.addEventListener('submit', event => {
        event.preventDefault();
        const answers = new FormData(form);
        const score = story.questions.filter((item, index) => answers.get(String(index)) === String(item.correctIndex)).length;
        const complete = score === story.questions.length;
        const previous = record(story.id).quizPassed;
        if (complete) update(story.id, {quizPassed: true});
        const name = activeProfile().name;
        result.textContent = complete
            ? (name ? `أحسنت يا ${name}!` : 'أحسنت!') + (previous ? ' أجبت عن جميع الأسئلة.' : ' حصلت على نجمتين.')
            : `${score}/${story.questions.length} إجابات صحيحة. جرّب مرة أخرى.`;
    });
    root.after(form);
}

function reader(story) {
    const saved = record(story.id);
    const base = storyPath(story.id);
    let position = Number.isInteger(saved.page) ? Math.max(0, Math.min(saved.page, story.pages.length - 1)) : 0;
    let quizShown = false;
    const book = node('div');
    book.className = 'pages-book';
    const frame = node('figure');
    frame.className = 'pages-frame';
    const image = node('img');
    image.alt = '';
    const text = node('figcaption');
    text.setAttribute('aria-live', 'polite');
    frame.append(image, text);
    const counter = node('span');
    counter.className = 'pages-counter';
    const controls = node('div');
    controls.className = 'pages-actions';
    const previous = button('السابق', () => move(-1));
    const next = button('التالي', () => seenEnd() ? finish() : move(1));
    const large = button('تكبير النص', () => {
        const enlarged = book.toggleAttribute('data-large');
        large.setAttribute('aria-pressed', String(enlarged));
    });
    const dialog = node('dialog');
    const zoomImage = node('img');
    zoomImage.alt = '';
    dialog.append(zoomImage, button('إغلاق', () => dialog.close()));
    const zoom = button('تكبير الصورة', () => {
        zoomImage.src = image.src;
        dialog.showModal();
    });
    const full = button('ملء الشاشة', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await book.requestFullscreen();
        } catch { notice.textContent = 'ملء الشاشة غير متاح.'; }
    });
    full.hidden = !document.fullscreenEnabled;
    const notice = node('p');
    notice.setAttribute('role', 'status');
    notice.className = 'pages-notice';
    controls.append(previous, counter, next, large, zoom, full);
    book.append(frame, controls, notice, dialog);
    root.replaceChildren(book);
    if (!android && navigator.serviceWorker && globalThis.caches) {
        downloadControls(story, controls, notice).catch(() => {});
    }
    if (story.youtubeUrl) {
        const link = node('a', 'شاهد القصة');
        link.href = android ? '/play-app/external/?url=' + encodeURIComponent(story.youtubeUrl) : story.youtubeUrl;
        link.rel = 'noopener noreferrer';
        controls.append(link);
    }
    function seenEnd() { return position === story.pages.length - 1; }
    function render() {
        const page = story.pages[position];
        image.src = base + page.image;
        text.textContent = page.text;
        counter.textContent = `${position + 1}/${story.pages.length}`;
        previous.disabled = position === 0;
        next.textContent = seenEnd() ? 'إنهاء القصة' : 'التالي';
        update(story.id, {page: position});
    }
    function move(delta) {
        const nextPage = position + delta;
        if (nextPage < 0 || nextPage >= story.pages.length) return;
        position = nextPage;
        render();
    }
    function finish() {
        const already = saved.completed;
        update(story.id, {completed: true});
        notice.textContent = already ? 'أكملت القصة.' : 'أكملت القصة وحصلت على نجمة!';
        if (!quizShown) quiz(story);
        quizShown = true;
    }
    let start;
    frame.addEventListener('pointerdown', event => {
        start = event.pointerType === 'touch' ? [event.clientX, event.clientY] : null;
    });
    frame.addEventListener('pointercancel', () => { start = null; });
    frame.addEventListener('pointerup', event => {
        if (!start) return;
        const dx = event.clientX - start[0];
        const dy = event.clientY - start[1];
        if (Math.abs(dx) > 48 && Math.abs(dx) > 1.3 * Math.abs(dy)) move(dx > 0 ? 1 : -1);
        start = null;
    });
    render();
}

async function downloadControls(story, controls, notice) {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const prefix = 'fudool-story-v1-' + story.id;
    const base = storyPath(story.id);
    const toggle = button('', async () => {
        toggle.disabled = true;
        try {
            if (await caches.has(prefix)) {
                await caches.delete(prefix);
                notice.textContent = 'حُذفت القصة المنزّلة.';
            } else {
                const cache = await caches.open(prefix);
                try {
                    await cache.addAll([base, base + 'story.json', base + story.cover,
                        '/stories/', catalogURL, '/assets/fudool-pages-cover.webp', '/assets/fudool-pages.js',
                        '/assets/fudool-pages.css', '/assets/profile-state.js',
                        ...story.pages.map(page => base + page.image)]);
                    notice.textContent = 'القصة جاهزة للقراءة دون إنترنت.';
                } catch (error) {
                    await caches.delete(prefix);
                    throw error;
                }
            }
        } catch { notice.textContent = 'تعذّر تنزيل القصة. حاول مرة أخرى.'; }
        finally { await refresh(); toggle.disabled = false; }
    });
    async function refresh() {
        toggle.textContent = await caches.has(prefix) ? 'حذف التنزيل' : 'تنزيل القصة';
    }
    await refresh();
    controls.append(toggle);
}

if (root) {
    if (android && root.hasAttribute('data-library')) document.querySelector('nav a').href = '/play-app/';
    const id = root.dataset.story;
    (id ? data(storyPath(id) + 'story.json').then(reader) : data(catalogURL).then(library))
        .catch(() => root.append(node('p', 'تعذر تحميل القصة أو المكتبة. جرّب مجددًا عند توفر الاتصال.')));
}
