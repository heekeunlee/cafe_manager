import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sampleEmployees, sampleSettings, sampleShifts } from "../data/sampleData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Employee, Shift, StoreSettings, Weekday } from "../types";

type SaveState = "saved" | "saving" | "error";

const storeId = "default";

function readLocal<T>(key: string, initialValue: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function useSupabaseCafeData() {
  const [employees, setEmployeesState] = useState<Employee[]>(() =>
    readLocal("cafe-manager-employees", sampleEmployees),
  );
  const [shifts, setShiftsState] = useState<Shift[]>(() => readLocal("cafe-manager-shifts", sampleShifts));
  const [settings, setSettingsState] = useState<StoreSettings>(() =>
    readLocal("cafe-manager-settings", sampleSettings),
  );
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const didHydrateRef = useRef(false);

  const syncEmployees = useCallback(async (nextEmployees: Employee[]) => {
    if (!supabase) return;
    const rows = nextEmployees.map(employeeToRow);
    const ids = nextEmployees.map((employee) => employee.id);
    if (rows.length > 0) {
      const { error } = await supabase.from("employees").upsert(rows);
      if (error) throw error;
    }
    const { data: existingRows, error: readError } = await supabase.from("employees").select("id");
    if (readError) throw readError;
    const idsToDelete = (existingRows ?? []).map((row) => row.id).filter((id) => !ids.includes(id));
    if (idsToDelete.length > 0) {
      const { error } = await supabase.from("employees").delete().in("id", idsToDelete);
      if (error) throw error;
    }
  }, []);

  const syncShifts = useCallback(async (nextShifts: Shift[]) => {
    if (!supabase) return;
    const rows = nextShifts.map(shiftToRow);
    const ids = nextShifts.map((shift) => shift.id);
    if (rows.length > 0) {
      const { error } = await supabase.from("shifts").upsert(rows);
      if (error) throw error;
    }
    const { data: existingRows, error: readError } = await supabase.from("shifts").select("id");
    if (readError) throw readError;
    const idsToDelete = (existingRows ?? []).map((row) => row.id).filter((id) => !ids.includes(id));
    if (idsToDelete.length > 0) {
      const { error } = await supabase.from("shifts").delete().in("id", idsToDelete);
      if (error) throw error;
    }
  }, []);

  const syncSettings = useCallback(async (nextSettings: StoreSettings) => {
    if (!supabase) return;
    const { error } = await supabase.from("settings").upsert(settingsToRow(nextSettings));
    if (error) throw error;
  }, []);

  const fetchAll = useCallback(async () => {
    if (!supabase) return;
    const [employeesResult, shiftsResult, settingsResult] = await Promise.all([
      supabase.from("employees").select("*").order("created_at", { ascending: true }),
      supabase.from("shifts").select("*").order("created_at", { ascending: true }),
      supabase.from("settings").select("*").eq("id", storeId).maybeSingle(),
    ]);

    if (employeesResult.error || shiftsResult.error || settingsResult.error) {
      throw employeesResult.error || shiftsResult.error || settingsResult.error;
    }

    const remoteEmployees = (employeesResult.data ?? []).map(rowToEmployee);
    const remoteShifts = (shiftsResult.data ?? []).map(rowToShift);
    const remoteSettings = settingsResult.data ? rowToSettings(settingsResult.data) : sampleSettings;

    if (remoteEmployees.length === 0 && remoteShifts.length === 0 && !settingsResult.data) {
      await Promise.all([syncEmployees(employees), syncShifts(shifts), syncSettings(settings)]);
      return;
    }

    setEmployeesState(remoteEmployees);
    setShiftsState(remoteShifts);
    setSettingsState(remoteSettings);
    writeLocal("cafe-manager-employees", remoteEmployees);
    writeLocal("cafe-manager-shifts", remoteShifts);
    writeLocal("cafe-manager-settings", remoteSettings);
  }, [employees, settings, shifts, syncEmployees, syncSettings, syncShifts]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    let active = true;
    fetchAll()
      .then(() => {
        if (active) didHydrateRef.current = true;
      })
      .catch((error) => {
        console.warn("Supabase sync unavailable. Falling back to localStorage.", error);
        if (active) {
          didHydrateRef.current = true;
          setSaveState("error");
        }
      });

    const channel = client
      .channel("cafe-manager-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => void fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => void fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => void fetchAll())
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [fetchAll]);

  const runRemoteSync = useCallback(async (operation: () => Promise<void>) => {
    if (!supabase || !didHydrateRef.current) return;
    setSaveState("saving");
    try {
      await operation();
      setSaveState("saved");
    } catch (error) {
      console.warn("Supabase write failed. Local changes are still saved in localStorage.", error);
      setSaveState("error");
    }
  }, []);

  const setEmployees = useCallback(
    (nextEmployees: Employee[]) => {
      setEmployeesState(nextEmployees);
      writeLocal("cafe-manager-employees", nextEmployees);
      void runRemoteSync(() => syncEmployees(nextEmployees));
    },
    [runRemoteSync, syncEmployees],
  );

  const setShifts = useCallback(
    (nextShifts: Shift[]) => {
      setShiftsState(nextShifts);
      writeLocal("cafe-manager-shifts", nextShifts);
      void runRemoteSync(() => syncShifts(nextShifts));
    },
    [runRemoteSync, syncShifts],
  );

  const setSettings = useCallback(
    (nextSettings: StoreSettings) => {
      setSettingsState(nextSettings);
      writeLocal("cafe-manager-settings", nextSettings);
      void runRemoteSync(() => syncSettings(nextSettings));
    },
    [runRemoteSync, syncSettings],
  );

  return useMemo(
    () => ({
      employees,
      shifts,
      settings,
      setEmployees,
      setShifts,
      setSettings,
      saved: saveState === "saved",
      syncStatus: saveState,
    }),
    [employees, saveState, setEmployees, setSettings, setShifts, settings, shifts],
  );
}

function employeeToRow(employee: Employee) {
  return {
    id: employee.id,
    name: employee.name,
    role_note: employee.roleNote,
    color: employee.color ?? null,
    hourly_wage: employee.hourlyWage,
    start_date: employee.startDate,
    end_date: employee.endDate || null,
    weekly_holiday_pay_enabled: employee.weeklyHolidayPayEnabled,
    status: employee.status,
  };
}

function rowToEmployee(row: any): Employee {
  return {
    id: row.id,
    name: row.name,
    roleNote: row.role_note ?? "",
    color: row.color ?? undefined,
    hourlyWage: Number(row.hourly_wage),
    startDate: row.start_date,
    endDate: row.end_date ?? "",
    weeklyHolidayPayEnabled: Boolean(row.weekly_holiday_pay_enabled),
    status: row.status,
  };
}

function shiftToRow(shift: Shift) {
  return {
    id: shift.id,
    employee_id: shift.employeeId,
    weekday: shift.weekday,
    start_time: shift.startTime,
    end_time: shift.endTime,
    break_minutes: shift.breakMinutes,
    repeats_weekly: shift.repeatsWeekly,
    note: shift.note ?? null,
  };
}

function rowToShift(row: any): Shift {
  return {
    id: row.id,
    employeeId: row.employee_id,
    weekday: row.weekday as Weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    breakMinutes: Number(row.break_minutes),
    repeatsWeekly: Boolean(row.repeats_weekly),
    note: row.note ?? "",
  };
}

function settingsToRow(settings: StoreSettings) {
  return {
    id: storeId,
    store_name: settings.storeName,
    base_week_label: settings.baseWeekLabel,
    default_hourly_wage: settings.defaultHourlyWage,
    monthly_week_multiplier: settings.monthlyWeekMultiplier,
    weekly_holiday_calculation: settings.weeklyHolidayCalculation,
  };
}

function rowToSettings(row: any): StoreSettings {
  return {
    storeName: row.store_name,
    baseWeekLabel: row.base_week_label,
    defaultHourlyWage: Number(row.default_hourly_wage),
    monthlyWeekMultiplier: Number(row.monthly_week_multiplier),
    weeklyHolidayCalculation: row.weekly_holiday_calculation,
  };
}
