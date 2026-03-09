import { TARGET } from "@/lib/data";

interface ThermometerProps {
  current: number;
}

const Thermometer = ({ current }: ThermometerProps) => {
  const percentage = Math.min((current / TARGET) * 100, 100);

  const getColor = (pct: number) => {
    if (pct < 33) return "bg-thermo-cold";
    if (pct < 66) return "bg-thermo-warm";
    return "bg-thermo-hot";
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Goal: ${TARGET.toLocaleString()}
      </div>

      <div className="relative flex flex-col items-center" style={{ height: 280 }}>
        {/* Thermometer tube */}
        <div className="relative w-10 h-full rounded-t-full bg-secondary overflow-hidden border-2 border-b-0 border-border shadow-inner">
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out ${getColor(percentage)}`}
            style={{ height: `${percentage}%` }}
          />
          {/* Glass shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>

        {/* Bulb */}
        <div className={`w-16 h-16 -mt-2 rounded-full ${getColor(percentage)} border-2 border-border shadow-lg`} />

        {/* Single marker at target */}
        <div className="absolute top-0 left-1/2 translate-x-6 flex items-center gap-1">
          <div className="w-3 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">${(TARGET / 1000).toFixed(0)}k</span>
        </div>
      </div>

      <div className="text-center">
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
