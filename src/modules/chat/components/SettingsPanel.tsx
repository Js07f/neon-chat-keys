import { useState } from "react";
import { Settings, Plus, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserSettings, ResponseStyle, CustomMode } from "../types";

interface SettingsPanelProps {
  settings: UserSettings | null;
  customModes: CustomMode[];
  onUpdateSettings: (updates: Partial<Omit<UserSettings, "user_id">>) => void;
  onCreateMode: (name: string, instructions: string) => void;
  onUpdateMode: (id: string, name: string, instructions: string) => void;
  onDeleteMode: (id: string) => void;
}

function PersonalityTab({ settings, onUpdate }: {
  settings: UserSettings | null;
  onUpdate: (u: Partial<Omit<UserSettings, "user_id">>) => void;
}) {
  const [prompt, setPrompt] = useState(settings?.personality_prompt || "");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Personalidade Customizada</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: Responda sempre com exemplos de código em Python..."
          className="min-h-[120px] bg-secondary/50 border-border text-sm"
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Essa personalidade é adicionada sobre a personalidade global base.
        </p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          Temperatura: {settings?.temperature_preference?.toFixed(1) || "0.7"}
        </label>
        <Slider
          value={[settings?.temperature_preference || 0.7]}
          onValueChange={([v]) => onUpdate({ temperature_preference: v })}
          min={0.2}
          max={1.2}
          step={0.1}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Preciso</span>
          <span>Criativo</span>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Estilo de Resposta</label>
        <div className="flex gap-2">
          {(["concise", "balanced", "detailed"] as ResponseStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => onUpdate({ response_style: style })}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                settings?.response_style === style
                  ? "bg-primary text-primary-foreground neon-glow"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {{ concise: "Conciso", balanced: "Balanceado", detailed: "Detalhado" }[style]}
            </button>
          ))}
        </div>
      </div>

      <Button
        size="sm"
        className="w-full neon-glow"
        onClick={() => onUpdate({ personality_prompt: prompt || null })}
      >
        <Save className="w-3.5 h-3.5 mr-2" />
        Salvar Personalidade
      </Button>
    </div>
  );
}

function ModesTab({ customModes, onCreate, onUpdate, onDelete }: {
  customModes: CustomMode[];
  onCreate: (name: string, instructions: string) => void;
  onUpdate: (id: string, name: string, instructions: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  const handleCreate = () => {
    if (!newName.trim() || !newInstructions.trim()) return;
    onCreate(newName.trim(), newInstructions.trim());
    setNewName("");
    setNewInstructions("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Criar Modo Personalizado</label>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do modo"
          className="bg-secondary/50 border-border text-sm"
        />
        <Textarea
          value={newInstructions}
          onChange={(e) => setNewInstructions(e.target.value)}
          placeholder="Instruções do modo..."
          className="min-h-[80px] bg-secondary/50 border-border text-sm"
          rows={3}
        />
        <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || !newInstructions.trim()} className="w-full">
          <Plus className="w-3.5 h-3.5 mr-2" />
          Criar Modo
        </Button>
      </div>

      {customModes.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Modos Personalizados</label>
          {customModes.map((cm) => (
            <div key={cm.id} className="bg-secondary/30 rounded-lg p-3 neon-border">
              {editingId === cm.id ? (
                <div className="space-y-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary/50 border-border text-sm" />
                  <Textarea value={editInstructions} onChange={(e) => setEditInstructions(e.target.value)} className="min-h-[60px] bg-secondary/50 border-border text-sm" rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { onUpdate(cm.id, editName, editInstructions); setEditingId(null); }} className="flex-1">
                      <Save className="w-3 h-3 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">🧩 {cm.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{cm.instructions}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditingId(cm.id); setEditName(cm.name); setEditInstructions(cm.instructions); }}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(cm.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPanel({ settings, customModes, onUpdateSettings, onCreateMode, onUpdateMode, onDeleteMode }: SettingsPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-sidebar border-border w-80">
        <SheetHeader>
          <SheetTitle className="text-primary neon-text">Configurações</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="personality" className="mt-4">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="personality" className="flex-1 text-xs">Personalidade</TabsTrigger>
            <TabsTrigger value="modes" className="flex-1 text-xs">Modos</TabsTrigger>
          </TabsList>
          <TabsContent value="personality" className="mt-3">
            <PersonalityTab settings={settings} onUpdate={onUpdateSettings} />
          </TabsContent>
          <TabsContent value="modes" className="mt-3">
            <ModesTab customModes={customModes} onCreate={onCreateMode} onUpdate={onUpdateMode} onDelete={onDeleteMode} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
