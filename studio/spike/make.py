import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=48, ring_count=32)
head=bpy.context.object; head.name="Head"
head.shape_key_add(name="Basis")
k=head.shape_key_add(name="mouth_open")
for v,bv in zip(k.data, head.data.vertices):
    if bv.co.z<-0.3 and bv.co.y<-0.5: v.co.z-=0.25
bpy.ops.object.armature_add(location=(0,0,-1)); arm=bpy.context.object; arm.name="Rig"
head.parent=arm; head.parent_type='OBJECT'
bpy.ops.export_scene.gltf(filepath="spike.glb", export_format='GLB', export_morph=True, export_skins=True)
print("EXPORT OK")
