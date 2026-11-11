#!/usr/bin/env python3
"""Deterministically extract the supplied GoldSrc BSP into Saltline scene data.

No third-party dependencies. The original texture names remain metadata; all
rendered material names refer to Saltline's existing procedural material bank.
Positions/normals are nonindexed so BSP hard edges cannot be accidentally
smoothed. UV coordinates are world metres, not material repeats. Runtime divides
them by the selected Saltline material's tile size.

Usage: python3 tools/extract-assault.py [--source ZIP] [--output JSON]
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
METRES = 0.0254


def rounded(values):
    return [round(float(x), 6) for x in values]


def world(v):
    return rounded((v[0] * METRES, v[2] * METRES, -v[1] * METRES))


def direction(v):
    return rounded((v[0], v[2], -v[1]))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def normalise(v):
    length = math.sqrt(dot(v, v))
    return tuple(x / length for x in v) if length else (0, 0, 0)


def bounds(points):
    return {"min": rounded(map(min, zip(*points))), "max": rounded(map(max, zip(*points)))}


def classify(name):
    """Map physical surfaces, retaining the source name for facade detailing."""
    t = name.lower()
    if t.startswith("{"):
        if "ladder" in t or "rail" in t or "tension" in t:
            return "steel_galv"
        if "duct" in t:
            return "steel_dark"
        return "chainlink"
    if "glass" in t or "skkylite" in t:
        return "glass_dirty"
    if "crate" in t or t.startswith("out_box"):
        return "wood_pallet"
    if "tire" in t or "tread" in t:
        return "tire"
    if t in {"trk_canvas", "trk_seat"}:
        return "tarp"
    if t.startswith("trk_"):
        return "steel_galv" if t in {"trk_rim", "trk_bumper", "trk_grille"} else "hull_paint"
    if "stripes" in t:
        return "hazard_stripes"
    if t in {"out_galv1", "silo2_cor"}:
        return "corrugated_roof"
    if t == "out_w4":
        return "paint_green"
    if t == "c1a1c_w2":
        return "steel_worn"
    if t in {"tnnl_flr4c", "tnnl_flr6", "tnnl_flr6b", "tnnl_flr7b", "tnnl_flr7d"}:
        return "concrete"
    if "brick" in t or "brck" in t or t in {"-0out_wall8", "c_stone1", "c_stone1_wndow", "out_wall2c", "out_wall4b", "out_wall6d"}:
        return "brick"
    if t.startswith("c_bldg2"):
        return "brick"
    if "container" in t:
        return {"bcontainer1": "paint_orange", "bcontainer2": "paint_blue", "bcontainer3": "paint_yellow"}.get(t, "hull_paint")
    if "pave" in t or "gravel" in t:
        return "asphalt"
    if t == "c_rockwall":
        return "concrete_dirty"
    if "duct" in t or "vent" in t or "galv" in t:
        return "steel_galv"
    if "comp" in t or "screen" in t or "recharged" in t or t == "black":
        return "gunmetal"
    if "light" in t:
        return "paint_white"
    if "dr" in t or "metal" in t or "silo" in t or "tank" in t or "base" in t:
        return "steel_worn"
    if t.startswith("out_dmp"):
        return "paint_green"
    if "sign" in t:
        return "paint_white"
    if "crete" in t or "sidewlk" in t or "flr" in t or t.startswith("basetrim"):
        return "concrete"
    if t.startswith("c_bldg") or t.startswith("c1a0_lab") or t.startswith("c1a1c"):
        return "concrete_painted"
    return "concrete_dirty"


def extract(blob, source_name):
    version = struct.unpack_from("<i", blob)[0]
    if version != 30:
        raise ValueError(f"Expected GoldSrc BSP v30, got {version}")
    lumps = [struct.unpack_from("<ii", blob, 4 + i * 8) for i in range(15)]
    for offset, length in lumps:
        if offset < 0 or length < 0 or offset + length > len(blob):
            raise ValueError("BSP lump outside input buffer")

    def raw(lump):
        offset, length = lumps[lump]
        return blob[offset:offset + length]

    def records(lump, fmt):
        data = raw(lump)
        size = struct.calcsize(fmt)
        if len(data) % size:
            raise ValueError(f"Invalid record length for BSP lump {lump}")
        return list(struct.iter_unpack(fmt, data))

    entity_text = raw(0).rstrip(b"\0").decode("latin1")
    entities = [dict(re.findall(r'"([^\"]+)"\s*"([^\"]*)"', text))
                for text in re.findall(r"\{(.*?)\}", entity_text, re.S)]
    by_model = {int(e["model"][1:]): e for e in entities if e.get("model", "").startswith("*")}
    by_model[0] = next(e for e in entities if e.get("classname") == "worldspawn")
    planes = records(1, "<4fi")
    vertices = records(3, "<3f")
    texinfos = records(6, "<8f2i")
    bsp_faces = records(7, "<HHiHH4Bi")
    light_bytes = raw(8)
    edges = records(12, "<2H")
    surfedges = [x[0] for x in records(13, "<i")]
    models = records(14, "<9f7i")
    texture_data = raw(2)
    texture_count = struct.unpack_from("<i", texture_data)[0]
    textures = []
    for i in range(texture_count):
        offset = struct.unpack_from("<i", texture_data, 4 + 4 * i)[0]
        if offset < 0:
            textures.append("missing")
        else:
            textures.append(texture_data[offset:offset + 16].split(b"\0")[0].decode("ascii", errors="replace"))

    groups = {}
    collision_positions = []
    doors, breakables, ladders, metadata = [], [], [], []
    emitted_points = []
    skipped = Counter()
    collisions_by_model = defaultdict(int)

    def surface(container, model_id, cls, texture):
        key = (model_id, texture)
        if key not in container:
            container[key] = {"modelId": model_id, "classname": cls, "texture": texture,
                              "material": classify(texture), "positions": [], "normals": [],
                              "uvMeters": [], "vertexLight": [], "faceIds": [], "triangles": 0}
        return container[key]

    def light_sampler(face, points, ti):
        offset = face[-1]
        st = [(dot(p, ti[:3]) + ti[3], dot(p, ti[4:7]) + ti[7]) for p in points]
        low = [math.floor(min(p[i] for p in st) / 16) for i in range(2)]
        high = [math.ceil(max(p[i] for p in st) / 16) for i in range(2)]
        w, h = high[0] - low[0] + 1, high[1] - low[1] + 1
        if offset < 0 or offset + w * h * 3 > len(light_bytes):
            return lambda index: [1, 1, 1]

        def sample(index):
            s, t = st[index]
            x, y = max(0, min(w - 1, s / 16 - low[0])), max(0, min(h - 1, t / 16 - low[1]))
            x0, y0 = int(x), int(y)
            x1, y1 = min(w - 1, x0 + 1), min(h - 1, y0 + 1)
            fx, fy = x - x0, y - y0
            result = []
            for channel in range(3):
                def px(a, b):
                    return light_bytes[offset + (b * w + a) * 3 + channel] / 255
                result.append(round((px(x0, y0) * (1 - fx) + px(x1, y0) * fx) * (1 - fy)
                                    + (px(x0, y1) * (1 - fx) + px(x1, y1) * fx) * fy, 5))
            return result
        return sample

    for model_id, model in enumerate(models):
        entity = by_model.get(model_id, {"classname": "func_wall"})
        cls = entity.get("classname", "func_wall")
        origin_native = tuple(float(x) for x in entity.get("origin", "0 0 0").split())
        offset = world(origin_native)
        model_bounds = bounds([world(tuple(model[j] + origin_native[j] for j in range(3))),
                               world(tuple(model[j + 3] + origin_native[j] for j in range(3)))])
        if cls == "func_ladder":
            ladders.append({"id": f"ladder_{model_id}", "modelId": model_id, "bounds": model_bounds})
            skipped[cls] += model[-1]
            continue
        dynamic = cls in {"func_door", "func_door_rotating", "func_breakable"}
        own_groups = {} if dynamic else groups
        own_collision = [] if dynamic else collision_positions
        dynamic_faces = []
        model_textures = set()
        for face_id in range(model[-2], model[-2] + model[-1]):
            face = bsp_faces[face_id]
            ti = texinfos[face[4]]
            texture = textures[ti[8]]
            model_textures.add(texture)
            tool = texture.lower() in {"sky", "aaatrigger", "origin", "clip", "{invisible", "null", "nodraw", "skip", "hint"}
            renderable = not tool
            collidable = cls != "func_illusionary" and texture.lower() not in {"sky", "aaatrigger", "origin", "null", "nodraw", "skip", "hint"}
            if not renderable and not collidable:
                skipped[texture] += 1
                continue
            pnative = []
            for edge_id in surfedges[face[2]:face[2] + face[3]]:
                edge = edges[abs(edge_id)]
                pnative.append(vertices[edge[0] if edge_id >= 0 else edge[1]])
            if len(pnative) < 3:
                continue
            points = [world(tuple(p[j] + origin_native[j] for j in range(3))) for p in pnative]
            normal = direction(tuple(x * (-1 if face[1] else 1) for x in planes[face[0]][:3]))
            # Use texture axes for orientation but normalise their magnitudes;
            # resulting UVs preserve physical metres and source grain direction.
            u_axis = direction(normalise(ti[:3]))
            v_axis = direction(normalise(tuple(-x for x in ti[4:7])))
            sampler = light_sampler(face, pnative, ti)
            group = surface(own_groups, model_id, cls, texture) if renderable else None
            vertex_start = len(group["positions"]) // 3 if group else 0
            area = 0
            for n in range(1, len(points) - 1):
                ids = [0, n, n + 1]
                a, b, c = [points[i] for i in ids]
                ab, ac = [b[j] - a[j] for j in range(3)], [c[j] - a[j] for j in range(3)]
                cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
                twice_area = math.sqrt(dot(cross, cross))
                if twice_area < 1e-9:
                    continue
                if dot(cross, normal) < 0:
                    ids.reverse()
                area += twice_area / 2
                for index in ids:
                    p = points[index]
                    if group:
                        group["positions"].extend(p)
                        group["normals"].extend(normal)
                        group["uvMeters"].extend(rounded([dot(p, u_axis), dot(p, v_axis)]))
                        group["vertexLight"].extend(sampler(index))
                    if collidable:
                        own_collision.extend(p)
                if group:
                    group["triangles"] += 1
                if collidable:
                    collisions_by_model[model_id] += 1
            if group:
                group["faceIds"].append(face_id)
                emitted_points.extend(points)
                description = {"id": face_id, "modelId": model_id, "texture": texture, "material": group["material"],
                               "normal": normal, "bounds": bounds(points),
                               "center": rounded(sum(p[j] for p in points) / len(points) for j in range(3)),
                               "area": round(area, 5), "vertexStart": vertex_start,
                               "vertexCount": len(group["positions"]) // 3 - vertex_start}
                (dynamic_faces if dynamic else metadata).append(description)

        if dynamic:
            record = {"id": f"{cls}_{model_id}", "modelId": model_id, "classname": cls,
                      "origin": offset, "bounds": model_bounds, "surfaces": list(own_groups.values()),
                      "collision": {"positions": own_collision}, "faces": dynamic_faces}
            if cls in {"func_door", "func_door_rotating"}:
                angle = float(entity.get("angle", "0"))
                flags = int(entity.get("spawnflags", "0"))
                if cls == "func_door_rotating":
                    axis = [0, 1, 0]
                    if flags & 64:
                        axis = [1, 0, 0]
                    elif flags & 128:
                        axis = [0, 0, -1]
                    record["motion"] = {"kind": "rotate", "axis": axis,
                                        "angle": math.radians(float(entity.get("distance", "90"))) * (-1 if flags & 2 else 1),
                                        "speed": math.radians(float(entity.get("speed", "100")))}
                else:
                    axis = [0, 1, 0] if angle == -1 else ([0, -1, 0] if angle == -2 else [math.cos(math.radians(angle)), 0, -math.sin(math.radians(angle))])
                    extent = [model_bounds["max"][j] - model_bounds["min"][j] for j in range(3)]
                    distance = sum(abs(axis[j]) * extent[j] for j in range(3)) - float(entity.get("lip", "0")) * METRES
                    record["motion"] = {"kind": "slide", "axis": rounded(axis), "distance": round(max(0, distance), 6),
                                        "speed": float(entity.get("speed", "100")) * METRES}
                record["motion"]["wait"] = float(entity.get("wait", "4"))
                record["motion"]["startOpen"] = bool(flags & 1)
                doors.append(record)
            else:
                is_glass = int(entity.get("material", "0")) == 0
                record.update({"health": float(entity.get("health", "20")),
                               "kind": "vent" if any("vnt" in t or "vent" in t for t in model_textures) else "glass" if is_glass else "solid",
                               "opacity": float(entity.get("renderamt", "255")) / 255 if entity.get("rendermode", "0") in {"2", "5"} else 1})
                breakables.append(record)

    useful_entities = []
    lights = []
    for index, entity in enumerate(entities):
        cls = entity.get("classname")
        if cls not in {"info_player_start", "info_player_deathmatch", "hostage_entity", "light", "light_environment", "trigger_camera", "info_target"}:
            continue
        p = world([float(v) for v in entity.get("origin", "0 0 0").split()])
        entry = {"id": index, "classname": cls, "pos": p,
                 "yaw": round(math.radians(float(entity.get("angle", "0"))) - math.pi / 2, 6)}
        for key in ("targetname", "target", "skin"):
            if key in entity:
                entry[key] = entity[key]
        useful_entities.append(entry)
        if cls in {"light", "light_environment"}:
            components = [float(v) for v in entity.get("_light", "255 255 255 200").split()]
            if len(components) == 1:
                components = [255, 255, 255, components[0]]
            lights.append({**entry, "color": rounded(v / 255 for v in components[:3]),
                           "brightness": components[3] if len(components) > 3 else 200,
                           "pitch": float(entity.get("pitch", "-60"))})

    result = {"version": 1,
              "source": {"file": source_name, "bspVersion": version, "bspSha256": hashlib.sha256(blob).hexdigest(),
                         "map": "cs_assault", "author": "CryptR", "originalTitle": by_model[0].get("message", "")},
              "transform": {"unit": METRES, "axes": "GoldSrc (X,Y,Z) -> Saltline (X,Z,-Y)", "up": "Y",
                            "uvUnits": "metres; divide by procedural material tile size",
                            "vertexLight": "original BSP baked RGB, 0..1, optional reference data; not applied automatically"},
              "bounds": bounds(emitted_points), "surfaces": list(groups.values()),
              "collision": {"positions": collision_positions}, "doors": doors, "breakables": breakables,
              "ladders": ladders, "entities": useful_entities, "lights": lights, "faces": metadata,
              "stats": {"models": len(models), "staticGroups": len(groups),
                        "staticTriangles": sum(g["triangles"] for g in groups.values()),
                        "staticCollisionTriangles": len(collision_positions) // 9,
                        "doors": len(doors), "breakables": len(breakables), "ladders": len(ladders),
                        "skippedFaces": dict(sorted(skipped.items())),
                        "collisionByModel": dict(sorted(collisions_by_model.items()))}}
    return result


def validate(scene):
    for surface in scene["surfaces"] + [s for d in scene["doors"] + scene["breakables"] for s in d["surfaces"]]:
        vertices = len(surface["positions"]) // 3
        assert len(surface["normals"]) == vertices * 3
        assert len(surface["uvMeters"]) == vertices * 2
        assert len(surface["vertexLight"]) == vertices * 3
        assert vertices == surface["triangles"] * 3
        assert all(math.isfinite(x) for key in ("positions", "normals", "uvMeters", "vertexLight") for x in surface[key])
    assert len(scene["doors"]) == 3, "Expected stock Assault's three doors"
    assert len(scene["ladders"]) == 8, "Expected stock Assault's eight ladders"
    assert len([e for e in scene["entities"] if e["classname"] == "hostage_entity"]) == 4
    door = next(d for d in scene["doors"] if d["modelId"] == 11)
    assert door["origin"] == [17.6784, 1.2192, -56.7944]
    assert door["bounds"]["min"][0] > 17, "Rotating door must include its entity origin"
    dynamic = {d["modelId"] for d in scene["doors"] + scene["breakables"]}
    assert all(s["modelId"] not in dynamic for s in scene["surfaces"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "reference/cs_assault_cs16.zip")
    parser.add_argument("--output", type=Path, default=ROOT / "src/assault-map.json")
    args = parser.parse_args()
    with zipfile.ZipFile(args.source) as archive:
        scene = extract(archive.read("cs_assault.bsp"), args.source.name)
    validate(scene)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(scene, separators=(",", ":"), ensure_ascii=True) + "\n")
    print(json.dumps({"output": str(args.output), "bytes": args.output.stat().st_size, "stats": scene["stats"]}, indent=2))


if __name__ == "__main__":
    main()
