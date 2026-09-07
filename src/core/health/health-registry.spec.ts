import { beforeEach, describe, expect, it } from 'vitest';
import { getReadinessReport, markComponentFailed, markComponentReady, resetHealthRegistry } from './health-registry';

describe('health-registry', () => {
  beforeEach(() => {
    resetHealthRegistry();
  });

  describe('getReadinessReport()', () => {
    it('should be ready when no components are registered', () => {
      expect(getReadinessReport()).toEqual({ ready: true, components: [] });
    });

    it('should be ready when all registered components are ok', () => {
      markComponentReady('savings');
      markComponentReady('CHATBOT');
      const report = getReadinessReport();
      expect(report.ready).toEqual(true);
      expect(report.components).toHaveLength(2);
    });

    it('should not be ready when any component failed', () => {
      markComponentReady('savings');
      markComponentFailed('CHATBOT', 'boom');
      const report = getReadinessReport();
      expect(report.ready).toEqual(false);
      expect(report.components).toContainEqual({ name: 'CHATBOT', status: 'failed', reason: 'boom' });
    });
  });

  it('should flip a previously ok component to failed', () => {
    markComponentReady('CHATBOT');
    expect(getReadinessReport().ready).toEqual(true);
    markComponentFailed('CHATBOT', 'polling terminated unexpectedly');
    expect(getReadinessReport().ready).toEqual(false);
  });
});
