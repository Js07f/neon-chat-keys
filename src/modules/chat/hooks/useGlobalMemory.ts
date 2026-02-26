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
  "planejamento", "planejar", "roadmap",
  "arquitetura", "estrutura do sistema", "design do sistema",
  "construir produto", "produto digital", "mvp", "saas",
  "decisão técnica", "qual stack", "qual tecnologia", "escolher entre",
  "organização", "organizar sistema", "módulos", "microserviço",
  "estratégia técnica", "estratégia de produto",
];

const MIN_LENGTH_FOR_MEMORY = 20;

export function shouldInjectMemory(userMessage: string): boolean {
  if (userMessage.length < MIN_LENGTH_FOR_MEMORY) return false;
  const lower = userMessage.toLowerCase();
  return MEMORY_TRIGGERS.some((t) => lower.includes(t));
}

export function buildMemoryPrompt(memory: GlobalMemory): string {
  const parts: string[] = [
    "Esta pergunta envolve planejamento, arquitetura ou decisões técnicas.",
    "Ajuste sutilmente o estilo com base no perfil implícito do usuário.",
    "",
    "Regras estritas:",
    "- Não mencione o perfil ou a memória.",
    "- Não expanda desnecessariamente.",
    "- Para perguntas diretas dentro do tema, seja objetivo.",
    "- Varie formato e ritmo entre respostas.",
    "- Seja natural, nunca robótico.",
    "",
    `Tom: ${memory.styleProfile.tone}. Detalhe: ${memory.styleProfile.verbosity}. Estrutura: ${memory.styleProfile.structure}.`,
  ];

  if (memory.longTermGoals.length > 0) {
    parts.push("Considere sutilmente os interesses de longo prazo do usuário.");
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
