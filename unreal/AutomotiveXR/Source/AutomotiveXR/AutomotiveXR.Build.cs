using UnrealBuildTool;
public class AutomotiveXR : ModuleRules {
 public AutomotiveXR(ReadOnlyTargetRules Target) : base(Target) {
 PCHUsage=PCHUsageMode.UseExplicitOrSharedPCHs;
 PublicDependencyModuleNames.AddRange(new string[]{"Core","CoreUObject","Engine","InputCore","Json","JsonUtilities","VariantManagerContent","PixelStreaming"});
 }
}
