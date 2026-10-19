import { mapAnnotation, mapWorkflowJob } from './mappers';

describe('mapWorkflowJob()', () => {
  test('should keep only failed step names', () => {
    const job = {
      id: 117814396296,
      name: 'build',
      status: 'completed',
      conclusion: 'failure',
      html_url: 'https://github.com/matansocher/mmps/actions/runs/39174538342/job/117814396296',
      steps: [
        { name: 'Install', conclusion: 'success' },
        { name: 'Build', conclusion: 'failure' },
        { name: 'Deploy', conclusion: 'skipped' },
      ],
    } as Parameters<typeof mapWorkflowJob>[0];

    expect(mapWorkflowJob(job)).toEqual({
      id: 117814396296,
      name: 'build',
      status: 'completed',
      conclusion: 'failure',
      failedSteps: ['Build'],
      url: 'https://github.com/matansocher/mmps/actions/runs/39174538342/job/117814396296',
    });
  });
});

describe('mapAnnotation()', () => {
  test('should map an annotation with its job id', () => {
    const annotation = { path: '.github', start_line: 1, annotation_level: 'failure', title: null, message: 'Process completed with exit code 1.' } as Parameters<typeof mapAnnotation>[1];

    expect(mapAnnotation(5, annotation)).toEqual({ jobId: 5, path: '.github', startLine: 1, level: 'failure', title: null, message: 'Process completed with exit code 1.' });
  });
});
