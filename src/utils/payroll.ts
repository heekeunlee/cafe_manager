import type { Employee, EmployeePayroll, Shift, Weekday } from "../types";

export const weekdays: Array<{ key: Weekday; label: string; shortLabel: string }> = [
  { key: "mon", label: "월요일", shortLabel: "월" },
  { key: "tue", label: "화요일", shortLabel: "화" },
  { key: "wed", label: "수요일", shortLabel: "수" },
  { key: "thu", label: "목요일", shortLabel: "목" },
  { key: "fri", label: "금요일", shortLabel: "금" },
  { key: "sat", label: "토요일", shortLabel: "토" },
  { key: "sun", label: "일요일", shortLabel: "일" },
];

const MONTHLY_WEEK_MULTIPLIER = 4.345;

export function parseTimeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return hour * 60 + minute;
}

export function calculateShiftHours(shift: Shift): number {
  const start = parseTimeToMinutes(shift.startTime);
  let end = parseTimeToMinutes(shift.endTime);
  if (end <= start) end += 24 * 60;
  const workedMinutes = Math.max(0, end - start - shift.breakMinutes);
  return workedMinutes / 60;
}

export function calculateWeeklyHours(employeeId: string, shifts: Shift[]): number {
  return shifts
    .filter((shift) => shift.employeeId === employeeId)
    .reduce((total, shift) => total + calculateShiftHours(shift), 0);
}

export function calculateWeeklyHolidayPay(employee: Employee, weeklyHours: number): number {
  if (!employee.weeklyHolidayPayEnabled || weeklyHours < 15) return 0;
  const paidHours = Math.min((weeklyHours / 40) * 8, 8);
  return paidHours * employee.hourlyWage;
}

export function calculateEmployeePayroll(employee: Employee, shifts: Shift[]): EmployeePayroll {
  const weeklyHours = calculateWeeklyHours(employee.id, shifts);
  const baseWeeklyPay = weeklyHours * employee.hourlyWage;
  const weeklyHolidayPay = calculateWeeklyHolidayPay(employee, weeklyHours);
  const weeklyTotalPay = baseWeeklyPay + weeklyHolidayPay;

  return {
    employeeId: employee.id,
    weeklyHours,
    baseWeeklyPay,
    weeklyHolidayPay,
    weeklyTotalPay,
    estimatedMonthlyPay: weeklyTotalPay * MONTHLY_WEEK_MULTIPLIER,
    qualifiesForWeeklyHolidayPay: weeklyHolidayPay > 0,
    isNearFifteenHours: weeklyHours >= 12 && weeklyHours < 15,
  };
}

export function calculatePayroll(employees: Employee[], shifts: Shift[]): EmployeePayroll[] {
  return employees
    .filter((employee) => employee.status === "active")
    .map((employee) => calculateEmployeePayroll(employee, shifts));
}

export function summarizeDailyHeadcount(shifts: Shift[]): Record<Weekday, number> {
  return weekdays.reduce(
    (summary, day) => {
      const employeeIds = new Set(
        shifts.filter((shift) => shift.weekday === day.key).map((shift) => shift.employeeId),
      );
      summary[day.key] = employeeIds.size;
      return summary;
    },
    {} as Record<Weekday, number>,
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatHours(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}시간`;
}
