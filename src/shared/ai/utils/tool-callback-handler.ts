import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { Serialized } from '@langchain/core/load/serializable';
import { Logger } from '@core/utils';

export type ToolCallbackOptions = {
  onToolStart?: (toolName: string, input: any, metadata?: Record<string, unknown>) => void | Promise<void>;
  onToolEnd?: (toolName: string, output: any, metadata?: Record<string, unknown>) => void | Promise<void>;
  onToolError?: (toolName: string, error: Error, metadata?: Record<string, unknown>) => void | Promise<void>;
  enableLogging?: boolean;
};

export class ToolCallbackHandler extends BaseCallbackHandler {
  name = 'ToolCallbackHandler';
  private readonly logger = new Logger(ToolCallbackHandler.name);
  private readonly options: ToolCallbackOptions;
  private toolStartTimes: Map<string, number> = new Map();

  constructor(options: ToolCallbackOptions = {}) {
    super();
    this.options = {
      enableLogging: true,
      ...options,
    };
  }

  async handleToolStart(tool: Serialized, input: string, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runName?: string): Promise<void> {
    const toolName = this.getToolName(tool, runName);
    this.toolStartTimes.set(runId, Date.now());

    if (this.options.enableLogging) {
      this.logger.log(`🔧 Tool started: ${toolName}, runId: ${runId}, parentRunId: ${parentRunId}, tags: ${tags}, input: ${this.truncateInput(input)}`);
    }

    if (this.options.onToolStart) {
      try {
        await this.options.onToolStart(toolName, input, metadata);
      } catch (err) {
        this.logger.error(`Error in onToolStart callback for ${toolName}: ${err}`);
      }
    }
  }

  async handleToolEnd(output: string, runId: string, parentRunId?: string, tags?: string[]): Promise<void> {
    const startTime = this.toolStartTimes.get(runId);
    const duration = startTime ? Date.now() - startTime : undefined;
    this.toolStartTimes.delete(runId);

    const toolName = this.extractToolNameFromTags(tags);

    if (this.options.enableLogging) {
      this.logger.log(`✅ Tool completed: ${toolName || 'unknown'}, runId: ${runId}, parentRunId: ${parentRunId}, duration: ${duration}, output: ${this.truncateOutput(output)}`);
    }

    if (this.options.onToolEnd) {
      try {
        await this.options.onToolEnd(toolName || 'unknown', output, { duration });
      } catch (err) {
        this.logger.error(`Error in onToolEnd callback for ${toolName}: ${err}`);
      }
    }
  }

  async handleToolError(error: Error, runId: string, parentRunId?: string, tags?: string[]): Promise<void> {
    const startTime = this.toolStartTimes.get(runId);
    const duration = startTime ? Date.now() - startTime : undefined;
    this.toolStartTimes.delete(runId);

    const toolName = this.extractToolNameFromTags(tags);

    if (this.options.enableLogging) {
      this.logger.error(`❌ Tool failed: ${toolName || 'unknown'}, runId: ${runId}, parentRunId: ${parentRunId}, duration: ${duration}, error: ${error.message}`);
    }

    if (this.options.onToolError) {
      try {
        await this.options.onToolError(toolName || 'unknown', error, { duration });
      } catch (err) {
        this.logger.error(`Error in onToolError callback for ${toolName}: ${err}`);
      }
    }
  }

  private getToolName(tool: Serialized, runName?: string): string {
    if (runName) return runName;
    if ('name' in tool && typeof tool.name === 'string') return tool.name;
    if ('id' in tool && Array.isArray(tool.id) && tool.id.length > 0) {
      return tool.id[tool.id.length - 1];
    }
    return 'unknown';
  }

  private extractToolNameFromTags(tags?: string[]): string | undefined {
    if (!tags || tags.length === 0) return undefined;
    // Tags often contain the tool name
    return tags[0];
  }

  private truncateInput(input: string, maxLength: number = 200): string {
    if (input.length <= maxLength) return input;
    return `${input.substring(0, maxLength)}... (truncated)`;
  }

  private truncateOutput(output: string, maxLength: number = 500): string {
    if (output.length <= maxLength) return output;
    return `${output.substring(0, maxLength)}... (truncated)`;
  }
}
