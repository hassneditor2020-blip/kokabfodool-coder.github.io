#!/usr/bin/env python3
"""Check that public page metadata and the bilingual sitemap agree."""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

SITE = 'https://kokabfodool.com'
ROOT = Path(__file__).resolve().parents[1]
NS = {
    's': 'http://www.sitemaps.org/schemas/sitemap/0.9',
    'x': 'http://www.w3.org/1999/xhtml',
}


class SearchMetadata(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.language = None
        self.canonicals = []
        self.alternates = []
        self.descriptions = []
        self.indexable = True
        self.title = ''
        self.in_title = False
        self.anchors = set()
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'html':
            self.language = attrs.get('lang')
        elif tag == 'title':
            self.in_title = True
        elif tag == 'a' and attrs.get('href'):
            self.anchors.add(attrs['href'])
        elif tag == 'meta':
            value = attrs.get('content') or ''
            name = attrs.get('name')
            if name == 'description':
                self.descriptions.append(value.strip())
            elif name in {'robots', 'googlebot', 'bingbot'} and re.search(r'\b(?:noindex|none)\b', value, re.I):
                self.indexable = False
        elif tag == 'link':
            rel = (attrs.get('rel') or '').split()
            if 'canonical' in rel:
                self.canonicals.append(attrs.get('href'))
            if 'alternate' in rel and attrs.get('hreflang'):
                self.alternates.append((attrs['hreflang'], attrs.get('href')))

    def handle_data(self, data):
        if self.in_title:
            self.title += data

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False


def read_public_pages():
    html_files = subprocess.check_output(['git', 'ls-files', '-z', '*.html'], cwd=ROOT)
    pages = {}
    for file in html_files.decode().rstrip('\0').split('\0'):
        metadata = SearchMetadata(ROOT / file)
        if metadata.indexable:
            route = '/' + file.removesuffix('index.html')
            pages[SITE + route] = metadata
    return pages


def read_sitemap():
    root = ET.parse(ROOT / 'sitemap.xml').getroot()
    assert root.tag == '{' + NS['s'] + '}urlset', 'Expected the sitemap protocol urlset'
    entries = {}
    for row in root.findall('s:url', NS):
        url = row.findtext('s:loc', namespaces=NS)
        assert url and url not in entries, f'Missing or duplicate sitemap URL: {url}'
        entries[url] = [(link.get('hreflang'), link.get('href')) for link in row.findall('x:link', NS)]
    return entries


def main():
    pages = read_public_pages()
    sitemap = read_sitemap()
    missing = sorted(pages.keys() - sitemap.keys())
    unexpected = sorted(sitemap.keys() - pages.keys())
    assert not (missing or unexpected), f'Sitemap missing {missing}; unexpected entries {unexpected}'
    robots = (ROOT / 'robots.txt').read_text()
    assert 'Sitemap: ' + SITE + '/sitemap.xml' in robots

    for url, page in pages.items():
        assert page.canonicals == [url], f'Invalid canonical URL: {url}'
        assert page.language in {'ar', 'en'}, f'Missing page language: {url}'
        assert page.title.strip(), f'Missing page title: {url}'
        assert len(page.descriptions) == 1 and page.descriptions[0], f'Missing unique description tag: {url}'
        suffix = url.removeprefix(SITE)
        arabic_suffix = suffix.removeprefix('/en') if page.language == 'en' else suffix
        assert arabic_suffix.startswith('/'), f'Invalid localized path: {url}'
        ar = SITE + arabic_suffix
        en = SITE + '/en' + arabic_suffix
        expected = {'ar': ar, 'en': en, 'x-default': ar}
        assert ar in pages and en in pages, f'Missing indexable translation: {url}'
        assert len(page.alternates) == 3 and dict(page.alternates) == expected, f'Invalid hreflang in page: {url}'
        assert len(sitemap[url]) == 3 and dict(sitemap[url]) == expected, f'Invalid hreflang in sitemap: {url}'

    for language_prefix in ('', '/en'):
        app_path = language_prefix + '/app/'
        assert SITE + app_path in pages, f'Public app landing missing: {app_path}'
        for directory in ('/', '/games/'):
            assert app_path in pages[SITE + language_prefix + directory].anchors, f'App link missing from {language_prefix + directory}'

    duplicate_titles = [title for title, n in Counter(page.title for page in pages.values()).items() if n > 1]
    assert not duplicate_titles, f'Duplicate page titles: {duplicate_titles}'
    duplicate_descriptions = [description for description, n in Counter(page.descriptions[0] for page in pages.values()).items() if n > 1]
    assert not duplicate_descriptions, f'Duplicate descriptions: {duplicate_descriptions}'
    counts = Counter(page.language for page in pages.values())
    print(f'SEO metadata and sitemap verified: {len(pages)} pages ({counts["ar"]} Arabic, {counts["en"]} English).')


if __name__ == '__main__':
    main()
