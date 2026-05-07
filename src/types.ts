export type EmployeeStatus = "active" | "inactive";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Employee {
  id: string;
  name: string;
  roleNote: string;
  hourlyWage: number;
  startDate: string;
  weeklyHolidayPayEnabled: boolean;
  status: EmployeeStatus;
}

export interface Shift {
  id: string;
  employeeId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  repeatsWeekly: boolean;
}

export interface StoreSettings {
  storeName: string;
  baseWeekLabel: string;
}

export interface EmployeePayroll {
  employeeId: string;
  weeklyHours: number;
  baseWeeklyPay: number;
  weeklyHolidayPay: number;
  weeklyTotalPay: number;
  estimatedMonthlyPay: number;
  qualifiesForWeeklyHolidayPay: boolean;
  isNearFifteenHours: boolean;
}
