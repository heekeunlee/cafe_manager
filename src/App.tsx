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
  Menu,
  Settings,
  Trash2,
  X,
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
  parseTimeToMinutes,
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

const STORE_NAME = "우지커피 광교상현역점";

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

  const saveEmployee = (employee: Employee) => {
    const exists = employees.some((target) => target.id === employee.id);
    setEmployees(exists ? employees.map((target) => (target.id === employee.id ? employee : target)) : [...employees, employee]);
  };

  const deleteEmployee = (id: string) => {
    const target = employees.find((employee) => employee.id === id);
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
                  <h2 className="text-xl font-bold md:text-2xl">{STORE_NAME}</h2>
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
              <EmployeesView
                employees={employees}
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
  onSave,
  onDelete,
  onQuickUpdate,
}: {
  employees: Employee[];
  onSave: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onQuickUpdate: (id: string, patch: Partial<Employee>) => void;
}) {
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAddModal = () => {
    setEditingEmployee({
      id: `emp-${Date.now()}`,
      name: "",
      roleNote: "",
      hourlyWage: 10030,
      startDate: new Date().toISOString().slice(0, 10),
      weeklyHolidayPayEnabled: true,
      status: "active",
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
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">시급</th>
              <th className="px-4 py-3">주휴수당</th>
              <th className="px-4 py-3">입사일</th>
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
      hourlyWage: Math.max(0, Number(draft.hourlyWage) || 0),
    });
  };

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/35 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h4 className="text-lg font-bold">{employee.name ? "직원 수정" : "직원 추가"}</h4>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-stone-100">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
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
          <Field label="입사일">
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => updateDraft({ startDate: event.target.value })}
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
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
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
        <div className="grid min-w-[1080px] grid-cols-7 gap-3">
          {weekdays.map((day) => {
            const dayShifts = shifts
              .filter((shift) => shift.weekday === day.key)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
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
                <div className="space-y-2 p-2">
                  {dayShifts.length === 0 && (
                    <div className="rounded-md border border-dashed border-line px-3 py-8 text-center text-xs text-stone-500">
                      근무 없음
                    </div>
                  )}
                  {dayShifts.map((shift) => {
                    const employee = employees.find((target) => target.id === shift.employeeId);
                    const overlapped = hasOverlap(shift);

                    return (
                      <button
                        key={shift.id}
                        onClick={() => openEditModal(shift)}
                        className={`w-full rounded-md border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                          overlapped ? "border-amber/70 bg-amber/10" : "border-line bg-paper"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <strong className="text-sm">{employee?.name ?? "직원 없음"}</strong>
                          {overlapped && <AlertTriangle size={16} className="shrink-0 text-amber" />}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-stone-600">
                          <p className="flex items-center gap-1">
                            <Clock size={13} />
                            {shift.startTime} - {shift.endTime}
                          </p>
                          <p>휴게 {shift.breakMinutes}분</p>
                          <p className="font-semibold text-ink">실근무 {formatHours(calculateShiftHours(shift))}</p>
                        </div>
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
    });
  };

  const handleDelete = () => {
    if (!window.confirm("이 근무를 삭제할까요?")) return;
    onDelete(draft.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/35 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h4 className="text-lg font-bold">{isExisting ? "근무 수정" : "근무 추가"}</h4>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-stone-100">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
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
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.repeatsWeekly}
              onChange={(event) => updateDraft({ repeatsWeekly: event.target.checked })}
            />
            반복 근무 패턴
          </label>
          {overlappedShifts.length > 0 && (
            <div className="rounded-md border border-amber/40 bg-amber/10 p-3 text-sm text-stone-800 sm:col-span-2">
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
