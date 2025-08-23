import { ToolInstance } from '../types';

class ToolRegistry {
  private tools = new Map<string, ToolInstance>();

  registerTool(tool: ToolInstance): void {
    const name = tool.getName();
    if (this.tools.has(name)) {
      console.warn(`Tool ${name} is already registered. Overwriting...`);
    }
    this.tools.set(name, tool);
    console.log(`Registered tool: ${name}`);
  }

  getTool(name: string): ToolInstance | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolInstance[] {
    return Array.from(this.tools.values());
  }

  findToolsForRequest(userRequest: string): ToolInstance[] {
    const request = userRequest.toLowerCase();
    return this.getAllTools().filter((tool) => {
      const keywords = tool.getKeywords();
      return keywords.some((keyword) => request.includes(keyword.toLowerCase()));
    });
  }

  getToolsInfo(): Array<{ name: string; description: string; parameters: any[]; keywords: string[] }> {
    return this.getAllTools().map((tool) => ({
      name: tool.getName(),
      description: tool.getDescription(),
      parameters: tool.getParameters(),
      keywords: tool.getKeywords(),
    }));
  }
}

// Create singleton instance
export const toolRegistry = new ToolRegistry();

// Helper functions
export function registerTool(tool: ToolInstance): void {
  toolRegistry.registerTool(tool);
}

export function getTool(name: string): ToolInstance | undefined {
  return toolRegistry.getTool(name);
}

export function getAllTools(): ToolInstance[] {
  return toolRegistry.getAllTools();
}

export function findToolsForRequest(userRequest: string): ToolInstance[] {
  return toolRegistry.findToolsForRequest(userRequest);
}

export function getToolsInfo(): Array<{ name: string; description: string; parameters: any[]; keywords: string[] }> {
  return toolRegistry.getToolsInfo();
}
