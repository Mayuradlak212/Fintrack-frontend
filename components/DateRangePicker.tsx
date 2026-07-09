import React from 'react';
import { CalendarDays, X } from 'lucide-react';

interface DateRange {
  from: string; // 'YYYY-MM-DD'
  to: string;   // 'YYYY-MM-DD'
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const hasFilter = value.from || value.to;

  const inputCls =
    'bg-bg-card border border-white/[0.09] rounded-xl text-xs text-txt-primary outline-none ' +
    'focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all py-2 px-3 ' +
    'placeholder:text-txt-muted [color-scheme:dark] cursor-pointer';

  return (
    <div className="flex items-center gap-2 p-1 bg-bg-card border border-white/[0.07] rounded-xl shrink-0">
      <CalendarDays size={13} className="text-txt-muted ml-1.5 shrink-0" />

      {/* From */}
      <input
        type="date"
        value={value.from}
        max={value.to || undefined}
        onChange={e => onChange({ ...value, from: e.target.value })}
        className={inputCls}
        title="From date"
      />

      <span className="text-txt-muted text-xs shrink-0">→</span>

      {/* To */}
      <input
        type="date"
        value={value.to}
        min={value.from || undefined}
        onChange={e => onChange({ ...value, to: e.target.value })}
        className={inputCls}
        title="To date"
      />

      {/* Clear */}
      {hasFilter && (
        <button
          onClick={() => onChange({ from: '', to: '' })}
          className="p-1 mr-0.5 rounded-lg text-txt-muted hover:text-debit-light hover:bg-red-500/10 transition-all cursor-pointer"
          title="Clear date filter"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
