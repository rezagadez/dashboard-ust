"use client";

import { useState } from "react";

export interface DateRange {
  start: string;
  end: string;
}

interface DateRangeFormProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangeForm({ value, onChange }: DateRangeFormProps) {
  const [start, setStart] = useState(value.start);
  const [end, setEnd] = useState(value.end);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onChange({ start, end });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Dari</span>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Sampai</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
          required
        />
      </label>
      <button
        type="submit"
        className="rounded bg-slate-900 px-4 py-1.5 font-medium text-white hover:bg-slate-700"
      >
        Terapkan
      </button>
    </form>
  );
}
