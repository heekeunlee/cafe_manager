import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void, boolean] {
  const [value, setValueState] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [saved, setSaved] = useState(true);

  const setValue = (nextValue: T) => {
    setValueState(nextValue);
    setSaved(false);
  };

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
    setSaved(true);
  }, [key, value]);

  return [value, setValue, saved];
}
