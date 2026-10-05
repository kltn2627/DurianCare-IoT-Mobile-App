import { useLocalSearchParams } from "expo-router";
import { TreeDetailScreen } from "@/src/features/trees/TreeDetailScreen";

export default function TreeDetailPage() {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  return <TreeDetailScreen treeId={treeId} />;
}
