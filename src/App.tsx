import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  Coffee,
  Pencil,
  Plus,
  LayoutDashboard,
  Settings,
  Trash2,
  X,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sampleEmployees, sampleSettings, sampleShifts } from "./data/sampleData";
import { useSupabaseCafeData } from "./hooks/useSupabaseCafeData";
import type { Employee, EmployeePayroll, Shift, StoreSettings, Weekday } from "./types";
import {
  calculatePayroll,
  calculateShiftHours,
  formatCurrency,
  formatHours,
  parseTimeToMinutes,
  weekdays,
} from "./utils/payroll";

type ViewId = "dashboard" | "employees" | "schedule" | "payroll" | "settings";
type DashboardPeriod = "weekly" | "monthly";

const APP_VERSION = __APP_VERSION__;

const navItems: Array<{ id: ViewId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "employees", label: "직원관리", icon: Users },
  { id: "schedule", label: "근무표", icon: CalendarDays },
  { id: "payroll", label: "급여계산", icon: WalletCards },
  { id: "settings", label: "설정", icon: Settings },
];

const emptyShift = (employeeId: string, weekday: Weekday): Shift => ({
  id: `shift-${Date.now()}`,
  employeeId,
  weekday,
  startTime: "09:00",
  endTime: "13:00",
  breakMinutes: 0,
  repeatsWeekly: true,
  note: "",
});

const SCHEDULE_START_MINUTES = 7 * 60;
const SCHEDULE_END_MINUTES = 23 * 60;
const SCHEDULE_RANGE_MINUTES = SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES;
const scheduleHourMarks = Array.from({ length: 9 }, (_, index) => 7 + index * 2);

const normalizeSettings = (settings: StoreSettings): StoreSettings => ({
  ...sampleSettings,
  ...settings,
});

const normalizeEmployee = (employee: Employee): Employee => ({
  ...employee,
  color: employee.color || getEmployeePastelColor(employee.id).accent,
});

function App() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("weekly");
  const [showSplash, setShowSplash] = useState(true);
  const {
    employees,
    shifts,
    settings: storedSettings,
    setEmployees,
    setShifts,
    setSettings: setStoredSettings,
    saved,
  } = useSupabaseCafeData();
  const settings = normalizeSettings(storedSettings);
  const normalizedEmployees = useMemo(() => employees.map(normalizeEmployee), [employees]);

  const activeEmployees = normalizedEmployees.filter((employee) => employee.status === "active");
  const payroll = useMemo(
    () => calculatePayroll(normalizedEmployees, shifts, settings.monthlyWeekMultiplier),
    [normalizedEmployees, shifts, settings.monthlyWeekMultiplier],
  );
  const weeklyHolidayEnabledCount = activeEmployees.filter((employee) => employee.weeklyHolidayPayEnabled).length;
  const nearThreshold = payroll.filter((item) => item.isNearFifteenHours);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);
  const updateEmployee = (id: string, patch: Partial<Employee>) => {
    setEmployees(employees.map((employee) => (employee.id === id ? normalizeEmployee({ ...employee, ...patch }) : employee)));
  };

  const saveEmployee = (employee: Employee) => {
    const normalizedEmployee = normalizeEmployee(employee);
    const exists = employees.some((target) => target.id === employee.id);
    setEmployees(
      exists
        ? employees.map((target) => (target.id === employee.id ? normalizedEmployee : target))
        : [...employees, normalizedEmployee],
    );
  };

  const deleteEmployee = (id: string) => {
    const target = normalizedEmployees.find((employee) => employee.id === id);
    if (!target) return;
    if (!window.confirm(`${target.name} 직원을 삭제할까요? 관련 근무표도 함께 삭제됩니다.`)) return;
    setEmployees(employees.filter((employee) => employee.id !== id));
    setShifts(shifts.filter((shift) => shift.employeeId !== id));
  };

  const saveShift = (shift: Shift) => {
    const exists = shifts.some((target) => target.id === shift.id);
    setShifts(exists ? shifts.map((target) => (target.id === shift.id ? shift : target)) : [...shifts, shift]);
  };

  const deleteShift = (id: string) => {
    setShifts(shifts.filter((shift) => shift.id !== id));
  };

  const resetAllData = () => {
    if (!window.confirm("모든 데이터를 샘플 상태로 초기화할까요? 현재 localStorage 데이터가 덮어써집니다.")) return;
    setEmployees(sampleEmployees);
    setShifts(sampleShifts);
    setStoredSettings(sampleSettings);
  };

  return (
    <div className="min-h-screen min-w-[1200px] bg-paper text-ink">
      {showSplash && <SplashScreen />}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-moss text-white">
                  <Coffee size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-semibold">Cafe Manager</h1>
                    <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">
                      {APP_VERSION}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{settings.baseWeekLabel}</p>
                  <h2 className="text-2xl font-bold">{settings.storeName}</h2>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill saved={saved} />
              </div>
            </div>
          </div>
          <nav className="no-print border-t border-line px-6">
            <div className="flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                      activeView === item.id
                        ? "border-moss text-moss"
                        : "border-transparent text-stone-600 hover:border-stone-200 hover:text-ink"
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </header>

        <main className="flex min-w-0 flex-1 flex-col">
          <section className="space-y-6 p-6">
            {activeView === "dashboard" && (
              <Dashboard
                payroll={payroll}
                employees={normalizedEmployees}
                weeklyHolidayEnabledCount={weeklyHolidayEnabledCount}
                nearThreshold={nearThreshold}
                period={dashboardPeriod}
                onPeriodChange={setDashboardPeriod}
                monthlyWeekMultiplier={settings.monthlyWeekMultiplier}
              />
            )}
            {activeView === "employees" && (
              <EmployeesView
                employees={normalizedEmployees}
                defaultHourlyWage={settings.defaultHourlyWage}
                onSave={saveEmployee}
                onDelete={deleteEmployee}
                onQuickUpdate={updateEmployee}
              />
            )}
            {activeView === "schedule" && (
              <ScheduleView
                employees={activeEmployees}
                shifts={shifts}
                onSaveShift={saveShift}
                onDeleteShift={deleteShift}
              />
            )}
            {activeView === "payroll" && <PayrollView payroll={payroll} employees={normalizedEmployees} />}
            {activeView === "settings" && (
              <SettingsView settings={settings} onSave={setStoredSettings} onReset={resetAllData} />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white">
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="splash-logo grid h-32 w-32 place-items-center rounded-[2rem] bg-moss text-white shadow-[0_24px_55px_rgba(79,141,97,0.24)]">
          <Coffee size={68} strokeWidth={1.75} />
        </div>
        <h1 className="splash-title text-4xl font-black tracking-tight text-ink sm:text-5xl">Cafe Manager</h1>
      </div>
    </div>
  );
}

function StatusPill({ saved }: { saved: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm">
      <CheckCircle2 size={16} className={saved ? "text-moss" : "text-amber"} />
      <span>{saved ? "로컬 저장 완료" : "저장 중"}</span>
    </div>
  );
}

type ExportAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

function exportRowsAsCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((value) => escapeCsvValue(String(value))).join(",")).join("\n");
  downloadTextFile(filename, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function saveCurrentViewAsPdf() {
  window.print();
}

function Dashboard({
  payroll,
  employees,
  weeklyHolidayEnabledCount,
  nearThreshold,
  period,
  onPeriodChange,
  monthlyWeekMultiplier,
}: {
  payroll: EmployeePayroll[];
  employees: Employee[];
  weeklyHolidayEnabledCount: number;
  nearThreshold: EmployeePayroll[];
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  monthlyWeekMultiplier: number;
}) {
  const periodLabel = period === "weekly" ? "주간" : "월간";
  const scale = period === "weekly" ? 1 : monthlyWeekMultiplier;
  const periodPayroll = payroll.map((item) => ({
    ...item,
    displayHours: item.weeklyHours * scale,
    displayBasePay: item.baseWeeklyPay * scale,
    displayHolidayPay: item.weeklyHolidayPay * scale,
    displayTotalPay: item.weeklyTotalPay * scale,
  }));
  const totalPeriodHours = periodPayroll.reduce((total, item) => total + item.displayHours, 0);
  const totalPeriodLaborCost = periodPayroll.reduce((total, item) => total + item.displayTotalPay, 0);
  const workingEmployeeCount = periodPayroll.filter((item) => item.displayHours > 0).length;
  const exportDashboardCsv = () => {
    exportRowsAsCsv(
      "dashboard-summary.csv",
      buildDashboardRows({
        period,
        payroll: periodPayroll,
        employees,
        totalHours: totalPeriodHours,
        totalLaborCost: totalPeriodLaborCost,
        weeklyHolidayEnabledCount,
        nearThreshold,
        workingEmployeeCount,
      }),
    );
  };

  return (
    <Panel
      title="대시보드"
      actions={[
        { label: "CSV 내려받기", onClick: exportDashboardCsv, variant: "secondary" },
        { label: "PDF 저장", onClick: saveCurrentViewAsPdf, variant: "secondary" },
      ]}
    >
      <div className="rounded-xl border border-moss/20 bg-gradient-to-r from-mint/25 via-white to-stone-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss/80">Dashboard Period</p>
            <h4 className="mt-1 text-base font-bold text-ink">주간 / 월간 보기</h4>
            <p className="mt-1 text-sm text-stone-600">
              {period === "weekly" ? "주간 기준으로 현재 근무 현황을 보여줍니다." : "월간 환산 기준으로 대시보드를 보여줍니다."}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onPeriodChange("weekly")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition ${
              period === "weekly" ? "bg-white text-moss shadow-sm" : "text-stone-600 hover:text-ink"
            }`}
          >
            <ClipboardList size={16} />
            주간
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("monthly")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition ${
              period === "monthly" ? "bg-white text-moss shadow-sm" : "text-stone-600 hover:text-ink"
            }`}
          >
            <CalendarDays size={16} />
            월간
          </button>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <MetricCard title={`${periodLabel} 총 근무시간`} value={formatHours(totalPeriodHours)} icon={ClipboardList} />
        <MetricCard title={`${periodLabel} 예상 인건비`} value={formatCurrency(totalPeriodLaborCost)} icon={WalletCards} />
        <MetricCard title="주휴수당 적용 직원" value={`${weeklyHolidayEnabledCount}명`} icon={Users} />
        <MetricCard title="주 15시간 근접 직원" value={`${nearThreshold.length}명`} icon={AlertTriangle} />
        <MetricCard title={`${periodLabel} 총 근무 인원`} value={`${workingEmployeeCount}명`} icon={CalendarDays} />
      </div>

      {nearThreshold.length > 0 && (
        <div className="rounded-md border border-amber/40 bg-amber/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber" size={20} />
            <div>
              <h3 className="font-semibold">주 15시간 근접 직원</h3>
              <p className="mt-1 text-sm text-stone-700">
                {nearThreshold
                  .map((item) => employees.find((employee) => employee.id === item.employeeId)?.name)
                  .filter(Boolean)
                  .join(", ")}
                님은 주휴수당 기준에 가까워 근무 조정 시 확인이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <DashboardPayrollTable payroll={periodPayroll} employees={employees} period={period} />
    </Panel>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof ClipboardList }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-stone-500">{title}</p>
        <Icon size={19} className="text-moss" />
      </div>
      <p className="text-2xl font-bold tracking-normal">{value}</p>
    </div>
  );
}

function DashboardPayrollTable({
  payroll,
  employees,
  period,
}: {
  payroll: Array<DashboardPayrollRow>;
  employees: Employee[];
  period: DashboardPeriod;
}) {
  const periodLabel = period === "weekly" ? "주간" : "월간";
  const payUnitLabel = period === "weekly" ? "주" : "월";
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-stone-50 text-stone-600">
          <tr>
            <th className="px-4 py-3">직원명</th>
            <th className="px-4 py-3">{periodLabel} 근무시간</th>
            <th className="px-4 py-3">{payUnitLabel} 기본급</th>
            <th className="px-4 py-3">{payUnitLabel} 주휴수당</th>
            <th className="px-4 py-3">{payUnitLabel} 예상 급여</th>
            <th className="px-4 py-3">주휴수당 발생 여부</th>
            <th className="px-4 py-3">경고 상태</th>
          </tr>
        </thead>
        <tbody>
          {payroll.map((item) => {
            const employee = employees.find((target) => target.id === item.employeeId);
            const warning = getDashboardWarning(item.weeklyHours);

            return (
              <tr
                key={item.employeeId}
                className={`border-t border-line ${
                  item.qualifiesForWeeklyHolidayPay ? "bg-mint/45" : warning.tone === "empty" ? "bg-stone-50" : ""
                }`}
              >
                <td className="px-4 py-3 font-semibold">{employee?.name}</td>
                <td className="px-4 py-3">{formatHours(item.displayHours)}</td>
                <td className="px-4 py-3">{formatCurrency(item.displayBasePay)}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(item.displayHolidayPay)}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(item.displayTotalPay)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${
                      item.qualifiesForWeeklyHolidayPay ? "bg-moss text-white" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {item.qualifiesForWeeklyHolidayPay ? "발생" : "미발생"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${warning.className}`}>
                    {warning.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type DashboardPayrollRow = EmployeePayroll & {
  displayHours: number;
  displayBasePay: number;
  displayHolidayPay: number;
  displayTotalPay: number;
};

function buildDashboardRows({
  period,
  payroll,
  employees,
  totalHours,
  totalLaborCost,
  weeklyHolidayEnabledCount,
  nearThreshold,
  workingEmployeeCount,
}: {
  period: DashboardPeriod;
  payroll: DashboardPayrollRow[];
  employees: Employee[];
  totalHours: number;
  totalLaborCost: number;
  weeklyHolidayEnabledCount: number;
  nearThreshold: EmployeePayroll[];
  workingEmployeeCount: number;
}) {
  const summaryPeriodLabel = period === "weekly" ? "이번 주" : "이번 달";
  const payPeriodLabel = period === "weekly" ? "주간" : "월간";
  return [
    ["항목", "값"],
    [`${summaryPeriodLabel} 총 근무시간`, formatHours(totalHours)],
    [`${summaryPeriodLabel} 예상 인건비`, formatCurrency(totalLaborCost)],
    ["주휴수당 적용 직원", `${weeklyHolidayEnabledCount}명`],
    ["주 15시간 근접 직원", `${nearThreshold.length}명`],
    [`${summaryPeriodLabel} 총 근무 인원`, `${workingEmployeeCount}명`],
    [],
    ["직원명", `${payPeriodLabel} 근무시간`, `${payPeriodLabel} 기본급`, `${payPeriodLabel} 주휴수당`, `${payPeriodLabel} 예상 급여`, "주휴발생여부"],
    ...payroll.map((item) => {
      const employee = employees.find((target) => target.id === item.employeeId);
      return [
        employee?.name ?? "",
        item.displayHours.toFixed(2),
        Math.round(item.displayBasePay),
        Math.round(item.displayHolidayPay),
        Math.round(item.displayTotalPay),
        item.qualifiesForWeeklyHolidayPay ? "발생" : "미발생",
      ];
    }),
  ];
}

function getDashboardWarning(weeklyHours: number): { label: string; tone: "empty" | "near" | "holiday" | "normal"; className: string } {
  if (weeklyHours === 0) {
    return { label: "이번 주 근무 없음", tone: "empty", className: "bg-stone-200 text-stone-700" };
  }
  if (weeklyHours >= 12 && weeklyHours < 15) {
    return { label: "주휴 발생 근접", tone: "near", className: "bg-amber/20 text-amber" };
  }
  if (weeklyHours >= 15) {
    return { label: "주휴 발생", tone: "holiday", className: "bg-mint text-moss" };
  }
  return { label: "정상", tone: "normal", className: "bg-stone-100 text-stone-600" };
}

function EmployeesView({
  employees,
  onSave,
  onDelete,
  onQuickUpdate,
  defaultHourlyWage,
}: {
  employees: Employee[];
  defaultHourlyWage: number;
  onSave: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onQuickUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAddModal = () => {
    const id = `emp-${Date.now()}`;
    setEditingEmployee({
      id,
      name: "",
      roleNote: "",
      color: getEmployeePastelColor(id).accent,
      hourlyWage: defaultHourlyWage,
      startDate: new Date().toISOString().slice(0, 10),
      weeklyHolidayPayEnabled: true,
      status: "active",
      endDate: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingEmployee(null);
    setIsModalOpen(false);
  };

  const handleSave = (employee: Employee) => {
    onSave(employee);
    closeModal();
  };

  const exportEmployeesCsv = () => {
    exportRowsAsCsv("employees.csv", buildEmployeeRows(employees));
  };

  return (
    <Panel
      title="직원 관리"
      actionLabel="직원 추가"
      onAction={openAddModal}
      actions={[
        { label: "CSV 내려받기", onClick: exportEmployeesCsv, variant: "secondary" },
        { label: "PDF 저장", onClick: saveCurrentViewAsPdf, variant: "secondary" },
      ]}
    >
      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="min-w-[1040px] w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">색상</th>
              <th className="px-4 py-3">시급</th>
              <th className="px-4 py-3">주휴수당</th>
              <th className="px-4 py-3">입사일</th>
              <th className="px-4 py-3">퇴사일</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="font-medium">{employee.name}</div>
                  {employee.roleNote && <div className="mt-1 text-xs text-stone-500">{employee.roleNote}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full border border-line"
                      style={{ backgroundColor: getEmployeeScheduleColor(employee).accent }}
                    />
                    <span className="text-xs text-stone-500">{getEmployeeScheduleColor(employee).accent}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{employee.hourlyWage.toLocaleString("ko-KR")}원</td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={employee.weeklyHolidayPayEnabled}
                      onChange={(event) =>
                        onQuickUpdate(employee.id, { weeklyHolidayPayEnabled: event.target.checked })
                      }
                    />
                    <span>{employee.weeklyHolidayPayEnabled ? "적용" : "미적용"}</span>
                  </label>
                </td>
                <td className="px-4 py-3">{employee.startDate}</td>
                <td className="px-4 py-3">{employee.endDate || "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      employee.status === "active" ? "bg-mint text-moss" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {employee.status === "active" ? "재직" : "퇴사"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(employee)}
                      className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-moss hover:text-moss"
                    >
                      <Pencil size={14} />
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(employee.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && editingEmployee && (
        <EmployeeModal employee={editingEmployee} onClose={closeModal} onSave={handleSave} />
      )}
    </Panel>
  );
}

function EmployeeModal({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee;
  onClose: () => void;
  onSave: (employee: Employee) => void;
}) {
  const [draft, setDraft] = useState<Employee>(employee);

  const updateDraft = (patch: Partial<Employee>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...draft,
      name: draft.name.trim() || "이름 없음",
      roleNote: draft.roleNote.trim(),
      color: draft.color || getEmployeePastelColor(draft.id).accent,
      hourlyWage: Math.max(0, Number(draft.hourlyWage) || 0),
    });
  };

  return (
    <div className="fixed inset-0 z-30 overflow-auto bg-black/35 p-6">
      <div className="grid min-h-full min-w-[1200px] place-items-center">
        <form onSubmit={handleSubmit} className="w-[32rem] rounded-md bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h4 className="text-lg font-bold">{employee.name ? "직원 수정" : "직원 추가"}</h4>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-stone-100">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
          <Field label="이름">
            <input
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="직원 이름"
              required
            />
          </Field>
          <Field label="시급">
            <input
              type="number"
              min="0"
              step="10"
              value={draft.hourlyWage}
              onChange={(event) => updateDraft({ hourlyWage: Number(event.target.value) })}
            />
            <span className="text-xs text-stone-500">표시: {draft.hourlyWage.toLocaleString("ko-KR")}원</span>
          </Field>
          <Field label="근무표 색상">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={draft.color || getEmployeePastelColor(draft.id).accent}
                onChange={(event) => updateDraft({ color: event.target.value })}
                className="h-10 w-14 p-1"
              />
              <span className="text-xs text-stone-500">{draft.color || getEmployeePastelColor(draft.id).accent}</span>
            </div>
          </Field>
          <Field label="입사일">
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => updateDraft({ startDate: event.target.value })}
            />
          </Field>
          <Field label="퇴사일">
            <input
              type="date"
              value={draft.endDate ?? ""}
              onChange={(event) => updateDraft({ endDate: event.target.value })}
            />
          </Field>
          <Field label="상태">
            <select
              value={draft.status}
              onChange={(event) => updateDraft({ status: event.target.value as Employee["status"] })}
            >
              <option value="active">재직</option>
              <option value="inactive">퇴사</option>
            </select>
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.weeklyHolidayPayEnabled}
              onChange={(event) => updateDraft({ weeklyHolidayPayEnabled: event.target.checked })}
            />
            주휴수당 적용
          </label>
          <Field label="직책 또는 메모">
            <input
              value={draft.roleNote}
              onChange={(event) => updateDraft({ roleNote: event.target.value })}
              placeholder="예: 오픈 담당"
            />
          </Field>
        </div>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-semibold">
              취소
            </button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white">
              <Plus size={16} />
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScheduleView({
  employees,
  shifts,
  onSaveShift,
  onDeleteShift,
}: {
  employees: Employee[];
  shifts: Shift[];
  onSaveShift: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;
}) {
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const openAddModal = (weekday: Weekday = "mon") => {
    const firstEmployee = employees[0];
    if (!firstEmployee) return;
    setEditingShift(emptyShift(firstEmployee.id, weekday));
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
  };

  const closeModal = () => {
    setEditingShift(null);
  };

  const handleSave = (shift: Shift) => {
    onSaveShift(shift);
    closeModal();
  };

  const hasOverlap = (shift: Shift) => findOverlappingShifts(shift, shifts).length > 0;
  const exportScheduleCsv = () => {
    exportRowsAsCsv("weekly-schedule.csv", buildShiftRows(shifts, employees));
  };

  return (
    <Panel
      title="근무표 관리"
      actionLabel="근무 추가"
      onAction={() => openAddModal()}
      actions={[
        { label: "CSV 내려받기", onClick: exportScheduleCsv, variant: "secondary" },
        { label: "PDF 저장", onClick: saveCurrentViewAsPdf, variant: "secondary" },
      ]}
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[1080px] grid-cols-7 gap-3">
          {weekdays.map((day) => {
            const dayShifts = shifts
              .filter((shift) => shift.weekday === day.key)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const positionedShifts = buildPositionedShifts(dayShifts);
            const dayHours = dayShifts.reduce((total, shift) => total + calculateShiftHours(shift), 0);

            return (
              <section key={day.key} className="min-h-[520px] rounded-md border border-line bg-white">
                <div className="border-b border-line bg-stone-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">{day.label}</h4>
                      <p className="mt-1 text-xs text-stone-500">
                        {dayShifts.length}건 · {formatHours(dayHours)}
                      </p>
                    </div>
                    <button
                      onClick={() => openAddModal(day.key)}
                      className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-moss hover:border-moss"
                      aria-label={`${day.label} 근무 추가`}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
                <div className="relative h-[680px] overflow-hidden p-2">
                  {scheduleHourMarks.map((hour) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute left-2 right-2 border-t border-stone-100"
                      style={{ top: `${((hour * 60 - SCHEDULE_START_MINUTES) / SCHEDULE_RANGE_MINUTES) * 100}%` }}
                    >
                      <span className="absolute -top-2 bg-white pr-1 text-[10px] text-stone-400">{`${hour}:00`}</span>
                    </div>
                  ))}
                  {dayShifts.length === 0 && (
                    <div className="absolute inset-x-2 top-16 rounded-md border border-dashed border-line px-3 py-8 text-center text-xs text-stone-500">
                      근무 없음
                    </div>
                  )}
                  {positionedShifts.map(({ shift, lane, laneCount }) => {
                    const employee = employees.find((target) => target.id === shift.employeeId);
                    const overlapped = hasOverlap(shift);
                    const color = getEmployeeScheduleColor(employee, shift.employeeId);
                    const isSplit = laneCount > 1;
                    const isCompact = isSplit || overlapped;
                    const isUltraCompact = laneCount >= 3;
                    const position = getShiftPositionStyle(shift, lane, laneCount);
                    const compactHours = formatCompactHours(calculateShiftHours(shift));
                    const compactNote = shift.note?.trim();

                    return (
                      <button
                        key={shift.id}
                        onClick={() => openEditModal(shift)}
                        title={`${employee?.name ?? "직원 없음"} ${shift.startTime}-${shift.endTime}, 휴게 ${shift.breakMinutes}분, 실근무 ${formatHours(calculateShiftHours(shift))}`}
                        className={`absolute overflow-hidden rounded-md border text-left shadow-sm transition hover:z-10 hover:-translate-y-0.5 hover:shadow ${
                          isCompact ? "p-1.5" : "p-2"
                        }`}
                        style={{
                          ...position,
                          backgroundColor: overlapped ? "#fff4dd" : color.background,
                          borderColor: overlapped ? "#d38a28" : color.border,
                          borderLeftColor: overlapped ? "#d38a28" : color.accent,
                          borderLeftWidth: 4,
                          boxShadow: isSplit ? "0 8px 18px rgba(23, 32, 27, 0.1)" : undefined,
                        }}
                      >
                        {isCompact ? (
                          <div className={`flex h-full min-h-0 flex-col overflow-hidden ${isUltraCompact ? "gap-0" : "gap-0.5"}`}>
                            <div className={`flex items-start ${isUltraCompact ? "gap-1" : "gap-1.5"}`}>
                              <span
                                className={`mt-0.5 shrink-0 rounded-full ${isUltraCompact ? "h-2 w-2" : "h-2.5 w-2.5"}`}
                                style={{ backgroundColor: color.accent }}
                              />
                              <div className="min-w-0 flex-1">
                                <strong
                                  className={`block truncate font-bold leading-tight text-ink ${
                                    isUltraCompact ? "text-[9px]" : "text-[11px]"
                                  }`}
                                >
                                  {employee?.name ?? "직원 없음"}
                                </strong>
                                <p className={`truncate leading-tight text-stone-600 ${isUltraCompact ? "text-[8px]" : "text-[10px]"}`}>
                                  {shift.startTime}-{shift.endTime}
                                </p>
                              </div>
                              {overlapped && <AlertTriangle size={isUltraCompact ? 10 : 12} className="mt-0.5 shrink-0 text-amber" />}
                            </div>
                            <div className={`space-y-0.5 leading-tight text-stone-700 ${isUltraCompact ? "text-[8px]" : "text-[10px]"}`}>
                              <p className="truncate">
                                실근무 <span className="font-semibold text-ink">{compactHours}</span>
                              </p>
                              <p className="truncate">
                                메모{" "}
                                <span className={`font-medium ${compactNote ? "text-ink" : "text-stone-400"}`}>
                                  {compactNote || "-"}
                                </span>
                              </p>
                              {!isUltraCompact && (
                                <p className="truncate">
                                  휴게 {shift.breakMinutes}분
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.accent }} />
                                <strong className="truncate text-sm">{employee?.name ?? "직원 없음"}</strong>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {overlapped && <AlertTriangle size={16} className="text-amber" />}
                              </div>
                            </div>
                            <div className="mt-1 space-y-0.5 text-xs text-stone-600">
                              <p className="flex items-center gap-1 whitespace-nowrap">
                                <Clock size={13} />
                                {shift.startTime} - {shift.endTime}
                              </p>
                              <p className="whitespace-nowrap">휴게 {shift.breakMinutes}분</p>
                              <p className="whitespace-nowrap font-semibold text-ink">실근무 {formatHours(calculateShiftHours(shift))}</p>
                            </div>
                            {shift.note && (
                              <p className="mt-2 rounded bg-white/70 px-2 py-1 text-xs text-stone-700">{shift.note}</p>
                            )}
                            {overlapped && <p className="mt-2 text-xs font-medium text-amber">시간 겹침</p>}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {editingShift && (
        <ShiftModal
          employees={employees}
          shift={editingShift}
          shifts={shifts}
          onClose={closeModal}
          onDelete={onDeleteShift}
          onSave={handleSave}
        />
      )}
    </Panel>
  );
}

function ShiftModal({
  employees,
  shift,
  shifts,
  onClose,
  onDelete,
  onSave,
}: {
  employees: Employee[];
  shift: Shift;
  shifts: Shift[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (shift: Shift) => void;
}) {
  const [draft, setDraft] = useState<Shift>(shift);
  const overlappedShifts = findOverlappingShifts(draft, shifts);
  const isExisting = shifts.some((target) => target.id === shift.id);

  const updateDraft = (patch: Partial<Shift>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...draft,
      breakMinutes: Math.max(0, Number(draft.breakMinutes) || 0),
      note: (draft.note ?? "").trim(),
    });
  };

  const handleDelete = () => {
    if (!window.confirm("이 근무를 삭제할까요?")) return;
    onDelete(draft.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 overflow-auto bg-black/35 p-6">
      <div className="grid min-h-full min-w-[1200px] place-items-center">
        <form onSubmit={handleSubmit} className="w-[36rem] rounded-md bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h4 className="text-lg font-bold">{isExisting ? "근무 수정" : "근무 추가"}</h4>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-stone-100">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
          <Field label="직원 선택">
            <select value={draft.employeeId} onChange={(event) => updateDraft({ employeeId: event.target.value })}>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="요일 선택">
            <select value={draft.weekday} onChange={(event) => updateDraft({ weekday: event.target.value as Weekday })}>
              {weekdays.map((day) => (
                <option key={day.key} value={day.key}>
                  {day.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="시작시간">
            <input type="time" value={draft.startTime} onChange={(event) => updateDraft({ startTime: event.target.value })} />
          </Field>
          <Field label="종료시간">
            <input type="time" value={draft.endTime} onChange={(event) => updateDraft({ endTime: event.target.value })} />
          </Field>
          <Field label="휴게시간">
            <input
              type="number"
              min="0"
              step="10"
              value={draft.breakMinutes}
              onChange={(event) => updateDraft({ breakMinutes: Number(event.target.value) })}
            />
            <span className="text-xs text-stone-500">분 단위로 입력</span>
          </Field>
          <div className="rounded-md border border-line bg-paper p-3">
            <p className="text-xs text-stone-500">실근무시간</p>
            <p className="mt-1 text-xl font-bold">{formatHours(calculateShiftHours(draft))}</p>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.repeatsWeekly}
              onChange={(event) => updateDraft({ repeatsWeekly: event.target.checked })}
            />
            반복 근무 패턴
          </label>
          <Field label="대타/결근 메모">
            <input
              value={draft.note ?? ""}
              onChange={(event) => updateDraft({ note: event.target.value })}
              placeholder="예: 대타, 결근, 마감 지원"
            />
          </Field>
          {overlappedShifts.length > 0 && (
            <div className="col-span-2 rounded-md border border-amber/40 bg-amber/10 p-3 text-sm text-stone-800">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber" />
                <div>
                  <p className="font-semibold">같은 직원의 근무 시간이 겹칩니다.</p>
                  <p className="mt-1 text-xs text-stone-600">
                    중복 입력은 저장할 수 있지만 급여 계산 전 확인이 필요합니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-line px-5 py-4">
            <div>
              {isExisting && (
                <button type="button" onClick={handleDelete} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                  삭제
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm font-semibold">
                취소
              </button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white">
                <Plus size={16} />
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function findOverlappingShifts(target: Shift, shifts: Shift[]): Shift[] {
  return shifts.filter(
    (shift) =>
      shift.id !== target.id &&
      shift.employeeId === target.employeeId &&
      shift.weekday === target.weekday &&
      shiftRangesOverlap(target, shift),
  );
}

function shiftRangesOverlap(a: Shift, b: Shift): boolean {
  const [aStart, aEnd] = normalizedShiftRange(a);
  const [bStart, bEnd] = normalizedShiftRange(b);
  return aStart < bEnd && bStart < aEnd;
}

function normalizedShiftRange(shift: Shift): [number, number] {
  const start = parseTimeToMinutes(shift.startTime);
  let end = parseTimeToMinutes(shift.endTime);
  if (end <= start) end += 24 * 60;
  return [start, end];
}

function formatShortTime(time: string): string {
  return time.replace(":00", "");
}

function formatCompactHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

const employeePastelColors = [
  { background: "#e8f3ea", border: "#9bc6a7", accent: "#4f8d61" },
  { background: "#fff1d8", border: "#e3ba72", accent: "#b77a1f" },
  { background: "#e8efff", border: "#a9bce8", accent: "#6179bd" },
  { background: "#fde8ee", border: "#e7a7b7", accent: "#ba6479" },
  { background: "#e7f5f4", border: "#94c9c5", accent: "#4e918b" },
  { background: "#f1ecff", border: "#bcaee5", accent: "#7d68bf" },
  { background: "#f4f0df", border: "#cfc28a", accent: "#8c7b35" },
  { background: "#e9f6df", border: "#abd084", accent: "#66973f" },
];

function getEmployeePastelColor(employeeId: string) {
  const hash = Array.from(employeeId).reduce((total, char) => total + char.charCodeAt(0), 0);
  return employeePastelColors[hash % employeePastelColors.length];
}

function getEmployeeScheduleColor(employee?: Employee, fallbackId = "employee") {
  if (!employee?.color || !/^#[0-9a-fA-F]{6}$/.test(employee.color)) {
    return getEmployeePastelColor(fallbackId);
  }

  return {
    accent: employee.color,
    border: mixHexColors(employee.color, "#ffffff", 0.45),
    background: mixHexColors(employee.color, "#ffffff", 0.82),
  };
}

function mixHexColors(base: string, mix: string, amount: number): string {
  const baseRgb = hexToRgb(base);
  const mixRgb = hexToRgb(mix);
  const mixed = baseRgb.map((value, index) => Math.round(value * (1 - amount) + mixRgb[index] * amount));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(value: string): [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

interface PositionedShift {
  shift: Shift;
  lane: number;
  laneCount: number;
}

function buildPositionedShifts(dayShifts: Shift[]): PositionedShift[] {
  const sorted = [...dayShifts].sort((a, b) => {
    const [aStart] = normalizedShiftRange(a);
    const [bStart] = normalizedShiftRange(b);
    return aStart - bStart;
  });
  const positioned: PositionedShift[] = [];
  let index = 0;

  while (index < sorted.length) {
    const cluster: Shift[] = [sorted[index]];
    let [, clusterEnd] = normalizedShiftRange(sorted[index]);
    index += 1;

    while (index < sorted.length) {
      const [nextStart, nextEnd] = normalizedShiftRange(sorted[index]);
      if (nextStart >= clusterEnd) break;
      cluster.push(sorted[index]);
      clusterEnd = Math.max(clusterEnd, nextEnd);
      index += 1;
    }

    const laneEnds: number[] = [];
    const clusterLayout = cluster.map((shift) => {
      const [start, end] = normalizedShiftRange(shift);
      const lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      const assignedLane = lane === -1 ? laneEnds.length : lane;
      laneEnds[assignedLane] = end;
      return { shift, lane: assignedLane };
    });
    const laneCount = Math.max(1, laneEnds.length);
    positioned.push(...clusterLayout.map((item) => ({ ...item, laneCount })));
  }

  return positioned;
}

function getShiftPositionStyle(shift: Shift, lane: number, laneCount: number): React.CSSProperties {
  const [rawStart, rawEnd] = normalizedShiftRange(shift);
  const start = Math.max(rawStart, SCHEDULE_START_MINUTES);
  const end = Math.min(rawEnd, SCHEDULE_END_MINUTES);
  const top = ((start - SCHEDULE_START_MINUTES) / SCHEDULE_RANGE_MINUTES) * 100;
  const height = Math.max(((end - start) / SCHEDULE_RANGE_MINUTES) * 100, 6);
  const columnWidth = 100 / laneCount;

  return {
    top: `${top}%`,
    height: `${height}%`,
    left: `calc(${lane * columnWidth}% + 0.5rem)`,
    width: `calc(${columnWidth}% - 0.75rem)`,
  };
}

function PayrollView({ payroll, employees }: { payroll: ReturnType<typeof calculatePayroll>; employees: Employee[] }) {
  const monthlySettlementRows = buildMonthlySettlementRows(payroll, employees);
  const monthlySettlementTotal = payroll.reduce((total, item) => total + item.estimatedMonthlyPay, 0);
  const exportPayrollCsv = () => {
    exportRowsAsCsv("cafe-payroll.csv", buildPayrollRows(payroll, employees));
  };
  const exportMonthlySettlementCsv = () => {
    exportRowsAsCsv("monthly-settlement.csv", buildMonthlySettlementCsvRows(monthlySettlementRows));
  };

  return (
    <Panel
      title="급여 계산"
      actions={[
        { label: "CSV 내려받기", onClick: exportPayrollCsv, variant: "secondary" },
        { label: "월말 정산 CSV", onClick: exportMonthlySettlementCsv, variant: "secondary" },
        { label: "PDF 저장", onClick: saveCurrentViewAsPdf, variant: "secondary" },
      ]}
    >
      <div className="rounded-md border border-moss/20 bg-mint/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-bold text-ink">월말 정산 요약</h4>
            <p className="mt-1 text-sm text-stone-600">
              직원 또는 근무표를 수정하면 주간, 월간 정산이 즉시 다시 계산됩니다. 월말 입금 예정액은 아래 정산표를 기준으로 확인하면 됩니다.
            </p>
          </div>
          <div className="rounded-md border border-line bg-white px-4 py-3 text-right">
            <p className="text-xs text-stone-500">이번 달 입금 총액</p>
            <p className="mt-1 text-xl font-bold text-moss">{formatCurrency(monthlySettlementTotal)}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-line bg-white">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3">직원명</th>
              <th className="px-4 py-3">주간 근무시간</th>
              <th className="px-4 py-3">주간 급여</th>
              <th className="px-4 py-3">월 예상 급여</th>
              <th className="px-4 py-3">입금 예정액</th>
              <th className="px-4 py-3">정산 상태</th>
            </tr>
          </thead>
          <tbody>
            {monthlySettlementRows.map((item) => (
              <tr key={item.employeeId} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{item.employeeName}</td>
                <td className="px-4 py-3">{formatHours(item.weeklyHours)}</td>
                <td className="px-4 py-3">{formatCurrency(item.weeklyTotalPay)}</td>
                <td className="px-4 py-3">{formatCurrency(item.estimatedMonthlyPay)}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(item.depositAmount)}</td>
                <td className="px-4 py-3">
                  <span className="rounded px-2 py-1 text-xs font-semibold bg-mint text-moss">월말 정산 대상</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PayrollTable payroll={payroll} employees={employees} showDetails />
    </Panel>
  );
}

function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function buildPayrollRows(payroll: ReturnType<typeof calculatePayroll>, employees: Employee[]) {
  return [
    ["직원명", "주근무시간", "기본주급", "주휴시간", "주휴수당", "월예상급여", "주휴발생여부"],
    ...payroll.map((item) => {
      const employee = employees.find((target) => target.id === item.employeeId);
      return [
        employee?.name ?? "",
        item.weeklyHours.toFixed(2),
        Math.round(item.baseWeeklyPay),
        item.weeklyHolidayHours.toFixed(2),
        Math.round(item.weeklyHolidayPay),
        Math.round(item.estimatedMonthlyPay),
        item.qualifiesForWeeklyHolidayPay ? "발생" : "미발생",
      ];
    }),
  ];
}

function buildMonthlySettlementRows(payroll: ReturnType<typeof calculatePayroll>, employees: Employee[]) {
  return payroll.map((item) => {
    const employee = employees.find((target) => target.id === item.employeeId);
    return {
      employeeId: item.employeeId,
      employeeName: employee?.name ?? "",
      weeklyHours: item.weeklyHours,
      weeklyTotalPay: item.weeklyTotalPay,
      estimatedMonthlyPay: item.estimatedMonthlyPay,
      depositAmount: Math.round(item.estimatedMonthlyPay),
    };
  });
}

function buildMonthlySettlementCsvRows(
  rows: Array<{
    employeeId: string;
    employeeName: string;
    weeklyHours: number;
    weeklyTotalPay: number;
    estimatedMonthlyPay: number;
    depositAmount: number;
  }>,
) {
  return [
    ["직원명", "주간근무시간", "주간총급여", "월예상급여", "입금예정액"],
    ...rows.map((row) => [
      row.employeeName,
      row.weeklyHours.toFixed(2),
      Math.round(row.weeklyTotalPay),
      Math.round(row.estimatedMonthlyPay),
      row.depositAmount,
    ]),
  ];
}

function buildEmployeeRows(employees: Employee[]) {
  return [
    ["이름", "직책/메모", "시급", "주휴수당", "입사일", "퇴사일", "상태", "색상"],
    ...employees.map((employee) => [
      employee.name,
      employee.roleNote,
      employee.hourlyWage,
      employee.weeklyHolidayPayEnabled ? "적용" : "미적용",
      employee.startDate,
      employee.endDate || "",
      employee.status === "active" ? "재직" : "퇴사",
      employee.color ?? "",
    ]),
  ];
}

function buildShiftRows(shifts: Shift[], employees: Employee[]) {
  return [
    ["요일", "직원명", "시작시간", "종료시간", "휴게시간(분)", "실근무시간", "반복근무", "메모"],
    ...shifts
      .slice()
      .sort((a, b) => `${a.weekday}-${a.startTime}`.localeCompare(`${b.weekday}-${b.startTime}`))
      .map((shift) => {
        const employee = employees.find((target) => target.id === shift.employeeId);
        const weekday = weekdays.find((day) => day.key === shift.weekday);
        return [
          weekday?.label ?? shift.weekday,
          employee?.name ?? "직원 없음",
          shift.startTime,
          shift.endTime,
          shift.breakMinutes,
          calculateShiftHours(shift).toFixed(2),
          shift.repeatsWeekly ? "예" : "아니오",
          shift.note ?? "",
        ];
      }),
  ];
}

function buildSettingsRows(settings: StoreSettings) {
  return [
    ["항목", "값"],
    ["매장명", settings.storeName],
    ["기준 주차", settings.baseWeekLabel],
    ["기준 시급", settings.defaultHourlyWage],
    ["월 환산 계수", settings.monthlyWeekMultiplier],
    ["주휴수당 계산 방식", settings.weeklyHolidayCalculation],
  ];
}

function PayrollTable({
  payroll,
  employees,
  showDetails = false,
}: {
  payroll: ReturnType<typeof calculatePayroll>;
  employees: Employee[];
  showDetails?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="bg-stone-50 text-stone-600">
          <tr>
            <th className="px-4 py-3">직원</th>
            <th className="px-4 py-3">주 근무시간</th>
            {showDetails && <th className="px-4 py-3">기본급</th>}
            {showDetails && <th className="px-4 py-3">주휴시간</th>}
            <th className="px-4 py-3">주휴수당</th>
            <th className="px-4 py-3">월 예상 급여</th>
            <th className="px-4 py-3">상태</th>
          </tr>
        </thead>
        <tbody>
          {payroll.map((item) => {
            const employee = employees.find((target) => target.id === item.employeeId);
            return (
              <tr key={item.employeeId} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{employee?.name}</td>
                <td className="px-4 py-3">{formatHours(item.weeklyHours)}</td>
                {showDetails && <td className="px-4 py-3">{formatCurrency(item.baseWeeklyPay)}</td>}
                {showDetails && <td className="px-4 py-3">{formatHours(item.weeklyHolidayHours)}</td>}
                <td className="px-4 py-3">{formatCurrency(item.weeklyHolidayPay)}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(item.estimatedMonthlyPay)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      item.qualifiesForWeeklyHolidayPay ? "bg-mint text-moss" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {item.qualifiesForWeeklyHolidayPay ? "주휴 발생" : "기본 계산"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SettingsView({
  settings,
  onSave,
  onReset,
}: {
  settings: StoreSettings;
  onSave: (settings: StoreSettings) => void;
  onReset: () => void;
}) {
  const updateSettings = (patch: Partial<StoreSettings>) => {
    onSave({ ...settings, ...patch });
  };

  const exportSettingsCsv = () => {
    exportRowsAsCsv("store-settings.csv", buildSettingsRows(settings));
  };

  return (
    <Panel
      title="설정"
      actions={[
        { label: "CSV 내려받기", onClick: exportSettingsCsv, variant: "secondary" },
        { label: "PDF 저장", onClick: saveCurrentViewAsPdf, variant: "secondary" },
      ]}
    >
      <div className="grid grid-cols-2 gap-4 rounded-md border border-line bg-white p-4">
        <Field label="매장명">
          <input value={settings.storeName} onChange={(event) => updateSettings({ storeName: event.target.value })} />
        </Field>
        <Field label="기준 주차">
          <input value={settings.baseWeekLabel} onChange={(event) => updateSettings({ baseWeekLabel: event.target.value })} />
        </Field>
        <Field label="기준 시급">
          <input
            type="number"
            min="0"
            step="10"
            value={settings.defaultHourlyWage}
            onChange={(event) => updateSettings({ defaultHourlyWage: Number(event.target.value) })}
          />
          <span className="text-xs text-stone-500">{settings.defaultHourlyWage.toLocaleString("ko-KR")}원</span>
        </Field>
        <Field label="월 환산 계수">
          <input
            type="number"
            min="0"
            step="0.001"
            value={settings.monthlyWeekMultiplier}
            onChange={(event) => updateSettings({ monthlyWeekMultiplier: Number(event.target.value) })}
          />
        </Field>
        <Field label="주휴수당 계산 방식">
          <input
            value={settings.weeklyHolidayCalculation}
            onChange={(event) => updateSettings({ weeklyHolidayCalculation: event.target.value })}
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            데이터 초기화
          </button>
        </div>
      </div>
      <div className="rounded-md border border-line bg-white p-4 text-sm text-stone-700">
        현재 MVP는 로그인과 서버 DB 없이 브라우저 localStorage에 저장됩니다. 이후 Supabase 또는 Firebase 도입 시
        직원, 근무표, 매장 설정 저장소를 API 어댑터로 교체하는 구조로 확장할 수 있습니다.
      </div>
    </Panel>
  );
}

function Panel({
  title,
  actionLabel,
  onAction,
  actions = [],
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actions?: ExportAction[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="no-print flex flex-wrap items-center justify-end gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                action.variant === "primary"
                  ? "bg-moss text-white"
                  : "border border-line bg-white text-stone-700 hover:border-moss hover:text-moss"
              }`}
            >
              {action.label}
            </button>
          ))}
          {actionLabel && (
            <button onClick={onAction} className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white">
              {actionLabel}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-stone-600">{label}</span>
      {children}
    </label>
  );
}

export default App;
