import { useState } from "react";
import { members, MonthlyRecord, calcMonthNet } from "@/lib/data";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

interface ContributionTableProps {
  records: MonthlyRecord[];
  onUpdate?: (id: string, record: MonthlyRecord) => void;
  editable?: boolean;
}

const ContributionTable = ({ records, onUpdate, editable = false }: ContributionTableProps) => {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<MonthlyRecord | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editWithdrawal, setEditWithdrawal] = useState("0");
  const [editRepayment, setEditRepayment] = useState("0");

  const startEdit = (index: number) => {
    const record = records[index];
    setEditValues(
      Object.fromEntries(members.map((m) => [m.name, String(record.contributions[m.name] || 0)]))
    );
    setEditWithdrawal(String(record.withdrawal || 0));
    setEditRepayment(String(record.repayment || 0));
    setEditingRow(index);
    setEditingRecord(record);
  };

  const saveEdit = () => {
    if (!editingRecord?.id) return;
    const contributions: Record<string, number> = {};
    for (const m of members) {
      const val = Number(editValues[m.name]);
      if (isNaN(val) || val < 0 || val > 100000) return;
      contributions[m.name] = Math.round(val);
    }
    const w = Number(editWithdrawal);
    const r = Number(editRepayment);
    if (isNaN(w) || w < 0 || isNaN(r) || r < 0) return;
    onUpdate?.(editingRecord.id, { ...editingRecord, contributions, withdrawal: Math.round(w), repayment: Math.round(r) });
    setEditingRow(null);
    setEditingRecord(null);
  };

  return (
    <div className="rounded-lg border bg-card overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-10">Month</TableHead>
            {members.map((m) => (
              <TableHead key={m.name} className="text-center">{m.shortName}</TableHead>
            ))}
            <TableHead className="text-center">Withdrawal</TableHead>
            <TableHead className="text-center">Repayment</TableHead>
            <TableHead className="text-center font-bold">Net</TableHead>
            {editable && <TableHead className="text-center w-20">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, i) => {
            const isEditing = editable && editingRow === i;
            const monthNet = calcMonthNet(record);

            return (
              <TableRow key={record.month}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium">
                  {record.month}
                </TableCell>
                {members.map((m) => {
                  if (isEditing) {
                    return (
                      <TableCell key={m.name} className="text-center p-1">
                        <Input
                          type="number"
                          min={0}
                          max={100000}
                          className="w-20 text-center mx-auto h-8 text-sm"
                          value={editValues[m.name]}
                          onChange={(e) =>
                            setEditValues((prev) => ({ ...prev, [m.name]: e.target.value }))
                          }
                        />
                      </TableCell>
                    );
                  }
                  const amount = record.contributions[m.name] || 0;
                  const missed = amount < m.monthlyDue;
                  return (
                    <TableCell
                      key={m.name}
                      className={`text-center ${missed ? "text-destructive" : "text-foreground"}`}
                    >
                      ${amount}
                    </TableCell>
                  );
                })}
                {isEditing ? (
                  <>
                    <TableCell className="text-center p-1">
                      <Input
                        type="number"
                        min={0}
                        className="w-24 text-center mx-auto h-8 text-sm"
                        value={editWithdrawal}
                        onChange={(e) => setEditWithdrawal(e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input
                        type="number"
                        min={0}
                        className="w-24 text-center mx-auto h-8 text-sm"
                        value={editRepayment}
                        onChange={(e) => setEditRepayment(e.target.value)}
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-center text-destructive">
                      {record.withdrawal ? `-$${record.withdrawal.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {record.repayment ? `+$${record.repayment.toLocaleString()}` : "—"}
                    </TableCell>
                  </>
                )}
                <TableCell className="text-center font-bold">${monthNet.toLocaleString()}</TableCell>
                {editable && (
                  <TableCell className="text-center">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit()}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingRow(null); setEditingRecord(null); }}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(i)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContributionTable;
