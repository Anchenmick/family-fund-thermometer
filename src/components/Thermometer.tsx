import { TARGET } from "@/lib/data";

interface ThermometerProps {
  current: number;
}

const Thermometer = ({ current }: ThermometerProps) => {
  const percentage = Math.min((current / TARGET) * 100, 100);

  // Color transitions: cold (blue) → warm (amber) → hot (red)
  const getColor = (pct: number) => {
    if (pct < 33) return "bg-thermo-cold";
    if (pct < 66) return "bg-thermo-warm";
    return "bg-thermo-hot";
  };

  const milestones = [0, 10000, 20000, 30000, 40000];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Goal: ${TARGET.toLocaleString()}
      </div>

      <div className="relative flex items-end gap-4" style={{ height: 320 }}>
        {/* Scale labels */}
        <div className="relative flex flex-col justify-between h-full text-right text-xs text-muted-foreground pr-2" style={{ width: 60 }}>
          {milestones.slice().reverse().map((m) => (
            <span key={m}>${(m / 1000).toFixed(0)}k</span>
          ))}
        </div>

        {/* Thermometer tube */}
        <div className="relative w-16 h-full rounded-full bg-secondary overflow-hidden border-2 border-border shadow-inner">
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out rounded-full ${getColor(percentage)}`}
            style={{ height: `${percentage}%` }}
          />
          {/* Glass shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>

        {/* Bulb */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 ml-[30px]">
          <div className={`w-20 h-20 rounded-full ${getColor(percentage)} border-2 border-border shadow-lg flex items-center justify-center`}>
            <span className="text-xs font-bold text-primary-foreground">
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <div className="text-3xl font-extrabold text-foreground">
          ${current.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">
          ${(TARGET - current).toLocaleString()} to go
        </div>
      </div>
    </div>
  );
};

export default Thermometer;
