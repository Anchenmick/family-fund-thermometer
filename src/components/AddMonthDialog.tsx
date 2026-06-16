import { useState } from "react";
import { members, MonthlyRecord } from "@/lib/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = ["2024", "2025", "2026", "2027"];

interface AddMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (record: MonthlyRecord) => void;
  existingMonths: string[];
}

const AddMonthDialog = ({ open, onOpenChange, onAdd, existingMonths }: AddMonthDialogProps) => {
  const [month, setMonth] = useState("Jan");
  const [year, setYear] = useState("2025");
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.name, String(m.monthlyDue)]))
  );
  const [withdrawal, setWithdrawal] = useState("0");
  const [repayment, setRepayment] = useState("0");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const label = `${month} ${year}`;
    if (existingMonths.includes(label)) {
      setError("This month already exists.");
      return;
    }
    const contributions: Record<string, number> = {};
    for (const m of members) {
      const val = Number(amounts[m.name]);
      if (isNaN(val) || val < 0 || val > 100000) {
        setError(`Invalid amount for ${m.name}`);
        return;
      }
      contributions[m.name] = Math.round(val);
    }
    const w = Number(withdrawal);
    const r = Number(repayment);
    if (isNaN(w) || w < 0 || isNaN(r) || r < 0) {
      setError("Invalid withdrawal or repayment");
      return;
    }
    onAdd({ month: label, contributions, withdrawal: Math.round(w), repayment: Math.round(r) });
    // Reset
    setAmounts(Object.fromEntries(members.map((m) => [m.name, String(m.monthlyDue)])));
    setWithdrawal("0");
    setRepayment("0");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Month</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <Label className="w-20 text-sm">{m.name}</Label>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={100000}
                    className="pl-7"
                    value={amounts[m.name]}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [m.name]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Add Month</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMonthDialog;
