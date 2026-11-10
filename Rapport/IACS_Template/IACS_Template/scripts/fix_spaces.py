# -*- coding: utf-8 -*-
"""Insert an invisible space glyph INSIDE each word's own BT...ET block,
right before its ET, by appending a zero-width invisible Tj with the
space CID after the visible TJ. This avoids touching graphics state
(Tf/Tr) outside of an already-open BT block, and does not add any new
positioning commands that could shift subsequent text.
"""
import sys
import pikepdf
from pikepdf import Name, String, Array, Operator, Dictionary


def rebuild(path_in: str, path_out: str):
    pdf = pikepdf.open(path_in)
    page = pdf.pages[0]
    ops = list(pikepdf.parse_content_stream(page))

    # Locate each top-level BDC...EMC block; remember the index of its ET
    # (end of BT) so we can inject a Tj right before it.
    blocks = []
    i = 0
    depth = 0
    cur_start = None
    cur_actualtext = None
    cur_et_idx = None
    while i < len(ops):
        operands, operator = ops[i]
        opstr = str(operator)
        if opstr == 'BDC' and depth == 0:
            depth = 1
            cur_start = i
            props = operands[1] if len(operands) > 1 else None
            cur_actualtext = None
            if isinstance(props, pikepdf.Object) and '/ActualText' in props:
                cur_actualtext = str(props['/ActualText'])
            cur_et_idx = None
        elif opstr == 'ET' and depth == 1:
            cur_et_idx = i
        elif opstr == 'EMC' and depth == 1:
            depth = 0
            blocks.append((cur_start, i, cur_actualtext, cur_et_idx))
        i += 1

    print(f'Found {len(blocks)} top-level marked-content text blocks')

    # Build new ops: for every block that is followed by another
    # word-level block, inject an invisible space Tj just before its ET.
    new_ops = []
    last_copied = 0
    inserted = 0
    for idx, (start, end, actualtext, et_idx) in enumerate(blocks):
        has_next = (idx + 1 < len(blocks)) and (blocks[idx+1][2] is not None)
        if actualtext is not None and has_next and et_idx is not None:
            # copy everything up to (not including) the ET
            new_ops.extend(ops[last_copied:et_idx])
            # inject invisible space glyph using current font/state
            new_ops.append(([3], Operator('Tr')))       # invisible mode
            new_ops.append(([Array([String(b'\x00\x01')])], Operator('TJ')))
            new_ops.append(([0], Operator('Tr')))        # restore normal fill mode
            last_copied = et_idx
            inserted += 1
        # else: nothing special, will be copied in bulk below
    new_ops.extend(ops[last_copied:])

    print(f'Inserted {inserted} inline space glyphs')

    new_stream = pikepdf.unparse_content_stream(new_ops)
    contents = page.obj.get('/Contents')
    if isinstance(contents, pikepdf.Array):
        contents[0].write(new_stream)
    else:
        contents.write(new_stream)
    pdf.save(path_out)
    print('Saved to', path_out)


if __name__ == '__main__':
    rebuild(sys.argv[1], sys.argv[2])
