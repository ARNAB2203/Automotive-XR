#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "XRGameMode.generated.h"
UCLASS()
class AUTOMOTIVEXR_API AXRGameMode : public AGameModeBase {
 GENERATED_BODY()
public:
 AXRGameMode();
 virtual void BeginPlay() override;
};
