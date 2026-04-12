#!/usr/bin/env python3
"""
Lee la solapa LISTA_HH de un .xlsx y genera JSON listo para importar vía API.

Uso:
  python3 scripts/parse_lista_hh.py "/ruta/al/archivo.xlsx" [salida.json]

Por defecto escribe en data/lista_hh_import.json (relativo al repo).
CUERPO1..5: se guardan en texto y se derivan siglas (primera palabra + patrones LP67, CAP01, etc.).
Las fechas FECHA4..FECHA33 se convierten de serial Excel a YYYY-MM-DD cuando aplica.
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


def excel_serial_to_iso(x: str) -> str | None:
    try:
        f = float(str(x).strip())
        if f <= 0 or f > 60000:
            return None
        d = EXCEL_EPOCH + timedelta(days=int(f))
        return d.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def split_apellido_nombre(s: str) -> tuple[str, str]:
    s = (s or "").strip()
    if not s:
        return "", ""
    if "," in s:
        a, n = s.split(",", 1)
        return a.strip(), n.strip()
    parts = s.split()
    if len(parts) >= 2:
        return " ".join(parts[:-1]), parts[-1]
    return s, ""


def parse_grado(x: str) -> int | None:
    try:
        v = int(float(str(x).strip()))
        return v if 0 <= v <= 99 else None
    except (ValueError, TypeError):
        return None


def cuerpo_sigla_guess(text: str) -> str | None:
    t = (text or "").strip()
    if not t or t == "-":
        return None
    first = t.split()[0].strip()
    return first.upper() if first else None


# Siglas tipo LP67, CAP01, ARE02, GIG05 (2–4 letras + 1–3 dígitos), por si el texto no empieza con la sigla.
_SIGLA_RE = re.compile(r"\b([A-Za-z]{2,4}\d{1,3})\b")


def siglas_desde_celdas_cuerpo(cuerpos_raw: list[str]) -> list[str]:
    orden: list[str] = []
    visto: set[str] = set()

    def agregar(s: str | None) -> None:
        if not s:
            return
        u = s.strip().upper()
        if not u or u in visto:
            return
        visto.add(u)
        orden.append(u)

    for celda in cuerpos_raw:
        t = (celda or "").strip()
        if not t or t == "-":
            continue
        agregar(cuerpo_sigla_guess(t))
        for m in _SIGLA_RE.findall(t):
            agregar(m.upper())
    return orden


def main():
    repo = Path(__file__).resolve().parent.parent
    default_out = repo / "data" / "lista_hh_import.json"

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
        lista_path = None
        for s in wb.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet"):
            if s.get("name") == "LISTA_HH":
                rid = s.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
                lista_path = "xl/" + rid_to_target[rid].lstrip("/")
                break
        if not lista_path:
            raise SystemExit("No se encontró la solapa LISTA_HH")

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

        ws = ET.fromstring(z.read(lista_path))
        rows_data: dict[int, dict[int, str]] = defaultdict(dict)
        for row in ws.findall(".//main:sheetData/main:row", NS):
            for c in row.findall("main:c", NS):
                r = c.get("r")
                if not r:
                    continue
                ci, ri = parse_cell_ref(r)
                rows_data[ri][ci] = get_val(c)

    rows: list[dict] = []
    for ri in sorted(rows_data.keys()):
        if ri <= 1:
            continue
        cells = rows_data[ri]
        raw_name = cells.get(0, "").strip()
        if not raw_name:
            continue
        apellido, nombre = split_apellido_nombre(raw_name)
        mail = cells.get(11, "").strip()
        fechas: dict[str, str] = {}
        for i, n in enumerate(range(4, 34)):
            col_idx = 12 + i
            raw = cells.get(col_idx, "").strip()
            if not raw or raw == "-":
                continue
            iso = excel_serial_to_iso(raw)
            if iso:
                fechas[str(n)] = iso
        cuerpos_raw = [cells.get(c, "").strip() for c in range(5, 10)]
        rows.append(
            {
                "apellido_y_nombre_original": raw_name,
                "apellido": apellido,
                "nombre": nombre,
                "email": mail.lower() if mail else None,
                "grado_troncal": parse_grado(cells.get(1, "")),
                "grado": parse_grado(cells.get(2, "")),
                "obs_scg33": cells.get(3, "").strip() or None,
                "detalle": cells.get(4, "").strip() or None,
                "cuerpo1": cuerpos_raw[0] or None,
                "cuerpo2": cuerpos_raw[1] or None,
                "cuerpo3": cuerpos_raw[2] or None,
                "cuerpo4": cuerpos_raw[3] or None,
                "cuerpo5": cuerpos_raw[4] or None,
                "cuerpos_sigla_sugeridas": siglas_desde_celdas_cuerpo(cuerpos_raw),
                "exencion": cells.get(10, "").strip() or None,
                "fechas_cuotas": fechas if fechas else None,
            }
        )

    payload = {
        "source": str(xlsx),
        "count": len(rows),
        "rows": rows,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Escritas {len(rows)} filas en {out}")


if __name__ == "__main__":
    main()
