import { members, getTotalBalance, getMonthlyTotals, TARGET } from "@/lib/data";
import Thermometer from "@/components/Thermometer";
import MemberCard from "@/components/MemberCard";
import ContributionTable from "@/components/ContributionTable";

const Index = () => {
  const balance = getTotalBalance();
  const monthlyTotals = getMonthlyTotals();
  const monthsElapsed = monthlyTotals.length;
  const avgMonthly = monthsElapsed > 0 ? balance / monthsElapsed : 0;
  const monthsRemaining = avgMonthly > 0 ? Math.ceil((TARGET - balance) / avgMonthly) : Infinity;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            🏠 Family Savings Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Together to <span className="font-bold text-accent">${TARGET.toLocaleString()}</span>
          </p>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Top section: Thermometer + Stats */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <Thermometer current={balance} />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-card border p-4 text-center">
                <div className="text-2xl font-extrabold text-foreground">${balance.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Current Balance</div>
              </div>
              <div className="rounded-lg bg-card border p-4 text-center">
                <div className="text-2xl font-extrabold text-foreground">${(TARGET - balance).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
              <div className="rounded-lg bg-card border p-4 text-center">
                <div className="text-2xl font-extrabold text-foreground">${avgMonthly.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Avg/Month</div>
              </div>
              <div className="rounded-lg bg-card border p-4 text-center">
                <div className="text-2xl font-extrabold text-foreground">
                  {monthsRemaining === Infinity ? "—" : `~${monthsRemaining} mo`}
                </div>
                <div className="text-xs text-muted-foreground">Est. Completion</div>
              </div>
            </div>
          </div>
        </div>

        {/* Member Cards */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Members</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {members.map((m) => (
              <MemberCard key={m.name} member={m} />
            ))}
          </div>
        </section>

        {/* Monthly Breakdown */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Monthly Breakdown</h2>
          <ContributionTable />
        </section>
      </main>
    </div>
  );
};

export default Index;
