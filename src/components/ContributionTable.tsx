import { useState } from "react";
import { members, MonthlyRecord } from "@/lib/data";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Trash2 } from "lucide-react";

interface ContributionTableProps {
  records: MonthlyRecord[];
  onUpdate: (index: number, record: MonthlyRecord) => void;
  onDelete: (index: number) => void;
}

const ContributionTable = ({ records, onUpdate, onDelete }: ContributionTableProps) => {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const startEdit = (index: number) => {
    const record = records[index];
    setEditValues(
      Object.fromEntries(members.map((m) => [m.name, String(record.contributions[m.name] || 0)]))
    );
    setEditingRow(index);
  };

  const saveEdit = (index: number) => {
    const contributions: Record<string, number> = {};
    for (const m of members) {
      const val = Number(editValues[m.name]);
      if (isNaN(val) || val < 0 || val > 100000) return;
      contributions[m.name] = Math.round(val);
    }
    onUpdate(index, { ...records[index], contributions });
    setEditingRow(null);
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
            <TableHead className="text-center font-bold">Total</TableHead>
            <TableHead className="text-center w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, i) => {
            const isEditing = editingRow === i;
            const monthTotal = Object.values(record.contributions).reduce((s, v) => s + v, 0);

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
                <TableCell className="text-center font-bold">${monthTotal.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  {isEditing ? (
                    <div className="flex gap-1 justify-center">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(i)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingRow(null)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-center">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(i)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContributionTable;
