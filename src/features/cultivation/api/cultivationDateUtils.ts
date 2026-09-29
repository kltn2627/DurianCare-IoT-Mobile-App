import type { ActivityStatus, CultivationActivity } from "./cultivationTypes";
import { isClosedActivityStatus } from "./cultivationLabels";

const DAY_MS = 86_400_000;

export type WeekDay = {
  date: Date;
  dateLabel: string;
  isToday: boolean;
  key: string;
  weekday: string;
};

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toActivityDateKey(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toLocalDateKey(date);
}

export function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekDays(weekOffset = 0): WeekDay[] {
  const today = startOfLocalDay(new Date());
  const monday = new Date(today);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      date,
      dateLabel: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }).format(date),
      isToday: date.getTime() === today.getTime(),
      key: toLocalDateKey(date),
      weekday: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date),
    };
  });
}

export function getWeekRangeLabel(days: WeekDay[]) {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return "Tuần đang chọn";
  return `${first.dateLabel} - ${last.dateLabel}`;
}

export function getActivityEffectiveStatus(activity: CultivationActivity): ActivityStatus {
  if (activity.status === "OVERDUE" || isActivityOverdue(activity)) return "OVERDUE";
  return activity.status;
}

export function isActivityOverdue(activity: CultivationActivity) {
  if (isClosedActivityStatus(activity.status)) return false;
  const scheduledAt = new Date(activity.scheduledStartAt);
  return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() < Date.now();
}

export function getDaysUntil(value?: string | null) {
  if (!value) return 0;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.round((startOfLocalDay(target).getTime() - startOfLocalDay(new Date()).getTime()) / DAY_MS);
}

export function getDueLabel(value?: string | null) {
  if (!value) return "Chưa có thời gian";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "Chưa có thời gian";

  const days = getDaysUntil(value);
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) {
    if (target.getTime() <= Date.now()) {
      const minutes = Math.ceil((Date.now() - target.getTime()) / 60_000);
      if (minutes < 60) return `Quá hạn ${Math.max(1, minutes)} phút`;
      return `Quá hạn ${Math.ceil(minutes / 60)} giờ`;
    }
    return "Hôm nay";
  }
  if (days === 1) return "Còn 1 ngày";
  return `Còn ${days} ngày`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDate(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function localDateTimeToInstant(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function instantToLocalInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
