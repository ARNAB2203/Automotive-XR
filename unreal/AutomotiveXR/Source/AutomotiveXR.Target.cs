using UnrealBuildTool;
using System.Collections.Generic;
public class AutomotiveXRTarget : TargetRules {
 public AutomotiveXRTarget(TargetInfo Target) : base(Target) { Type=TargetType.Game; DefaultBuildSettings=BuildSettingsVersion.V5; ExtraModuleNames.Add("AutomotiveXR"); }
}
