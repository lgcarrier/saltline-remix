#!/usr/bin/env python3
"""Deterministically extract the supplied de_dust BSP into Saltline scene data.

No third-party dependencies. Original texture names and projected UVs remain
metadata; rendered material names refer to the new Dust desert finish bank.
Positions/normals are nonindexed so BSP hard edges cannot be accidentally
smoothed. uvMeters supplies world metres for new physical finishes; uvSource
preserves the original BSP projection for architectural source-aligned details.
Static collision retains solid sky boundaries while excluding illusionary and
trigger brushes. Every collision range has a material category for dry audio.

Usage: python3 tools/extract-dust.py [--source ZIP] [--output JSON]
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
    """Desert finish keys; preserve source names and native UVs independently."""
    t = name.lower()
    if t == "generic011":
        return "steel_dark"
    if t == "+0~fifties_lgt2":
        return "dust_lamp"
    if "mltrycrte" in t:
        return "dust_military"
    if "sandcrt" in t:
        return "dust_crate"
    if "sandroad" in t:
        return "dust_road"
    if "sandtrim" in t:
        return "dust_trim"
    if "door" in t:
        return "dust_door"
    if "crete" in t:
        return "dust_stone"
    if re.fullmatch(r"-\d+sand", t):
        return "dust_sand"
    return "dust_plaster"


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
    texture_sizes = []
    for i in range(texture_count):
        offset = struct.unpack_from("<i", texture_data, 4 + 4 * i)[0]
        if offset < 0:
            textures.append("missing")
            texture_sizes.append([256, 256])
        else:
            textures.append(texture_data[offset:offset + 16].split(b"\0")[0].decode("ascii", errors="replace"))
            texture_sizes.append(list(struct.unpack_from("<II", texture_data, offset + 16)))

    groups = {}
    collision_positions = []
    collision_ranges = []
    doors, breakables, ladders, metadata, triggers = [], [], [], [], []
    emitted_points = []
    skipped = Counter()
    collisions_by_model = defaultdict(int)

    def surface(container, model_id, cls, texture):
        key = (model_id, texture)
        if key not in container:
            container[key] = {"modelId": model_id, "classname": cls, "texture": texture,
                              "material": classify(texture), "positions": [], "normals": [],
                              "uvMeters": [], "uvSource": [], "vertexLight": [], "faceIds": [], "triangles": 0}
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
        if cls.startswith("trigger_") or cls in {"func_bomb_target", "func_buyzone"}:
            triggers.append({"id": f"{cls}_{model_id}", "modelId": model_id,
                             "classname": cls, "bounds": model_bounds, "properties": entity})
            skipped[cls] += model[-1]
            continue
        if cls == "func_ladder":
            ladders.append({"id": f"ladder_{model_id}", "modelId": model_id, "bounds": model_bounds})
            skipped[cls] += model[-1]
            continue
        dynamic = cls in {"func_door", "func_door_rotating", "func_breakable"}
        own_groups = {} if dynamic else groups
        own_collision = [] if dynamic else collision_positions
        own_ranges = [] if dynamic else collision_ranges
        dynamic_faces = []
        model_textures = set()
        for face_id in range(model[-2], model[-2] + model[-1]):
            face = bsp_faces[face_id]
            ti = texinfos[face[4]]
            texture = textures[ti[8]]
            model_textures.add(texture)
            tool = texture.lower() in {"sky", "aaatrigger", "origin", "clip", "{invisible", "null", "nodraw", "skip", "hint"}
            renderable = not tool
            collidable = cls != "func_illusionary" and texture.lower() not in {"aaatrigger", "origin", "null", "nodraw", "skip", "hint"}
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
            collision_start = len(own_collision) // 3
            for n in range(1, len(points) - 1):
                ids = [0, n, n + 1]
                a, b, c = [points[i] for i in ids]
                ab, ac = [b[j] - a[j] for j in range(3)], [c[j] - a[j] for j in range(3)]
                cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
                twice_area = math.sqrt(dot(cross, cross))
                # BSP face fans may contain collinear split vertices. Metre
                # rounding can make these produce a microscopic off-plane
                # triangle; reject by area projected on the owning face plane.
                if twice_area < 1e-9 or abs(dot(cross, normal)) < 1e-9:
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
                        pn = pnative[index]
                        tw, th = texture_sizes[ti[8]]
                        group["uvSource"].extend(rounded([(dot(pn, ti[:3]) + ti[3]) / tw,
                                                           1 - (dot(pn, ti[4:7]) + ti[7]) / th]))
                        group["vertexLight"].extend(sampler(index))
                    if collidable:
                        own_collision.extend(p)
                if group:
                    group["triangles"] += 1
                if collidable:
                    collisions_by_model[model_id] += 1
            collision_count = len(own_collision) // 3 - collision_start
            if collision_count:
                category = {"dust_sand": "dirt", "dust_door": "wood", "dust_crate": "wood", "dust_military": "metal"}.get(classify(texture), "concrete")
                if own_ranges and own_ranges[-1]["surface"] == category:
                    own_ranges[-1]["count"] += collision_count
                else:
                    own_ranges.append({"start": collision_start, "count": collision_count, "surface": category})
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
                      "collision": {"positions": own_collision, "ranges": own_ranges}, "faces": dynamic_faces,
                      "properties": entity, "triggerOnly": bool(int(entity.get("spawnflags", "0")) & 1)}
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
        p = world([float(v) for v in entity.get("origin", "0 0 0").split()])
        entry = {"id": index, "classname": cls, "pos": p,
                 "yaw": round(math.radians(float(entity.get("angles", "0 " + entity.get("angle", "0") + " 0").split()[1])) - math.pi / 2, 6),
                 "properties": entity}
        if entity.get("model", "").startswith("*"):
            mid = int(entity["model"][1:]); m = models[mid]
            origin = tuple(float(v) for v in entity.get("origin", "0 0 0").split())
            entry["bounds"] = bounds([world(tuple(m[j] + origin[j] for j in range(3))),
                                      world(tuple(m[j + 3] + origin[j] for j in range(3)))])
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
                         "map": "de_dust", "author": "Dave Johnston", "originalTitle": by_model[0].get("message", "")},
              "transform": {"unit": METRES, "axes": "GoldSrc (X,Y,Z) -> Saltline (X,Z,-Y)", "up": "Y",
                            "uvUnits": "uvMeters are physical metres; uvSource preserve BSP texture projection with V flipped",
                            "vertexLight": "original BSP baked RGB, 0..1, optional reference data; not applied automatically"},
              "bounds": bounds(emitted_points), "surfaces": list(groups.values()),
              "collision": {"positions": collision_positions, "ranges": collision_ranges}, "doors": doors, "breakables": breakables,
              "ladders": ladders, "entities": useful_entities, "lights": lights, "faces": metadata,
              "triggers": triggers,
              "bombsites": [{**t, "label": t["properties"].get("target", "target?")[-1].upper()} for t in triggers if t["classname"] == "func_bomb_target"],
              "textureSizes": dict(zip(textures, texture_sizes)),
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
    assert len(scene["doors"]) == 0
    assert len(scene["ladders"]) == 0
    assert len(scene["bombsites"]) == 2
    assert len(scene["breakables"]) == 14
    assert all(b["triggerOnly"] for b in scene["breakables"])
    assert len([e for e in scene["entities"] if e["classname"] == "info_player_start"]) == 16
    assert len([e for e in scene["entities"] if e["classname"] == "info_player_deathmatch"]) == 16
    assert len(scene["collision"]["positions"]) % 9 == 0
    for collision in [scene["collision"]] + [b["collision"] for b in scene["breakables"]]:
        cursor = 0
        for run in collision["ranges"]:
            assert run["start"] == cursor and run["count"] % 3 == 0
            cursor += run["count"]
        assert cursor * 3 == len(collision["positions"])
    assert len(scene["surfaces"]) > 19, "Include brush entities, not just OBJ worldspawn"
    dynamic = {d["modelId"] for d in scene["doors"] + scene["breakables"]}
    triggers = {t["modelId"] for t in scene["triggers"]}
    assert all(s["modelId"] not in dynamic | triggers for s in scene["surfaces"])
    for s in scene["surfaces"]:
        assert len(s["uvSource"]) == len(s["uvMeters"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "reference/de_dust_cs16.zip")
    parser.add_argument("--output", type=Path, default=ROOT / "src/dust-map.json")
    args = parser.parse_args()
    with zipfile.ZipFile(args.source) as archive:
        scene = extract(archive.read("de_dust.bsp"), args.source.name)
    validate(scene)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(scene, separators=(",", ":"), ensure_ascii=True) + "\n")
    print(json.dumps({"output": str(args.output), "bytes": args.output.stat().st_size, "stats": scene["stats"]}, indent=2))


if __name__ == "__main__":
    main()
