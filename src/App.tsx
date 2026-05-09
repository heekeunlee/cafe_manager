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
import { useMemo, useState } from "react";
import { sampleEmployees, sampleSettings, sampleShifts } from "./data/sampleData";
import { useSupabaseCafeData } from "./hooks/useSupabaseCafeData";
import type { Employee, Shift, StoreSettings, Weekday } from "./types";
import {
  calculatePayroll,
  calculateShiftHours,
  formatCurrency,
  formatHours,
  parseTimeToMinutes,
  weekdays,
} from "./utils/payroll";

type ViewId = "dashboard" | "employees" | "schedule" | "payroll" | "settings";

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
const BASE_DAY_COLUMN_WIDTH = 360;
const SHIFT_LANE_WIDTH = 188;
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
  const totalWeeklyHours = payroll.reduce((total, item) => total + item.weeklyHours, 0);
  const monthlyLaborCost = payroll.reduce((total, item) => total + item.estimatedMonthlyPay, 0);
  const weeklyHolidayEnabledCount = activeEmployees.filter((employee) => employee.weeklyHolidayPayEnabled).length;
  const nearThreshold = payroll.filter((item) => item.isNearFifteenHours);
  const weeklyWorkingEmployeeCount = payroll.filter((item) => item.weeklyHours > 0).length;
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
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-line bg-white px-4 py-5">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-moss text-white">
              <Coffee size={22} />
            </div>
            <div>
              <p className="text-sm text-stone-500">Cafe Ops</p>
              <h1 className="font-semibold">근무 급여 관리</h1>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeView === item.id ? "bg-mint text-moss" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-stone-500">{settings.baseWeekLabel}</p>
                  <h2 className="text-2xl font-bold">{settings.storeName}</h2>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill saved={saved} />
              </div>
            </div>
          </header>

          <section className="space-y-6 p-6">
            {activeView === "dashboard" && (
              <Dashboard
                payroll={payroll}
                employees={normalizedEmployees}
                totalWeeklyHours={totalWeeklyHours}
                monthlyLaborCost={monthlyLaborCost}
                weeklyHolidayEnabledCount={weeklyHolidayEnabledCount}
                nearThreshold={nearThreshold}
                weeklyWorkingEmployeeCount={weeklyWorkingEmployeeCount}
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

function StatusPill({ saved }: { saved: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-sm">
      <CheckCircle2 size={16} className={saved ? "text-moss" : "text-amber"} />
      <span>{saved ? "로컬 저장 완료" : "저장 중"}</span>
    </div>
  );
}

function Dashboard({
  payroll,
  employees,
  totalWeeklyHours,
  monthlyLaborCost,
  weeklyHolidayEnabledCount,
  nearThreshold,
  weeklyWorkingEmployeeCount,
}: {
  payroll: ReturnType<typeof calculatePayroll>;
  employees: Employee[];
  totalWeeklyHours: number;
  monthlyLaborCost: number;
  weeklyHolidayEnabledCount: number;
  nearThreshold: ReturnType<typeof calculatePayroll>;
  weeklyWorkingEmployeeCount: number;
}) {
  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <MetricCard title="이번 주 총 근무시간" value={formatHours(totalWeeklyHours)} icon={ClipboardList} />
        <MetricCard title="이번 달 예상 인건비" value={formatCurrency(monthlyLaborCost)} icon={WalletCards} />
        <MetricCard title="주휴수당 적용 직원" value={`${weeklyHolidayEnabledCount}명`} icon={Users} />
        <MetricCard title="주 15시간 근접 직원" value={`${nearThreshold.length}명`} icon={AlertTriangle} />
        <MetricCard title="이번 주 총 근무 인원" value={`${weeklyWorkingEmployeeCount}명`} icon={CalendarDays} />
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

      <DashboardPayrollTable payroll={payroll} employees={employees} />
    </>
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
}: {
  payroll: ReturnType<typeof calculatePayroll>;
  employees: Employee[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-stone-50 text-stone-600">
          <tr>
            <th className="px-4 py-3">직원명</th>
            <th className="px-4 py-3">주 근무시간</th>
            <th className="px-4 py-3">기본 주급</th>
            <th className="px-4 py-3">주휴수당</th>
            <th className="px-4 py-3">예상 월급</th>
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
                <td className="px-4 py-3">{formatHours(item.weeklyHours)}</td>
                <td className="px-4 py-3">{formatCurrency(item.baseWeeklyPay)}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(item.weeklyHolidayPay)}</td>
                <td className="px-4 py-3 font-bold">{formatCurrency(item.estimatedMonthlyPay)}</td>
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

  return (
    <Panel title="직원 관리" actionLabel="직원 추가" onAction={openAddModal}>
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

  return (
    <Panel title="근무표 관리" actionLabel="근무 추가" onAction={() => openAddModal()}>
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3">
          {weekdays.map((day) => {
            const dayShifts = shifts
              .filter((shift) => shift.weekday === day.key)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const positionedShifts = buildPositionedShifts(dayShifts);
            const dayWidth = getScheduleDayWidth(positionedShifts);
            const dayHours = dayShifts.reduce((total, shift) => total + calculateShiftHours(shift), 0);

            return (
              <section
                key={day.key}
                className="min-h-[520px] shrink-0 rounded-md border border-line bg-white"
                style={{ width: dayWidth }}
              >
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
                    const position = getShiftPositionStyle(shift, lane, laneCount);

                    return (
                      <button
                        key={shift.id}
                        onClick={() => openEditModal(shift)}
                        className="absolute overflow-hidden rounded-md border p-2 text-left shadow-sm transition hover:z-10 hover:-translate-y-0.5 hover:shadow"
                        style={{
                          ...position,
                          backgroundColor: overlapped ? "#fff4dd" : color.background,
                          borderColor: overlapped ? "#d38a28" : color.border,
                          borderLeftColor: overlapped ? "#d38a28" : color.accent,
                          borderLeftWidth: 4,
                          boxShadow: isSplit ? "0 8px 18px rgba(23, 32, 27, 0.1)" : undefined,
                        }}
                      >
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

function getScheduleDayWidth(positionedShifts: PositionedShift[]): number {
  const maxLaneCount = positionedShifts.reduce((max, item) => Math.max(max, item.laneCount), 1);
  return Math.max(BASE_DAY_COLUMN_WIDTH, maxLaneCount * SHIFT_LANE_WIDTH);
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
  const exportPayrollCsv = () => {
    const rows = [
      ["직원명", "주근무시간", "기본주급", "주휴시간", "주휴수당", "월예상급여", "주휴발생여부"],
      ...payroll.map((item) => {
        const employee = employees.find((target) => target.id === item.employeeId);
        return [
          employee?.name ?? "",
          item.weeklyHours.toFixed(2),
          Math.round(item.baseWeeklyPay).toString(),
          item.weeklyHolidayHours.toFixed(2),
          Math.round(item.weeklyHolidayPay).toString(),
          Math.round(item.estimatedMonthlyPay).toString(),
          item.qualifiesForWeeklyHolidayPay ? "발생" : "미발생",
        ];
      }),
    ];
    const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cafe-payroll.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel title="급여 계산" actionLabel="CSV 내보내기" onAction={exportPayrollCsv}>
      <PayrollTable payroll={payroll} employees={employees} showDetails />
    </Panel>
  );
}

function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
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

  return (
    <Panel title="설정">
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
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold">{title}</h3>
        {actionLabel && (
          <button onClick={onAction} className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white">
            {actionLabel}
          </button>
        )}
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
