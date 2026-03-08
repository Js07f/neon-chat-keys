export interface ToolDefinition {
  name: string;
  description: string;
  icon: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface ToolCall {
  tool_name: string;
  input: Record<string, any>;
}

export interface ToolResult {
  tool_name: string;
  output: string;
  duration_ms: number;
}

export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    name: "web_search",
    description: "Busca informações atualizadas na web sobre qualquer tópico. Use quando o usuário perguntar sobre eventos recentes, dados específicos, ou quando precisar de informações que podem ter mudado.",
    icon: "🔍",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "A consulta de busca" },
      },
      required: ["query"],
    },
  },
  {
    name: "math",
    description: "Resolve expressões matemáticas com precisão. Use para cálculos numéricos, conversões, porcentagens e expressões algébricas.",
    icon: "🧮",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "A expressão matemática para calcular (ex: 2+2, 15*3.14, 100/7)" },
      },
      required: ["expression"],
    },
  },
  {
    name: "generate_image",
    description: "Gera imagens a partir de descrições textuais. Use quando o usuário pedir para criar, gerar, desenhar ou fazer uma imagem, ilustração, foto, arte, logo ou qualquer conteúdo visual.",
    icon: "🎨",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Descrição detalhada da imagem a ser gerada em inglês. Traduza o pedido do usuário para inglês e adicione detalhes de estilo." },
      },
      required: ["prompt"],
    },
  },
];

// Convert our tool definitions to OpenAI-compatible format for the AI gateway
export function toolsToOpenAIFormat() {
  return AVAILABLE_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object",
        properties: t.parameters.properties,
        required: t.parameters.required,
        additionalProperties: false,
      },
    },
  }));
}
