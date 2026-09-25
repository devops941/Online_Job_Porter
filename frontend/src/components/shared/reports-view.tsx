import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart3, Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiErrorMessage } from "@/lib/api";
import { reportApi, triggerDownload } from "@/lib/api-client";
import { titleCase } from "@/lib/utils";

const SCOPE_LABELS: Record<string, string> = {
  jobs: "Jobs",
  applications: "Applications",
  interviews: "Interviews",
  hiring: "Hiring funnel",
  users: "Users",
};

interface ReportsViewProps {
  scopes: string[];
  title: string;
  description: string;
}

export function ReportsView({ scopes, title, description }: ReportsViewProps) {
  const [scope, setScope] = useState(scopes[0]);

  const report = useQuery({
    queryKey: ["report", scope],
    queryFn: () => reportApi.table(scope),
  });

  const download = useMutation({
    mutationFn: (format: "xlsx" | "pdf") => reportApi.download(scope, format),
    onSuccess: ({ blob, fileName }) => {
      triggerDownload(blob, fileName);
      toast.success("Report downloaded");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not generate the report")),
  });

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() => download.mutate("xlsx")}
            >
              <FileSpreadsheet /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={download.isPending}
              onClick={() => download.mutate("pdf")}
            >
              <FileText /> PDF
            </Button>
          </div>
        }
      />

      <Tabs value={scope} onValueChange={setScope}>
        <TabsList className="flex-wrap">
          {scopes.map((entry) => (
            <TabsTrigger key={entry} value={entry}>
              {SCOPE_LABELS[entry] ?? titleCase(entry)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {report.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : report.isError ? (
        <EmptyState
          icon={BarChart3}
          title="Report unavailable"
          description={apiErrorMessage(report.error)}
          actionLabel="Retry"
          onAction={() => void report.refetch()}
        />
      ) : report.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(report.data.summary)
              .slice(0, 4)
              .map(([key, value]) => (
                <StatCard key={key} label={titleCase(key)} value={value} />
              ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{report.data.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{report.data.rows.length} rows</Badge>
                <Button variant="ghost" size="icon" onClick={() => void report.refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {report.data.rows.length ? (
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      {report.data.columns.map((column) => (
                        <th key={column} className="px-3 py-2 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.rows.slice(0, 100).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b last:border-0 hover:bg-muted/40">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2">
                            {cell === null || cell === undefined ? "—" : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No data for this report yet.
                </p>
              )}
              {report.data.rows.length > 100 ? (
                <p className="pt-3 text-xs text-muted-foreground">
                  Showing the first 100 of {report.data.rows.length} rows. Export for the full data
                  set.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5" />
            Exports include every row and are generated on the server.
          </p>
        </div>
      ) : null}
    </>
  );
}
