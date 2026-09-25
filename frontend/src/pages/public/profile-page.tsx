import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, SkillChips } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { apiErrorMessage } from "@/lib/api";
import { authApi, profileApi, taxonomyApi, userApi } from "@/lib/api-client";
import { titleCase } from "@/lib/utils";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const isSeeker = user?.role === "job_seeker";
  const isEmployer = user?.role === "employer";

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [education, setEducation] = useState("");
  const [summary, setSummary] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const [designation, setDesignation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const seekerProfile = useQuery({
    queryKey: ["profile", "seeker", "me"],
    queryFn: () => profileApi.seekerMe(),
    enabled: isSeeker,
  });

  const employerProfile = useQuery({
    queryKey: ["profile", "employer", "me"],
    queryFn: () => profileApi.employerMe(),
    enabled: isEmployer,
  });

  const knownSkills = useQuery({
    queryKey: ["skills", "all"],
    queryFn: () => taxonomyApi.skills(),
  });

  useEffect(() => {
    const data = seekerProfile.data;
    if (!data) return;
    setHeadline(data.headline ?? "");
    setLocation(data.location ?? "");
    setEducation(data.education ?? "");
    setSummary(data.summary ?? "");
    setExperienceYears(data.experienceYears?.toString() ?? "");
    setSkills(data.skills ?? []);
  }, [seekerProfile.data]);

  useEffect(() => {
    const data = employerProfile.data;
    if (!data) return;
    setDesignation(data.designation ?? "");
    setCompanyName(data.company?.name ?? "");
    setCompanyIndustry(data.company?.industry ?? "");
    setCompanyLocation(data.company?.location ?? "");
    setCompanySize(data.company?.size ?? "");
    setCompanyWebsite(data.company?.website ?? "");
    setCompanyDescription(data.company?.description ?? "");
  }, [employerProfile.data]);

  const saveAccount = useMutation({
    mutationFn: () => userApi.updateMe({ fullName: fullName.trim() }),
    onSuccess: (updated) => {
      setUser(updated);
      toast.success("Account details saved");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveSeeker = useMutation({
    mutationFn: () =>
      profileApi.updateSeekerMe({
        headline,
        location,
        education,
        summary,
        skills,
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      void queryClient.invalidateQueries({ queryKey: ["profile", "seeker"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "job-seeker"] });
      void queryClient.invalidateQueries({ queryKey: ["jobs", "recommended"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const saveEmployer = useMutation({
    mutationFn: () =>
      profileApi.updateEmployerMe({
        designation,
        company: {
          name: companyName,
          industry: companyIndustry || undefined,
          location: companyLocation || undefined,
          size: companySize || undefined,
          website: companyWebsite || undefined,
          description: companyDescription || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Company profile saved");
      void queryClient.invalidateQueries({ queryKey: ["profile", "employer"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "employer"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const suggestions = (knownSkills.data ?? [])
    .filter((skill) => !skills.includes(skill.name))
    .slice(0, 10);

  return (
    <AppShell>
      <PageHeader
        title="Profile"
        description="Keep your details current — employers and match scores use this information."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {isSeeker ? (
            <Card>
              <CardHeader>
                <CardTitle>Job seeker profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {seekerProfile.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="headline">Professional headline</Label>
                      <Input
                        id="headline"
                        placeholder="Backend Engineer with 5 years in Python"
                        value={headline}
                        onChange={(event) => setHeadline(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="Bengaluru, India"
                          value={location}
                          onChange={(event) => setLocation(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="experience">Years of experience</Label>
                        <Input
                          id="experience"
                          type="number"
                          min={0}
                          max={60}
                          value={experienceYears}
                          onChange={(event) => setExperienceYears(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="education">Education</Label>
                      <Input
                        id="education"
                        placeholder="B.Tech Computer Science"
                        value={education}
                        onChange={(event) => setEducation(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="summary">Professional summary</Label>
                      <Textarea
                        id="summary"
                        rows={4}
                        placeholder="A short paragraph about what you do best."
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Skills</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a skill and press Enter"
                          value={skillInput}
                          onChange={(event) => setSkillInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && skillInput.trim()) {
                              event.preventDefault();
                              if (!skills.includes(skillInput.trim())) {
                                setSkills([...skills, skillInput.trim()]);
                              }
                              setSkillInput("");
                            }
                          }}
                        />
                      </div>
                      {skills.length ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {skills.map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium hover:bg-destructive/15"
                              onClick={() => setSkills(skills.filter((entry) => entry !== skill))}
                            >
                              {skill} ×
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Add skills to improve your match scores.
                        </p>
                      )}
                      {suggestions.length ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {suggestions.map((skill) => (
                            <button
                              key={skill.id}
                              type="button"
                              className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                              onClick={() => setSkills([...skills, skill.name])}
                            >
                              + {skill.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <Button disabled={saveSeeker.isPending} onClick={() => saveSeeker.mutate()}>
                      <Save /> {saveSeeker.isPending ? "Saving…" : "Save profile"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          {isEmployer ? (
            <Card>
              <CardHeader>
                <CardTitle>Company profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {employerProfile.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="companyName">Company name</Label>
                        <Input
                          id="companyName"
                          value={companyName}
                          onChange={(event) => setCompanyName(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="designation">Your designation</Label>
                        <Input
                          id="designation"
                          placeholder="Head of Engineering"
                          value={designation}
                          onChange={(event) => setDesignation(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          value={companyIndustry}
                          onChange={(event) => setCompanyIndustry(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="companyLocation">Head office</Label>
                        <Input
                          id="companyLocation"
                          value={companyLocation}
                          onChange={(event) => setCompanyLocation(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="size">Company size</Label>
                        <Input
                          id="size"
                          placeholder="51-200"
                          value={companySize}
                          onChange={(event) => setCompanySize(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          placeholder="https://example.com"
                          value={companyWebsite}
                          onChange={(event) => setCompanyWebsite(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="description">About the company</Label>
                      <Textarea
                        id="description"
                        rows={4}
                        value={companyDescription}
                        onChange={(event) => setCompanyDescription(event.target.value)}
                      />
                    </div>
                    <Button disabled={saveEmployer.isPending} onClick={() => saveEmployer.mutate()}>
                      <Save /> {saveEmployer.isPending ? "Saving…" : "Save company profile"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Change password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="current">Current password</Label>
                  <Input
                    id="current"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="next">New password</Label>
                  <Input
                    id="next"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                disabled={changePassword.isPending || !currentPassword || newPassword.length < 8}
                onClick={() => changePassword.mutate()}
              >
                <KeyRound /> Update password
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-4 w-4" /> Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} readOnly disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary">{titleCase(user?.role)}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email verified</span>
                <Badge variant={user?.isVerified ? "success" : "warning"}>
                  {user?.isVerified ? "Verified" : "Pending"}
                </Badge>
              </div>
              {employerProfile.data ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Employer approval</span>
                  <Badge variant={employerProfile.data.isApproved ? "success" : "warning"}>
                    {employerProfile.data.isApproved ? "Approved" : "Pending review"}
                  </Badge>
                </div>
              ) : null}
              <Button
                className="w-full"
                disabled={saveAccount.isPending}
                onClick={() => saveAccount.mutate()}
              >
                <Save /> Save account details
              </Button>
            </CardContent>
          </Card>

          {isSeeker && skills.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SkillChips skills={skills} limit={12} />
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Match scores are recalculated from these skills on every application.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
