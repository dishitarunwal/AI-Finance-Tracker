// Category ids match the ones the Gemini agent assigns in app/ai_agent.py.
export interface Category {
  id: number;
  name: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 1, name: "Food & Dining", emoji: "🍽️", color: "#f59e0b" },
  { id: 2, name: "Transportation", emoji: "🚕", color: "#3b82f6" },
  { id: 3, name: "Utilities", emoji: "💡", color: "#8b5cf6" },
  { id: 4, name: "Shopping", emoji: "🛍️", color: "#ec4899" },
  { id: 5, name: "Entertainment", emoji: "🎬", color: "#06b6d4" },
  { id: 6, name: "Healthcare", emoji: "🩺", color: "#84cc16" },
  { id: 7, name: "Income", emoji: "💰", color: "#10b981" },
];

const UNCATEGORIZED: Category = { id: 0, name: "Uncategorized", emoji: "📄", color: "#94a3b8" };

export function getCategory(id: number | null | undefined): Category {
  if (!id) return UNCATEGORIZED;
  return CATEGORIES.find((c) => c.id === id) ?? { ...UNCATEGORIZED, id, name: `Category ${id}` };
}
