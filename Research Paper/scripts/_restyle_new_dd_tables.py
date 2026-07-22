# -*- coding: utf-8 -*-
import docx
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HEADER_FILL = "2D5A8A"
STRIPE_A = "F0F4F8"
STRIPE_B = "FFFFFF"

d = docx.Document("BUS_BOOKING_UPDATED.docx")
body = d.element.body
children = list(body)

def el_kind(el):
    if el.tag == qn('w:p'):
        return 'p'
    if el.tag == qn('w:tbl'):
        return 'tbl'
    return el.tag

dd_table_indices = []
for i, el in enumerate(children):
    if el_kind(el) == 'tbl':
        from docx.table import Table
        tbl = Table(el, d)
        hdr = [c.text for c in tbl.rows[0].cells]
        if hdr == ['Field', 'Data Type', 'Constraints', 'Description']:
            dd_table_indices.append(i)

print("total DD tables:", len(dd_table_indices))
# first 4 (2.3-2.6) already correctly styled -- restyle the rest (2.7-2.30)
new_table_indices = dd_table_indices[4:]
print("restyling:", len(new_table_indices), "tables")

def set_shd(tcPr, fill):
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tcPr.append(shd)
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill)

def get_or_add_tcPr(tc):
    tcPr = tc.find(qn('w:tcPr'))
    if tcPr is None:
        tcPr = OxmlElement('w:tcPr')
        tc.insert(0, tcPr)
    return tcPr

for tbl_idx in new_table_indices:
    el = children[tbl_idx]
    trs = el.findall(qn('w:tr'))
    for ri, tr in enumerate(trs):
        tcs = tr.findall(qn('w:tc'))
        for tc in tcs:
            tcPr = get_or_add_tcPr(tc)
            if ri == 0:
                set_shd(tcPr, HEADER_FILL)
                # bold + white run color for every run in this header cell
                for p in tc.findall(qn('w:p')):
                    for r in p.findall(qn('w:r')):
                        rPr = r.find(qn('w:rPr'))
                        if rPr is None:
                            rPr = OxmlElement('w:rPr')
                            r.insert(0, rPr)
                        # bold
                        if rPr.find(qn('w:b')) is None:
                            rPr.append(OxmlElement('w:b'))
                        # white color
                        color = rPr.find(qn('w:color'))
                        if color is None:
                            color = OxmlElement('w:color')
                            rPr.append(color)
                        color.set(qn('w:val'), 'FFFFFF')
            else:
                fill = STRIPE_A if (ri % 2 == 1) else STRIPE_B
                set_shd(tcPr, fill)

d.save("BUS_BOOKING_UPDATED.docx")
print("Saved.")
