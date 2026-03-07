import { members, monthlyRecords } from "@/lib/data";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";

const ContributionTable = () => {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthlyRecords.map((record) => {
            const monthTotal = Object.values(record.contributions).reduce((s, v) => s + v, 0);
            return (
              <TableRow key={record.month}>
                <TableCell className="sticky left-0 bg-card z-10 font-medium">
                  {record.month}
                </TableCell>
                {members.map((m) => {
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContributionTable;
