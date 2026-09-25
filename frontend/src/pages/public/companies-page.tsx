import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Globe, MapPin, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PublicNavbar, PublicFooter } from "@/components/layout/public-navbar";
import { EmptyState } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { profileApi } from "@/lib/api-client";

export default function CompaniesPage() {
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 350);

  const companies = useQuery({
    queryKey: ["companies", debounced],
    queryFn: () => profileApi.companies(debounced || undefined),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <div className="container flex-1 py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Companies hiring now</h1>
          <p className="text-sm text-muted-foreground">
            Explore employers publishing roles on the portal.
          </p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search companies"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>

        {companies.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full" />
            ))}
          </div>
        ) : companies.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.data.map((company) => (
              <Card key={company.id} className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-muted p-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.industry ?? "—"}</p>
                      </div>
                    </div>
                    {company.isVerified ? <Badge variant="success">Verified</Badge> : null}
                  </div>

                  <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                    {company.description ?? "No company description provided yet."}
                  </p>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {company.location ?? "Location not specified"}
                    </p>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                  </div>

                  <Link
                    to={`/jobs?companyId=${company.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View open roles
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No companies found"
            description="Try a different search term."
          />
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
