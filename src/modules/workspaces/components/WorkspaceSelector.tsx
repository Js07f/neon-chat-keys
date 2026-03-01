import { useState } from "react";
import { Plus, Briefcase, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Workspace } from "../hooks/useWorkspaces";

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function WorkspaceSelector({
  workspaces,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: WorkspaceSelectorProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const active = workspaces.find((w) => w.id === activeId);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim());
      setNewName("");
      setCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
      setEditingId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 max-w-[180px] truncate text-xs h-8">
          <Briefcase className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span className="truncate">{active?.name || "Workspace"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            className="flex items-center justify-between gap-2"
            onSelect={(e) => {
              if (editingId === ws.id) {
                e.preventDefault();
                return;
              }
              onSelect(ws.id);
            }}
          >
            {editingId === ws.id ? (
              <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 text-xs"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleRename(ws.id)}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRename(ws.id)}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                <span className={`truncate text-xs ${ws.id === activeId ? "text-primary font-medium" : ""}`}>
                  {ws.name}
                </span>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(ws.id);
                      setEditName(ws.name);
                    }}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </Button>
                  {workspaces.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(ws.id);
                      }}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {creating ? (
          <div className="px-2 py-1.5 flex items-center gap-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do workspace"
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate}>
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5 mr-2" />
            <span className="text-xs">Novo workspace</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
