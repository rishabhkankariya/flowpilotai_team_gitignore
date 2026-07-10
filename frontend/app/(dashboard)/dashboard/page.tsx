import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, Inbox, FileText, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1.5">
          Welcome back. Your AI-powered inbox orchestration is running smoothly.
        </p>
      </div>

      {/* Modern Card Grid Stubs */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Total Submissions</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-[#00684a] font-semibold inline-flex items-center gap-0.5">
                +12% <ArrowUpRight className="h-3 w-3" />
              </span>{' '}
              since yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Agent Accuracy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">98.4%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-[#00684a] font-semibold inline-flex items-center gap-0.5">
                +0.5% <ArrowUpRight className="h-3 w-3" />
              </span>{' '}
              above SLA target
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Document Intelligence</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">412</div>
            <p className="text-xs text-muted-foreground mt-1">
              Invoices and forms processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature showcase callout card */}
      <Card className="bg-[#001e2b] text-white border-0 shadow-lg relative overflow-hidden rounded-xl">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-[#00a35c]/10 to-transparent pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle className="text-xl text-white font-bold">One data platform. Unlimited AI potential.</CardTitle>
          <CardDescription className="text-white/70 max-w-xl mt-1.5 text-sm">
            FlowPilot AI automatically classifies incoming documents, scores confidence levels, and invokes specialized agent pipelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-2 pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00ed64] hover:bg-[#00b545] text-[#001e2b] text-sm font-semibold rounded-full shadow transition-all cursor-pointer">
            Explore AI Inbox
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
