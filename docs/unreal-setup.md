# Unreal setup

Target: Unreal Engine 5.5 and the matching Pixel Streaming frontend package. C++ source is supplied, but no Editor or GPU exists in the cloud task: no Unreal compile, scene generation or packaged-runtime test has been run.

1. Install UE 5.5 under the applicable Epic license and its supported C++ toolchain. Generate project files for `unreal/AutomotiveXR/AutomotiveXR.uproject`.
2. Build the AutomotiveXREditor development target with UnrealBuildTool. Open the project, enable Python/Editor Scripting and Pixel Streaming plugins.
3. Run `Scripts/create_demo.py` from the Editor Python console. It creates a material and schematic primitive vehicle scene. It refuses to overwrite an existing Demo level. These engine primitives are a clearly labelled placeholder, not a photorealistic or production vehicle asset.
4. Create a Blueprint subclass of ConfigurableVehicle for Pixel Streaming bindings. Add the engine-version-appropriate Pixel Streaming input component. Bind its input event to `HandleWebMessage`; bind `OnProtocolResponse` to the plugin's send-response function. On data-channel connection, call `AnnounceReady` after handlers are bound. Replace the native scene actor with this subclass.
5. Create a Level Variant Sets asset with sets `paint`, `wheels`, `interior`, `camera`, `environment`. Variant names match catalog option codes / presets. Capture material, geometry and light properties and assign it to `VariantSets`. Native placeholder paint/wheel/cabin/camera controls work without this asset, but authored Variant Manager assets are not supplied.
6. Bind mouse/touch orbit and zoom to the actor's `Orbit` and `Zoom` functions for kiosk operation. The native methods clamp input and interpolate camera movement; input mappings require Editor authoring.
7. Package after generating Demo. Start the executable with `-RenderOffscreen -AudioMixer -PixelStreamingURL=ws://127.0.0.1:8888 -ResX=1920 -ResY=1080 -ForceRes` against the matching UE 5.5 signaling server. Confirm the correct switch for your patched engine version.

Door animation requires a rigged licensed asset and is intentionally absent. Interior is a schematic cabin, not a detailed cockpit. The visual catalog is hardcoded for the demonstrator; adding options requires synchronized UE assets and allowlists. Backend compatibility/prices remain authoritative.

Native FGuid/JSON validation rejects unsupported message versions, UUIDs, command names, values and oversized payloads. Acknowledgements and snapshots correlate request IDs; duplicate identical messages are acknowledged without reapplying. Unknown JSON properties are not fully rejected in native code yet. Run conformance fixtures and compile checks on a real UE machine before promoting this source.
