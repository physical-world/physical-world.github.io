"""Replace the method diagram's bitmap labels and icons with checked-in vectors.

Usage: python3 scripts/vectorize-method-svg.py [method.svg]
Only simulation screenshots remain raster images. Replacement coordinates are
local to the original bitmap, so PPT positioning, clipping and animation groups
are preserved. The companion SVG stores editable LaTeX in data-latex attributes
and standalone glyph paths, with no browser font or runtime dependency.
"""

import copy
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
ASSETS = Path(__file__).resolve().parents[1] / "src/assets/diagrams"
SCENE_OBJECTS = {"89", "90", "91", "158", "160", "109", "110", "111", "61", "152", "156"}


def vectorize_method(root):
    elements = ET.parse(ASSETS / "method-vector-elements.svg").getroot()
    replacements = {node.get("data-object"): node for node in elements}
    count = 0
    for group in root.iter(f"{{{NS}}}g"):
        object_id = group.get("data-object")
        if object_id not in replacements:
            continue
        for parent in group.iter():
            for child in list(parent):
                is_bitmap = child.tag == f"{{{NS}}}image"
                is_vector = child.get("data-vector-object") == object_id
                if not (is_bitmap or is_vector):
                    continue
                vector = copy.deepcopy(replacements[object_id])
                vector.attrib.pop("id", None)
                vector.attrib.pop("data-object", None)
                vector.set("data-vector-object", object_id)
                for attr in ("x", "y", "width", "height"):
                    vector.set(attr, child.get(attr))
                vector.set("preserveAspectRatio", "none")
                parent.insert(list(parent).index(child), vector)
                parent.remove(child)
                count += 1
    # Fail on new/unhandled raster artwork instead of silently shipping it.
    for group in root.iter(f"{{{NS}}}g"):
        object_id = group.get("data-object")
        if object_id and object_id not in SCENE_OBJECTS:
            if any(group.iter(f"{{{NS}}}image")):
                raise ValueError(f"Unhandled raster method object: {object_id}")
    return count


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else ASSETS / "method.svg"
    root = ET.parse(path).getroot()
    count = vectorize_method(root)
    path.write_text(ET.tostring(root, encoding="unicode"))
    print(f"Replaced {count} method bitmaps with SVG geometry")
