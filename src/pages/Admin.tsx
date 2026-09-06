import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { docToRecord } from "@/lib/convexAdapter";
import { MONTH_ABBREVIATIONS } from "@/lib/period";
import {
  members,
  calcMonthNet,
  calcTotalBalance,
  MonthlyRecord,
} from "@/lib/data";
import { extractErrorMessage } from "@/lib/convexErrors";
import ContributionTable from "@/components/ContributionTable";
import AuthControls from "@/components/AuthControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const YEARS = ["2024", "2025", "2026", "2027", "2028"];

const emptyAmounts = () => Object.fromEntries(members.map((m) => [m.name, "0"])) as Record<string, string>;

const Admin = () => {
  const ledger = useQuery(api.ledger.list);
  const appendMonth = useMutation(api.ledger.append);
  const updateMonth = useMutation(api.ledger.update);

  const [month, setMonth] = useState("Jan");
  const [year, setYear] = useState("2026");
  const [amounts, setAmounts] = useState<Record<string, string>>(emptyAmounts);
  const [withdrawal, setWithdrawal] = useState("0");
  const [repayment, setRepayment] = useState("0");

  if (ledger === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading the ledger...</p>
      </div>
    );
  }

  const records = ledger.map(docToRecord);

  const handleUpdate = async (id: string, record: MonthlyRecord) => {
    try {
      await updateMonth({
        id: id as Id<"ledger">,
        contributions: record.contributions,
        withdrawal: record.withdrawal || 0,
        repayment: record.repayment || 0,
      });
      toast({ title: "Entry updated", description: record.month });
    } catch (error) {
      toast({
        title: "Could not update",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleAppend = async () => {
    const monthIndex = MONTH_ABBREVIATIONS.indexOf(month);
    const contributions: Record<string, number> = {};
    for (const m of members) {
      const v = Number(amounts[m.name]);
      if (isNaN(v) || v < 0) {
        toast({ title: "Invalid amount", description: `Check ${m.name}`, variant: "destructive" });
        return;
      }
      contributions[m.name] = Math.round(v);
    }
    const w = Number(withdrawal);
    const r = Number(repayment);
    if (isNaN(w) || w < 0 || isNaN(r) || r < 0) {
      toast({ title: "Invalid withdrawal/repayment", variant: "destructive" });
      return;
    }

    try {
      await appendMonth({
        year: Number(year),
        monthIndex,
        contributions,
        withdrawal: Math.round(w),
        repayment: Math.round(r),
      });
      const net = calcMonthNet({ month: `${month} ${year}`, contributions, withdrawal: Math.round(w), repayment: Math.round(r) });
      setAmounts(emptyAmounts());
      setWithdrawal("0");
      setRepayment("0");
      toast({ title: "Month added", description: `${month} ${year} • Net $${net.toLocaleString()}` });
    } catch (error) {
      toast({
        title: "Could not add month",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const balance = calcTotalBalance(records);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">📒 Admin · Ledger</h1>
            <p className="text-sm text-muted-foreground">
              Running balance: <span className="font-bold text-foreground">${balance.toLocaleString()}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AuthControls />
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-10">
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Add new month</h2>
            <p className="text-xs text-muted-foreground">
              Append-only ledger. Enter what happened this period, contributions, any withdrawal (loan out), any
              repayment received.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_ABBREVIATIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {members.map((m) => (
              <div key={m.name}>
                <Label className="text-xs">{m.name} <span className="text-muted-foreground">(${m.monthlyDue})</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={amounts[m.name]}
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [m.name]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div>
              <Label className="text-xs">Withdrawal (loan out)</Label>
              <Input type="number" min={0} value={withdrawal} onChange={(e) => setWithdrawal(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Repayment received</Label>
              <Input type="number" min={0} value={repayment} onChange={(e) => setRepayment(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleAppend} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> Append to ledger
          </Button>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">Ledger</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Use the pencil icon only to correct a mistake. Do not overwrite real history.
          </p>
          <ContributionTable records={records} onUpdate={handleUpdate} editable />
        </section>
      </main>
    </div>
  );
};

export default Admin;
