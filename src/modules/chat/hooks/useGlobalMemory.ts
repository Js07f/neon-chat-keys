import { useState, useCallback } from "react";

export interface StyleProfile {
  tone: "strategic" | "casual" | "technical";
  verbosity: "low" | "medium" | "high";
  structure: "loose" | "organized" | "structured";
}

export interface GlobalMemory {
  styleProfile: StyleProfile;
  longTermGoals: string[];
  behavioralFlags: string[];
  lastUpdated: string;
}

const STORAGE_KEY = "neonchat_global_memory";

const DEFAULT_MEMORY: GlobalMemory = {
  styleProfile: {
    tone: "strategic",
    verbosity: "medium",
    structure: "organized",
  },
  longTermGoals: [],
  behavioralFlags: [],
  lastUpdated: new Date().toISOString(),
};

function load(): GlobalMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_MEMORY, ...JSON.parse(raw) } : DEFAULT_MEMORY;
  } catch {
    return DEFAULT_MEMORY;
  }
}

function save(memory: GlobalMemory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

const MEMORY_TRIGGERS = [
  "projeto", "arquitetura", "produto", "estrutura",
  "planejamento", "estratégia", "stack", "roadmap",
  "objetivo", "meta", "plano", "sistema",
];

export function shouldInjectMemory(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  return MEMORY_TRIGGERS.some((t) => lower.includes(t));
}

export function buildMemoryPrompt(memory: GlobalMemory): string {
  const parts: string[] = [
    "Ajuste o estilo de resposta com base no perfil implícito do usuário.",
    "",
    "Regras:",
    "- Não mencione o perfil explicitamente.",
    "- Não repita padrões estruturais idênticos.",
    "- Varie ritmo e construção entre respostas.",
    "- Use memória apenas quando relevante ao contexto.",
    "- Evite reafirmar preferências já implícitas.",
    "- Seja natural.",
    "",
    `Tom preferido: ${memory.styleProfile.tone}.`,
    `Nível de detalhe: ${memory.styleProfile.verbosity}.`,
    `Estrutura: ${memory.styleProfile.structure}.`,
  ];

  if (memory.longTermGoals.length > 0) {
    parts.push("", "Direcione respostas considerando os interesses de longo prazo do usuário de forma sutil.");
  }

  if (memory.behavioralFlags.length > 0) {
    parts.push("", "Considere sutilmente as seguintes preferências comportamentais sem mencioná-las.");
  }

  return parts.join("\n");
}

export function useGlobalMemory() {
  const [memory, setMemory] = useState<GlobalMemory>(load);

  const update = useCallback((updates: Partial<GlobalMemory>) => {
    setMemory((prev) => {
      const next = { ...prev, ...updates, lastUpdated: new Date().toISOString() };
      save(next);
      return next;
    });
  }, []);

  const updateStyle = useCallback((updates: Partial<StyleProfile>) => {
    setMemory((prev) => {
      const next = {
        ...prev,
        styleProfile: { ...prev.styleProfile, ...updates },
        lastUpdated: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  const addGoal = useCallback((goal: string) => {
    setMemory((prev) => {
      if (prev.longTermGoals.includes(goal)) return prev;
      const next = {
        ...prev,
        longTermGoals: [...prev.longTermGoals, goal].slice(-10),
        lastUpdated: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  const removeGoal = useCallback((goal: string) => {
    setMemory((prev) => {
      const next = {
        ...prev,
        longTermGoals: prev.longTermGoals.filter((g) => g !== goal),
        lastUpdated: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  const addFlag = useCallback((flag: string) => {
    setMemory((prev) => {
      if (prev.behavioralFlags.includes(flag)) return prev;
      const next = {
        ...prev,
        behavioralFlags: [...prev.behavioralFlags, flag].slice(-10),
        lastUpdated: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  const removeFlag = useCallback((flag: string) => {
    setMemory((prev) => {
      const next = {
        ...prev,
        behavioralFlags: prev.behavioralFlags.filter((f) => f !== flag),
        lastUpdated: new Date().toISOString(),
      };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const fresh = { ...DEFAULT_MEMORY, lastUpdated: new Date().toISOString() };
    save(fresh);
    setMemory(fresh);
  }, []);

  return { memory, update, updateStyle, addGoal, removeGoal, addFlag, removeFlag, reset };
}
