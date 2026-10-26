import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { taxonomyApi } from "@/lib/api-client";

export default function AdminTaxonomyPage() {
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [skillName, setSkillName] = useState("");

  const categories = useQuery({
    queryKey: ["categories", "admin"],
    queryFn: () => taxonomyApi.categories(false),
  });

  const skills = useQuery({
    queryKey: ["skills", "admin"],
    queryFn: () => taxonomyApi.skills(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["skills"] });
  };

  const addCategory = useMutation({
    mutationFn: () =>
      taxonomyApi.createCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Category created");
      setCategoryName("");
      setCategoryDescription("");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not create the category")),
  });

  const toggleCategory = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      taxonomyApi.updateCategory(payload.id, { isActive: payload.isActive }),
    onSuccess: () => {
      toast.success("Category updated");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => taxonomyApi.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not delete the category")),
  });

  const addSkill = useMutation({
    mutationFn: () => taxonomyApi.createSkill({ name: skillName.trim() }),
    onSuccess: () => {
      toast.success("Skill created");
      setSkillName("");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not create the skill")),
  });

  const removeSkill = useMutation({
    mutationFn: (id: string) => taxonomyApi.deleteSkill(id),
    onSuccess: () => {
      toast.success("Skill deleted");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageHeader
        title="Categories & skills"
        description="Maintain the taxonomy that powers job filters and match scores."
      />

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        {/* ── Categories tab ── */}
        <TabsContent value="categories">
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Create form */}
            <div className="rounded-lg border bg-card">
              <div className="border-b px-5 py-3.5">
                <p className="text-sm font-semibold text-foreground">New category</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <Label htmlFor="categoryName">Name</Label>
                  <Input
                    id="categoryName"
                    placeholder="Data Science"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && categoryName.trim()) addCategory.mutate();
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoryDescription">Description</Label>
                  <Input
                    id="categoryDescription"
                    placeholder="Analytics, ML and AI roles"
                    value={categoryDescription}
                    onChange={(event) => setCategoryDescription(event.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={addCategory.isPending || !categoryName.trim()}
                  onClick={() => addCategory.mutate()}
                >
                  <Plus className="h-4 w-4" /> Create category
                </Button>
              </div>
            </div>

            {/* Categories table */}
            <div className="rounded-lg border bg-card">
              <div className="border-b px-5 py-3.5">
                <p className="text-sm font-semibold text-foreground">
                  Categories
                  {categories.data ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {categories.data.length} total
                    </span>
                  ) : null}
                </p>
              </div>
              {categories.isLoading ? (
                <div className="p-5">
                  <TableSkeleton rows={4} />
                </div>
              ) : categories.data?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Name
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Description
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Visibility
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {categories.data.map((category) => (
                        <tr key={category.id} className="hover:bg-muted/40">
                          <td className="px-5 py-3.5 font-medium text-foreground">
                            {category.name}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {category.description ?? (
                              <span className="italic text-muted-foreground/60">No description</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={category.isActive ? "success" : "secondary"}>
                              {category.isActive ? "Active" : "Hidden"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={toggleCategory.isPending}
                                onClick={() =>
                                  toggleCategory.mutate({
                                    id: category.id,
                                    isActive: !category.isActive,
                                  })
                                }
                              >
                                {category.isActive ? "Hide" : "Show"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete category"
                                disabled={removeCategory.isPending}
                                onClick={() => removeCategory.mutate(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState icon={Tags} title="No categories yet" />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Skills tab ── */}
        <TabsContent value="skills">
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Create form */}
            <div className="rounded-lg border bg-card">
              <div className="border-b px-5 py-3.5">
                <p className="text-sm font-semibold text-foreground">New skill</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <Label htmlFor="skillName">Skill name</Label>
                  <Input
                    id="skillName"
                    placeholder="Kubernetes"
                    value={skillName}
                    onChange={(event) => setSkillName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && skillName.trim()) addSkill.mutate();
                    }}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={addSkill.isPending || !skillName.trim()}
                  onClick={() => addSkill.mutate()}
                >
                  <Plus className="h-4 w-4" /> Create skill
                </Button>
                <p className="text-xs text-muted-foreground">
                  Skills added here appear as quick-add chips on job seeker profiles.
                </p>
              </div>
            </div>

            {/* Skills table */}
            <div className="rounded-lg border bg-card">
              <div className="border-b px-5 py-3.5">
                <p className="text-sm font-semibold text-foreground">
                  Skills
                  {skills.data ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {skills.data.length} total
                    </span>
                  ) : null}
                </p>
              </div>
              {skills.isLoading ? (
                <div className="p-5">
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : skills.data?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Skill name
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {skills.data.map((skill) => (
                        <tr key={skill.id} className="hover:bg-muted/40">
                          <td className="px-5 py-3 font-medium text-foreground">{skill.name}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${skill.name}`}
                                disabled={removeSkill.isPending}
                                onClick={() => removeSkill.mutate(skill.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState icon={Tags} title="No skills defined yet" />
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
