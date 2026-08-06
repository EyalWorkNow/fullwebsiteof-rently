'use client'

// Two-thumb range slider built from two overlaid native range inputs — no new
// deps. RTL-native: min sits on the right, like the app's RangeSlider.
//
// a11y: both thumbs are real <input type="range">, so they are tabbable and
// arrow-key driven for free. What was missing and is fixed here:
//   • `:focus { outline: none }` with no replacement made keyboard focus
//     completely invisible — there is now a focus-visible ring on the thumb.
//   • both sliders on the page announced the same two labels ("מינימום" /
//     "מקסימום") with no idea WHICH range they belonged to → `label` prop.
//   • screen readers read the raw number ("40000") → aria-valuetext carries the
//     formatted value ("₪40,000" / "ללא הגבלה").

interface DualRangeProps {
  min: number
  max: number
  step: number
  valueMin: number
  valueMax: number
  onChange: (nextMin: number, nextMax: number) => void
  format: (value: number) => string
  /** Label to show when valueMax sits at the slider ceiling (= unlimited). */
  maxLabel?: string
  /** What this range measures, e.g. "מחיר" — used to build the aria labels. */
  label: string
}

export default function DualRange({
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  format,
  maxLabel,
  label,
}: DualRangeProps) {
  const lo = Math.min(Math.max(valueMin, min), max)
  const hi = Math.min(Math.max(valueMax, min), max)
  const range = max - min || 1
  const loPct = ((lo - min) / range) * 100
  const hiPct = ((hi - min) / range) * 100
  const hiText = hi >= max && maxLabel ? maxLabel : format(hi)

  return (
    <div>
      <div className="relative h-6" dir="rtl">
        {/* track */}
        <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-border-app" />
        {/* filled segment (RTL: grows from the right) */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ right: `${loPct}%`, width: `${Math.max(hiPct - loPct, 0)}%` }}
        />
        <input
          type="range"
          dir="rtl"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`${label} — מינימום`}
          aria-valuetext={format(lo)}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi)
            onChange(v, hi)
          }}
          className="dual-range-input absolute inset-0 w-full"
          // Raise whichever thumb would otherwise be buried: near the ceiling
          // the two overlap and only the top one is grabbable.
          style={{ zIndex: lo > max - range / 10 ? 5 : 3 }}
        />
        <input
          type="range"
          dir="rtl"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`${label} — מקסימום`}
          aria-valuetext={hiText}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo)
            onChange(lo, v)
          }}
          className="dual-range-input absolute inset-0 w-full"
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[12px] font-bold text-secondary-text">
        <span>{format(lo)}</span>
        <span>{hiText}</span>
      </div>
      {/* Thumb styling for the overlaid native inputs (scoped by class). */}
      <style>{`
        .dual-range-input {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          pointer-events: none;
          height: 100%;
          margin: 0;
        }
        .dual-range-input:focus { outline: none; }
        .dual-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          pointer-events: auto;
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          background: #fff;
          border: 2.5px solid #2563EB;
          box-shadow: 0 2px 6px rgba(7, 41, 70, 0.18);
          cursor: grab;
        }
        .dual-range-input::-moz-range-thumb {
          pointer-events: auto;
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          background: #fff;
          border: 2.5px solid #2563EB;
          box-shadow: 0 2px 6px rgba(7, 41, 70, 0.18);
          cursor: grab;
        }
        .dual-range-input::-moz-range-track { background: transparent; }
        /* Visible keyboard focus (the thumb is the only painted part). */
        .dual-range-input:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px #fff, 0 0 0 5px #2563EB;
        }
        .dual-range-input:focus-visible::-moz-range-thumb {
          box-shadow: 0 0 0 3px #fff, 0 0 0 5px #2563EB;
        }
      `}</style>
    </div>
  )
}
