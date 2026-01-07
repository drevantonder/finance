// Agentic Kanban Configuration

export interface DeveloperDefinition {
  name: string;
  model: string;
}

export interface AgenticKanbanConfig {
  // Base branch for creating feature branches
  baseBranch: string;
  
  // Available developer models (enabled state is in fleet.json)
  developers: DeveloperDefinition[];
  
  // Sleep durations (in milliseconds)
  sleep: {
    pm: number;
    developer: number;
  };
}

export const config: AgenticKanbanConfig = {
  // Change this to test on a different branch (e.g., "move-to-kanban-workflow")
  baseBranch: "prod",
  
  developers: [
    {
      name: "glm-4.7",
      model: "zai-coding-plan/glm-4.7"
    },
    {
      name: "gemini-3-flash",
      model: "google/gemini-3-flash-preview"
    },
    {
      name: "minimax-m2.1",
      model: "opencode/minimax-m2.1-free"
    }
  ],
  
  sleep: {
    pm: 10000,        // 10 seconds
    developer: 30000  // 30 seconds
  }
};
