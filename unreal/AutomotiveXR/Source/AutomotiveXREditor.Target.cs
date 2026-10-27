using UnrealBuildTool;
using System.Collections.Generic;
public class AutomotiveXREditorTarget : TargetRules {
 public AutomotiveXREditorTarget(TargetInfo Target) : base(Target) { Type=TargetType.Editor; DefaultBuildSettings=BuildSettingsVersion.V5; ExtraModuleNames.Add("AutomotiveXR"); }
}
