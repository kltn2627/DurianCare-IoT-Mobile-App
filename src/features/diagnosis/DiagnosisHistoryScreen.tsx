import { Clock3, History, LoaderCircle, Trash2, ArrowRight, Leaf } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

import { getDiagnosisDetail } from "./diseaseDetails";
import {
  loadDiagnosisHistory,
  removeDiagnosisHistoryEntry,
} from "./diagnosisHistoryStore";
import type { DiagnosisHistoryEntry } from "./types";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DurianDiagnosisHistoryScreen() {
  const navigation = useDurianSafeNavigation();
  const [history, setHistory] = useState<DiagnosisHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const entries = await loadDiagnosisHistory();
      setHistory(entries);
      setError(null);
    } catch {
      setError("Không thể tải lịch sử chẩn đoán.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openDetail = useCallback(
    (entryId: string) => navigation.push(`/diagnosis-result?entryId=${encodeURIComponent(entryId)}`),
    [navigation],
  );

  const deleteEntry = useCallback(
    (entryId: string) => {
      Alert.alert("Xóa kết quả", "Bạn muốn xóa kết quả chẩn đoán này?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setRemovingId(entryId);
              try {
                await removeDiagnosisHistoryEntry(entryId);
                await loadHistory();
              } finally {
                setRemovingId(null);
              }
            })();
          },
        },
      ]);
    },
    [loadHistory],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <DurianScreenHeader
        eyebrow="CHẨN ĐOÁN"
        icon={History}
        title="Lịch sử chẩn đoán"
        subtitle="Lưu lại các lần quét lá để xem lại kết quả, ảnh gốc và khuyến nghị kỹ thuật."
      />

      <FlatList
        contentContainerStyle={styles.content}
        data={history}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            colors={[durianTheme.colors.durianYellow]}
            progressBackgroundColor={durianTheme.colors.moss}
            refreshing={refreshing}
            tintColor={durianTheme.colors.durianYellow}
            onRefresh={() => {
              setRefreshing(true);
              void loadHistory();
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <LoaderCircle color={durianTheme.colors.moss} size={28} />
              <Text style={styles.emptyTitle}>Đang tải lịch sử...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Không tải được lịch sử</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Leaf color={durianTheme.colors.moss} size={32} />
              <Text style={styles.emptyTitle}>Chưa có lần chẩn đoán nào</Text>
              <Text style={styles.emptyText}>
                Quét một lá bệnh trước, sau đó các kết quả sẽ tự động được lưu ở đây.
              </Text>
              <Pressable
                onPress={() => navigation.replace("/diagnosis")}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Mở màn hình chẩn đoán</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={useCallback(
          ({ item }: { item: DiagnosisHistoryEntry }) => {
            const detail = getDiagnosisDetail(item.diseaseCode);
            return (
              <View style={styles.card}>
                {item.imageUri ? (
                  <DurianRemoteImage
                    feature="diagnosis-history-image"
                    uri={item.imageUri}
                    resizeMode="cover"
                    style={styles.thumbnail}
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
                    <Leaf color={durianTheme.colors.moss} size={30} />
                    <Text style={styles.thumbnailEmptyText}>Không có ảnh</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.metaChip}>
                      <Clock3 color={durianTheme.colors.moss} size={12} />
                      <Text style={styles.metaChipText}>{formatDateTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.confidence}>{item.confidence.toFixed(1)}%</Text>
                  </View>
                  <Text style={styles.title}>{item.diseaseName}</Text>
                  <Text numberOfLines={3} style={styles.summary}>
                    {item.recommendation?.diseaseSummary ??
                      detail?.summary ??
                      "Kết quả chẩn đoán được lưu bởi backend AI service."}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => openDetail(item.id)}
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.secondaryButtonText}>Xem lại</Text>
                      <ArrowRight color={durianTheme.colors.moss} size={16} />
                    </Pressable>
                    <Pressable
                      disabled={removingId === item.id}
                      onPress={() => deleteEntry(item.id)}
                      style={({ pressed }) => [
                        styles.dangerButton,
                        removingId === item.id && styles.disabled,
                        pressed && removingId !== item.id && styles.pressed,
                      ]}
                    >
                      {removingId === item.id ? (
                        <LoaderCircle color={durianTheme.colors.danger} size={16} />
                      ) : (
                        <Trash2 color={durianTheme.colors.danger} size={16} />
                      )}
                      <Text style={styles.dangerButtonText}>Xóa</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          },
          [deleteEntry, openDetail, removingId],
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  card: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardBody: { gap: 10, padding: 16 },
  cardTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  confidence: {
    color: durianTheme.colors.mossDark,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.xl, paddingBottom: 42 },
  dangerButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.dangerSoft,
    borderRadius: durianTheme.radius.sm,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  dangerButtonText: {
    color: durianTheme.colors.danger,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  disabled: { opacity: 0.45 },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  emptyText: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    color: durianTheme.colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 24,
    textAlign: "center",
  },
  metaChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  metaChipText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.sm,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  summary: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  thumbnail: { height: 190, width: "100%" },
  thumbnailEmpty: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    gap: 8,
    justifyContent: "center",
  },
  thumbnailEmptyText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  title: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 25,
  },
});
