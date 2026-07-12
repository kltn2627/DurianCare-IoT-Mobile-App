import { BadgeCheck, Check, FileSearch, LoaderCircle, Search, ShieldAlert, X } from "lucide-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  approveEngineerApplication,
  getEngineerApplication,
  listEngineerApplications,
  rejectEngineerApplication,
} from "@/src/features/auth/authApi";
import type {
  EngineerApplicationDetail,
  EngineerApplicationSummary,
  ReviewEngineerApplicationRequest,
} from "@/src/features/auth/authTypes";
import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";

const statusFilters = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
] as const;

export function DurianFarmAuthorizationScreen() {
  const [applications, setApplications] = useState<EngineerApplicationSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<EngineerApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const selectedApplication = useMemo(
    () => applications.find((application) => application.applicationId === selectedId) ?? null,
    [applications, selectedId],
  );

  useEffect(() => {
    let active = true;

    const loadApplications = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await listEngineerApplications(statusFilter || undefined);
        if (!active) return;
        setApplications(response);
        setSelectedId((current) =>
          response.some((item) => item.applicationId === current)
            ? current
            : response[0]?.applicationId ?? "",
        );
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải danh sách hồ sơ kỹ sư.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadApplications();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setDetail(null);
      return;
    }

    const loadDetail = async () => {
      setDetailLoading(true);
      setError("");
      try {
        const response = await getEngineerApplication(selectedId);
        if (!active) return;
        setDetail(response);
        setRejectionReason(response.rejectionReason ?? "");
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết hồ sơ.");
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    };

    void loadDetail();
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function reload() {
    setLoading(true);
    try {
      const response = await listEngineerApplications(statusFilter || undefined);
      setApplications(response);
      if (response.length === 0) {
        setSelectedId("");
        setDetail(null);
        return;
      }
      const nextSelected =
        response.find((item) => item.applicationId === selectedId)?.applicationId ??
        response[0].applicationId;
      setSelectedId(nextSelected);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedId) return;
    setActionLoading("approve");
    setError("");
    try {
      await approveEngineerApplication(selectedId);
      setRejectionReason("");
      setDetail(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể phê duyệt hồ sơ kỹ sư.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!selectedId) return;
    setActionLoading("reject");
    setError("");
    try {
      const payload: ReviewEngineerApplicationRequest = rejectionReason.trim()
        ? { rejectionReason: rejectionReason.trim() }
        : {};
      await rejectEngineerApplication(selectedId, payload);
      setRejectionReason("");
      setDetail(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể từ chối hồ sơ kỹ sư.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="PHÊ DUYỆT HỒ SƠ KỸ SƯ"
        icon={FileSearch}
        subtitle="Duyệt thông tin chuyên môn, chứng chỉ đính kèm và quyết định chấp thuận hoặc từ chối."
        title="Quản lý ủy quyền"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {statusFilters.map((filter) => (
            <Pressable
              key={filter.value || "all"}
              onPress={() => setStatusFilter(filter.value)}
              style={({ pressed }) => [
                styles.filterChip,
                statusFilter === filter.value && styles.filterChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter.value && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.grid}>
          <View style={styles.listPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Danh sách hồ sơ</Text>
              <Text style={styles.panelMeta}>{applications.length} hồ sơ</Text>
            </View>

            {loading ? (
              <LoadingState label="Đang tải danh sách hồ sơ..." />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert size={18} />}
                title="Không có hồ sơ phù hợp"
                message="Không tìm thấy hồ sơ kỹ sư với bộ lọc hiện tại."
              />
            ) : (
              <View style={styles.list}>
                {applications.map((application) => {
                  const active = application.applicationId === selectedId;
                  return (
                    <Pressable
                      key={application.applicationId}
                      onPress={() => setSelectedId(application.applicationId)}
                      style={({ pressed }) => [
                        styles.applicationCard,
                        active && styles.applicationCardActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.applicationHeader}>
                        <View style={styles.applicationCopy}>
                          <Text style={styles.applicationName}>{application.fullName}</Text>
                          <Text style={styles.applicationEmail}>{application.email}</Text>
                        </View>
                        <StatusBadge status={application.status} />
                      </View>

                      <View style={styles.applicationMeta}>
                        <Text style={styles.applicationMetaText}>
                          Chuyên môn: {application.specialization}
                        </Text>
                        <Text style={styles.applicationMetaText}>
                          Nơi công tác: {application.workplace}
                        </Text>
                        <Text style={styles.applicationMetaText}>
                          Kinh nghiệm: {application.yearsExperience} năm
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.detailPanel}>
            {!selectedApplication || detailLoading ? (
              <LoadingState label="Đang tải chi tiết hồ sơ..." />
            ) : detail ? (
              <View style={styles.detailContent}>
                <View style={styles.detailTop}>
                  <View>
                    <Text style={styles.detailName}>{detail.fullName}</Text>
                    <Text style={styles.detailEmail}>{detail.email}</Text>
                  </View>
                  <StatusBadge status={detail.status} />
                </View>

                <View style={styles.detailMetaGrid}>
                  <InfoCard label="Nơi công tác" value={detail.workplace} />
                  <InfoCard label="Chuyên môn" value={detail.specialization} />
                  <InfoCard label="Kinh nghiệm" value={`${detail.yearsExperience} năm`} />
                  <InfoCard label="Ngày nộp" value={formatDate(detail.createdAt)} />
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Giới thiệu chuyên môn</Text>
                  <Text style={styles.sectionText}>{detail.biography}</Text>
                </View>

                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>Tài liệu đính kèm</Text>
                  {detail.documents.length === 0 ? (
                    <Text style={styles.emptyHint}>Chưa có tài liệu đính kèm.</Text>
                  ) : (
                    <View style={styles.documentList}>
                      {detail.documents.map((document) => (
                        <View key={document.documentId} style={styles.documentRow}>
                          <View style={styles.documentCopy}>
                            <Text style={styles.documentTitle} numberOfLines={1}>
                              {document.fileName}
                            </Text>
                            <Text style={styles.documentMeta}>
                              {document.contentType} • {(document.fileSize / (1024 * 1024)).toFixed(1)} MB
                            </Text>
                          </View>
                          <BadgeCheck color={durianTheme.colors.moss} size={16} />
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {detail.status === "REJECTED" ? (
                  <View style={styles.rejectBox}>
                    <Text style={styles.sectionLabel}>Lý do từ chối</Text>
                    <Text style={styles.rejectText}>
                      {detail.rejectionReason ?? "Chưa ghi nhận lý do."}
                    </Text>
                  </View>
                ) : null}

                {detail.status === "PENDING_REVIEW" ? (
                  <View style={styles.reviewBox}>
                    <Text style={styles.sectionLabel}>Ghi chú từ chối (không bắt buộc)</Text>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      onChangeText={setRejectionReason}
                      placeholder="Nhập lý do từ chối nếu cần..."
                      placeholderTextColor={durianTheme.colors.muted}
                      style={styles.textArea}
                      value={rejectionReason}
                    />

                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => void handleApprove()}
                        disabled={actionLoading !== null}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.pressed,
                          actionLoading !== null && styles.disabled,
                        ]}
                      >
                        {actionLoading === "approve" ? (
                          <LoaderCircle color={durianTheme.colors.mossDark} size={16} />
                        ) : (
                          <Check color={durianTheme.colors.mossDark} size={16} />
                        )}
                        <Text style={styles.primaryButtonText}>Phê duyệt</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => void handleReject()}
                        disabled={actionLoading !== null}
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          pressed && styles.pressed,
                          actionLoading !== null && styles.disabled,
                        ]}
                      >
                        {actionLoading === "reject" ? (
                          <LoaderCircle color={durianTheme.colors.moss} size={16} />
                        ) : (
                          <X color={durianTheme.colors.moss} size={16} />
                        )}
                        <Text style={styles.secondaryButtonText}>Từ chối</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <EmptyState
                icon={<Search size={18} />}
                title="Chưa chọn hồ sơ"
                message="Chọn một hồ sơ ở danh sách bên trái để xem chi tiết."
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED"
      ? styles.statusApproved
      : status === "REJECTED"
        ? styles.statusRejected
        : styles.statusPending;
  const label =
    status === "APPROVED"
      ? "Đã duyệt"
      : status === "REJECTED"
        ? "Đã từ chối"
        : "Chờ duyệt";

  return (
    <View style={[styles.statusBadge, tone]}>
      <Text style={styles.statusBadgeText}>{label}</Text>
    </View>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.feedbackBox}>
      <LoaderCircle color={durianTheme.colors.moss} size={18} />
      <Text style={styles.feedbackText}>{label}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ReactNode;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.feedbackBox}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.feedbackTitle}>{title}</Text>
      <Text style={styles.feedbackMessage}>{message}</Text>
    </View>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  applicationCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E1E6DF",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  applicationCardActive: {
    backgroundColor: "#F7FAF7",
    borderColor: "#B9CBBD",
  },
  applicationCopy: { flex: 1, gap: 3 },
  applicationEmail: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  applicationHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  applicationMeta: { gap: 4 },
  applicationMetaText: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  applicationName: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  content: { gap: 14, padding: 18, paddingBottom: 42 },
  detailContent: { gap: 14 },
  detailEmail: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  detailMetaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailName: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900" },
  detailPanel: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 28,
    padding: 16,
  },
  detailTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  disabled: { opacity: 0.55 },
  error: {
    backgroundColor: "#FFF5F1",
    borderColor: "#F2DDD6",
    borderRadius: 18,
    borderWidth: 1,
    color: "#8d5140",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  documentCopy: { flex: 1, gap: 2 },
  documentList: { gap: 8 },
  documentMeta: { color: durianTheme.colors.muted, fontSize: 11, lineHeight: 16 },
  documentRow: {
    alignItems: "center",
    backgroundColor: "#FAFCF9",
    borderColor: "#E7ECE6",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  documentTitle: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "800" },
  emptyHint: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  feedbackBox: {
    alignItems: "center",
    backgroundColor: "#FAFCF9",
    borderColor: "#DFE6DF",
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 10,
    minHeight: 220,
    justifyContent: "center",
    padding: 18,
  },
  feedbackMessage: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  feedbackText: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 18 },
  feedbackTitle: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  grid: { gap: 14 },
  filterChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#D8E1D8",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  filterChipText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: { color: durianTheme.colors.white },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoCard: {
    backgroundColor: "#F8F6EB",
    borderColor: "#E7E1CF",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 4,
    minWidth: 120,
    padding: 12,
  },
  infoLabel: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoValue: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  list: { gap: 10 },
  listPanel: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 28,
    padding: 16,
  },
  panelHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  panelMeta: { color: durianTheme.colors.muted, fontSize: 12 },
  panelTitle: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 13,
    fontWeight: "900",
  },
  rejectBox: {
    backgroundColor: "#FFF5F1",
    borderColor: "#F2DDD6",
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  rejectText: {
    color: "#8d5140",
    fontSize: 13,
    lineHeight: 20,
  },
  reviewBox: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E7ECE6",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#DDE4DD",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "900" },
  sectionBox: {
    backgroundColor: "#FAFCF9",
    borderColor: "#E7ECE6",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  sectionLabel: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionText: {
    color: durianTheme.colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  statusApproved: {
    backgroundColor: "#E8F2EA",
  },
  statusBadge: {
    borderRadius: 999,
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: { color: durianTheme.colors.mossDark, fontSize: 10, fontWeight: "900" },
  statusPending: {
    backgroundColor: "#FBF1CA",
  },
  statusRejected: {
    backgroundColor: "#F7E9E4",
  },
  textArea: {
    backgroundColor: durianTheme.colors.canvas,
    borderColor: "#E3DDC5",
    borderRadius: 16,
    borderWidth: 1,
    color: durianTheme.colors.ink,
    minHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
});
