import {
  CalendarCheck,
  Check,
  ClipboardList,
  Droplets,
  Leaf,
  Plus,
  SprayCan,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

type TaskType =
  | "fertilizer"
  | "pesticide"
  | "irrigation"
  | "pruning"
  | "inspection";
type TaskStatus = "planned" | "in-progress" | "done";

type CultivationTask = {
  assignee: string;
  cropId: string;
  date: string;
  dosage: string;
  id: string;
  materialName: string;
  notes: string;
  safetyInterval: string;
  status: TaskStatus;
  time: string;
  type: TaskType;
  zoneId: string;
};

const taskTypes: Record<TaskType, { icon: typeof Leaf; label: string }> = {
  fertilizer: { icon: Leaf, label: "Rải phân" },
  pesticide: { icon: SprayCan, label: "Xịt thuốc" },
  irrigation: { icon: Droplets, label: "Tưới nước" },
  pruning: { icon: ClipboardList, label: "Tỉa cành" },
  inspection: { icon: CalendarCheck, label: "Kiểm tra vườn" },
};

const statusLabels: Record<TaskStatus, string> = {
  planned: "Đã lên lịch",
  "in-progress": "Đang làm",
  done: "Hoàn thành",
};

const zones = [
  { id: "A1", name: "Vườn Dona A1" },
  { id: "A2", name: "Vườn Dona A2" },
  { id: "B1", name: "Vườn Ri6 B1" },
  { id: "B2", name: "Vườn Ri6 B2" },
];

const cropLots = [
  { id: "DC-2026-DONA-018", label: "Dona 2026" },
  { id: "DC-2026-RI6-012", label: "Ri6 2026" },
];

const initialTasks: CultivationTask[] = [
  {
    assignee: "Tổ canh tác 01",
    cropId: "DC-2026-DONA-018",
    date: "2026-06-12",
    dosage: "2.5 kg/cây",
    id: "CAL-001",
    materialName: "Phân hữu cơ vi sinh 3-2-2",
    notes: "Rải theo tán, giữ cách gốc 40 cm, tưới nhẹ sau khi rải.",
    safetyInterval: "0 ngày",
    status: "planned",
    time: "07:30",
    type: "fertilizer",
    zoneId: "A1",
  },
  {
    assignee: "KS. Trần Hoàng Nam",
    cropId: "DC-2026-RI6-012",
    date: "2026-06-13",
    dosage: "1.2 lít/ha",
    id: "CAL-002",
    materialName: "Bacillus subtilis",
    notes: "Phun mặt dưới lá vào chiều mát, tránh mưa trong 6 giờ sau phun.",
    safetyInterval: "7 ngày",
    status: "done",
    time: "16:00",
    type: "pesticide",
    zoneId: "B2",
  },
  {
    assignee: "Chủ vườn Nguyễn Minh",
    cropId: "DC-2026-DONA-018",
    date: "2026-06-14",
    dosage: "Kiểm tra 12 trạm",
    id: "CAL-003",
    materialName: "Độ ẩm đất và áp lực tưới",
    notes: "Ưu tiên các cây có độ ẩm dưới 72%.",
    safetyInterval: "Không áp dụng",
    status: "planned",
    time: "06:45",
    type: "inspection",
    zoneId: "A2",
  },
];

const blankTask: Omit<CultivationTask, "id" | "status"> = {
  assignee: "KS. Trần Hoàng Nam",
  cropId: "DC-2026-DONA-018",
  date: "2026-06-15",
  dosage: "",
  materialName: "",
  notes: "",
  safetyInterval: "",
  time: "07:00",
  type: "fertilizer",
  zoneId: "A1",
};

function getDaysUntilLabel(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${date}T00:00:00`);
  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Hôm nay";

  return `Còn ${days} ngày`;
}

function compareTaskTime(left: CultivationTask, right: CultivationTask) {
  return `${left.date} ${left.time}`.localeCompare(
    `${right.date} ${right.time}`,
  );
}

export function DurianCultivationCalendarScreen() {
  const { session } = useSession();
  const [tasks, setTasks] = useState(initialTasks);
  const [draft, setDraft] = useState(blankTask);
  const [showForm, setShowForm] = useState(false);

  const upcomingTasks = useMemo(
    () => tasks.filter((task) => task.status !== "done").sort(compareTaskTime),
    [tasks],
  );

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status === "done")
        .sort((left, right) => compareTaskTime(right, left)),
    [tasks],
  );

  const pesticideCount = tasks.filter(
    (task) => task.type === "pesticide",
  ).length;

  function updateStatus(taskId: string, status: TaskStatus) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
  }

  function addTask() {
    const scheduledAt = new Date(`${draft.date}T${draft.time}`);

    if (!draft.materialName.trim() || !draft.dosage.trim()) {
      Alert.alert(
        "Không lưu được lịch",
        "Vui lòng nhập tên vật tư và liều lượng.",
      );
      return;
    }

    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      Alert.alert(
        "Không lưu được lịch",
        "Vui lòng chọn ngày và giờ sau thời gian hiện tại.",
      );
      return;
    }

    setTasks((current) => [
      {
        ...draft,
        dosage: draft.dosage.trim(),
        id: `CAL-${Date.now()}`,
        materialName: draft.materialName.trim(),
        notes: draft.notes.trim() || "Chưa có ghi chú bổ sung.",
        safetyInterval: draft.safetyInterval.trim() || "Không áp dụng",
        status: "planned",
      },
      ...current,
    ]);

    setDraft(blankTask);
    setShowForm(false);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="LỊCH CANH TÁC"
        icon={CalendarCheck}
        title="Điều phối chăm sóc vườn"
        subtitle="Đồng bộ luồng Web: rải phân, xịt thuốc, liều lượng, cách ly và ghi chú thực địa."
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <SummaryCard label="Đang chờ" value={String(upcomingTasks.length)} />
          <SummaryCard
            label="Xịt thuốc"
            value={String(pesticideCount)}
            warning
          />
          <SummaryCard
            label="Hoàn thành"
            value={String(completedTasks.length)}
          />
        </View>

        <Pressable
          onPress={() => setShowForm((value) => !value)}
          style={styles.createButton}
        >
          <Plus color={durianTheme.colors.mossDark} size={20} />
          <Text style={styles.createButtonText}>
            {showForm ? "Thu gọn tạo lịch" : "Tạo lịch canh tác"}
          </Text>
        </Pressable>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Thông tin lịch mới</Text>

            <View style={styles.segmentRow}>
              {Object.entries(taskTypes).map(([value, item]) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setDraft({ ...draft, type: value as TaskType })
                  }
                  style={[
                    styles.segment,
                    draft.type === value && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      draft.type === value && styles.segmentTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.twoColumns}>
              <Input
                label="Ngày"
                onChangeText={(date) => setDraft({ ...draft, date })}
                value={draft.date}
              />
              <Input
                label="Giờ"
                onChangeText={(time) => setDraft({ ...draft, time })}
                value={draft.time}
              />
            </View>

            <View style={styles.segmentRow}>
              {zones.map((zone) => (
                <Pressable
                  key={zone.id}
                  onPress={() => setDraft({ ...draft, zoneId: zone.id })}
                  style={[
                    styles.segment,
                    draft.zoneId === zone.id && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      draft.zoneId === zone.id && styles.segmentTextActive,
                    ]}
                  >
                    {zone.id}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.segmentRow}>
              {cropLots.map((crop) => (
                <Pressable
                  key={crop.id}
                  onPress={() => setDraft({ ...draft, cropId: crop.id })}
                  style={[
                    styles.segment,
                    draft.cropId === crop.id && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      draft.cropId === crop.id && styles.segmentTextActive,
                    ]}
                  >
                    {crop.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="Tên phân/thuốc/vật tư"
              onChangeText={(materialName) =>
                setDraft({ ...draft, materialName })
              }
              placeholder="VD: NPK 16-16-8"
              value={draft.materialName}
            />

            <Input
              label="Liều lượng"
              onChangeText={(dosage) => setDraft({ ...draft, dosage })}
              placeholder="VD: 0.8 kg/cây"
              value={draft.dosage}
            />

            <Input
              label="Người phụ trách"
              onChangeText={(assignee) => setDraft({ ...draft, assignee })}
              value={draft.assignee}
            />

            <Input
              label="Thời gian cách ly"
              onChangeText={(safetyInterval) =>
                setDraft({ ...draft, safetyInterval })
              }
              placeholder="VD: 7 ngày"
              value={draft.safetyInterval}
            />

            <Input
              label="Ghi chú thực địa"
              multiline
              onChangeText={(notes) => setDraft({ ...draft, notes })}
              placeholder="Điều kiện thời tiết, hướng dẫn phun/rải..."
              value={draft.notes}
            />

            <Pressable onPress={addTask} style={styles.saveButton}>
              <CalendarCheck color={durianTheme.colors.white} size={19} />
              <Text style={styles.saveButtonText}>Lưu lịch canh tác</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Công việc sắp tới</Text>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map((task) => (
            <TaskCard key={task.id} onUpdateStatus={updateStatus} task={task} />
          ))
        ) : (
          <EmptyText text="Không có công việc chưa hoàn thành." />
        )}

        <Text style={styles.sectionTitle}>Lịch sử hoàn thành</Text>
        {completedTasks.length > 0 ? (
          completedTasks.map((task) => (
            <TaskCard key={task.id} onUpdateStatus={updateStatus} task={task} />
          ))
        ) : (
          <EmptyText text="Chưa có công việc hoàn thành." />
        )}

        <Text style={styles.syncNote}>
          {session?.user.role === "OWNER" ? "Chủ vườn" : "Kỹ sư"} đang dùng dữ
          liệu cục bộ trên thiết bị. Khi service lịch canh tác sẵn sàng, màn này
          có thể đồng bộ sang API /api/cultivation-schedules.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, warning && styles.warningValue]}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Input({
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={durianTheme.colors.muted}
        style={[styles.input, multiline && styles.textArea]}
        value={value}
      />
    </View>
  );
}

function TaskCard({
  onUpdateStatus,
  task,
}: {
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  task: CultivationTask;
}) {
  const type = taskTypes[task.type];
  const Icon = type.icon;
  const zone = zones.find((item) => item.id === task.zoneId);
  const done = task.status === "done";

  return (
    <View style={[styles.taskCard, done && styles.doneTaskCard]}>
      <View style={styles.taskTop}>
        <View style={styles.taskIcon}>
          <Icon color={durianTheme.colors.moss} size={22} />
        </View>

        <View style={styles.taskCopy}>
          <View style={styles.taskTitleRow}>
            <Text style={styles.taskTitle}>
              {type.label} • {task.materialName}
            </Text>
            {!done ? (
              <Text style={styles.daysBadge}>
                {getDaysUntilLabel(task.date)}
              </Text>
            ) : null}
          </View>

          <Text style={styles.taskMeta}>
            {task.date} lúc {task.time} • {zone?.name} • {task.cropId}
          </Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <Detail label="Liều lượng" value={task.dosage} />
        <Detail label="Phụ trách" value={task.assignee} />
        <Detail label="Cách ly" value={task.safetyInterval} />
      </View>

      <Text style={styles.note}>{task.notes}</Text>

      <View style={styles.actionRow}>
        <Text style={styles.statusBadge}>{statusLabels[task.status]}</Text>

        <View style={styles.buttons}>
          <Pressable
            disabled={done}
            onPress={() => onUpdateStatus(task.id, "in-progress")}
            style={[styles.secondaryButton, done && styles.disabledButton]}
          >
            <Text style={styles.secondaryButtonText}>Đang làm</Text>
          </Pressable>

          <Pressable
            disabled={done}
            onPress={() => onUpdateStatus(task.id, "done")}
            style={[styles.doneButton, done && styles.disabledButton]}
          >
            <Check color={durianTheme.colors.white} size={16} />
            <Text style={styles.doneButtonText}>Xong</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  buttons: { flexDirection: "row", gap: 8 },
  content: { gap: 16, padding: 18, paddingBottom: 42 },

  createButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    paddingVertical: 14,
  },
  createButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 14,
    fontWeight: "900",
  },

  detailCard: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 13,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  detailGrid: { flexDirection: "row", gap: 8 },
  detailLabel: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
  },
  detailValue: {
    color: durianTheme.colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },

  disabledButton: { opacity: 0.45 },

  doneButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  doneButtonText: {
    color: durianTheme.colors.white,
    fontSize: 11,
    fontWeight: "900",
  },
  doneTaskCard: { opacity: 0.78 },

  empty: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 18,
    padding: 18,
  },
  emptyText: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

  formCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    gap: 12,
    padding: 16,
  },
  formTitle: {
    color: durianTheme.colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },

  input: {
    backgroundColor: durianTheme.colors.canvas,
    borderColor: durianTheme.colors.mossSoft,
    borderRadius: 13,
    borderWidth: 1,
    color: durianTheme.colors.ink,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inputGroup: { gap: 6 },
  inputLabel: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
  },

  note: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 12,
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    padding: 11,
  },

  safeArea: {
    backgroundColor: durianTheme.colors.canvas,
    flex: 1,
  },

  saveButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 13,
  },
  saveButtonText: {
    color: durianTheme.colors.white,
    fontSize: 13,
    fontWeight: "900",
  },

  secondaryButton: {
    borderColor: durianTheme.colors.mossSoft,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
  },

  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 8,
  },

  segment: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: durianTheme.colors.moss,
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segmentText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: durianTheme.colors.white,
  },

  statusBadge: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 999,
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  summaryCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 16,
    flex: 1,
    gap: 3,
    padding: 14,
  },
  summaryLabel: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 9,
  },
  summaryValue: {
    color: durianTheme.colors.moss,
    fontSize: 23,
    fontWeight: "900",
  },

  syncNote: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },

  taskCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    gap: 13,
    padding: 16,
  },
  taskCopy: {
    flex: 1,
    gap: 5,
  },
  taskIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 15,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  taskMeta: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  taskTitle: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  taskTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  taskTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 11,
  },

  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },

  twoColumns: {
    flexDirection: "row",
    gap: 10,
  },

  warningValue: {
    color: durianTheme.colors.warning,
  },

  daysBadge: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 999,
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
});
