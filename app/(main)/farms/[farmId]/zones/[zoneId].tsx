import { useLocalSearchParams } from "expo-router";
import { ZoneTreesScreen } from "@/src/features/trees/ZoneTreesScreen";

export default function ZoneTreesPage() {
  const { farmId, zoneId } = useLocalSearchParams<{ farmId: string; zoneId: string }>();
  return <ZoneTreesScreen farmId={farmId} zoneId={zoneId} />;
}
