#!/usr/bin/env python3
"""
Lee la solapa RESUMEN de un .xlsx (Estado de cuentas) y genera JSON para la app.

Uso (desde la raíz del repo escuadra):
  python3 scripts/parse_resumen.py "/ruta/al/archivo.xlsx" [salida.json]

Desde la carpeta api:
  npm run parse:resumen -- "/ruta/al/archivo.xlsx"

Por defecto escribe data/resumen_estado_cuentas.json (raíz del repo).
"""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

EXCEL_EPOCH = datetime(1899, 12, 30)
NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

_CUERPO_ROW = re.compile(r"^(LP|LF|CAP|ARE|CON|GIG)\d", re.I)


def col_to_idx(col: str) -> int:
    n = 0
    for c in col:
        n = n * 26 + (ord(c.upper()) - ord("A") + 1)
    return n - 1


def parse_cell_ref(ref: str) -> tuple[int, int]:
    m = re.match(r"([A-Z]+)(\d+)", ref)
    if not m:
        return 0, 0
    return col_to_idx(m.group(1)), int(m.group(2))


def parse_num(x) -> float | None:
    if x is None or x == "":
        return None
    t = str(x).strip().replace(",", "").replace(" ", "")
    if t in ("-", "—"):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def excel_serial_to_iso(x) -> str | None:
    try:
        f = float(str(x).strip())
        if f <= 0 or f > 60000:
            return None
        d = EXCEL_EPOCH + timedelta(days=int(f))
        return d.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def is_cuerpo_data_row(col1: str) -> bool:
    s = (col1 or "").strip()
    if not s:
        return False
    return bool(_CUERPO_ROW.match(s))


def main():
    repo = Path(__file__).resolve().parent.parent
    default_out = repo / "data" / "resumen_estado_cuentas.json"

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    xlsx = Path(sys.argv[1]).expanduser()
    out = Path(sys.argv[2]).expanduser() if len(sys.argv) > 2 else default_out
    out.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(xlsx, "r") as z:
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_to_target = {}
        for rel in rels.findall(
            "{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"
        ):
            rid_to_target[rel.get("Id")] = rel.get("Target")

        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheet_path = None
        for s in wb.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet"):
            if (s.get("name") or "").strip().upper() == "RESUMEN":
                rid = s.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
                sheet_path = "xl/" + rid_to_target[rid].lstrip("/")
                break
        if not sheet_path:
            raise SystemExit("No se encontró la solapa RESUMEN")

        ss: list[str] = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("main:si", NS):
                parts: list[str] = []
                for t in si.findall(".//main:t", NS):
                    if t.text:
                        parts.append(t.text)
                    if t.tail:
                        parts.append(t.tail)
                ss.append("".join(parts))

        def get_val(c) -> str:
            t = c.get("t")
            if t == "s":
                return ss[int(c.find("main:v", NS).text)]
            v = c.find("main:v", NS)
            return v.text if v is not None else ""

        ws = ET.fromstring(z.read(sheet_path))
        rows_data: dict[int, dict[int, str]] = defaultdict(dict)
        for row in ws.findall(".//main:sheetData/main:row", NS):
            for c in row.findall("main:c", NS):
                r = c.get("r")
                if not r:
                    continue
                ci, ri = parse_cell_ref(r)
                rows_data[ri][ci] = get_val(c)

    r2 = rows_data.get(2, {})
    fecha_serial = parse_num(r2.get(0))
    fecha_corte = excel_serial_to_iso(fecha_serial) if fecha_serial else None

    indicadores: list[dict] = []
    visto_ind: set[str] = set()
    totales_tipo: list[dict] = []
    visto_tt: set[str] = set()

    for ri in sorted(rows_data.keys()):
        if ri < 4:
            continue
        c = rows_data[ri]
        lab7 = (c.get(7) or "").strip()
        if lab7:
            val8 = parse_num(c.get(8))
            if val8 is not None and lab7 not in visto_ind:
                visto_ind.add(lab7)
                indicadores.append({"label": lab7, "value": val8})
        lab10 = (c.get(10) or "").strip()
        if lab10:
            val11 = parse_num(c.get(11))
            if val11 is not None and lab10 not in visto_tt:
                visto_tt.add(lab10)
                totales_tipo.append({"label": lab10, "value": val11})

    cuerpos: list[dict] = []
    for ri in sorted(rows_data.keys()):
        if ri < 5:
            continue
        c = rows_data[ri]
        col1 = (c.get(1) or "").strip()
        if not is_cuerpo_data_row(col1):
            continue
        n_raw = parse_num(c.get(0))
        cuerpos.append(
            {
                "orden": int(n_raw) if n_raw is not None and n_raw == int(n_raw) else len(cuerpos) + 1,
                "nombre": col1,
                "localidad": (c.get(2) or "").strip() or None,
                "saldo": parse_num(c.get(3)),
                "capitantes": parse_num(c.get(4)),
                "capita_mensual": parse_num(c.get(5)),
            }
        )

    payload = {
        "source": str(xlsx),
        "sheet": "RESUMEN",
        "excel_date_serial": fecha_serial,
        "fecha_corte": fecha_corte,
        "indicadores": indicadores,
        "totales_por_tipo": totales_tipo,
        "cuerpos": cuerpos,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Escrito {out} — {len(cuerpos)} cuerpos, {len(indicadores)} indicadores, {len(totales_tipo)} totales por tipo.")


if __name__ == "__main__":
    main()
