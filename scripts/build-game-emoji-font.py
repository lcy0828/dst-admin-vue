#!/usr/bin/env python3
"""Build the small PUA-only display font from DST's fonts.zip.

Requires Pillow and fonttools[woff]. Run with fonts.zip and an output .woff2.
Only fonts/emoji.zip is used; no saves, player data or game scripts are read.
"""
import io
from pathlib import Path
import struct
import sys
import xml.etree.ElementTree as ET
import zipfile

from PIL import Image
from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen


def pixel_outlines(pixels, width, height, matches, char, baseline, scale, overlap=0):
    pen = TTGlyphPen(None)
    for y in range(height):
        x = 0
        while x < width:
            if not matches(pixels[y * width + x]):
                x += 1
                continue
            end = x + 1
            while end < width and matches(pixels[y * width + end]):
                end += 1
            left, right = round((char['xoffset'] + x - overlap) * scale), round((char['xoffset'] + end + overlap) * scale)
            top, bottom = round((baseline - char['yoffset'] - y + overlap) * scale), round((baseline - char['yoffset'] - y - 1 - overlap) * scale)
            pen.moveTo((left, bottom))
            pen.lineTo((left, top))
            pen.lineTo((right, top))
            pen.lineTo((right, bottom))
            pen.closePath()
            x = end
    return pen.glyph()


def build(source, output):
    with zipfile.ZipFile(source) as bundle:
        with zipfile.ZipFile(io.BytesIO(bundle.read('fonts/emoji.zip'))) as emoji:
            description = ET.fromstring(emoji.read('font.fnt'))
            texture = emoji.read('font.tex')
    if texture[:4] != b'KTEX':
        raise ValueError('Expected KTEX texture')
    bits, = struct.unpack_from('<I', texture, 4)
    compression, mipmaps = (bits >> 4) & 31, (bits >> 13) & 31
    width, height, _, size = struct.unpack_from('<HHHI', texture, 8)
    start = 8 + mipmaps * 10
    if not (0 < width <= 2048 and 0 < height <= 2048 and 0 < mipmaps <= 24):
        raise ValueError('Unexpected emoji atlas dimensions')
    payload = texture[start:start + size]
    if compression in (0, 1, 2):
        atlas = Image.frombytes('RGBA', (width, height), payload, 'bcn',
                                ({0: 1, 1: 2, 2: 3}[compression], {0: 'DXT1', 1: 'DXT3', 2: 'DXT5'}[compression]))
    elif compression == 4:
        atlas = Image.frombytes('RGBA', (width, height), payload)
    else:
        raise ValueError('Unsupported emoji texture compression')
    # KTEX stores rows from the bottom, BMFont coordinates start at the top.
    atlas = atlas.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    common = description.find('common')
    line_height, baseline = int(common.get('lineHeight')), int(common.get('base'))
    chars = [dict((key, int(value)) for key, value in node.attrib.items())
             for node in description.find('chars')]
    if not chars or any(not 0xF0000 <= char['id'] <= 0xFFFFD for char in chars):
        raise ValueError('Expected supplementary private-use emoji codepoints')
    names = ['.notdef'] + [f"emoji{char['id']:X}" for char in chars]
    base_names = names[1:]
    indexed = atlas.quantize(colors=64, method=Image.Quantize.FASTOCTREE)
    palette = list(zip(*[iter(indexed.getpalette('RGBA'))] * 4))[:64]
    silhouette_color = len(palette)
    palette.append((0, 0, 0, 255))
    # COLR v0 works across current desktop/mobile browsers. Horizontal pixel
    # runs become shared-color vector layers, retaining transparency without
    # relying on platform-specific bitmap-font handling.
    outlines = {name: TTGlyphPen(None).glyph() for name in names}
    metrics = {'.notdef': (1024, 0)}
    colors = {}
    scale = 1024 / line_height
    for char, name in zip(chars, base_names):
        x, y, w, h = (char[key] for key in ('x', 'y', 'width', 'height'))
        if x < 0 or y < 0 or x + w > width or y + h > height:
            raise ValueError('Glyph exceeds atlas bounds')
        glyph_image = indexed.crop((x, y, x + w, y + h))
        pixels = list(glyph_image.get_flattened_data() if hasattr(glyph_image, 'get_flattened_data') else glyph_image.getdata())
        outlines[name] = pixel_outlines(pixels, w, h, lambda p: palette[p][3] > 0, char, baseline, scale)
        metrics[name] = (round(char['xadvance'] * scale), 0)
        silhouette = f'{name}.silhouette'
        names.append(silhouette)
        outlines[silhouette] = outlines[name]
        metrics[silhouette] = (0, 0)
        # An opaque underlay avoids pale seams where adjacent palette regions
        # are rasterized separately at small UI sizes.
        colors[name] = [(silhouette, silhouette_color)]
        for color in sorted(set(pixels)):
            if palette[color][3] == 0:
                continue
            layer = f'{name}.color{color}'
            names.append(layer)
            outlines[layer] = pixel_outlines(pixels, w, h, lambda p: p == color, char, baseline, scale, overlap=.3)
            metrics[layer] = (0, 0)
            colors[name].append((layer, color))
    builder = FontBuilder(1024, isTTF=True)
    builder.setupGlyphOrder(names)
    builder.setupCharacterMap({char['id']: name for char, name in zip(chars, base_names)})
    missing = TTGlyphPen(None)
    missing.moveTo((100, 0))
    missing.lineTo((100, 800))
    missing.lineTo((900, 800))
    missing.lineTo((900, 0))
    missing.closePath()
    outlines['.notdef'] = missing.glyph()
    builder.setupGlyf(outlines)
    builder.setupHorizontalMetrics(metrics)
    ascent, descent = round(baseline * 1024 / line_height), round((baseline - line_height) * 1024 / line_height)
    builder.setupHorizontalHeader(ascent=ascent, descent=descent)
    builder.setupNameTable({
        'familyName': 'DST Game Emoji', 'styleName': 'Regular',
        'uniqueFontIdentifier': 'DSTAdmin-GameEmoji-1', 'fullName': 'DST Game Emoji',
        'psName': 'DSTGameEmoji', 'version': 'Version 1.0',
        'copyright': "Emoji artwork: Don't Starve Together, Klei Entertainment. Font packaging: DST Admin.",
    })
    builder.setupOS2(sTypoAscender=ascent, sTypoDescender=descent,
                     usWinAscent=1024, usWinDescent=256, fsType=0)
    builder.setupPost()
    builder.setupMaxp()
    builder.font['COLR'] = buildCOLR(colors, version=0)
    builder.font['CPAL'] = buildCPAL([[(r / 255, g / 255, b / 255, a / 255) for r, g, b, a in palette]])
    builder.font.recalcTimestamp = False
    builder.font['head'].created = builder.font['head'].modified = 2082844800
    builder.font.flavor = 'woff2'
    output.parent.mkdir(parents=True, exist_ok=True)
    builder.font.save(output)
    print(f'{len(chars)} glyphs, {output.stat().st_size} bytes: {output}')


if __name__ == '__main__':
    build(Path(sys.argv[1]), Path(sys.argv[2]))
