export type ChatMode = "default" | "study" | "agent" | "plan" | "ask" | string;

export type ResponseStyle = "concise" | "balanced" | "detailed";

export interface UserSettings {
  user_id: string;
  personality_prompt: string | null;
  default_mode: string;
  temperature_preference: number;
  response_style: ResponseStyle;
}

export interface CustomMode {
  id: string;
  user_id: string;
  name: string;
  instructions: string;
  created_at: string;
}

export const DEFAULT_MODES: Record<string, { label: string; icon: string; instructions: string }> = {
  default: {
    label: "Padrão",
    icon: "💬",
    instructions: "",
  },
  study: {
    label: "Estudo",
    icon: "📚",
    instructions:
      "Você está no modo ESTUDO. Explique conceitos de forma pedagógica e estruturada. Use exemplos práticos, analogias e divida informações complexas em partes digestíveis. Sugira recursos adicionais e exercícios quando relevante.",
  },
  agent: {
    label: "Agente",
    icon: "🤖",
    instructions:
      "Você está no modo AGENTE. Atue de forma proativa e autônoma. Antecipe necessidades, sugira próximos passos, forneça soluções completas e acionáveis. Seja direto e orientado a resultados.",
  },
  plan: {
    label: "Plano",
    icon: "📋",
    instructions:
      "Você está no modo PLANEJAMENTO. Ajude a criar planos estruturados, roadmaps e estratégias. Use listas, timelines, marcos e priorização. Considere riscos, dependências e recursos.",
  },
  ask: {
    label: "Perguntas",
    icon: "❓",
    instructions:
      "Você está no modo PERGUNTAS. Antes de responder, faça perguntas clarificadoras para entender melhor o contexto. Explore diferentes ângulos do problema. Use o método socrático quando apropriado.",
  },
};

export const GLOBAL_PERSONALITY = `Você é um assistente avançado de alto nível, preciso, elegante e estrategicamente inteligente.
Seu tom é sofisticado, profissional e confiante.
Quando apropriado, pode usar leve espirituosidade sutil.
Explique com clareza, demonstre domínio técnico e evite informalidade excessiva.
Seja objetivo quando necessário e detalhado quando útil.
Priorize precisão, atualidade e raciocínio estruturado.
Use Markdown para formatar suas respostas quando apropriado. Quando o usuário enviar imagens, analise-as detalhadamente.`;
