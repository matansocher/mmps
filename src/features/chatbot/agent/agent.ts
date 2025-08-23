import { z } from 'zod';
import { getAllTools } from '../tools/tool-registry';
import { WeatherTool } from '../tools/weather/weather.tool';
import { AgentDescriptor } from '../types';
import { convertToLangChainTools, createLangChainTool } from '../utils';

const AGENT_NAME = 'CHATBOT';
const AGENT_PROMPT = `
You are a helpful AI assistant chatbot with access to various tools to help answer user questions.

Your role is to:
1. Understand user requests and determine if tools are needed
2. Use appropriate tools to gather information
3. Provide helpful, accurate, and friendly responses
4. Handle errors gracefully and inform users of any issues

Available capabilities:
- Weather information for any location
- General conversation and assistance

Guidelines:
- Be concise but informative in your responses
- Only use tools when necessary to answer the user's question
- If a tool fails, acknowledge the error and provide what help you can
- Always be polite and helpful
- When asked about weather, use the weather tool to get current information
`;

function createWeatherTool() {
  const weatherTool = new WeatherTool();
  const schema = z.object({
    location: z.string().describe('The city or location to get weather for'),
  });

  return createLangChainTool(weatherTool, schema);
}

export function agent(): AgentDescriptor {
  const tools = [createWeatherTool()];
  // const tools = convertToLangChainTools(getAllTools());

  return {
    name: AGENT_NAME,
    prompt: AGENT_PROMPT,
    description: 'A helpful AI assistant chatbot with access to various tools',
    tools,
  };
}
