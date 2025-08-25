import { CurrentWeatherTool } from './current-weather.tool';
import { WeatherForecastTool } from './weather-forecast.tool';
import { ToolExecutionContext } from '../../types';

describe('Weather Tools', () => {
  describe('CurrentWeatherTool', () => {
    let tool: CurrentWeatherTool;

    beforeEach(() => {
      tool = new CurrentWeatherTool();
    });

    it('should have correct name', () => {
      expect(tool.getName()).toBe('current_weather');
    });

    it('should have correct description', () => {
      expect(tool.getDescription()).toBe('Get current weather information for a specific location');
    });

    it('should have correct keywords', () => {
      const keywords = tool.getKeywords();
      expect(keywords).toContain('weather');
      expect(keywords).toContain('current');
      expect(keywords).toContain('now');
      expect(keywords).toContain('today');
    });

    it('should require location parameter', () => {
      const schema = tool.getSchema();
      const shape = schema.shape;
      expect(shape.location).toBeDefined();
      expect(shape.date).toBeUndefined(); // Should not have date parameter
    });

    it('should throw error when location is missing', async () => {
      const context: ToolExecutionContext = {
        userRequest: 'What is the weather?',
        parameters: {},
      };

      await expect(tool.execute(context)).rejects.toThrow('Location parameter is required');
    });
  });

  describe('WeatherForecastTool', () => {
    let tool: WeatherForecastTool;

    beforeEach(() => {
      tool = new WeatherForecastTool();
    });

    it('should have correct name', () => {
      expect(tool.getName()).toBe('weather_forecast');
    });

    it('should have correct description', () => {
      expect(tool.getDescription()).toBe('Get weather forecast for a specific location and date (up to 5 days in the future)');
    });

    it('should have correct keywords', () => {
      const keywords = tool.getKeywords();
      expect(keywords).toContain('forecast');
      expect(keywords).toContain('tomorrow');
      expect(keywords).toContain('next');
      expect(keywords).toContain('future');
    });

    it('should require both location and date parameters', () => {
      const schema = tool.getSchema();
      const shape = schema.shape;
      expect(shape.location).toBeDefined();
      expect(shape.date).toBeDefined();
    });

    it('should throw error when location is missing', async () => {
      const context: ToolExecutionContext = {
        userRequest: 'What will the weather be tomorrow?',
        parameters: { date: '2024-01-01' },
      };

      await expect(tool.execute(context)).rejects.toThrow('Location parameter is required');
    });

    it('should throw error when date is missing', async () => {
      const context: ToolExecutionContext = {
        userRequest: 'What will the weather be tomorrow?',
        parameters: { location: 'New York' },
      };

      await expect(tool.execute(context)).rejects.toThrow('Date parameter is required for weather forecast');
    });
  });
});
