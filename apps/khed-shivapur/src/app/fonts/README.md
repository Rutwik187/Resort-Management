# Fonts, trimmed for this site

## Newsreader

Newsreader is by Production Type, licensed under the SIL Open Font License 1.1 (see `OFL.txt`).
These files were made from the Google Fonts sources (`ofl/newsreader` in github.com/google/fonts):

- `newsreader-light.woff2`: weight fixed at 300, optical size kept from 24 to 72.
- `newsreader-light-italic.woff2`: weight 300, optical size 72.

Both are subset to Basic Latin, Latin-1, typographic punctuation, the prime marks used in
coordinates (′ ″) and the rupee sign (₹). Together they are about 67 KB, against about 360 KB
for the full variable font from Google Fonts. Remake them with fontTools:

```sh
fonttools varLib.instancer Newsreader[opsz,wght].ttf opsz=24:72 wght=300 -o light.ttf
fonttools varLib.instancer Newsreader-Italic[opsz,wght].ttf opsz=72 wght=300 -o italic.ttf
pyftsubset light.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2032-2033,U+2039-203A,U+20B9,U+2122" --layout-features='*' --flavor=woff2 --output-file=newsreader-light.woff2
```

## Tiro Devanagari Marathi

By Tiro Typeworks, licensed under the SIL Open Font License 1.1 (see `OFL-tiro-devanagari-marathi.txt`).
`tiro-devanagari-marathi-sahyadri.woff2` holds only the letters of the one Marathi word on the site,
सह्याद्री (Sahyadri), with its joined forms: about 7 KB. To use more Marathi words, remake it with all of them:

```sh
pyftsubset TiroDevanagariMarathi-Regular.ttf --text="सह्याद्री" --layout-features='*' --flavor=woff2 --output-file=tiro-devanagari-marathi-sahyadri.woff2
```
