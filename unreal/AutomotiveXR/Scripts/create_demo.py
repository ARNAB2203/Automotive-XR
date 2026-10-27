"""Run in UE 5.5 Editor after compiling the C++ module. Creates engine-primitive placeholder content only."""
import unreal
asset_tools=unreal.AssetToolsHelpers.get_asset_tools()
material=unreal.load_asset('/Game/Materials/M_Placeholder')
if not material:
    material=asset_tools.create_asset('M_Placeholder','/Game/Materials',unreal.Material,unreal.MaterialFactoryNew())
    color=unreal.MaterialEditingLibrary.create_material_expression(material,unreal.MaterialExpressionVectorParameter,-300,0)
    color.set_editor_property('parameter_name','PaintColor')
    color.set_editor_property('default_value',unreal.LinearColor(.055,.07,.06,1))
    unreal.MaterialEditingLibrary.connect_material_property(color,'',unreal.MaterialProperty.MP_BASE_COLOR)
    unreal.MaterialEditingLibrary.recompile_material(material)
# Never overwrite an existing artist-authored scene.
if unreal.EditorAssetLibrary.does_asset_exist('/Game/Maps/Demo'):
    raise RuntimeError('Demo already exists; open it or choose a new map name. No scene overwritten.')
unreal.EditorLevelLibrary.new_level('/Game/Maps/Demo')
vehicle_class=unreal.load_class(None,'/Script/AutomotiveXR.ConfigurableVehicle')
vehicle=unreal.EditorLevelLibrary.spawn_actor_from_class(vehicle_class,unreal.Vector(0,0,0))
vehicle.set_actor_label('SCHEMATIC PLACEHOLDER - NOT A LICENSED VEHICLE')
vehicle.get_editor_property('body').set_material(0,material)
vehicle.get_editor_property('cabin').set_material(0,material)
light=unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.DirectionalLight,unreal.Vector(0,0,400),unreal.Rotator(-40,0,0))
vehicle.set_editor_property('environment_light',light)
unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SkyLight,unreal.Vector(0,0,300))
floor=unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.StaticMeshActor,unreal.Vector(0,0,-10))
floor.static_mesh_component.set_static_mesh(unreal.load_asset('/Engine/BasicShapes/Cube'))
floor.set_actor_scale3d(unreal.Vector(30,30,.1))
unreal.EditorLevelLibrary.save_current_level()
unreal.EditorAssetLibrary.save_directory('/Game')
