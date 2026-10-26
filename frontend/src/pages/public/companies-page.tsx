import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Globe, MapPin, Search } from "lucide-react";
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
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />

      <div className="container flex-1 py-8">
        {/* Page header */}
        <div className="mb-6 space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Companies hiring now
          </h1>
          <p className="text-sm text-muted-foreground">
            Explore verified companies publishing roles on the portal.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search companies"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>

        {/* List */}
        {companies.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : companies.data?.length ? (
          <div className="space-y-3">
            {companies.data.map((company) => (
              <div
                key={company.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/40"
              >
                {/* Logo / icon */}
                <div className="hidden shrink-0 sm:flex">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="h-11 w-11 rounded border object-contain bg-muted p-0.5"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded border bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{company.name}</p>
                    {company.isVerified ? (
                      <Badge variant="success" className="text-[11px]">
                        Verified
                      </Badge>
                    ) : null}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {company.industry ? <span>{company.industry}</span> : null}
                    {company.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {company.location}
                      </span>
                    ) : null}
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="h-3 w-3" />
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null}
                  </p>
                  {company.description ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {company.description}
                    </p>
                  ) : null}
                </div>

                {/* Action */}
                <Link
                  to={`/jobs?companyId=${company.id}`}
                  className="ml-auto hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
                >
                  View roles <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
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
