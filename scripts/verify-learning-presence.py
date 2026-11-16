#!/usr/bin/env python3
"""Verify the public learning pages, schema graphs and video sitemap preview."""
from collections import Counter
from datetime import datetime
import json
from pathlib import Path
import re
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://kokabfodool.com'
PAGE_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
VIDEO_NS = 'http://www.google.com/schemas/sitemap-video/1.1'
LD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)


def route_file(url):
    path = urlsplit(url).path.lstrip('/')
    return ROOT / (path + 'index.html' if not path or path.endswith('/') else path)


def check():
    page_map = ET.parse(ROOT / 'sitemap.xml').getroot()
    urls = {loc.text for loc in page_map.findall('.//{' + PAGE_NS + '}loc')}
    source = json.loads((ROOT / 'scripts/youtube-public.json').read_text())
    embeds_enabled = source.get('childDirectedDesignationVerified') is True
    filename = 'video-sitemap.xml' if embeds_enabled else 'build/learning-preview/video-sitemap.xml'
    if (ROOT / filename).exists():
        video_map = ET.parse(ROOT / filename).getroot()
        entries = video_map.findall('{' + PAGE_NS + '}url')
        assert entries, 'Video discovery is empty'
        for row in entries:
            loc = row.findtext('{' + PAGE_NS + '}loc')
            assert loc in urls
            video = row.find('{' + VIDEO_NS + '}video')
            fields = {child.tag.split('}', 1)[1]: child.text for child in video}
            assert route_file(fields['thumbnail_loc']).is_file()
            id = fields['player_loc'].split('/')[-1]
            assert source['items'][id]['publishedAt'] == fields['publication_date']
            assert int(fields['duration']) == source['items'][id]['durationSeconds']
            assert len(fields['title']) <= 100 and len(fields['description']) <= 2048
            datetime.fromisoformat(fields['publication_date'])
    else:
        assert not embeds_enabled

    robots = (ROOT / 'robots.txt').read_text()
    assert ('/video-sitemap.xml' in robots) == embeds_enabled
    graphs = Counter()
    games = 0
    episodes = 0
    for url in urls:
        text = route_file(url).read_text()
        assert 'Kawkab Fudool' not in text, url
        assert 'twitter:title' in text and 'twitter:image' in text, url
        records = LD.findall(text)
        assert len(records) == 1, url
        data = json.loads(records[0])
        nodes = data['@graph']
        assert data['@context'] == 'https://schema.org'
        assert len(nodes) == len({node['@id'] for node in nodes}), url
        assert any(node.get('url') == url for node in nodes), url
        for item in nodes:
            types = item['@type']
            for kind in types if isinstance(types, list) else [types]:
                graphs[kind] += 1
        if re.fullmatch(r'/(?:en/)?games/[^/]+/', urlsplit(url).path):
            games += 1
            assert 'id="game-levels"' in text and 'href="#game-levels"' in text
            assert 'play-guide' in text and 'LearningResource' in records[0]
        if re.fullmatch(r'/(?:en/)?series/[^/]+/[^/]+/', urlsplit(url).path):
            episodes += 1
            assert 'episode-objectives' in text and 'class="age-label"' in text
            assert ('data-load-video=' in text) == embeds_enabled
            assert 'youtu' in text and 'LearningResource' in records[0]
    assert games == 40
    assert episodes > 0
    assert graphs['Organization'] == graphs['WebSite'] == graphs['MobileApplication'] == 2
    if not embeds_enabled:
        assert graphs['VideoObject'] == 0
    print('Learning presence verified', len(urls), 'pages,', games, 'game pages,', episodes, 'episode pages')
    print(dict(sorted(graphs.items())))


if __name__ == '__main__':
    check()
