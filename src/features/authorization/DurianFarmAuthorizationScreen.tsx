import { AlertCircle, Check, Search, ShieldCheck, ShieldX, UserRoundPlus, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { farmAuthorizationApi } from "@/src/features/authorization/farmAuthorizationApi";
import type { AgronomistInvitation, AgronomistSummary, AuthorizedFarmAccess, FarmAuthorization, FarmPermissionType } from "@/src/features/authorization/farmAuthorizationTypes";
import { listAuthorizedFarms, listCultivationActivities, listCultivationPlans, listOwnedFarms } from "@/src/features/cultivation/api/cultivationApi";
import { buildFoundationFarmOptions, buildFoundationZoneOptions, shortFoundationId } from "@/src/features/cultivation/api/farmFoundation";
import type { AuthorizedFarm, CareFarmOption, CareZoneOption, CultivationActivity, CultivationPlan, FarmCatalog } from "@/src/features/cultivation/api/cultivationTypes";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

type RoleMode = "ENGINEER" | "FARMER" | "UNSUPPORTED";
type FoundationData = { activities: CultivationActivity[]; authorizedFarms: AuthorizedFarm[]; ownedFarms: FarmCatalog[]; plans: CultivationPlan[] };

const defaultPermissions: FarmPermissionType[] = ["VIEW_FARM", "VIEW_CULTIVATION_AREA", "VIEW_CARE_SCHEDULE", "CHAT_WITH_OWNER"];
const editablePermissions: Array<{ label: string; value: FarmPermissionType }> = [
  { label: "Xem farm", value: "VIEW_FARM" },
  { label: "Xem khu", value: "VIEW_CULTIVATION_AREA" },
  { label: "Xem lịch", value: "VIEW_CARE_SCHEDULE" },
  { label: "Tạo lịch", value: "CREATE_CARE_SCHEDULE" },
  { label: "Cập nhật lịch", value: "UPDATE_CARE_SCHEDULE" },
  { label: "Chat", value: "CHAT_WITH_OWNER" },
  { label: "Đọc IoT", value: "READ_IOT" },
  { label: "Đọc AI", value: "READ_DISEASE" },
  { label: "Tạo phác đồ", value: "CREATE_PROTOCOL" },
];
const emptyFoundation: FoundationData = { activities: [], authorizedFarms: [], ownedFarms: [], plans: [] };

function roleMode(role?: string): RoleMode {
  if (role === "FARMER") return "FARMER";
  if (role === "ENGINEER" || role === "EXPERT") return "ENGINEER";
  return "UNSUPPORTED";
}

function friendlyError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "Không giới hạn";
  try {
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function areaText(ids: string[]) {
  if (!ids.length) return "Toàn bộ khu hiện có theo backend";
  return ids.map((id) => `Plot ${shortFoundationId(id)}`).join(", ");
}

export function DurianFarmAuthorizationScreen() {
  const { session } = useSession();
  const mode = roleMode(session?.user.backendRole);
  const [foundation, setFoundation] = useState<FoundationData>(emptyFoundation);
  const [farmId, setFarmId] = useState("");
  const [authorizations, setAuthorizations] = useState<FarmAuthorization[]>([]);
  const [farmInvitations, setFarmInvitations] = useState<AgronomistInvitation[]>([]);
  const [myInvitations, setMyInvitations] = useState<AgronomistInvitation[]>([]);
  const [authorizedAccess, setAuthorizedAccess] = useState<AuthorizedFarmAccess[]>([]);
  const [agronomists, setAgronomists] = useState<AgronomistSummary[]>([]);
  const [selectedAgronomistId, setSelectedAgronomistId] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<FarmPermissionType[]>(defaultPermissions);
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [query, setQuery] = useState("");
  const [editingAuthorization, setEditingAuthorization] = useState<FarmAuthorization | null>(null);
  const [editAreas, setEditAreas] = useState<string[]>([]);
  const [editPermissions, setEditPermissions] = useState<FarmPermissionType[]>(defaultPermissions);
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const farms = useMemo(() => buildFoundationFarmOptions(foundation), [foundation]);
  const zones = useMemo(() => buildFoundationZoneOptions(foundation, farmId), [farmId, foundation]);
  const activeAuthorizations = authorizations.filter((item) => item.status === "ACTIVE");
  const pendingFarmInvitations = farmInvitations.filter((item) => item.status === "PENDING");

  const loadFoundation = useCallback(async () => {
    const [owned, authorized, plans, activities] = await Promise.allSettled([listOwnedFarms(), listAuthorizedFarms(), listCultivationPlans(), listCultivationActivities()]);
    const next: FoundationData = {
      activities: activities.status === "fulfilled" ? activities.value : [],
      authorizedFarms: authorized.status === "fulfilled" ? authorized.value : [],
      ownedFarms: owned.status === "fulfilled" ? owned.value : [],
      plans: plans.status === "fulfilled" ? plans.value : [],
    };
    setFoundation(next);
    setFarmId((current) => {
      const nextFarms = buildFoundationFarmOptions(next);
      return nextFarms.some((farm) => farm.farmId === current) ? current : nextFarms[0]?.farmId ?? "";
    });
  }, []);

  const loadEngineerData = useCallback(async () => {
    const [invitations, access] = await Promise.all([farmAuthorizationApi.listMyInvitations(), farmAuthorizationApi.listAuthorizedFarms()]);
    setMyInvitations(invitations);
    setAuthorizedAccess(access);
  }, []);

  const loadOwnerFarmData = useCallback(async (selectedFarmId: string) => {
    if (!selectedFarmId) {
      setAuthorizations([]);
      setFarmInvitations([]);
      return;
    }
    const [auths, invites] = await Promise.all([farmAuthorizationApi.listFarmAuthorizations(selectedFarmId), farmAuthorizationApi.listFarmInvitations(selectedFarmId)]);
    setAuthorizations(auths);
    setFarmInvitations(invites);
  }, []);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (mode === "UNSUPPORTED") {
      setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    setError("");
    setNotice("");
    try {
      await loadFoundation();
      if (mode === "ENGINEER") await loadEngineerData();
    } catch (caught) {
      setError(friendlyError(caught, "Không thể tải dữ liệu ủy quyền."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadEngineerData, loadFoundation, mode]);

  useEffect(() => {
    void loadData();
  }, [loadData, session?.user.id]);

  useEffect(() => {
    if (mode !== "FARMER" || !farmId) return;
    let active = true;
    setError("");
    void loadOwnerFarmData(farmId).catch((caught) => {
      if (active) setError(friendlyError(caught, "Không thể tải quyền truy cập của farm đã chọn."));
    });
    return () => {
      active = false;
    };
  }, [farmId, loadOwnerFarmData, mode]);

  async function refresh() {
    setRefreshing(true);
    await loadData({ silent: true });
    if (mode === "FARMER") await loadOwnerFarmData(farmId);
    setRefreshing(false);
  }

  async function searchAgronomists() {
    setSubmitting(true);
    setError("");
    try {
      const result = await farmAuthorizationApi.searchAgronomists(query);
      const eligible = result.filter((item) => item.eligible);
      setAgronomists(eligible);
      setSelectedAgronomistId((current) => (eligible.some((item) => item.id === current) ? current : eligible[0]?.id ?? ""));
    } catch (caught) {
      setError(friendlyError(caught, "Không thể tìm kỹ sư nông nghiệp."));
    } finally {
      setSubmitting(false);
    }
  }

  async function createInvitation() {
    if (!farmId || !selectedAgronomistId) {
      Alert.alert("Chưa đủ thông tin", "Vui lòng chọn farm và kỹ sư nhận lời mời.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await farmAuthorizationApi.createInvitation(farmId, {
        agronomistId: selectedAgronomistId,
        expiresAt: expiresAt.trim() || null,
        initialAllowedCultivationAreaIds: selectedAreas.length ? selectedAreas : undefined,
        initialPermissions: selectedPermissions,
        message: message.trim() || null,
      });
      setNotice("Đã gửi lời mời cộng tác bằng API thật.");
      setMessage("");
      setExpiresAt("");
      setSelectedAreas([]);
      await loadOwnerFarmData(farmId);
    } catch (caught) {
      setError(friendlyError(caught, "Không thể gửi lời mời cộng tác."));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    setSubmitting(true);
    setError("");
    try {
      await farmAuthorizationApi.cancelInvitation(invitationId);
      setNotice("Đã hủy lời mời đang chờ.");
      await loadOwnerFarmData(farmId);
    } catch (caught) {
      setError(friendlyError(caught, "Không thể hủy lời mời."));
    } finally {
      setSubmitting(false);
    }
  }

  async function acceptInvitation(invitationId: string) {
    setSubmitting(true);
    setError("");
    try {
      await farmAuthorizationApi.acceptInvitation(invitationId);
      setNotice("Đã chấp nhận lời mời. Danh sách farm được cấp quyền đã tải lại.");
      await loadEngineerData();
      await loadFoundation();
    } catch (caught) {
      setError(friendlyError(caught, "Không thể chấp nhận lời mời."));
    } finally {
      setSubmitting(false);
    }
  }

  async function rejectInvitation(invitationId: string) {
    setSubmitting(true);
    setError("");
    try {
      await farmAuthorizationApi.rejectInvitation(invitationId, {});
      setNotice("Đã từ chối lời mời.");
      await loadEngineerData();
    } catch (caught) {
      setError(friendlyError(caught, "Không thể từ chối lời mời."));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAuthorization() {
    if (!editingAuthorization) return;
    setSubmitting(true);
    setError("");
    try {
      await farmAuthorizationApi.updateAuthorization(editingAuthorization.id, {
        allowedCultivationAreaIds: editAreas,
        expiresAt: editExpiresAt.trim() || null,
        permissions: editPermissions,
      });
      setEditingAuthorization(null);
      setNotice("Đã cập nhật quyền truy cập.");
      await loadOwnerFarmData(farmId);
      await loadFoundation();
    } catch (caught) {
      setError(friendlyError(caught, "Không thể cập nhật quyền truy cập."));
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeAuthorization(authorizationId: string) {
    setSubmitting(true);
    setError("");
    try {
      await farmAuthorizationApi.revokeAuthorization(authorizationId);
      setNotice("Đã thu hồi quyền truy cập. Dữ liệu quyền/farm đã tải lại.");
      await loadOwnerFarmData(farmId);
      await loadFoundation();
    } catch (caught) {
      setError(friendlyError(caught, "Không thể thu hồi quyền truy cập."));
    } finally {
      setSubmitting(false);
    }
  }

  function confirmRevoke(authorization: FarmAuthorization) {
    Alert.alert("Thu hồi quyền truy cập?", "Kỹ sư sẽ không còn thấy farm này trong danh sách được cấp quyền.", [
      { text: "Giữ lại", style: "cancel" },
      { text: "Thu hồi", style: "destructive", onPress: () => void revokeAuthorization(authorization.id) },
    ]);
  }

  function openEditAuthorization(authorization: FarmAuthorization) {
    setEditingAuthorization(authorization);
    setEditAreas(authorization.allowedCultivationAreaIds);
    setEditPermissions(authorization.permissions);
    setEditExpiresAt(authorization.expiresAt ?? "");
  }

  if (mode === "UNSUPPORTED") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DurianScreenHeader eyebrow="QUYỀN TRUY CẬP VƯỜN" icon={ShieldCheck} title="Chưa hỗ trợ vai trò này" subtitle="Farm authorization hiện chỉ có contract cho Farmer và Engineer/Expert." />
        <View style={styles.content}><MessageCard kind="warning" message="Backend chưa xác nhận Admin có quyền quản trị farm authorization toàn hệ thống, nên Mobile không tự mở màn hình admin ở phase này." /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader eyebrow="QUYỀN TRUY CẬP VƯỜN" icon={ShieldCheck} title={mode === "FARMER" ? "Quản lý quyền truy cập vườn" : "Farm được cấp quyền"} subtitle={mode === "FARMER" ? "Mời kỹ sư, giới hạn quyền và thu hồi quyền bằng farm-service." : "Xem lời mời và farm/khu canh tác bạn được phép hỗ trợ."} />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void refresh()} refreshing={refreshing} />}>
        {error ? <MessageCard kind="error" message={error} /> : null}
        {notice ? <MessageCard kind="success" message={notice} /> : null}
        {loading ? <LoadingState /> : mode === "FARMER" ? (
          <FarmerFlow
            agronomists={agronomists}
            authorizations={activeAuthorizations}
            expiresAt={expiresAt}
            farmId={farmId}
            farmInvitations={pendingFarmInvitations}
            farms={farms}
            message={message}
            onAreaToggle={(areaId) => setSelectedAreas((current) => toggleValue(current, areaId))}
            onCancelInvitation={(id) => void cancelInvitation(id)}
            onCreateInvitation={() => void createInvitation()}
            onEditAuthorization={openEditAuthorization}
            onExpiresAtChange={setExpiresAt}
            onFarmChange={(id) => {
              setFarmId(id);
              setSelectedAreas([]);
            }}
            onMessageChange={setMessage}
            onPermissionToggle={(permission) => setSelectedPermissions((current) => toggleValue(current, permission))}
            onQueryChange={setQuery}
            onRevokeAuthorization={confirmRevoke}
            onSearch={() => void searchAgronomists()}
            query={query}
            selectedAgronomistId={selectedAgronomistId}
            selectedAreas={selectedAreas}
            selectedPermissions={selectedPermissions}
            setSelectedAgronomistId={setSelectedAgronomistId}
            submitting={submitting}
            zones={zones}
          />
        ) : (
          <EngineerFlow access={authorizedAccess} invitations={myInvitations} onAccept={(id) => void acceptInvitation(id)} onReject={(id) => void rejectInvitation(id)} submitting={submitting} />
        )}
      </KeyboardAwareScrollView>
      <EditAuthorizationModal authorization={editingAuthorization} editAreas={editAreas} editExpiresAt={editExpiresAt} editPermissions={editPermissions} onAreaToggle={(areaId) => setEditAreas((current) => toggleValue(current, areaId))} onClose={() => setEditingAuthorization(null)} onExpiresAtChange={setEditExpiresAt} onPermissionToggle={(permission) => setEditPermissions((current) => toggleValue(current, permission))} onSubmit={() => void saveAuthorization()} submitting={submitting} zones={zones} />
    </SafeAreaView>
  );
}

function FarmerFlow({ agronomists, authorizations, expiresAt, farmId, farmInvitations, farms, message, onAreaToggle, onCancelInvitation, onCreateInvitation, onEditAuthorization, onExpiresAtChange, onFarmChange, onMessageChange, onPermissionToggle, onQueryChange, onRevokeAuthorization, onSearch, query, selectedAgronomistId, selectedAreas, selectedPermissions, setSelectedAgronomistId, submitting, zones }: { agronomists: AgronomistSummary[]; authorizations: FarmAuthorization[]; expiresAt: string; farmId: string; farmInvitations: AgronomistInvitation[]; farms: CareFarmOption[]; message: string; onAreaToggle: (areaId: string) => void; onCancelInvitation: (invitationId: string) => void; onCreateInvitation: () => void; onEditAuthorization: (authorization: FarmAuthorization) => void; onExpiresAtChange: (value: string) => void; onFarmChange: (farmId: string) => void; onMessageChange: (value: string) => void; onPermissionToggle: (permission: FarmPermissionType) => void; onQueryChange: (value: string) => void; onRevokeAuthorization: (authorization: FarmAuthorization) => void; onSearch: () => void; query: string; selectedAgronomistId: string; selectedAreas: string[]; selectedPermissions: FarmPermissionType[]; setSelectedAgronomistId: (id: string) => void; submitting: boolean; zones: CareZoneOption[] }) {
  return (
    <>
      <Section title="Farm đang quản lý" subtitle="Do backend chưa có owner farm list API, danh sách này được suy ra từ cultivation data thật. Backend vẫn kiểm tra owner khi thao tác.">
        <SelectorRow emptyText="Chưa có farm thật để cấp quyền." label="Farm" onChange={onFarmChange} options={farms.map((farm) => ({ id: farm.farmId, label: farm.label }))} selectedId={farmId} />
      </Section>
      <Section title="Mời kỹ sư cộng tác" subtitle="Lời mời sau khi kỹ sư chấp nhận mới tạo FarmAuthorization ACTIVE.">
        <View style={styles.searchBox}><Search color={durianTheme.colors.muted} size={18} /><TextInput onChangeText={onQueryChange} placeholder="Tìm kỹ sư/agronomist..." placeholderTextColor={durianTheme.colors.muted} style={styles.searchInput} value={query} /><Pressable disabled={submitting} onPress={onSearch} style={styles.smallButton}><Text style={styles.smallButtonText}>Tìm</Text></Pressable></View>
        {agronomists.length ? <SelectorRow emptyText="Không có kỹ sư đủ điều kiện." label="Kỹ sư nhận lời mời" onChange={setSelectedAgronomistId} options={agronomists.map((item) => ({ id: item.id, label: `${item.fullName} · ${item.specialization ?? item.role}` }))} selectedId={selectedAgronomistId} /> : <EmptyText text="Nhập từ khóa rồi tìm kỹ sư đủ điều kiện từ backend." />}
        <ScopeEditor selectedAreas={selectedAreas} selectedPermissions={selectedPermissions} onAreaToggle={onAreaToggle} onPermissionToggle={onPermissionToggle} zones={zones} />
        <TextInput multiline onChangeText={onMessageChange} placeholder="Tin nhắn mời cộng tác..." placeholderTextColor={durianTheme.colors.muted} style={[styles.input, styles.textArea]} value={message} />
        <TextInput onChangeText={onExpiresAtChange} placeholder="expiresAt ISO, bỏ trống = backend +14 ngày" placeholderTextColor={durianTheme.colors.muted} style={styles.input} value={expiresAt} />
        <Pressable disabled={submitting || !farmId || !selectedAgronomistId} onPress={onCreateInvitation} style={[styles.primaryButton, (submitting || !farmId || !selectedAgronomistId) && styles.disabled]}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <UserRoundPlus color={durianTheme.colors.white} size={18} />}<Text style={styles.primaryButtonText}>Gửi lời mời bằng API thật</Text></Pressable>
      </Section>
      <Section title="Lời mời đang chờ" subtitle="Chỉ owner farm có quyền xem/hủy các lời mời của farm.">
        {farmInvitations.length ? farmInvitations.map((item) => <InvitationCard key={item.id} invitation={item} onCancel={onCancelInvitation} submitting={submitting} />) : <EmptyText text="Chưa có lời mời pending cho farm này." />}
      </Section>
      <Section title="Kỹ sư đang được cấp quyền" subtitle="Update/revoke gọi trực tiếp farm-service và tải lại farm access sau mutation.">
        {authorizations.length ? authorizations.map((item) => <AuthorizationCard key={item.id} authorization={item} onEdit={onEditAuthorization} onRevoke={onRevokeAuthorization} submitting={submitting} />) : <EmptyText text="Chưa cấp quyền truy cập cho ai." />}
      </Section>
    </>
  );
}

function EngineerFlow({ access, invitations, onAccept, onReject, submitting }: { access: AuthorizedFarmAccess[]; invitations: AgronomistInvitation[]; onAccept: (id: string) => void; onReject: (id: string) => void; submitting: boolean }) {
  const pending = invitations.filter((item) => item.status === "PENDING");
  return <><Section title="Lời mời cộng tác" subtitle="Chấp nhận lời mời sẽ tạo FarmAuthorization ACTIVE ở backend.">{pending.length ? pending.map((item) => <EngineerInvitationCard invitation={item} key={item.id} onAccept={onAccept} onReject={onReject} submitting={submitting} />) : <EmptyText text="Bạn chưa có lời mời truy cập trang trại nào." />}</Section><Section title="Farm được cấp quyền" subtitle="/api/v1/me/authorized-farms chỉ trả authorization ACTIVE, chưa hết hạn.">{access.length ? access.map((item) => <AuthorizedFarmCard access={item} key={item.authorizationId} />) : <EmptyText text="Bạn chưa được cấp quyền truy cập trang trại nào." />}</Section></>;
}

function ScopeEditor({ onAreaToggle, onPermissionToggle, selectedAreas, selectedPermissions, zones }: { onAreaToggle: (areaId: string) => void; onPermissionToggle: (permission: FarmPermissionType) => void; selectedAreas: string[]; selectedPermissions: FarmPermissionType[]; zones: CareZoneOption[] }) {
  return <View style={styles.scopeBox}><Text style={styles.scopeTitle}>Phạm vi khu canh tác</Text>{zones.length ? <View style={styles.chipGrid}>{zones.map((zone) => <ToggleChip active={selectedAreas.includes(zone.zoneId)} key={zone.zoneId} label={zone.label} onPress={() => onAreaToggle(zone.zoneId)} />)}</View> : <Text style={styles.hint}>Không có zone catalog thật. Nếu để trống, backend tự dùng toàn bộ Farm.zones hiện có.</Text>}<Text style={styles.scopeTitle}>Quyền</Text><View style={styles.chipGrid}>{editablePermissions.map((permission) => <ToggleChip active={selectedPermissions.includes(permission.value)} key={permission.value} label={permission.label} onPress={() => onPermissionToggle(permission.value)} />)}</View></View>;
}

function EditAuthorizationModal({ authorization, editAreas, editExpiresAt, editPermissions, onAreaToggle, onClose, onExpiresAtChange, onPermissionToggle, onSubmit, submitting, zones }: { authorization: FarmAuthorization | null; editAreas: string[]; editExpiresAt: string; editPermissions: FarmPermissionType[]; onAreaToggle: (areaId: string) => void; onClose: () => void; onExpiresAtChange: (value: string) => void; onPermissionToggle: (permission: FarmPermissionType) => void; onSubmit: () => void; submitting: boolean; zones: CareZoneOption[] }) {
  return <Modal animationType="slide" onRequestClose={onClose} visible={authorization !== null}><SafeAreaView style={styles.safeArea}><View style={styles.modalHeader}><Pressable onPress={onClose} style={styles.iconButton}><X color={durianTheme.colors.ink} size={20} /></Pressable><Text style={styles.modalTitle}>Cập nhật quyền</Text><View style={styles.iconButton} /></View><ScrollView contentContainerStyle={styles.content}>{authorization ? <Section title={`Authorization ${shortFoundationId(authorization.id)}`} subtitle="Chỉ ACTIVE authorization được backend cho phép cập nhật."><ScopeEditor selectedAreas={editAreas} selectedPermissions={editPermissions} onAreaToggle={onAreaToggle} onPermissionToggle={onPermissionToggle} zones={zones} /><TextInput onChangeText={onExpiresAtChange} placeholder="expiresAt ISO, bỏ trống = không giới hạn" placeholderTextColor={durianTheme.colors.muted} style={styles.input} value={editExpiresAt} /><Pressable disabled={submitting} onPress={onSubmit} style={[styles.primaryButton, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Check color={durianTheme.colors.white} size={18} />}<Text style={styles.primaryButtonText}>Lưu cập nhật</Text></Pressable></Section> : null}</ScrollView></SafeAreaView></Modal>;
}

function Section({ children, subtitle, title }: { children: React.ReactNode; subtitle?: string; title: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}<View style={styles.sectionBody}>{children}</View></View>;
}

function SelectorRow({ emptyText, label, onChange, options, selectedId }: { emptyText: string; label: string; onChange: (id: string) => void; options: Array<{ id: string; label: string }>; selectedId: string }) {
  return <View style={styles.selectorBlock}><Text style={styles.selectorLabel}>{label}</Text>{options.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipGrid}>{options.map((option) => <ToggleChip active={option.id === selectedId} key={option.id} label={option.label} onPress={() => onChange(option.id)} />)}</ScrollView> : <EmptyText text={emptyText} />}</View>;
}

function ToggleChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

function InvitationCard({ invitation, onCancel, submitting }: { invitation: AgronomistInvitation; onCancel: (id: string) => void; submitting: boolean }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>Agronomist {shortFoundationId(invitation.agronomistId)}</Text><Text style={styles.cardMeta}>Farm {shortFoundationId(invitation.farmId)} · Hết hạn {formatDate(invitation.expiresAt)}</Text><Text style={styles.cardMeta}>Scope: {areaText(invitation.initialAllowedCultivationAreaIds)}</Text><Pressable disabled={submitting} onPress={() => onCancel(invitation.id)} style={styles.dangerButton}><ShieldX color={durianTheme.colors.danger} size={16} /><Text style={styles.dangerButtonText}>Hủy lời mời</Text></Pressable></View>;
}

function EngineerInvitationCard({ invitation, onAccept, onReject, submitting }: { invitation: AgronomistInvitation; onAccept: (id: string) => void; onReject: (id: string) => void; submitting: boolean }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>Farm {shortFoundationId(invitation.farmId)}</Text><Text style={styles.cardMeta}>Owner {shortFoundationId(invitation.ownerId)} · Hết hạn {formatDate(invitation.expiresAt)}</Text><Text style={styles.cardMeta}>Scope: {areaText(invitation.initialAllowedCultivationAreaIds)}</Text>{invitation.message ? <Text style={styles.cardDescription}>{invitation.message}</Text> : null}<View style={styles.actionRow}><Pressable disabled={submitting} onPress={() => onAccept(invitation.id)} style={styles.primaryButtonSmall}><Check color={durianTheme.colors.white} size={16} /><Text style={styles.primaryButtonText}>Chấp nhận</Text></Pressable><Pressable disabled={submitting} onPress={() => onReject(invitation.id)} style={styles.dangerButton}><X color={durianTheme.colors.danger} size={16} /><Text style={styles.dangerButtonText}>Từ chối</Text></Pressable></View></View>;
}

function AuthorizationCard({ authorization, onEdit, onRevoke, submitting }: { authorization: FarmAuthorization; onEdit: (authorization: FarmAuthorization) => void; onRevoke: (authorization: FarmAuthorization) => void; submitting: boolean }) {
  return <View style={styles.card}><View style={styles.cardTop}><Text style={styles.cardTitle}>Agronomist {shortFoundationId(authorization.agronomistId)}</Text><StatusPill status={authorization.status} /></View><Text style={styles.cardMeta}>Scope: {areaText(authorization.allowedCultivationAreaIds)}</Text><Text style={styles.cardMeta}>Quyền: {authorization.permissions.join(", ")}</Text><Text style={styles.cardMeta}>Cấp: {formatDate(authorization.grantedAt)} · Hết hạn: {formatDate(authorization.expiresAt)}</Text><View style={styles.actionRow}><Pressable disabled={submitting} onPress={() => onEdit(authorization)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cập nhật</Text></Pressable><Pressable disabled={submitting} onPress={() => onRevoke(authorization)} style={styles.dangerButton}><ShieldX color={durianTheme.colors.danger} size={16} /><Text style={styles.dangerButtonText}>Thu hồi</Text></Pressable></View></View>;
}

function AuthorizedFarmCard({ access }: { access: AuthorizedFarmAccess }) {
  return <View style={styles.card}><View style={styles.cardTop}><Text style={styles.cardTitle}>{access.farmName?.trim() || `Farm ${shortFoundationId(access.farmId)}`}</Text><StatusPill status={access.status} /></View><Text style={styles.cardMeta}>Owner {shortFoundationId(access.ownerId)} · Authorization {shortFoundationId(access.authorizationId)}</Text><Text style={styles.cardMeta}>Scope: {areaText(access.allowedCultivationAreaIds)}</Text><Text style={styles.cardMeta}>Quyền: {access.permissions.join(", ")}</Text><Text style={styles.cardMeta}>Cấp: {formatDate(access.grantedAt)} · Hết hạn: {formatDate(access.expiresAt)}</Text></View>;
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "ACTIVE" ? styles.successTone : status === "EXPIRED" ? styles.warningTone : styles.dangerTone;
  return <Text style={[styles.statusPill, tone]}>{status}</Text>;
}

function LoadingState() {
  return <View style={styles.feedback}><ActivityIndicator color={durianTheme.colors.moss} /><Text style={styles.feedbackText}>Đang tải dữ liệu quyền truy cập thật...</Text></View>;
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function MessageCard({ kind, message }: { kind: "error" | "success" | "warning"; message: string }) {
  return <View style={[styles.messageCard, kind === "error" && styles.errorCard, kind === "success" && styles.successCard, kind === "warning" && styles.warningCard]}><AlertCircle color={kind === "error" ? durianTheme.colors.danger : durianTheme.colors.moss} size={16} /><Text style={styles.messageText}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.md, borderWidth: 1, gap: 8, padding: 13, ...durianTheme.shadow.card },
  cardDescription: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  cardMeta: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  cardTitle: { color: durianTheme.colors.ink, flex: 1, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  cardTop: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  chip: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  chipTextActive: { color: durianTheme.colors.white },
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.lg, paddingBottom: 40 },
  dangerButton: { alignItems: "center", borderColor: "#F0C9C3", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10 },
  dangerButtonText: { color: durianTheme.colors.danger, fontSize: 12, fontWeight: "900" },
  dangerTone: { backgroundColor: durianTheme.colors.dangerSoft, color: durianTheme.colors.danger },
  disabled: { opacity: 0.5 },
  emptyText: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  errorCard: { backgroundColor: durianTheme.colors.dangerSoft, borderColor: durianTheme.colors.danger },
  feedback: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 10, padding: 20 },
  feedbackText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "900" },
  hint: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  iconButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  input: { backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 13, borderWidth: 1, color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 11 },
  messageCard: { alignItems: "flex-start", borderColor: durianTheme.colors.mossSoft, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 9, padding: 12 },
  messageText: { color: durianTheme.colors.ink, flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  modalHeader: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, borderBottomColor: durianTheme.colors.mossSoft, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 12 },
  modalTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },
  primaryButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: durianTheme.radius.sm, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: durianTheme.control.minHeight },
  primaryButtonSmall: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 13, flexDirection: "row", gap: 7, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10 },
  primaryButtonText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  scopeBox: { backgroundColor: "#FAFCF9", borderColor: durianTheme.colors.mossSoft, borderRadius: 14, borderWidth: 1, gap: 10, padding: 12 },
  scopeTitle: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "900" },
  searchBox: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, borderColor: durianTheme.colors.mossSoft, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12 },
  searchInput: { color: durianTheme.colors.ink, flex: 1, fontSize: 13, fontWeight: "800", paddingVertical: 11 },
  secondaryButton: { alignItems: "center", borderColor: durianTheme.colors.mossSoft, borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10 },
  secondaryButtonText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  section: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 6, padding: 15 },
  sectionBody: { gap: 12, marginTop: 6 },
  sectionSubtitle: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900" },
  selectorBlock: { gap: 7 },
  selectorLabel: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "900" },
  smallButton: { backgroundColor: durianTheme.colors.moss, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  statusPill: { borderRadius: 999, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  successCard: { backgroundColor: "#EDF8EF", borderColor: "#CDE6D3" },
  successTone: { backgroundColor: "#E7F6EC", color: "#1E7A3D" },
  textArea: { minHeight: 84, textAlignVertical: "top" },
  warningCard: { backgroundColor: "#FFF8E2", borderColor: "#F4E3A2" },
  warningTone: { backgroundColor: "#FFF3CD", color: "#936B00" },
});
