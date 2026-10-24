# DST game emoji

`dst-game-emoji.woff2` contains the 50 private-use emoji glyphs U+F0000–U+F0031
from the `fonts/emoji.zip` bitmap atlas in Don't Starve Together's `fonts.zip`.
The artwork belongs to **Klei Entertainment**:
https://www.klei.com/games/dont-starve-together

The font only supplies game emoji. It includes no game scripts, saves or player
data, and does not replace ordinary text or system emoji fonts. It is packaged
with the frontend so room names and other game text work without an external
font service or a running game server.

The atlas is encoded as COLR v0/CPAL layers in WOFF2, with 64 artwork colors,
a monochrome underlay, and fallback outlines. The source artwork is raster;
the generated layers map its icons to the original private-use codepoints.

To rebuild from an installed game's `data/databundles/fonts.zip`, install Pillow
and `fonttools[woff]`, then run:

```sh
python scripts/build-game-emoji-font.py /path/to/fonts.zip src/assets/fonts/dst-game-emoji.woff2
```

《饥荒联机版》表情图案来自 Klei Entertainment。此字体仅用于显示游戏私有区表情。
