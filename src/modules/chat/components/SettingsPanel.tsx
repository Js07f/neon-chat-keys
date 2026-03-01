import { useState } from "react";
import { Settings, Plus, Trash2, Save, X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { UserSettings, ResponseStyle, CustomMode } from "../types";
import type { GlobalMemory, StyleProfile } from "../hooks/useGlobalMemory";

interface SettingsPanelProps {
  settings: UserSettings | null;
  customModes: CustomMode[];
  globalMemory: GlobalMemory;
  onUpdateSettings: (updates: Partial<Omit<UserSettings, "user_id">>) => void;
  onCreateMode: (name: string, instructions: string) => void;
  onUpdateMode: (id: string, name: string, instructions: string) => void;
  onDeleteMode: (id: string) => void;
  onUpdateStyle: (updates: Partial<StyleProfile>) => void;
  onAddGoal: (goal: string) => void;
  onRemoveGoal: (goal: string) => void;
  onResetMemory: () => void;
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

function GlobalMemoryTab({ memory, onUpdateStyle, onAddGoal, onRemoveGoal, onReset }: {
  memory: GlobalMemory;
  onUpdateStyle: (u: Partial<StyleProfile>) => void;
  onAddGoal: (g: string) => void;
  onRemoveGoal: (g: string) => void;
  onReset: () => void;
}) {
  const [newGoal, setNewGoal] = useState("");

  const toneOptions: StyleProfile["tone"][] = ["casual", "strategic", "technical"];
  const verbosityOptions: StyleProfile["verbosity"][] = ["low", "medium", "high"];
  const structureOptions: StyleProfile["structure"][] = ["loose", "organized", "structured"];

  const labels = {
    casual: "Casual", strategic: "Estratégico", technical: "Técnico",
    low: "Baixa", medium: "Média", high: "Alta",
    loose: "Livre", organized: "Organizado", structured: "Estruturado",
  };

  const renderToggle = <T extends string>(label: string, options: T[], current: T, onChange: (v: T) => void) => (
    <div>
      <label className="text-xs text-muted-foreground mb-2 block">{label}</label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              current === opt
                ? "bg-primary text-primary-foreground neon-glow"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels[opt as keyof typeof labels] || opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderToggle("Tom", toneOptions, memory.styleProfile.tone, (v) => onUpdateStyle({ tone: v }))}
      {renderToggle("Verbosidade", verbosityOptions, memory.styleProfile.verbosity, (v) => onUpdateStyle({ verbosity: v }))}
      {renderToggle("Estrutura", structureOptions, memory.styleProfile.structure, (v) => onUpdateStyle({ structure: v }))}

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Objetivos de Longo Prazo</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Ex: Construir SaaS de IA"
            className="bg-secondary/50 border-border text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newGoal.trim()) {
                onAddGoal(newGoal.trim());
                setNewGoal("");
              }
            }}
          />
          <Button size="sm" disabled={!newGoal.trim()} onClick={() => { onAddGoal(newGoal.trim()); setNewGoal(""); }}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        {memory.longTermGoals.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {memory.longTermGoals.map((goal) => (
              <Badge key={goal} variant="secondary" className="text-xs gap-1 pr-1">
                <Target className="w-3 h-3" />
                {goal}
                <button onClick={() => onRemoveGoal(goal)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum objetivo definido.</p>
        )}
      </div>

      <Button size="sm" variant="outline" className="w-full text-xs" onClick={onReset}>
        Resetar Memória Global
      </Button>
    </div>
  );
}

export default function SettingsPanel({
  settings, customModes, globalMemory,
  onUpdateSettings, onCreateMode, onUpdateMode, onDeleteMode,
  onUpdateStyle, onAddGoal, onRemoveGoal, onResetMemory,
}: SettingsPanelProps) {
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
            <TabsTrigger value="memory" className="flex-1 text-xs">Memória</TabsTrigger>
            <TabsTrigger value="modes" className="flex-1 text-xs">Modos</TabsTrigger>
          </TabsList>
          <TabsContent value="personality" className="mt-3">
            <PersonalityTab settings={settings} onUpdate={onUpdateSettings} />
          </TabsContent>
          <TabsContent value="memory" className="mt-3">
            <GlobalMemoryTab
              memory={globalMemory}
              onUpdateStyle={onUpdateStyle}
              onAddGoal={onAddGoal}
              onRemoveGoal={onRemoveGoal}
              onReset={onResetMemory}
            />
          </TabsContent>
          <TabsContent value="modes" className="mt-3">
            <ModesTab customModes={customModes} onCreate={onCreateMode} onUpdate={onUpdateMode} onDelete={onDeleteMode} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
