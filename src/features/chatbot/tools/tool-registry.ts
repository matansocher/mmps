import { ToolInstance } from '../types';

/*
Not in use currently, but could be useful for dynamic tool management
*/
const tools = new Map<string, ToolInstance>();

export function registerTool(tool: ToolInstance): void {
  const name = tool.getName();
  if (tools.has(name)) {
    console.warn(`Tool ${name} is already registered. Overwriting...`);
  }
  tools.set(name, tool);
}

export function getTool(name: string): ToolInstance | undefined {
  return tools.get(name);
}

export function getAllTools(): ToolInstance[] {
  return Array.from(tools.values());
}
