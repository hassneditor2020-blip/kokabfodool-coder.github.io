"""Validate a Fudool Pages ZIP and build publishable, size-limited artwork and HTML."""
import argparse
from html import escape
import io
import json
from pathlib import Path, PurePosixPath
import re
from zipfile import ZipFile

from PIL import Image

AGES = {(3, 4), (5, 6), (7, 8), (9, 10)}
MAX_TOTAL = 64 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 16_000_000


def fields(record, names, maximum=700):
    for key in names:
        value = record.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > maximum:
            raise ValueError(f'Invalid {key}')


def load_archive(archive):
    names = set()
    total = 0
    files = [entry for entry in archive.infolist() if not entry.is_dir()]
    if not 2 <= len(files) <= 100:
        raise ValueError('Invalid number of files')
    for entry in files:
        parts = PurePosixPath(entry.filename).parts
        if (not parts or entry.filename.startswith('/') or '..' in parts or
                '\\' in entry.filename or ':' in entry.filename or entry.filename in names or
                (entry.external_attr >> 16) & 0o170000 == 0o120000):
            raise ValueError(f'Unsafe or duplicate path: {entry.filename}')
        names.add(entry.filename)
        total += entry.file_size
    if total > MAX_TOTAL:
        raise ValueError('Expanded archive exceeds 64 MiB')
    found = [name for name in names if PurePosixPath(name).name == 'story.json']
    if len(found) != 1:
        raise ValueError('A single story.json is required')
    manifest = found[0]
    if archive.getinfo(manifest).file_size > 65536:
        raise ValueError('Manifest exceeds 64 KiB')
    prefix = manifest[:-len('story.json')]

    def read(relative, extensions):
        if (not isinstance(relative, str) or not re.fullmatch(r'(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+\.[A-Za-z0-9]+', relative)
                or Path(relative).suffix.lower() not in extensions or prefix + relative not in names):
            raise ValueError(f'Invalid attachment: {relative}')
        return archive.read(prefix + relative)

    return json.loads(archive.read(manifest)), read


def image_bytes(data, limit):
    with Image.open(io.BytesIO(data), formats=['PNG', 'JPEG', 'WEBP']) as image:
        if image.n_frames != 1 or image.width * image.height > 16_000_000:
            raise ValueError('Invalid image dimensions or number of frames')
        image.load()
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        image.convert('RGB').save(out, 'WEBP', quality=82, method=6)
        return out.getvalue()


def prepare(story, read):
    fields(story, ('id', 'titleAr', 'description', 'educationalValue', 'theme'))
    if story.get('schemaVersion') != 1 or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', story['id']) or len(story['id']) > 64:
        raise ValueError('Invalid schema version or story ID')
    ages = story.get('ageMin'), story.get('ageMax')
    if ages not in AGES or story.get('isFree') is not True:
        raise ValueError('Choose a supported age group and mark the story free')
    if not isinstance(story.get('readingMinutes'), int) or not 1 <= story['readingMinutes'] <= 60:
        raise ValueError('Invalid reading time')
    fields(story, ('cover',))
    if (not isinstance(story.get('characters'), list) or not 1 <= len(story['characters']) <= 12 or
            not all(isinstance(name, str) and 0 < len(name.strip()) <= 60 for name in story['characters'])):
        raise ValueError('Invalid characters')
    pages = story.get('pages')
    if not isinstance(pages, list) or not 2 <= len(pages) <= 25 or story.get('pageCount') != len(pages):
        raise ValueError('Invalid number of pages')
    pages = sorted(pages, key=lambda page: page['number'])
    if [page['number'] for page in pages] != list(range(1, len(pages) + 1)):
        raise ValueError('Page numbering must be consecutive')
    questions = story.get('questions', [])
    if not isinstance(questions, list) or len(questions) > 15:
        raise ValueError('Invalid questions')
    for question in questions:
        fields(question, ('question',))
        options = question.get('options')
        answer = question.get('correctIndex')
        if (not isinstance(options, list) or not 2 <= len(options) <= 6 or
                not all(isinstance(option, str) and 0 < len(option.strip()) <= 200 for option in options)
                or type(answer) is not int or not 0 <= answer < len(options)):
            raise ValueError('Invalid question answer choices')
    video = story.get('youtubeUrl')
    if video and not re.fullmatch(r'https://(?:www\.youtube\.com/(?:watch\?v=|shorts/)|youtu\.be/)[A-Za-z0-9_-]{11}', video):
        raise ValueError('Unsupported YouTube URL')
    extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    files = {'cover.webp': image_bytes(read(story['cover'], extensions), 540)}
    story['cover'] = 'cover.webp'
    for page in pages:
        fields(page, ('text', 'image'))
        image = f"page-{page['number']:02d}.webp"
        files[image] = image_bytes(read(page['image'], extensions), 800)
        page['image'] = image
        page.pop('compositeImage', None)
        if page.get('audio'):
            raise ValueError('Audio imports require review before publishing')
    story['pages'] = pages
    return files


def index(story):
    route = '/stories/' + story['id'] + '/'
    canonical = 'https://kokabfodool.com' + route
    title = escape(story['titleAr'])
    description = escape(story['description'])
    text = ''.join(f'<p>{escape(page["text"])}</p>' for page in story['pages'])
    schema = json.dumps({'@context': 'https://schema.org', '@graph': [{
        '@type': 'CreativeWork', '@id': canonical + '#story',
        'name': story['titleAr'], 'description': story['description'],
        'url': canonical, 'inLanguage': 'ar', 'image': canonical + story['cover'],
    }]}, ensure_ascii=False).replace('<', '\\u003c')
    return f"""<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} | صفحات فضول</title><meta name="description" content="{description}">
<link rel="canonical" href="{canonical}"><meta property="og:image" content="{canonical}{story['cover']}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="{title}">
<meta name="twitter:image" content="{canonical}{story['cover']}">
<script type="application/ld+json">{schema}</script>
<link rel="stylesheet" href="/assets/fudool-pages.css"></head>
<body><main class="pages-layout"><nav><a href="/stories/">كل القصص</a></nav>
<h1>{title}</h1><p>{description}</p>
<section data-reader data-story="{escape(story['id'])}"><img src="{story['cover']}" width="540" height="540" alt="{title}"></section>
<details class="pages-text"><summary>نص القصة كاملًا</summary>{text}</details>
</main><script type="module" src="/assets/fudool-pages.js"></script></body></html>
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('zip', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    with ZipFile(args.zip) as archive:
        story, read = load_archive(archive)
        files = prepare(story, read)
    story['status'] = 'published' if args.publish else 'draft'
    dest = args.output / story['id']
    dest.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (dest / name).write_bytes(data)
    (dest / 'story.json').write_text(json.dumps(story, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (dest / 'index.html').write_text(index(story), encoding='utf-8')
    print(dest)


if __name__ == '__main__':
    main()
