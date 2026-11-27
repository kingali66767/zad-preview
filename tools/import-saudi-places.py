"""Refresh the Saudi prayer directory from the GeoNames SA.zip country extract."""

import argparse
import json
import re
from pathlib import Path
from zipfile import ZipFile

# The 17 existing city aliases and selections remain stable across releases.
EXISTING = {
    "108410", "104515", "109223", "105343", "110336", "109323",
    "107968", "107304", "106281", "101628", "110690", "105299",
    "103630", "109953", "102527", "108512", "109571",
}
POPULATED = re.compile(r"PPL(?:A[2345]?|C|R|L|F)?")
ARABIC = re.compile(r"^[\u0621-\u063a\u0641-\u065f\u0670\s-]+$")
CHINESE = re.compile(r"^[\u3400-\u9fff]+$")


def import_places(archive):
    populated = []
    with ZipFile(archive) as source:
        for line in source.read("SA.txt").decode("utf-8").splitlines():
            ident, name, ascii_name, aliases, lat, lon, kind, feature, country, _, region, *_ = line.split("\t")
            if country != "SA" or kind != "P" or not POPULATED.fullmatch(feature) or ident in EXISTING:
                continue
            names = aliases.split(",")
            ar = next((alias for alias in names if ARABIC.fullmatch(alias) and alias.strip()), "")
            zh = next((alias for alias in reversed(names) if CHINESE.fullmatch(alias)), "")
            populated.append([int(ident), ascii_name or name, ar, zh, float(lat), float(lon), region])
    return sorted(populated, key=lambda place: (place[1].casefold(), place[0]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    places = import_places(args.archive)
    if len(places) < 4000 or len({place[0] for place in places}) != len(places):
        parser.error("Unexpected Saudi populated-place coverage")
    destination = Path(__file__).resolve().parents[1] / "docs/assets/saudi-places.js"
    lines = ",\n".join(json.dumps(place, ensure_ascii=False, separators=(",", ":")) for place in places)
    destination.write_text(
        '"use strict";\n// GeoNames Saudi Arabia extract, CC BY 4.0 · https://www.geonames.org/\n'
        'const zadSaudiPlaces = [\n' + lines + '\n];\n', encoding="utf-8"
    )
    print(f"Imported {len(places)} additional populated places.")


if __name__ == "__main__":
    main()
