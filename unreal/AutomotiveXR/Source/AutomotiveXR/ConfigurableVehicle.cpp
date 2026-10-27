#include "ConfigurableVehicle.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/DirectionalLight.h"
#include "Components/LightComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "LevelVariantSets.h"
#include "VariantSet.h"
#include "Variant.h"
AConfigurableVehicle::AConfigurableVehicle(){
 PrimaryActorTick.bCanEverTick=true;
 RootComponent=CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
 static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
 static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
 Body=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Body"));Body->SetupAttachment(RootComponent);Body->SetStaticMesh(Cube.Object);Body->SetRelativeScale3D(FVector(4.3f,1.8f,.65f));Body->SetRelativeLocation(FVector(0,0,85));
 Cabin=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Cabin"));Cabin->SetupAttachment(RootComponent);Cabin->SetStaticMesh(Cube.Object);Cabin->SetRelativeScale3D(FVector(2.1f,1.5f,.7f));Cabin->SetRelativeLocation(FVector(-20,0,145));
 for(int32 I=0;I<4;I++){auto* Wheel=CreateDefaultSubobject<UStaticMeshComponent>(*FString::Printf(TEXT("Wheel%d"),I));Wheel->SetupAttachment(RootComponent);Wheel->SetStaticMesh(Cylinder.Object);Wheel->SetRelativeLocation(FVector(I<2?130:-130,I%2?95:-95,55));Wheel->SetRelativeRotation(FRotator(0,0,90));Wheel->SetRelativeScale3D(FVector(.85f,.85f,.3f));Wheels.Add(Wheel);}
 CameraArm=CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraArm"));CameraArm->SetupAttachment(RootComponent);CameraArm->SetRelativeLocation(FVector(0,0,100));CameraArm->TargetArmLength=650;CameraArm->SetRelativeRotation(TargetRotation);CameraArm->bDoCollisionTest=false;
 Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));Camera->SetupAttachment(CameraArm);Camera->FieldOfView=45;
}
void AConfigurableVehicle::BeginPlay(){Super::BeginPlay();Reset();AnnounceReady();}
void AConfigurableVehicle::Tick(float Dt){Super::Tick(Dt);CameraArm->TargetArmLength=FMath::FInterpTo(CameraArm->TargetArmLength,TargetArmLength,Dt,5.f);CameraArm->SetRelativeRotation(FMath::RInterpTo(CameraArm->GetRelativeRotation(),TargetRotation,Dt,5.f));}
void AConfigurableVehicle::Orbit(float YawDelta,float PitchDelta){TargetRotation.Yaw+=FMath::Clamp(YawDelta,-30.f,30.f);TargetRotation.Pitch=FMath::Clamp(TargetRotation.Pitch+PitchDelta,-60.f,10.f);}
void AConfigurableVehicle::Zoom(float Delta){TargetArmLength=FMath::Clamp(TargetArmLength+Delta,200.f,1000.f);}
void AConfigurableVehicle::Reset(){State={{TEXT("paint"),TEXT("paint-graphite")},{TEXT("wheels"),TEXT("wheel-aero")},{TEXT("interior"),TEXT("interior-charcoal")},{TEXT("camera"),TEXT("exterior")},{TEXT("environment"),TEXT("studio")}};TargetArmLength=650;TargetRotation=FRotator(-15,-50,0);for(const auto& Pair:State){ApplyVariant(Pair.Key,Pair.Value);}}
bool AConfigurableVehicle::ApplyVariant(const FString& Category,const FString& Code){
 if(VariantSets){if(UVariantSet* Set=VariantSets->GetVariantSetByName(Category)){if(UVariant* Variant=Set->GetVariantByName(Code)){Variant->SwitchOn();}}}
 if(Category==TEXT("paint")){FLinearColor Color=Code==TEXT("paint-copper")?FLinearColor(.46f,.16f,.06f):Code==TEXT("paint-ivory")?FLinearColor(.77f,.73f,.63f):FLinearColor(.055f,.07f,.06f);if(auto* Mat=Body->CreateAndSetMaterialInstanceDynamic(0)){Mat->SetVectorParameterValue(TEXT("PaintColor"),Color);}}
 if(Category==TEXT("wheels")){for(auto* Wheel:Wheels){const float Size=Code==TEXT("wheel-sport")?.95f:.85f;Wheel->SetRelativeScale3D(FVector(Size,Size,.3f));}}
 if(Category==TEXT("interior")){if(auto* Mat=Cabin->CreateAndSetMaterialInstanceDynamic(0)){Mat->SetVectorParameterValue(TEXT("PaintColor"),Code==TEXT("interior-tan")?FLinearColor(.35f,.18f,.08f):FLinearColor(.035f,.045f,.035f));}}
 if(Category==TEXT("camera")){const bool Interior=Code==TEXT("interior");CameraArm->SetRelativeLocation(Interior?FVector(0,0,160):FVector(0,0,100));TargetArmLength=Interior?0:650;TargetRotation=Interior?FRotator(0,0,0):FRotator(-15,-50,0);}
 if(Category==TEXT("environment")&&EnvironmentLight){EnvironmentLight->GetLightComponent()->SetIntensity(Code==TEXT("night")?.25f:Code==TEXT("day")?8.f:3.f);EnvironmentLight->SetActorRotation(Code==TEXT("day")?FRotator(-40,-35,0):FRotator(-15,90,0));}
 OnVisualConfigurationChanged(Category,Code);return true;
}
void AConfigurableVehicle::AnnounceReady(){Emit(FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphens),TEXT("VIEWER_READY"));}
void AConfigurableVehicle::Emit(const FString& Id,const FString& Type,const FString& Message){
 auto Root=MakeShared<FJsonObject>();Root->SetNumberField(TEXT("version"),1);Root->SetStringField(TEXT("id"),Id);Root->SetStringField(TEXT("type"),Type);auto Payload=MakeShared<FJsonObject>();
 if(!Message.IsEmpty())Payload->SetStringField(TEXT("message"),Message);
 auto Snapshot=MakeShared<FJsonObject>();for(const auto& Pair:State)Snapshot->SetStringField(Pair.Key,Pair.Value);Payload->SetObjectField(TEXT("state"),Snapshot);Root->SetObjectField(TEXT("payload"),Payload);
 FString Output;auto Writer=TJsonWriterFactory<>::Create(&Output);FJsonSerializer::Serialize(Root,Writer);OnProtocolResponse.Broadcast(Output);
}
void AConfigurableVehicle::HandleWebMessage(const FString& Json){
 FString Id=FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphens);auto Fail=[&](const FString& Why){Emit(Id,TEXT("VIEWER_ERROR"),Why);};
 if(Json.Len()>4096){Fail(TEXT("Message too large"));return;}
 TSharedPtr<FJsonObject> Root;auto Reader=TJsonReaderFactory<>::Create(Json);if(!FJsonSerializer::Deserialize(Reader,Root)||!Root.IsValid()){Fail(TEXT("Malformed JSON"));return;}
 double Version;FString ParsedId;FGuid Guid;
 if(!Root->TryGetNumberField(TEXT("version"),Version)||Version!=1||!Root->TryGetStringField(TEXT("id"),ParsedId)||!FGuid::Parse(ParsedId,Guid)){Fail(TEXT("Invalid envelope"));return;}Id=ParsedId;
 if(const FString* Previous=Receipts.Find(Id)){if(*Previous==Json)Emit(Id,TEXT("ACK"));else Fail(TEXT("Command ID reuse"));return;}
 const TSharedPtr<FJsonObject>* Command;const TSharedPtr<FJsonObject>* Payload;FString Type;
 if(!Root->TryGetObjectField(TEXT("command"),Command)||!(*Command)->TryGetStringField(TEXT("type"),Type)||!(*Command)->TryGetObjectField(TEXT("payload"),Payload)){Fail(TEXT("Invalid command"));return;}
 FString Category,Code;
 if(Type==TEXT("RESET_CONFIGURATION")){Reset();}
 else {
  FString Field=TEXT("code");TArray<FString> Allowed;
  if(Type==TEXT("SET_PAINT")){Category=TEXT("paint");Allowed={TEXT("paint-graphite"),TEXT("paint-copper"),TEXT("paint-ivory")};}
  else if(Type==TEXT("SET_WHEELS")){Category=TEXT("wheels");Allowed={TEXT("wheel-aero"),TEXT("wheel-sport")};}
  else if(Type==TEXT("SET_INTERIOR")){Category=TEXT("interior");Allowed={TEXT("interior-charcoal"),TEXT("interior-tan")};}
  else if(Type==TEXT("SET_CAMERA")){Category=TEXT("camera");Field=TEXT("preset");Allowed={TEXT("exterior"),TEXT("interior"),TEXT("front"),TEXT("rear")};}
  else if(Type==TEXT("SET_ENVIRONMENT")){Category=TEXT("environment");Field=TEXT("preset");Allowed={TEXT("day"),TEXT("night"),TEXT("studio")};}
  else {Fail(TEXT("Unknown command"));return;}
  if(!(*Payload)->TryGetStringField(Field,Code)||!Allowed.Contains(Code)){Fail(TEXT("Invalid payload"));return;}
  State.Add(Category,Code);ApplyVariant(Category,Code);
  if(Category==TEXT("camera")&&Code==TEXT("front"))TargetRotation=FRotator(-10,0,0);
  if(Category==TEXT("camera")&&Code==TEXT("rear"))TargetRotation=FRotator(-10,180,0);
 }
 if(Receipts.Num()>=128)Receipts.Empty();Receipts.Add(Id,Json);Emit(Id,TEXT("ACK"));Emit(Id,TEXT("CONFIGURATION_UPDATED"));
}
