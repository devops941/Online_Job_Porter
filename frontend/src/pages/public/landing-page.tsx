import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Building2,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicNavbar, PublicFooter } from "@/components/layout/public-navbar";
import { JobListItem, JobListItemSkeleton } from "@/components/jobs/job-list-item";
import { EmptyState } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { jobApi, taxonomyApi } from "@/lib/api-client";

export default function LandingPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const latest = useQuery({
    queryKey: ["jobs", "latest"],
    queryFn: () => jobApi.search({ pageSize: 6, sort: "newest" }),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => taxonomyApi.categories(),
  });

  const totals = latest.data?.total ?? 0;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location.trim()) params.set("location", location.trim());
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b bg-card">
        <div className="container py-16 sm:py-24">
          <div className="mx-auto max-w-2xl space-y-5 text-center">
            <p className="text-sm font-medium text-primary">
              {totals > 0 ? `${totals.toLocaleString()} live openings` : "Now hiring"}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Find the job that fits your life
            </h1>
            <p className="text-base text-muted-foreground">
              Search thousands of roles, apply with your resume and track every stage of the hiring
              pipeline — all in one place.
            </p>

            {/* Search row */}
            <form
              onSubmit={handleSearch}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 h-11"
                  placeholder="Job title, skill or keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <div className="relative sm:w-52">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 h-11"
                  placeholder="City or Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-11 px-6 shrink-0">
                Search jobs
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Category strip ───────────────────────────────────── */}
      <section className="border-b bg-background">
        <div className="container py-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Browse by category
          </h2>
          {categories.isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-28 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.data?.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/jobs?categoryId=${cat.id}`}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Latest jobs ─────────────────────────────────────── */}
      <section className="container py-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Latest openings
            </h2>
            <p className="text-sm text-muted-foreground">
              Freshly approved roles from verified companies.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jobs">
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {latest.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <JobListItemSkeleton key={i} />
            ))}
          </div>
        ) : latest.data?.items.length ? (
          <div className="space-y-3">
            {latest.data.items.map((job) => (
              <JobListItem key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No jobs published yet"
            description="Once an administrator approves company listings they will show up here."
          />
        )}
      </section>

      {/* ── Stats / trust band ──────────────────────────────── */}
      <section className="border-t bg-card">
        <div className="container py-10">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Users,
                label: "Job Seekers",
                text: "Build a profile, upload resumes and get AI match scores.",
              },
              {
                icon: Building2,
                label: "Companies",
                text: "Post roles, shortlist applicants and schedule interviews.",
              },
              {
                icon: ShieldCheck,
                label: "Admins",
                text: "Moderate listings, approve companies and export reports.",
              },
            ].map((item) => (
              <div key={item.label} className="flex gap-4">
                <div className="mt-0.5 rounded-md border bg-muted p-2 shrink-0">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────────── */}
      <section className="border-t bg-background">
        <div className="container flex flex-col items-center gap-4 py-16 text-center">
          <div className="rounded-md border bg-card p-3">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Ready to take the next step?
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Create a free account as a job seeker or register your company to start hiring today.
          </p>
          <div className="flex gap-3">
            <Button size="lg" asChild>
              <Link to="/register">Create your account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/jobs">Browse jobs</Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
