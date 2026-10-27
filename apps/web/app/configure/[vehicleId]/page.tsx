import { Configurator } from "../../../components/configurator";
export default async function Page({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  return <Configurator vehicleId={(await params).vehicleId} />;
}
