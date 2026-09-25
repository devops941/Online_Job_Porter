import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
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

        <TabsContent value="categories">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="categoryName">Name</Label>
                  <Input
                    id="categoryName"
                    placeholder="Data Science"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
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
                  <Plus /> Create category
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {categories.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : categories.data?.length ? (
                categories.data.map((category) => (
                  <Card key={category.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{category.name}</p>
                          <Badge variant={category.isActive ? "success" : "secondary"}>
                            {category.isActive ? "Active" : "Hidden"}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {category.description ?? "No description"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
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
                          onClick={() => removeCategory.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState icon={Tags} title="No categories yet" />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New skill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Plus /> Create skill
                </Button>
                <p className="text-xs text-muted-foreground">
                  Skills suggested here appear as quick-add chips on job seeker profiles.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {skills.data ? `${skills.data.length} skills` : "Skills"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {skills.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : skills.data?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.data.map((skill) => (
                      <span
                        key={skill.id}
                        className="group inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium"
                      >
                        {skill.name}
                        <button
                          type="button"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label={`Delete ${skill.name}`}
                          onClick={() => removeSkill.mutate(skill.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Tags} title="No skills defined yet" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
