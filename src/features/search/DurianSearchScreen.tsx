import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Filter,
  LoaderCircle,
  Search as SearchIcon,
  Sparkles,
  Table2,
  Tag,
  ThermometerSun,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { friendlyApiMessage } from "@/src/lib/feedback";
import { durianTheme } from "@/src/theme/durianTheme";

import { searchDocuments, SearchApiError } from "./searchApi";
import type {
  SearchDocumentType,
  SearchResponse,
  SearchResult,
  SearchSortBy,
  SearchSortDirection,
} from "./types";

type SearchFilters = {
  query: string;
  type: SearchDocumentType | "";
  page: number;
  size: number;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
};

const DEFAULT_SIZE = 10;
const PAGE_SIZES = [10, 20, 50, 100];

const TYPE_OPTIONS: Array<{ label: string; value: SearchDocumentType | "" }> = [
  { label: "Tất cả", value: "" },
  { label: "Bài viết", value: "ARTICLE" },
  { label: "Bệnh hại", value: "DISEASE" },
];

const SORT_OPTIONS: Array<{
  label: string;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
}> = [
  { label: "Cập nhật mới nhất", sortBy: "updatedAt", sortDirection: "desc" },
  { label: "Cập nhật cũ nhất", sortBy: "updatedAt", sortDirection: "asc" },
  { label: "Tiêu đề A-Z", sortBy: "title", sortDirection: "asc" },
  { label: "Tiêu đề Z-A", sortBy: "title", sortDirection: "desc" },
];

function buildPageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function highlightType(type: string) {
  if (type === "ARTICLE") return "Bài viết";
  if (type === "DISEASE") return "Bệnh hại";
  return type;
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonPill} />
      <View style={[styles.skeletonLine, { width: "78%" }]} />
      <View style={[styles.skeletonLine, { width: "100%" }]} />
      <View style={[styles.skeletonLine, { width: "86%" }]} />
    </View>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Filter; label: string }) {
  return (
    <View style={styles.chip}>
      <Icon color={durianTheme.colors.moss} size={13} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function ToggleChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.toggleChip, selected && styles.toggleChipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.toggleChipText, selected && styles.toggleChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function DurianSearchScreen() {
  const [draftQuery, setDraftQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    type: "",
    page: 0,
    size: DEFAULT_SIZE,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(
    function debounceSearch() {
      const trimmed = draftQuery.trim();
      if (!trimmed) {
        setFilters((current) => ({ ...current, query: "", page: 0 }));
        setData(null);
        setError("");
        setTouched(false);
        setLoading(false);
        return undefined;
      }

      const timer = setTimeout(() => {
        setTouched(true);
        setError("");
        setLoading(true);
        setFilters((current) => ({ ...current, query: trimmed, page: 0 }));
      }, 450);

      return () => clearTimeout(timer);
    },
    [draftQuery],
  );

  useEffect(
    function fetchSearchResults() {
      if (!filters.query.trim()) return undefined;

      const controller = new AbortController();
      void searchDocuments(filters, controller.signal)
        .then((response) => {
          setData(response);
          setError("");
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          setData(null);
          setError(
            friendlyApiMessage(
              cause instanceof SearchApiError
                ? { status: cause.status, message: cause.message }
                : null,
              "search",
              "Không thể tải dữ liệu tìm kiếm.",
            ),
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });

      return () => controller.abort();
    },
    [filters],
  );

  const pageWindow = useMemo(
    () => buildPageWindow(data?.page ?? filters.page, data?.totalPages ?? 0),
    [data?.page, data?.totalPages, filters.page],
  );

  const totalLabel = data
    ? `${data.totalElements.toLocaleString("vi-VN")} kết quả`
    : "0 kết quả";
  const hasQuery = Boolean(filters.query.trim());

  const clearSearch = useCallback(() => {
    setDraftQuery("");
    setFilters({
      query: "",
      type: "",
      page: 0,
      size: DEFAULT_SIZE,
      sortBy: "updatedAt",
      sortDirection: "desc",
    });
    setData(null);
    setError("");
    setTouched(false);
    setLoading(false);
  }, []);

  const runQuickSearch = useCallback((query: string) => {
    setDraftQuery(query);
  }, []);

  const renderResult = useCallback(({ item }: { item: SearchResult }) => {
    return (
      <View style={styles.resultCard}>
        <View style={styles.resultTopRow}>
          <View style={styles.resultTypeChip}>
            <Sparkles color={durianTheme.colors.moss} size={12} />
            <Text style={styles.resultTypeText}>{highlightType(item.type)}</Text>
          </View>
          <Text style={styles.resultDate}>Cập nhật {formatUpdatedAt(item.updatedAt)}</Text>
        </View>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text numberOfLines={4} style={styles.resultContent}>
          {item.content}
        </Text>
        <View style={styles.resultMetaRow}>
          <View style={styles.resultMetaChip}>
            <Tag color={durianTheme.colors.moss} size={12} />
            <Text style={styles.resultMetaText}>ID: {item.id}</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={data?.results ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <DurianScreenHeader
              eyebrow="TÌM KIẾM"
              icon={SearchIcon}
              title="Không gian tra cứu"
              subtitle="Tra cứu bài viết, bệnh hại và tài liệu vận hành theo đúng bộ lọc web."
            />

            <View style={styles.searchCard}>
              <View style={styles.searchRow}>
                <SearchIcon color={durianTheme.colors.moss} size={20} />
                <TextInput
                  onChangeText={setDraftQuery}
                  placeholder="Ví dụ: Phytophthora, bệnh lá, dinh dưỡng..."
                  placeholderTextColor={durianTheme.colors.muted}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={draftQuery}
                />
                {draftQuery ? (
                  <Pressable hitSlop={10} onPress={clearSearch} style={styles.clearButton}>
                    <X color={durianTheme.colors.muted} size={16} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                <Chip icon={Filter} label="Loại tài liệu" />
                {TYPE_OPTIONS.map((option) => (
                  <ToggleChip
                    key={option.value || "ALL"}
                    label={option.label}
                    selected={filters.type === option.value}
                    onPress={() =>
                      setFilters((current) => ({ ...current, type: option.value, page: 0 }))
                    }
                  />
                ))}
              </ScrollView>

              <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                <Chip icon={ArrowUpDown} label="Sắp xếp" />
                {SORT_OPTIONS.map((option) => {
                  const key = `${option.sortBy}:${option.sortDirection}` as const;
                  const selected =
                    filters.sortBy === option.sortBy &&
                    filters.sortDirection === option.sortDirection;
                  return (
                    <ToggleChip
                      key={key}
                      label={option.label}
                      selected={selected}
                      onPress={() =>
                        setFilters((current) => ({
                          ...current,
                          sortBy: option.sortBy,
                          sortDirection: option.sortDirection,
                          page: 0,
                        }))
                      }
                    />
                  );
                })}
              </ScrollView>

              <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
                <Chip icon={Table2} label="Kích thước" />
                {PAGE_SIZES.map((value) => (
                  <ToggleChip
                    key={value}
                    label={`${value}/trang`}
                    selected={filters.size === value}
                    onPress={() => setFilters((current) => ({ ...current, size: value, page: 0 }))}
                  />
                ))}
              </ScrollView>

              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={clearSearch}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryButtonText}>Xoá bộ lọc</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    const normalized = draftQuery.trim();
                    if (!normalized) {
                      clearSearch();
                      return;
                    }
                    setTouched(true);
                    setLoading(true);
                    setFilters((current) => ({ ...current, query: normalized, page: 0 }));
                  }}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <SearchIcon color={durianTheme.colors.mossDark} size={16} />
                  <Text style={styles.primaryButtonText}>Tìm kiếm</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.sectionLabel}>Kết quả tìm kiếm</Text>
                <Text style={styles.sectionTitle}>
                  {loading ? "Đang truy vấn..." : totalLabel}
                </Text>
              </View>
              {data ? (
                <View style={styles.sortBadge}>
                  <Tag color={durianTheme.colors.moss} size={12} />
                  <Text style={styles.sortBadgeText}>
                    {
                      SORT_OPTIONS.find(
                        (option) =>
                          option.sortBy === data.sortBy &&
                          option.sortDirection === data.sortDirection,
                      )?.label
                    }
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.listGap}>
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
              <View style={styles.loadingRow}>
                <LoaderCircle color={durianTheme.colors.moss} size={18} />
                <Text style={styles.loadingText}>Đang tải kết quả...</Text>
              </View>
            </View>
          ) : hasQuery ? (
            <View style={styles.emptyState}>
              <ThermometerSun color={durianTheme.colors.mossSoft} size={36} />
              <Text style={styles.emptyTitle}>
                {touched ? "Không tìm thấy kết quả" : "Bắt đầu tìm kiếm"}
              </Text>
              <Text style={styles.emptyText}>
                {touched
                  ? "Thử đổi từ khóa, bộ lọc hoặc kiểu sắp xếp để tìm đúng nội dung hơn."
                  : "Nhập từ khóa để tra trong kho tài liệu, sau đó lọc thêm theo loại và sắp xếp."}
              </Text>
              {touched ? (
                <Pressable
                  onPress={clearSearch}
                  style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
                >
                  <X color={durianTheme.colors.white} size={14} />
                  <Text style={styles.emptyButtonText}>Xoá tìm kiếm</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <BookOpen color={durianTheme.colors.mossSoft} size={36} />
              <Text style={styles.emptyTitle}>Tra cứu tri thức durian</Text>
              <Text style={styles.emptyText}>
                Dùng bộ lọc để tìm bài viết, bệnh hại hoặc tài liệu vận hành phù hợp.
              </Text>
              <Pressable
                onPress={() => runQuickSearch("bệnh lá")}
                style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
              >
                <Text style={styles.emptyButtonText}>Thử tìm “bệnh lá”</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          data && data.totalPages > 0 ? (
            <View style={styles.pagination}>
              <Text style={styles.paginationText}>
                Trang {data.page + 1} / {data.totalPages} • {data.numberOfElements} mục trên trang
              </Text>
              <View style={styles.paginationRow}>
                <Pressable
                  disabled={!data.hasPrevious}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.max(0, current.page - 1),
                    }))
                  }
                  style={({ pressed }) => [
                    styles.pageButton,
                    !data.hasPrevious && styles.pageButtonDisabled,
                    pressed && data.hasPrevious && styles.pressed,
                  ]}
                >
                  <ArrowLeft color={durianTheme.colors.moss} size={16} />
                  <Text style={styles.pageButtonText}>Trước</Text>
                </Pressable>

                {pageWindow.map((page) => (
                  <Pressable
                    key={page}
                    onPress={() => setFilters((current) => ({ ...current, page }))}
                    style={({ pressed }) => [
                      styles.pageNumber,
                      page === data.page && styles.pageNumberActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pageNumberText,
                        page === data.page && styles.pageNumberTextActive,
                      ]}
                    >
                      {page + 1}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  disabled={!data.hasNext}
                  onPress={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.min(data.totalPages - 1, current.page + 1),
                    }))
                  }
                  style={({ pressed }) => [
                    styles.pageButton,
                    !data.hasNext && styles.pageButtonDisabled,
                    pressed && data.hasNext && styles.pressed,
                  ]}
                >
                  <Text style={styles.pageButtonText}>Sau</Text>
                  <ArrowRight color={durianTheme.colors.moss} size={16} />
                </Pressable>
              </View>
            </View>
          ) : null
        }
        renderItem={renderResult}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 4,
  },
  chip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  chipRow: {
    alignItems: "center",
    gap: 8,
    paddingRight: 18,
  },
  chipText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
  clearButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: {
    paddingBottom: 42,
  },
  emptyButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16,
  },
  emptyButtonText: {
    color: durianTheme.colors.white,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 26,
    paddingVertical: 26,
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
  },
  header: {
    gap: 14,
  },
  listGap: { gap: 12 },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 4,
  },
  loadingText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  pageButton: {
    alignItems: "center",
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 44,
    justifyContent: "center",
    minWidth: 92,
    paddingHorizontal: 14,
  },
  pageButtonDisabled: { opacity: 0.45 },
  pageButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  pageNumber: {
    alignItems: "center",
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
  },
  pageNumberActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  pageNumberText: {
    color: durianTheme.colors.ink,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
  },
  pageNumberTextActive: {
    color: durianTheme.colors.white,
  },
  pagination: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  paginationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paginationText: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    minWidth: 108,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 8,
    height: 46,
    justifyContent: "center",
    minWidth: 132,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: durianTheme.colors.white,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 16,
  },
  resultContent: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  resultDate: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  resultMetaChip: {
    alignItems: "center",
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resultMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  resultMetaText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
  resultTitle: {
    color: durianTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 23,
    marginBottom: 8,
    marginTop: 10,
  },
  resultTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resultTypeChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resultTypeText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    textTransform: "uppercase",
  },
  safeArea: {
    backgroundColor: durianTheme.colors.canvas,
    flex: 1,
  },
  searchCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    gap: 14,
    marginHorizontal: 18,
    padding: 16,
  },
  searchInput: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 11,
  },
  searchRow: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingLeft: 14,
    paddingRight: 4,
  },
  sectionLabel: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 25,
    marginTop: 3,
  },
  skeletonCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 16,
  },
  skeletonLine: {
    backgroundColor: durianTheme.colors.border,
    borderRadius: 999,
    height: 12,
  },
  skeletonPill: {
    backgroundColor: durianTheme.colors.border,
    borderRadius: 999,
    height: 18,
    width: 88,
  },
  sortBadge: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  sortBadgeText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 18,
    paddingTop: 2,
  },
  toggleChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
  },
  toggleChipActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  toggleChipText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
  },
  toggleChipTextActive: {
    color: durianTheme.colors.white,
  },
});
