import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coffee,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { sampleEmployees, sampleSettings, sampleShifts } from "./data/sampleData";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { Employee, Shift, Weekday } from "./types";
import {
  calculatePayroll,
  calculateShiftHours,
  formatCurrency,
  formatHours,
  summarizeDailyHeadcount,
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
});

function App() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [employees, setEmployees, employeesSaved] = useLocalStorage<Employee[]>(
    "cafe-manager-employees",
    sampleEmployees,
  );
  const [shifts, setShifts, shiftsSaved] = useLocalStorage<Shift[]>("cafe-manager-shifts", sampleShifts);
  const [settings] = useLocalStorage("cafe-manager-settings", sampleSettings);

  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const payroll = useMemo(() => calculatePayroll(employees, shifts), [employees, shifts]);
  const totalWeeklyHours = payroll.reduce((total, item) => total + item.weeklyHours, 0);
  const monthlyLaborCost = payroll.reduce((total, item) => total + item.estimatedMonthlyPay, 0);
  const weeklyHolidayCount = payroll.filter((item) => item.qualifiesForWeeklyHolidayPay).length;
  const nearThreshold = payroll.filter((item) => item.isNearFifteenHours);
  const dailyHeadcount = summarizeDailyHeadcount(shifts);
  const saved = employeesSaved && shiftsSaved;

  const updateEmployee = (id: string, patch: Partial<Employee>) => {
    setEmployees(employees.map((employee) => (employee.id === id ? { ...employee, ...patch } : employee)));
  };

  const updateShift = (id: string, patch: Partial<Shift>) => {
    setShifts(shifts.map((shift) => (shift.id === id ? { ...shift, ...patch } : shift)));
  };

  const addEmployee = () => {
    const next: Employee = {
      id: `emp-${Date.now()}`,
      name: "새 직원",
      roleNote: "메모 입력",
      hourlyWage: 10030,
      startDate: new Date().toISOString().slice(0, 10),
      weeklyHolidayPayEnabled: true,
      status: "active",
    };
    setEmployees([...employees, next]);
  };

  const addShift = (employeeId: string, weekday: Weekday) => {
    setShifts([...shifts, emptyShift(employeeId, weekday)]);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-line bg-white px-4 py-5 lg:block">
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
          <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <button className="grid h-10 w-10 place-items-center rounded-md border border-line lg:hidden">
                  <Menu size={20} />
                </button>
                <div>
                  <p className="text-sm text-stone-500">{settings.baseWeekLabel}</p>
                  <h2 className="text-xl font-bold md:text-2xl">{settings.storeName}</h2>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill saved={saved} />
                <div className="flex rounded-md border border-line bg-paper p-1 lg:hidden">
                  {navItems.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        activeView === item.id ? "bg-moss text-white" : "text-stone-600"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <section className="space-y-6 p-4 md:p-6">
            {activeView === "dashboard" && (
              <Dashboard
                payroll={payroll}
                employees={employees}
                totalWeeklyHours={totalWeeklyHours}
                monthlyLaborCost={monthlyLaborCost}
                weeklyHolidayCount={weeklyHolidayCount}
                dailyHeadcount={dailyHeadcount}
                nearThreshold={nearThreshold}
              />
            )}
            {activeView === "employees" && (
              <EmployeesView employees={employees} onAdd={addEmployee} onUpdate={updateEmployee} />
            )}
            {activeView === "schedule" && (
              <ScheduleView
                employees={activeEmployees}
                shifts={shifts}
                onAddShift={addShift}
                onUpdateShift={updateShift}
              />
            )}
            {activeView === "payroll" && <PayrollView payroll={payroll} employees={employees} />}
            {activeView === "settings" && <SettingsView />}
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
  weeklyHolidayCount,
  dailyHeadcount,
  nearThreshold,
}: {
  payroll: ReturnType<typeof calculatePayroll>;
  employees: Employee[];
  totalWeeklyHours: number;
  monthlyLaborCost: number;
  weeklyHolidayCount: number;
  dailyHeadcount: Record<Weekday, number>;
  nearThreshold: ReturnType<typeof calculatePayroll>;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="이번 주 총 근무시간" value={formatHours(totalWeeklyHours)} icon={ClipboardList} />
        <MetricCard title="이번 달 예상 인건비" value={formatCurrency(monthlyLaborCost)} icon={WalletCards} />
        <MetricCard title="주휴수당 발생 직원" value={`${weeklyHolidayCount}명`} icon={Users} />
        <MetricCard title="근무 입력 건수" value={`${payroll.length}명 정산`} icon={CalendarDays} />
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

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <PayrollTable payroll={payroll} employees={employees} />
        <div className="rounded-md border border-line bg-white p-4">
          <h3 className="mb-4 font-semibold">요일별 근무 인원</h3>
          <div className="space-y-3">
            {weekdays.map((day) => (
              <div key={day.key} className="flex items-center justify-between">
                <span className="text-sm text-stone-600">{day.label}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-28 overflow-hidden rounded bg-stone-100">
                    <div
                      className="h-full bg-moss"
                      style={{ width: `${Math.min(dailyHeadcount[day.key] * 25, 100)}%` }}
                    />
                  </div>
                  <strong className="w-8 text-right">{dailyHeadcount[day.key]}명</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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

function EmployeesView({
  employees,
  onAdd,
  onUpdate,
}: {
  employees: Employee[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  return (
    <Panel title="직원 관리" actionLabel="직원 추가" onAction={onAdd}>
      <div className="grid gap-4 xl:grid-cols-2">
        {employees.map((employee) => (
          <div key={employee.id} className="rounded-md border border-line bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="이름">
                <input value={employee.name} onChange={(event) => onUpdate(employee.id, { name: event.target.value })} />
              </Field>
              <Field label="직책 또는 메모">
                <input
                  value={employee.roleNote}
                  onChange={(event) => onUpdate(employee.id, { roleNote: event.target.value })}
                />
              </Field>
              <Field label="시급">
                <input
                  type="number"
                  value={employee.hourlyWage}
                  onChange={(event) => onUpdate(employee.id, { hourlyWage: Number(event.target.value) })}
                />
              </Field>
              <Field label="입사일">
                <input
                  type="date"
                  value={employee.startDate}
                  onChange={(event) => onUpdate(employee.id, { startDate: event.target.value })}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={employee.weeklyHolidayPayEnabled}
                  onChange={(event) => onUpdate(employee.id, { weeklyHolidayPayEnabled: event.target.checked })}
                />
                주휴수당 적용
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={employee.status === "active"}
                  onChange={(event) =>
                    onUpdate(employee.id, { status: event.target.checked ? "active" : "inactive" })
                  }
                />
                재직 중
              </label>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ScheduleView({
  employees,
  shifts,
  onAddShift,
  onUpdateShift,
}: {
  employees: Employee[];
  shifts: Shift[];
  onAddShift: (employeeId: string, weekday: Weekday) => void;
  onUpdateShift: (id: string, patch: Partial<Shift>) => void;
}) {
  return (
    <Panel title="근무표 관리">
      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="w-36 px-4 py-3">직원</th>
              {weekdays.map((day) => (
                <th key={day.key} className="px-3 py-3">{day.shortLabel}</th>
              ))}
              <th className="px-4 py-3">주간 합계</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const employeeShifts = shifts.filter((shift) => shift.employeeId === employee.id);
              const weeklyHours = employeeShifts.reduce((total, shift) => total + calculateShiftHours(shift), 0);
              return (
                <tr key={employee.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 font-medium">{employee.name}</td>
                  {weekdays.map((day) => {
                    const dayShift = employeeShifts.find((shift) => shift.weekday === day.key);
                    return (
                      <td key={day.key} className="px-2 py-3">
                        {dayShift ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-1">
                              <input
                                type="time"
                                value={dayShift.startTime}
                                onChange={(event) => onUpdateShift(dayShift.id, { startTime: event.target.value })}
                              />
                              <input
                                type="time"
                                value={dayShift.endTime}
                                onChange={(event) => onUpdateShift(dayShift.id, { endTime: event.target.value })}
                              />
                            </div>
                            <input
                              aria-label="휴게시간"
                              type="number"
                              value={dayShift.breakMinutes}
                              onChange={(event) => onUpdateShift(dayShift.id, { breakMinutes: Number(event.target.value) })}
                              className="w-full"
                            />
                            <label className="flex items-center gap-1 text-xs text-stone-500">
                              <input
                                type="checkbox"
                                checked={dayShift.repeatsWeekly}
                                onChange={(event) => onUpdateShift(dayShift.id, { repeatsWeekly: event.target.checked })}
                              />
                              반복
                            </label>
                          </div>
                        ) : (
                          <button
                            onClick={() => onAddShift(employee.id, day.key)}
                            className="rounded border border-dashed border-line px-2 py-1 text-xs text-stone-500 hover:border-moss hover:text-moss"
                          >
                            추가
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 font-semibold">{formatHours(weeklyHours)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PayrollView({ payroll, employees }: { payroll: ReturnType<typeof calculatePayroll>; employees: Employee[] }) {
  return (
    <Panel title="급여 계산">
      <PayrollTable payroll={payroll} employees={employees} showDetails />
    </Panel>
  );
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

function SettingsView() {
  return (
    <Panel title="설정">
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
