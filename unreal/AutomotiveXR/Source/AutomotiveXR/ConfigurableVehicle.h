#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ConfigurableVehicle.generated.h"
class UStaticMeshComponent;
class USpringArmComponent;
class UCameraComponent;
class ULevelVariantSets;
class ADirectionalLight;
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FXRProtocolResponse,const FString&,Json);
UCLASS(Blueprintable)
class AUTOMOTIVEXR_API AConfigurableVehicle : public AActor {
 GENERATED_BODY()
public:
 AConfigurableVehicle();
 virtual void BeginPlay() override;
 virtual void Tick(float DeltaSeconds) override;
 UPROPERTY(VisibleAnywhere,BlueprintReadOnly) UStaticMeshComponent* Body;
 UPROPERTY(VisibleAnywhere,BlueprintReadOnly) UStaticMeshComponent* Cabin;
 UPROPERTY(VisibleAnywhere,BlueprintReadOnly) USpringArmComponent* CameraArm;
 UPROPERTY(VisibleAnywhere,BlueprintReadOnly) UCameraComponent* Camera;
 UPROPERTY(EditAnywhere,BlueprintReadWrite) ULevelVariantSets* VariantSets;
 UPROPERTY(EditAnywhere,BlueprintReadWrite) ADirectionalLight* EnvironmentLight;
 UPROPERTY(BlueprintAssignable) FXRProtocolResponse OnProtocolResponse;
 UFUNCTION(BlueprintCallable) void HandleWebMessage(const FString& Json);
 UFUNCTION(BlueprintCallable) void AnnounceReady();
 UFUNCTION(BlueprintCallable) void Orbit(float YawDelta,float PitchDelta);
 UFUNCTION(BlueprintCallable) void Zoom(float Delta);
 UFUNCTION(BlueprintImplementableEvent) void OnVisualConfigurationChanged(const FString& Category,const FString& Code);
private:
 UPROPERTY() TArray<UStaticMeshComponent*> Wheels;
 TMap<FString,FString> State;
 TMap<FString,FString> Receipts;
 float TargetArmLength=650.f;
 FRotator TargetRotation=FRotator(-15.f,-50.f,0.f);
 void Emit(const FString& Id,const FString& Type,const FString& Message=TEXT(""));
 bool ApplyVariant(const FString& Category,const FString& Code);
 void Reset();
};
