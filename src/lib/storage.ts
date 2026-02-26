// Storage abstraction layer - ready for chrome.storage.sync migration

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  images?: string[];
}

const STORAGE_KEY = "neonchat_conversations";
const LICENSE_KEY = "neonchat_license_key";

export const storage = {
  getConversations(): Conversation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveConversations(conversations: Conversation[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  },

  addConversation(conversation: Conversation) {
    const convos = this.getConversations();
    convos.unshift(conversation);
    this.saveConversations(convos);
  },

  updateConversation(id: string, updates: Partial<Conversation>) {
    const convos = this.getConversations();
    const idx = convos.findIndex((c) => c.id === id);
    if (idx !== -1) {
      convos[idx] = { ...convos[idx], ...updates, updatedAt: new Date().toISOString() };
      this.saveConversations(convos);
    }
  },

  deleteConversation(id: string) {
    const convos = this.getConversations().filter((c) => c.id !== id);
    this.saveConversations(convos);
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  },

  exportJSON(): string {
    return JSON.stringify(this.getConversations(), null, 2);
  },

  getLicenseKey(): string | null {
    return localStorage.getItem(LICENSE_KEY);
  },

  setLicenseKey(key: string) {
    localStorage.setItem(LICENSE_KEY, key);
  },

  removeLicenseKey() {
    localStorage.removeItem(LICENSE_KEY);
  },
};
