# -*- coding: utf-8 -*-
"""Rewrite broken ToUnicode CMaps (isolated Arabic presentation forms)
to their logical base characters via NFKC normalization, so that
copy-paste/search works correctly while the visible glyphs (untouched)
keep rendering the correct shaped/ligated forms."""
import re
import sys
import unicodedata
import pikepdf

def fix_cmap_bytes(data: bytes) -> bytes:
    text = data.decode('latin-1')

    def repl(m):
        src_hex = m.group(1)
        dst_hex = m.group(2)
        # dst may be a single 4-hex-digit code or a sequence; handle single first
        if len(dst_hex) == 4:
            cp = int(dst_hex, 16)
            ch = chr(cp)
            normalized = unicodedata.normalize('NFKC', ch)
            new_hex = ''.join(f'{ord(c):04X}' for c in normalized)
            return f'<{src_hex}> <{new_hex}>'
        return m.group(0)

    # Match lines like: <0031> <FE80>
    fixed = re.sub(r'<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]+)>', repl, text)
    return fixed.encode('latin-1')


def fix_pdf(path_in: str, path_out: str):
    pdf = pikepdf.open(path_in)
    total_fixed = 0
    for page in pdf.pages:
        resources = page.get('/Resources')
        if resources is None or '/Font' not in resources:
            continue
        fonts = resources['/Font']
        for key in fonts.keys():
            font = fonts[key]
            if '/ToUnicode' in font:
                tu_stream = font['/ToUnicode']
                data = tu_stream.read_bytes()
                new_data = fix_cmap_bytes(data)
                tu_stream.write(new_data)
                total_fixed += 1
    pdf.save(path_out)
    print(f'Fixed {total_fixed} ToUnicode streams. Saved to {path_out}')


if __name__ == '__main__':
    fix_pdf(sys.argv[1], sys.argv[2])
