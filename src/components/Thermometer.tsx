interface ThermometerProps {
  current: number;
  target: number;
}

const Thermometer = ({ current, target }: ThermometerProps) => {
  const percentage = Math.min((current / target) * 100, 100);
  // Nine labels, eight even divisions, so the printed scale always matches
  // the goal rather than assuming 40,000.
  const steps = Array.from({ length: 9 }, (_, i) => Math.round((target / 8) * i));

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Goal banner */}
      <div className="relative bg-destructive text-destructive-foreground px-6 py-1.5 text-sm font-extrabold uppercase tracking-wider rounded-sm">
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-destructive rotate-45" />
        Goal
      </div>

      <div className="relative flex items-end" style={{ height: 360 }}>
        {/* Scale labels on the right */}
        <div className="absolute right-0 translate-x-full pl-2 top-0 bottom-0 flex flex-col justify-between">
          {steps.slice().reverse().map((val) => (
            <div key={val} className="flex items-center gap-1">
              <div className="w-3 h-px bg-foreground/40" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {val.toLocaleString()}$
              </span>
            </div>
          ))}
        </div>

        {/* Tick marks on left side of tube */}
        <div className="absolute left-0 -translate-x-full pr-0 top-0 bottom-0 flex flex-col justify-between">
          {steps.slice().reverse().map((val) => (
            <div key={val} className="flex items-center justify-end">
              <div className="w-3 h-px bg-foreground/40" />
            </div>
          ))}
        </div>

        {/* Thermometer tube - spans full height to align with scale */}
        <div className="relative w-8 rounded-t-full rounded-b-full bg-secondary overflow-hidden border-2 border-foreground/20" style={{ height: "100%" }}>
          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-destructive transition-all duration-1000 ease-out"
            style={{ height: `${percentage}%` }}
          />
          {/* Shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Amount display */}
      <div className="mt-6 text-center">
        <div className="text-3xl font-extrabold text-foreground">
          ${current.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">
          ${(target - current).toLocaleString()} to go
        </div>
      </div>
    </div>
  );
};

export default Thermometer;
