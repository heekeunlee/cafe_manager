import type { Employee, Shift, StoreSettings } from "../types";

export const sampleSettings: StoreSettings = {
  storeName: "브릭하우스 커피 성수점",
  baseWeekLabel: "2026년 5월 2주차",
};

export const sampleEmployees: Employee[] = [
  {
    id: "emp-1",
    name: "김민서",
    roleNote: "오픈 담당",
    hourlyWage: 10500,
    startDate: "2025-09-03",
    weeklyHolidayPayEnabled: true,
    status: "active",
  },
  {
    id: "emp-2",
    name: "박준호",
    roleNote: "마감 담당",
    hourlyWage: 11000,
    startDate: "2025-11-12",
    weeklyHolidayPayEnabled: true,
    status: "active",
  },
  {
    id: "emp-3",
    name: "이지아",
    roleNote: "주말 바리스타",
    hourlyWage: 12000,
    startDate: "2026-01-05",
    weeklyHolidayPayEnabled: true,
    status: "active",
  },
  {
    id: "emp-4",
    name: "최도윤",
    roleNote: "교육 중",
    hourlyWage: 10030,
    startDate: "2026-03-18",
    weeklyHolidayPayEnabled: false,
    status: "active",
  },
];

export const sampleShifts: Shift[] = [
  { id: "shift-1", employeeId: "emp-1", weekday: "mon", startTime: "08:00", endTime: "14:00", breakMinutes: 30, repeatsWeekly: true },
  { id: "shift-2", employeeId: "emp-1", weekday: "wed", startTime: "08:00", endTime: "14:00", breakMinutes: 30, repeatsWeekly: true },
  { id: "shift-3", employeeId: "emp-1", weekday: "fri", startTime: "08:00", endTime: "13:00", breakMinutes: 0, repeatsWeekly: true },
  { id: "shift-4", employeeId: "emp-2", weekday: "tue", startTime: "15:00", endTime: "22:00", breakMinutes: 60, repeatsWeekly: true },
  { id: "shift-5", employeeId: "emp-2", weekday: "thu", startTime: "15:00", endTime: "22:00", breakMinutes: 60, repeatsWeekly: true },
  { id: "shift-6", employeeId: "emp-2", weekday: "sun", startTime: "13:00", endTime: "19:00", breakMinutes: 30, repeatsWeekly: true },
  { id: "shift-7", employeeId: "emp-3", weekday: "sat", startTime: "10:00", endTime: "18:00", breakMinutes: 60, repeatsWeekly: true },
  { id: "shift-8", employeeId: "emp-3", weekday: "sun", startTime: "10:00", endTime: "18:00", breakMinutes: 60, repeatsWeekly: true },
  { id: "shift-9", employeeId: "emp-4", weekday: "mon", startTime: "14:00", endTime: "18:00", breakMinutes: 0, repeatsWeekly: true },
  { id: "shift-10", employeeId: "emp-4", weekday: "thu", startTime: "10:00", endTime: "15:00", breakMinutes: 30, repeatsWeekly: true },
];
