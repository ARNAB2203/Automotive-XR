#include "XRGameMode.h"
#include "ConfigurableVehicle.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
AXRGameMode::AXRGameMode(){DefaultPawnClass=nullptr;}
void AXRGameMode::BeginPlay(){Super::BeginPlay();for(TActorIterator<AConfigurableVehicle> It(GetWorld());It;++It){if(APlayerController* PC=GetWorld()->GetFirstPlayerController()){PC->SetViewTarget(*It);}break;}}
