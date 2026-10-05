"""Audit generated PDFs; use Poppler PNG review as the visual check as well."""
import json
import sys
import pdfplumber

for path in sys.argv[1:]:
    problems = []
    summaries = []
    with pdfplumber.open(path) as doc:
        for index, page in enumerate(doc.pages, 1):
            body = [c for c in page.chars if 69 < c['top'] < page.height - 44]
            overflowing = [c for c in body if c['bottom'] > page.height - 61 or c['x0'] < 48 or c['x1'] > page.width - 48]
            colored = [c for c in page.chars if isinstance(c.get('non_stroking_color'), (tuple,list)) and len(c['non_stroking_color']) == 3 and max(c['non_stroking_color']) - min(c['non_stroking_color']) > .001]
            black_boxes = [r for r in page.rects if r['top'] > 70 and r.get('fill') and r.get('non_stroking_color') in [(0,0,0),0]]
            lines = set(round(c['top'],1) for c in body)
            if overflowing: problems.append(f'Page {index}: {len(overflowing)} characters outside body bounds')
            if colored: problems.append(f'Page {index}: colored text')
            if black_boxes: problems.append(f'Page {index}: black-filled body rectangles')
            if len(lines) < 4: problems.append(f'Page {index}: sparse page ({len(lines)} lines)')
            summaries.append({'page':index, 'body_lines':len(lines), 'characters':len(body)})
    print(json.dumps({'file':path,'pages':summaries,'problems':problems},indent=2))
    if problems: sys.exit(1)
