"""Keep PPT-exported SVG objects at original coordinates; assign reveal stages.
Usage: python3 scripts/prepare-physics-svg.py /path/to/libreoffice-svg-exports
The input SVG files are exported directly from the two source PPT slides.
"""
import copy
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
import importlib.util

NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
n = {'s': NS}

def align_labels(root, kind):
    # PPT stores left edges computed for its original font. Anchor each whole
    # line to the label box center so font changes do not shift its alignment.
    centered = {
        'teaser': {2, 15, 24, 5, 12, 13, 7, 14},
        'method': {139, 0, 88, 92, 102, 137, 138, 79, 118, 49, 52, 51, 154, 155},
    }[kind]
    for group in root.findall('.//s:g[@data-object]', n):
        if int(group.get('data-object')) not in centered:
            continue
        bounds = group.find('.//s:rect[@class="BoundingBox"]', n)
        center = float(bounds.get('x')) + float(bounds.get('width')) / 2
        for position in group.findall('.//s:tspan[@class="TextPosition"]', n):
            position.set('x', f'{center:g}')
            position.set('text-anchor', 'middle')

def replace_raster_labels(root):
    """Keep ordinary labels editable and styled by the website font."""
    for group in root.findall('.//s:g[@data-object]', n):
        object_id = group.get('data-object')
        if object_id not in ('113', '23'):
            continue
        for parent in group.iter():
            for child in list(parent):
                if child.tag != f'{{{NS}}}image':
                    continue
                parent.remove(child)
                if object_id == '23':
                    ET.SubElement(parent, f'{{{NS}}}rect', {
                        'x': '13846', 'y': '123', 'width': '6856', 'height': '2748',
                        'rx': '480', 'fill': '#dcebf7', 'stroke': 'none',
                    })
                    label = ET.SubElement(parent, f'{{{NS}}}text', {
                        'x': '17274', 'y': '1497', 'text-anchor': 'middle',
                        'dominant-baseline': 'central',
                        'font-family': 'var(--font-noto-sans), Arial, sans-serif',
                        'font-size': '480px', 'font-weight': '600',
                        'fill': '#000', 'stroke': 'none',
                    })
                    label.text = 'PhysiCalWorld Model'
                else:
                    label = ET.SubElement(parent, f'{{{NS}}}text', {
                        'x': '9151', 'y': '2820', 'text-anchor': 'middle',
                        'font-family': 'var(--font-noto-sans), Arial, sans-serif',
                        'font-size': '338.4px', 'fill': '#000', 'stroke': 'none',
                    })
                    label.text = 'Test Scene '
                    symbol = ET.SubElement(label, f'{{{NS}}}tspan', {
                        'font-family': 'serif', 'font-style': 'italic',
                    })
                    symbol.text = '𝒯'

source = Path(sys.argv[1])
destination = Path(__file__).resolve().parents[1] / 'src/assets/diagrams'

# Indices reference the original stacking order, including off-slide working objects.
TEASER = {
 -1: [0,16,19,20,21,22,23,28],
 0: [1,2,9,17],
 1: [8,15,24,27],
 2: [5,10,11],
 3: [6,12],
 4: [3,13,18],
 5: [7,26],
 6: [4,14,25],
}
METHOD = {
 -1: [69],
 0: [0,4,5,6,70,88,89,90,91,92,101,102,103,104,136,137,138,139,147,158,159],
 1: [8,64,66,79,144],
 2: [1,97,113,145,160],
 3: [106,108,109,110,111,115,118,143],
 4: [29,112,141],
 5: [21,22],
 6: [15,49,61,83],
 7: [16,31,41,52,161],
 8: [23,27,28,30],
 9: [2,3,35,51,96,152,153,154,155,156,157],
}
for kind, filename, stages in [('teaser','1-teaser-v3',TEASER),('method','2-method-v9-local',METHOD)]:
    root = ET.parse(source / (filename + '.svg')).getroot()
    page = root.find('.//s:g[@class="Slide"][@id="id1"]/s:g',n)
    output = ET.Element(f'{{{NS}}}svg', {'viewBox':root.get('viewBox'), 'preserveAspectRatio':'xMidYMid meet', 'fill-rule':'evenodd', 'stroke-width':'28.222', 'stroke-linejoin':'round','aria-hidden':'true'})
    # Keep referenced clipping paths and embedded image definitions, not export metadata/fonts.
    for defs in root.findall('s:defs',n):
        kept=ET.Element(f'{{{NS}}}defs')
        for child in defs:
            if child.find('.//s:image', n) is not None or child.tag in [f'{{{NS}}}clipPath',f'{{{NS}}}image',f'{{{NS}}}pattern',f'{{{NS}}}linearGradient',f'{{{NS}}}radialGradient']:
                kept.append(copy.deepcopy(child))
        if len(kept):output.append(kept)
    W,H=map(float,root.get('viewBox').split()[2:])
    groups = {}
    for stage in stages:
        groups[stage] = ET.SubElement(output, f'{{{NS}}}g', {
            'class': 'ppt-scaffold' if stage == -1 else 'ppt-module',
            'data-module': str(stage),
            # All three inputs start before WM; keep the same overlapping cadence.
            'style': f'--module-delay:{({5:900,6:1080}.get(stage,max(0,stage)*180) if kind == "teaser" else max(0,stage)*180)}ms',
        })
    count=0
    for index, original in enumerate(page):
        b=original.find('.//s:rect[@class="BoundingBox"]',n)
        if b is None:raise ValueError(f'Missing bounds: {kind} {index}')
        x,y,w,h=[float(b.get(k)) for k in ['x','y','width','height']]
        if x+w<0 or y+h<0 or x>W or y>H:continue
        stage=next((s for s,indices in stages.items() if index in indices),None)
        if stage is None:raise ValueError(f'Unassigned visible object: {kind} {index}')
        g=copy.deepcopy(original)
        # LibreOffice emits dangling bitmap <use> references for repeated images.
        # Reuse the original embedded bitmap with the target object's geometry.
        reused = {'teaser': {19:17}, 'method': {97:63,152:156,160:158}}[kind]
        if index in reused:
            original_image_group=page[reused[index]]
            sb=original_image_group.find('.//s:rect[@class="BoundingBox"]',n)
            sx,sy,sw,sh=[float(sb.get(k)) for k in ['x','y','width','height']]
            source_image=original_image_group.find('.//s:image',n)
            for parent in g.iter():
                for child in list(parent):
                    if child.tag == f'{{{NS}}}use':
                        im=copy.deepcopy(source_image)
                        for key,start,base,ratio in [('x',x,sx,w/sw),('y',y,sy,h/sh)]:
                            im.set(key,str(start+(float(im.get(key,'0'))-base)*ratio))
                        im.set('width',str(float(im.get('width'))*w/sw))
                        im.set('height',str(float(im.get('height'))*h/sh))
                        parent.insert(list(parent).index(child),im);parent.remove(child)
        # Color emoji metrics differ from the export's Aptos fallback. Do not
        # squeeze the question-mark glyph into the fallback's half-width advance.
        for span in g.findall('.//s:tspan', n):
            if span.text and '❓' in span.text:
                span.attrib.pop('textLength', None)
                span.attrib.pop('lengthAdjust', None)
                span.set('font-family', 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif')
        if kind == 'method' and index == 101:
            # Account for the emoji's built-in side bearing so the visible mark
            # sits close to the title, while retaining its baseline.
            position = g.find('.//s:tspan[@class="TextPosition"]', n)
            position.set('x', '5030')
            position.set('y', '3357')
        g.set('data-object',str(index))
        # Animate the actual connector strokes, retaining stationary arrowheads.
        # The vertical separator in the method diagram is not a connector arrow.
        if 'ConnectorShape' in original.get('class','') and not (kind == 'method' and index == 69):
            reverse = kind == 'teaser' and index in [6,11,22]
            for path in g.findall('.//s:path',n):
                if path.get('stroke','none') != 'none':
                    path.set('class','ppt-arrow-line' + (' arrow-reverse' if reverse else ''))
                    if kind != 'method':path.set('vector-effect','non-scaling-stroke')
                    color = path.get('stroke') if kind == 'method' else ('#3a7d22' if path.get('stroke') == 'rgb(58,125,34)' else '#333')
                    style = f'--arrow-color:{color}'
                    if kind == 'method':
                        style += f";--arrow-width:{path.get('stroke-width','28.222')}px;--arrow-dash:55px 45px;--arrow-period:-100px;--arrow-cap:butt;--arrow-duration:0.35s"
                    path.set('style',style)
                elif path.get('fill','none') != 'none':
                    path.set('class','ppt-arrow-head')
                    color = path.get('fill') if kind == 'method' else ('#3a7d22' if path.get('fill') == 'rgb(58,125,34)' else '#333')
                    path.set('style',f'--arrow-color:{color}')

        for parent in g.iter():
            for child in list(parent):
                if child.tag in [f'{{{NS}}}desc', f'{{{NS}}}title']:parent.remove(child)
        groups[stage].append(g);count+=1
    # Let the webpage font use its natural glyph widths rather than stretching
    # it to the original PowerPoint font's measurements.
    for element in output.iter():
        element.attrib.pop('textLength', None)
        element.attrib.pop('lengthAdjust', None)
        # Noto Sans labels need more horizontal room than the PPT serif font.
        # Reduce font size uniformly, preserving natural glyph proportions.
        family = element.get('font-family', '').replace(' embedded', '')
        if family in ('Times New Roman, serif', 'Aptos'):
            size = element.get('font-size', '')
            if size.endswith('px'):
                element.set('font-size', f'{float(size[:-2]) * 0.8:g}px')
    if kind == 'method':
        replace_raster_labels(output)
        spec = importlib.util.spec_from_file_location(
            'method_vectors', Path(__file__).with_name('vectorize-method-svg.py'))
        method_vectors = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(method_vectors)
        method_vectors.vectorize_method(output)
    align_labels(output, kind)
    raw=ET.tostring(output,encoding='unicode')
    # Avoid cross-figure SVG definition collisions when both SVGs are inline.
    ids=re.findall(r'\bid="([^"]+)"',raw)
    for id_ in sorted(ids,key=len,reverse=True):
        raw=raw.replace(f'id="{id_}"',f'id="{kind}-{id_}"').replace(f'#{id_}"',f'#{kind}-{id_}"').replace(f'#{id_})',f'#{kind}-{id_})')
    # The export's embedded SVG fonts are unsupported by modern browsers. Use the
    # corresponding installed font family (export supplies fallbacks as well).
    raw=raw.replace(' embedded','')
    (destination / (kind+'.svg')).write_text(raw)
    print(kind,count,'native objects',len(raw),'bytes')
