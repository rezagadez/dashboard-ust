"use client";

import { useEffect, useState } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Shared by every dashboard section - all of them fetch our own /api/* proxy
// routes (never FRED/Treasury directly) and unwrap the { data: ... } envelope.
// Pass an empty string to skip fetching (e.g. while no filter is selected yet).
export function useApiData<T>(url: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: url !== "",
    error: null,
  });

  useEffect(() => {
    if (url === "") {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetch(url)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? `Request failed (${res.status})`);
        }
        return json;
      })
      .then((json) => {
        if (!cancelled) setState({ data: json.data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
