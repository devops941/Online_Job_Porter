import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Building2, FileText, Search, ShieldCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar, PublicFooter } from "@/components/layout/public-navbar";
import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { jobApi, taxonomyApi } from "@/lib/api-client";

export default function LandingPage() {
  const latest = useQuery({
    queryKey: ["jobs", "latest"],
    queryFn: () => jobApi.search({ pageSize: 6, sort: "newest" }),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => taxonomyApi.categories(),
  });

  const totals = latest.data?.total ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <section className="relative overflow-hidden border-b">
        <div className="surface-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="container relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <Badge variant="info" className="mx-auto">
              {totals > 0 ? `${totals} live openings` : "Now hiring"}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Find the job that fits your life
            </h1>
            <p className="text-lg text-muted-foreground">
              One portal for job seekers, employers and administrators. Search roles, apply with a
              parsed resume, and track every stage of the hiring pipeline.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/jobs">
                  <Search /> Browse jobs
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/register">
                  Post a job <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { icon: Users, label: "Job seekers", text: "Build a profile, upload resumes, get AI match scores." },
              { icon: Building2, label: "Employers", text: "Post roles, shortlist applicants, schedule interviews." },
              { icon: ShieldCheck, label: "Admins", text: "Moderate listings, approve employers, export reports." },
            ].map((item) => (
              <Card key={item.label} className="text-left">
                <CardContent className="space-y-2 p-5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Browse by category</h2>
            <p className="text-sm text-muted-foreground">Pick a field and jump straight in.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))
            : categories.data?.map((category) => (
                <Link
                  key={category.id}
                  to={`/jobs?categoryId=${category.id}`}
                  className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
                >
                  <p className="font-medium">{category.name}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {category.description ?? "Explore open roles in this field."}
                  </p>
                </Link>
              ))}
        </div>
      </section>

      <section className="container pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Latest openings</h2>
            <p className="text-sm text-muted-foreground">Freshly approved roles from our employers.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jobs">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>

        {latest.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full" />
            ))}
          </div>
        ) : latest.data?.items.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {latest.data.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No jobs published yet"
            description="Once an administrator approves employer listings they will show up here."
          />
        )}
      </section>

      <section className="border-t bg-muted/30">
        <div className="container flex flex-col items-center gap-4 py-14 text-center">
          <FileText className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Ready to take the next step?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Create a free account as a job seeker or register your company to start hiring today.
          </p>
          <Button size="lg" asChild>
            <Link to="/register">Create your account</Link>
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
