# "Bottega" dei personaggi: costruisce Marco e Luca in Blender (senza schermo) ed esporta marco_v1.glb e luca_v1.glb.
# Uso: /opt/blender-env/bin/python studio/assets/build_characters.py
# Corpo unico (forme unite e levigate), scheletro con dita, faccia a pezzi (occhi, palpebre, sopracciglia, bocca
# con shape key per i visemi). Colori nei vertici (un materiale), così l'asset resta leggero e costante.
import bpy, bmesh, math, os, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)

def hexc(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1.0]  # sRGB → lineare

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def sel(o):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o

def ellipsoid(name, loc, size, seg=40):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size; bpy.ops.object.transform_apply(scale=True); return o

def capsule(name, a, b, r, r2=None):
    """Capsula conica da a a b (raggi r → r2), fatta come scafo di due sfere."""
    r2 = r if r2 is None else r2
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    n = 10
    for k in range(n + 1):
        t = k / n; c = a.lerp(b, t); rr = r + (r2 - r) * t
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=rr, matrix=__import__("mathutils").Matrix.Translation(c))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return o

def fuse(name, parts, voxel, smooth=6, faces=None):
    """Unisce le forme in un solo volume (remesh voxel), leviga e colora i vertici in base alla forma più vicina."""
    trees = []
    for p, col in parts:
        dg = bpy.context.evaluated_depsgraph_get()
        trees.append((BVHTree.FromObject(p, dg), col))
    for p, _ in parts[1:]:
        sel(parts[0][0]); p.select_set(True)
    sel(parts[0][0])
    for p, _ in parts[1:]: p.select_set(True)
    bpy.ops.object.join()
    o = bpy.context.object; o.name = name
    m = o.modifiers.new("r", "REMESH"); m.mode = "VOXEL"; m.voxel_size = voxel; m.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier="r")
    if smooth:
        s = o.modifiers.new("s", "SMOOTH"); s.factor = 0.6; s.iterations = smooth; bpy.ops.object.modifier_apply(modifier="s")
    if faces and len(o.data.polygons) > faces:
        d = o.modifiers.new("d", "DECIMATE"); d.ratio = faces / len(o.data.polygons); bpy.ops.object.modifier_apply(modifier="d")
    attr = o.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for v in o.data.vertices:
        best, bc = 1e9, None
        for t, col in trees:
            hit = t.find_nearest(v.co)
            if hit[0] is not None and hit[3] < best: best, bc = hit[3], col
        attr.data[v.index].color = bc
    o.data.color_attributes.active_color = attr
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
    cols = [tuple(attr.data[i].color) for i in range(len(bm.verts))]
    for _ in range(4):
        new = []
        for v in bm.verts:
            votes = {}
            for c in [cols[v.index]] + [cols[e.other_vert(v).index] for e in v.link_edges]:
                votes[c] = votes.get(c, 0) + 1
            new.append(max(votes, key=votes.get))
        cols = new
    bm.free()
    for i, c in enumerate(cols): attr.data[i].color = c
    bpy.ops.object.shade_smooth()
    return o

def solid(o, col):
    attr = o.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for i in range(len(o.data.vertices)): attr.data[i].color = col
    o.data.color_attributes.active_color = attr
    sel(o); bpy.ops.object.shade_smooth(); return o

def vc_material():
    m = bpy.data.materials.new("vc"); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = 0.7
    a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Col"; nt.links.new(a.outputs["Color"], bsdf.inputs["Base Color"])
    return m

# ——— proporzioni ———
def build(kind):
    reset()
    MAT = vc_material()
    M = kind == "marco"
    SKIN = hexc("#E9B48C" if M else "#F2D2B6")
    SUIT = hexc("#C4471D") if M else hexc("#2F7A4C")
    PANTS = hexc("#A63A17") if M else hexc("#F4F1EA")
    SOCK = SUIT if M else hexc("#F4F1EA")
    SHOE = hexc("#2B2118") if M else hexc("#C4471D")
    W = 1.0 if M else 0.86  # larghezza del busto
    leg = 0.0 if M else 0.06  # Luca ha gambe più lunghe
    hip_z = 0.92 + leg
    chest_z = hip_z + 0.62
    head_z = chest_z + (0.42 if M else 0.385)
    R = 0.25 if M else 0.235  # raggio della testa

    parts = []
    for sx in (-1, 1):
        x = 0.13 * sx * W + 0.01 * sx
        parts += [
            (ellipsoid("shoe", (x, -0.05, 0.06), (0.1, 0.17, 0.07)), SHOE),
            (capsule("shin", (x, 0, 0.12), (x, 0, 0.5 + leg / 2 - 0.06), 0.07 if M else 0.055, 0.085 if M else 0.068), SOCK if not M else PANTS),
        ]
        if M:
            parts.append((capsule("thigh", (x, 0, 0.5 + leg / 2), (x * 0.9, 0, hip_z), 0.09, 0.12), PANTS))
        else:
            mid = (0.5 + leg / 2 + hip_z) / 2 + 0.04
            parts += [(capsule("knee", (x, 0, 0.5 + leg / 2 - 0.05), (x * 0.95, 0, mid), 0.065, 0.085), SKIN),
                      (capsule("shorts", (x * 0.95, 0, mid), (x * 0.9, 0, hip_z), 0.1, 0.105), PANTS)]
        sh = Vector((0.31 * W * sx, 0, chest_z - 0.05)); el = Vector((0.43 * W * sx, 0.02, chest_z - 0.32)); wr = Vector((0.52 * W * sx, 0, chest_z - 0.56))
        hand = wr + Vector((0.025 * sx, 0, -0.07))
        parts += [
            (capsule("upper", sh, el, 0.085 if M else 0.07, 0.07 if M else 0.06), SUIT),
            (capsule("fore", el, wr, 0.068 if M else 0.058, 0.055 if M else 0.048), SUIT if M else SKIN),
            (ellipsoid("palm", hand, (0.04, 0.06, 0.065), 24), SKIN),
        ]
        # tre dita e pollice, abbastanza staccati da non fondersi
        for k, dy in enumerate((-0.035, 0.0, 0.035)):
            base = hand + Vector((0.01 * sx, dy, -0.045)); tip = base + Vector((0.012 * sx, dy * 0.15, -0.075))
            parts.append((capsule("finger", base, tip, 0.017, 0.015), SKIN))
        tb = hand + Vector((-0.02 * sx, -0.045, -0.005)); parts.append((capsule("thumb", tb, tb + Vector((-0.015 * sx, -0.04, -0.035)), 0.018, 0.016), SKIN))
    parts += [
        (ellipsoid("hips", (0, 0, hip_z + 0.02), (0.26 * W, 0.17, 0.15) if M else (0.2, 0.13, 0.13)), PANTS),
        (ellipsoid("belly", (0, -0.01, hip_z + 0.27), (0.29 * W, 0.2, 0.3)) if M else ellipsoid("belly", (0, 0, hip_z + 0.25), (0.2, 0.13, 0.26)), SUIT),
        (ellipsoid("chest", (0, 0, chest_z - 0.14), (0.34, 0.21, 0.26)) if M else ellipsoid("chest", (0, 0, chest_z - 0.12), (0.31, 0.16, 0.2)), SUIT),
        (capsule("neck", (0, 0, chest_z - 0.05), (0, 0, chest_z + 0.12), 0.075 if M else 0.065), SKIN),
    ]
    body = fuse("Body", parts, 0.011, smooth=8, faces=30000)

    # ——— testa ———
    hp = [
        (ellipsoid("skull", (0, 0, head_z), (R, R * 0.97, R * 1.05)), SKIN),
        (ellipsoid("cheeks", (0, -0.05, head_z - R * 0.35), (R * 0.85, R * 0.75, R * 0.6)), SKIN),
        (ellipsoid("nose", (0, -R * 0.98, head_z - R * 0.12), (R * 0.17, R * 0.15, R * 0.15) if M else (R * 0.13, R * 0.12, R * 0.12)), hexc("#E09A74" if M else "#EDB89A")),
    ]
    for sx in (-1, 1):
        hp.append((ellipsoid("ear", (sx * R * 0.98, 0.02, head_z - 0.02), (R * 0.12, R * 0.08, R * 0.2), 20), SKIN))
    head = fuse("Head", hp, 0.006, smooth=4, faces=14000)

    extras = []
    def shell(name, loc, size, col, cut_z=None, keep="below", seg=48):
        o = ellipsoid(name, loc, size, seg)
        if cut_z is not None:
            bm = bmesh.new(); bm.from_mesh(o.data)
            kill = [v for v in bm.verts if ((v.co.z > cut_z) if keep == "below" else (v.co.z < cut_z))]
            bmesh.ops.delete(bm, geom=kill, context="VERTS"); bm.to_mesh(o.data); bm.free()
        s = o.modifiers.new("s", "SOLIDIFY"); s.thickness = 0.012; sel(o); bpy.ops.object.modifier_apply(modifier="s")
        solid(o, col); extras.append(o); return o

    if M:
        # barba corta che segue la mandibola, berretto con visiera
        b = shell("Beard", (0, -0.01, head_z - 0.02), (R * 1.03, R * 1.0, R * 1.07), hexc("#5B3A26"), cut_z=head_z - R * 0.28)
        bm = bmesh.new(); bm.from_mesh(b.data)  # libera la zona della bocca
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -R * 0.6 and (v.co.x / (R * 0.34)) ** 2 + ((v.co.z - (head_z - R * 0.43)) / (R * 0.125)) ** 2 < 1], context="VERTS")
        bm.to_mesh(b.data); bm.free()
        shell("Moustache", (0, -R * 0.86, head_z - R * 0.38), (R * 0.42, R * 0.16, R * 0.1), hexc("#5B3A26"))
        shell("Cap", (0, 0.0, head_z + 0.02), (R * 1.06, R * 1.05, R * 1.04), hexc("#2B2118"), cut_z=head_z + R * 0.33, keep="above")
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=R * 0.75, depth=0.02, location=(0, -R * 0.78, head_z + R * 0.36))
        brim = bpy.context.object; brim.name = "Brim"; brim.scale = (1, 0.75, 1); brim.rotation_euler.x = math.radians(-12)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        bm = bmesh.new(); bm.from_mesh(brim.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > R * 0.1 - R * 0.78 + 0.25 * R and False], context="VERTS"); bm.to_mesh(brim.data); bm.free()
        solid(brim, hexc("#2B2118")); extras.append(brim)
        # fischietto
        w = ellipsoid("Whistle", (0.0, -0.21, chest_z - 0.2), (0.035, 0.02, 0.022)); solid(w, hexc("#D99A25")); extras.append(w)
    else:
        # capelli castani spettinati: calotta + ciuffi
        hp2 = [(ellipsoid("cap", (0, 0.01, head_z + 0.03), (R * 1.04, R * 1.03, R * 1.0)), hexc("#8A5A2B"))]
        for k, (x, y, z, rx) in enumerate([(-0.1, -0.15, 0.2, -30), (0.0, -0.17, 0.22, -40), (0.1, -0.14, 0.2, -25), (0.15, 0.0, 0.2, 20), (-0.15, 0.02, 0.2, 10), (0, 0.1, 0.22, 30)]):
            bpy.ops.mesh.primitive_cone_add(radius1=0.06, depth=0.14, location=(x * R / 0.23, y * R / 0.23, head_z + z * R / 0.23))
            c = bpy.context.object; c.rotation_euler = (math.radians(rx), math.radians(x * 120), 0); hp2.append((c, hexc("#8A5A2B")))
        hair = fuse("Hair", hp2, 0.008, smooth=3, faces=6000)
        bm = bmesh.new(); bm.from_mesh(hair.data)  # scopre la faccia
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < head_z + R * 0.25 and v.co.y < 0.0 or v.co.z < head_z - R * 0.3], context="VERTS")
        bm.to_mesh(hair.data); bm.free(); extras.append(hair)
        # numero 10 sulla maglia: lo mette il renderer come decalcomania

    # occhi, palpebre, sopracciglia
    eyes = []
    ez = head_z + R * 0.12; ex = R * 0.36; ey = -R * 0.8
    for sx, side in ((-1, "R"), (1, "L")):
        c = Vector((sx * ex, ey, ez))
        white = ellipsoid(f"EyeWhite.{side}", c, (R * 0.2, R * 0.16, R * 0.23), 32); solid(white, hexc("#FFFFFF"))
        iris = ellipsoid(f"Iris.{side}", c + Vector((0, -R * 0.14, 0)), (R * 0.12, R * 0.04, R * 0.13), 24); solid(iris, hexc("#5A3A22" if M else "#3D6B8C"))
        pupil = ellipsoid(f"Pupil.{side}", c + Vector((0, -R * 0.172, 0)), (R * 0.065, R * 0.02, R * 0.07), 20); solid(pupil, hexc("#120C08"))
        glint = ellipsoid(f"Glint.{side}", c + Vector((R * 0.04, -R * 0.19, R * 0.05)), (R * 0.025, R * 0.008, R * 0.025), 12); solid(glint, hexc("#FFFFFF"))
        lid = ellipsoid(f"Lid.{side}", c, (R * 0.215, R * 0.175, R * 0.245), 32)
        bm = bmesh.new(); bm.from_mesh(lid.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < c.z], context="VERTS"); bm.to_mesh(lid.data); bm.free()
        s = lid.modifiers.new("s", "SOLIDIFY"); s.thickness = 0.006; sel(lid); bpy.ops.object.modifier_apply(modifier="s"); solid(lid, SKIN)
        brow = capsule(f"Brow.{side}", c + Vector((-sx * R * 0.14, -R * 0.12, R * 0.3)), c + Vector((sx * R * 0.16, -R * 0.1, R * 0.34)), R * (0.05 if M else 0.038)); solid(brow, hexc("#3A2418" if M else "#6E4522"))
        eyes += [white, iris, pupil, glint, lid, brow]
    # bocca con shape key (visemi)
    mz = head_z - R * 0.45; my = -R * 0.93
    mouth = ellipsoid("Mouth", (0, my, mz), (R * 0.26, R * 0.08, R * 0.05), 40)
    solid(mouth, hexc("#5A1E12"))
    mouth.shape_key_add(name="Basis")
    def key(name, f):
        k = mouth.shape_key_add(name=name); k.value = 0.0
        for kv, v in zip(k.data, mouth.data.vertices):
            kv.co = f(v.co.copy())
    cz = mz
    key("open", lambda p: Vector((p.x * 0.9, p.y, cz + (p.z - cz) * 5.2 - R * 0.06)))
    key("wide", lambda p: Vector((p.x * 1.35, p.y, cz + (p.z - cz) * 2.0)))
    key("round", lambda p: Vector((p.x * 0.55, p.y - R * 0.03, cz + (p.z - cz) * 3.2 - R * 0.03)))
    key("smile", lambda p: Vector((p.x * 1.15, p.y, p.z + (p.x / (R * 0.26)) ** 2 * R * 0.07)))
    key("frown", lambda p: Vector((p.x * 1.05, p.y, p.z - (p.x / (R * 0.26)) ** 2 * R * 0.06)))
    teeth = ellipsoid("Teeth", (0, my - R * 0.01, mz + R * 0.04), (R * 0.17, R * 0.05, R * 0.03), 24); solid(teeth, hexc("#FBF7EF"))

    # ——— scheletro ———
    bpy.ops.object.armature_add(location=(0, 0, 0)); rig = bpy.context.object; rig.name = "Rig"; rig.data.name = "Rig"
    bpy.ops.object.mode_set(mode="EDIT"); eb = rig.data.edit_bones; eb.remove(eb[0])
    def bone(n, h, t, parent=None, connect=False):
        b = eb.new(n); b.head = h; b.tail = t
        if parent: b.parent = eb[parent]; b.use_connect = connect
        return b
    bone("hips", (0, 0, hip_z - 0.05), (0, 0, hip_z + 0.15))
    bone("spine", (0, 0, hip_z + 0.15), (0, 0, chest_z - 0.25), "hips", True)
    bone("chest", (0, 0, chest_z - 0.25), (0, 0, chest_z - 0.02), "spine", True)
    bone("neck", (0, 0, chest_z - 0.02), (0, 0, chest_z + 0.12), "chest", True)
    bone("head", (0, 0, chest_z + 0.12), (0, 0, head_z + R * 1.1), "neck", True)
    for sx, s in ((1, "L"), (-1, "R")):
        sh = (0.31 * W * sx, 0, chest_z - 0.05); el = (0.43 * W * sx, 0.02, chest_z - 0.32); wr = (0.52 * W * sx, 0, chest_z - 0.56)
        bone(f"shoulder.{s}", (0.06 * sx, 0, chest_z - 0.04), sh, "chest")
        bone(f"upper_arm.{s}", sh, el, f"shoulder.{s}", True)
        bone(f"forearm.{s}", el, wr, f"upper_arm.{s}", True)
        bone(f"hand.{s}", wr, (wr[0] + 0.03 * sx, 0, wr[2] - 0.1), f"forearm.{s}", True)
        hb = Vector(wr) + Vector((0.035 * sx, 0, -0.115))
        bone(f"fingers.{s}", hb, hb + Vector((0.012 * sx, 0, -0.075)), f"hand.{s}")
        tb = Vector(wr) + Vector((0.005 * sx, -0.045, -0.075))
        bone(f"thumb.{s}", tb, tb + Vector((-0.015 * sx, -0.04, -0.035)), f"hand.{s}")
        x = 0.13 * sx * W + 0.01 * sx
        bone(f"thigh.{s}", (x * 0.9, 0, hip_z), (x, 0, 0.5 + leg / 2), "hips")
        bone(f"shin.{s}", (x, 0, 0.5 + leg / 2), (x, 0, 0.1), f"thigh.{s}", True)
        bone(f"foot.{s}", (x, 0, 0.1), (x, -0.16, 0.04), f"shin.{s}", True)
    bpy.ops.object.mode_set(mode="OBJECT")

    # pelle del corpo: pesi automatici; testa e faccia rigide sull'osso "head"
    sel(body); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    def to_bone(o, b):
        o.parent = rig; o.parent_type = "BONE"; o.parent_bone = b
        o.matrix_parent_inverse = (rig.matrix_world @ rig.pose.bones[b].matrix @ __import__("mathutils").Matrix.Translation((0, rig.data.bones[b].length, 0))).inverted()
    for o in [head, mouth, teeth] + eyes + [e for e in extras if e.name != "Whistle"]:
        to_bone(o, "head")
    for e in extras:
        if e.name == "Whistle": to_bone(e, "chest")
    for o in bpy.data.objects:
        if o.type == "MESH":
            o.data.materials.clear(); o.data.materials.append(MAT)
    rig.name = "Marco" if M else "Luca"
    f = os.path.join(OUT, f"{kind}_v1.glb")
    kw = dict(filepath=f, export_format="GLB", export_morph=True, export_skins=True, export_apply=False, export_yup=True)
    try:
        bpy.ops.export_scene.gltf(**kw, export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    print("OK", f, len(body.data.vertices), "vertici corpo")

for k in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["marco", "luca"]):
    build(k)
