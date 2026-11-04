# Fonts, trimmed for this site

## Archivo

Archivo is by Omnibus-Type, licensed under the SIL Open Font License 1.1 (see `OFL.txt`).
`archivo-variable.woff2` was made from the Google Fonts source (`ofl/archivo/Archivo[wdth,wght].ttf`
in github.com/google/fonts). It keeps two axes:

- weight from 400 to 900, for text, labels and the heavy display capitals;
- width from 62 to 100, from the condensed display face to normal text width.

It is subset to Basic Latin, Latin-1, typographic punctuation, the prime marks (′ ″), arrows
and the rupee sign (₹): about 61 KB. Remake it with fontTools:

```sh
fonttools varLib.instancer "Archivo[wdth,wght].ttf" wght=400:900 wdth=62:100 -o archivo-limited.ttf
pyftsubset archivo-limited.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2032-2033,U+2039-203A,U+2190-2193,U+20B9,U+2122" --layout-features='*' --flavor=woff2 --output-file=archivo-variable.woff2
```
