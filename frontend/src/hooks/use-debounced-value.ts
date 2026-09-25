import { useEffect, useState } from "react";

/**
 * Debounces a fast-changing value (search boxes) so we do not fire a request
 * on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
