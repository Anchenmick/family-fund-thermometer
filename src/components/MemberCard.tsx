import { FamilyMember, calcMemberTotal, TARGET, members, MonthlyRecord } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MemberCardProps {
  member: FamilyMember;
  records: MonthlyRecord[];
}

const MemberCard = ({ member, records }: MemberCardProps) => {
  const total = calcMemberTotal(records, member.name);
  const fairShare = TARGET / members.length;
  const progressPct = Math.min((total / fairShare) * 100, 100);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {member.shortName}
            </div>
            <div>
              <div className="font-semibold text-foreground">{member.name}</div>
              <div className="text-xs text-muted-foreground">${member.monthlyDue}/mo</div>
            </div>
          </div>
          {member.irregular && (
            <Badge variant="outline" className="text-xs border-accent text-accent">Flexible</Badge>
          )}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Total contributed</span>
            <span className="font-bold text-foreground">${total.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberCard;
