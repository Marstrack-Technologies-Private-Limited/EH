import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Layers, Tag, RotateCcw, ChevronDown } from "lucide-react";
import PageHeader from "@/components/layout/page-header.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { categoryIcon } from "@/components/icon-map.js";
import { RoleBadge } from "@/components/role-badge.jsx";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useApp } from "@/store/app-store.jsx";
import { cn } from "@/lib/utils.js";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function Admin() {
  const { user } = useAuth();
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(null); // expanded category id
  const [newCat, setNewCat] = useState("");
  const [topicInputs, setTopicInputs] = useState({});

  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const addCategory = () => {
    if (!newCat.trim()) return;
    dispatch({
      type: "ADD_CATEGORY",
      category: { id: `cat_${slug(newCat)}_${Date.now()}`, name: newCat.trim(), icon: "Tag", topics: [] },
    });
    toast.success(`Category "${newCat.trim()}" added.`);
    setNewCat("");
  };

  const addTopic = (catId) => {
    const name = (topicInputs[catId] || "").trim();
    if (!name) return;
    dispatch({
      type: "ADD_TOPIC",
      categoryId: catId,
      topic: { id: `t_${slug(name)}_${Date.now()}`, name },
    });
    setTopicInputs((s) => ({ ...s, [catId]: "" }));
    toast.success(`Topic "${name}" added.`);
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <PageHeader
        title="Admin panel"
        description="Manage the category & topic taxonomy and review platform members."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Reset all demo data to defaults? This clears local changes.")) {
                dispatch({ type: "RESET" });
                toast.success("Demo data reset.");
              }
            }}
          >
            <RotateCcw className="size-4" /> Reset demo data
          </Button>
        }
      />

      <Tabs defaultValue="taxonomy">
        <TabsList>
          <TabsTrigger value="taxonomy"><Layers className="size-4" /> Taxonomy</TabsTrigger>
          <TabsTrigger value="members"><Tag className="size-4" /> Members</TabsTrigger>
        </TabsList>

        <TabsContent value="taxonomy" className="space-y-4">
          {/* add category */}
          <Card>
            <CardHeader><CardTitle className="text-base">Add a category</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="e.g. Legal & Compliance"
              />
              <Button onClick={addCategory}><Plus className="size-4" /> Add</Button>
            </CardContent>
          </Card>

          {/* categories */}
          <div className="space-y-3">
            {state.categories.map((c) => {
              const Icon = categoryIcon(c.icon);
              const expanded = open === c.id;
              return (
                <Card key={c.id}>
                  <button
                    onClick={() => setOpen(expanded ? null : c.id)}
                    className="flex w-full items-center gap-3 p-4 text-left cursor-pointer"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.topics.length} topics</p>
                    </div>
                    <Badge variant="muted">{c.topics.length}</Badge>
                    <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                  </button>

                  {expanded && (
                    <CardContent className="space-y-3 border-t pt-4">
                      <div className="flex flex-wrap gap-2">
                        {c.topics.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 rounded-full border bg-background py-1 pl-3 pr-1.5 text-sm"
                          >
                            {t.name}
                            <button
                              onClick={() => dispatch({ type: "DELETE_TOPIC", categoryId: c.id, topicId: t.id })}
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              aria-label="Delete topic"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </span>
                        ))}
                        {c.topics.length === 0 && (
                          <span className="text-sm text-muted-foreground">No topics yet.</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={topicInputs[c.id] || ""}
                          onChange={(e) => setTopicInputs((s) => ({ ...s, [c.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addTopic(c.id)}
                          placeholder="New topic name…"
                          className="h-9"
                        />
                        <Button size="sm" onClick={() => addTopic(c.id)}><Plus className="size-4" /> Topic</Button>
                      </div>
                      <DeleteCategory category={c} onDelete={() => dispatch({ type: "DELETE_CATEGORY", categoryId: c.id })} />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="divide-y p-0">
              {state.users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <UserAvatar user={u} className="size-10" showStatus />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">{u.city}, {u.country}</span>
                  <RoleBadge role={u.role} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeleteCategory({ category, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="size-4" /> Delete category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{category.name}"?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This removes the category and its {category.topics.length} topics. Members keep any
          topics they already selected.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
