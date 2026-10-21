import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const preload = resolve('local-env.mjs');
const directories: string[] = [];

function runPreload(files: Record<string, string | null>, injected: Record<string, string> = {}, flags: string[] = []) {
  const cwd = mkdtempSync(resolve(tmpdir(), 'mmps-local-env-'));
  directories.push(cwd);
  for (const [name, content] of Object.entries(files)) {
    if (content === null) {
      mkdirSync(resolve(cwd, name));
    } else {
      writeFileSync(resolve(cwd, name), content);
    }
  }
  writeFileSync(resolve(cwd, 'config.mjs'), 'export const snapshot = { port: process.env.PORT, key: process.env.TEST_KEY };');
  writeFileSync(resolve(cwd, 'app.mjs'), "import { snapshot } from './config.mjs'; console.log(JSON.stringify(snapshot));");
  return spawnSync(process.execPath, [...flags, '--import', preload, 'app.mjs'], {
    cwd,
    env: { IS_PROD: 'false', NODE_ENV: 'development', ...injected },
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('local environment preload', () => {
  test('starts in a fresh worktree without dotenv files', () => {
    const result = runPreload({}, { TEST_KEY: 'injected' });
    expect(result.status).toEqual(0);
    expect(JSON.parse(result.stdout)).toEqual({ key: 'injected' });
  });

  test('tsx honors the preload before application imports', () => {
    const result = runPreload({ '.env.local': 'PORT=43101\n' }, {}, [resolve('node_modules/tsx/dist/cli.mjs')]);
    expect(result.status).toEqual(0);
    expect(JSON.parse(result.stdout)).toEqual({ port: '43101' });
  });

  test('local files override injected secrets before static application imports', () => {
    const result = runPreload({ '.env.local': 'PORT=43101\nTEST_KEY=local\n' }, { TEST_KEY: 'injected' });
    expect(result.status).toEqual(0);
    expect(JSON.parse(result.stdout)).toEqual({ port: '43101', key: 'local' });
  });

  test('dotenv overrides Doppler values while leaving unspecified values injected', () => {
    const result = runPreload({ '.env': 'TEST_KEY=override\n' }, { TEST_KEY: 'doppler', PORT: '43101' });
    expect(result.status).toEqual(0);
    expect(JSON.parse(result.stdout)).toEqual({ key: 'override', port: '43101' });
  });

  test('Doppler-backed evaluations use the same local overrides', () => {
    const result = runPreload({ '.env': 'TEST_KEY=override\n' }, { DOPPLER_PROJECT: 'mmps', DOPPLER_ENVIRONMENT: 'dev', TEST_KEY: 'doppler' }, [
      resolve('node_modules/tsx/dist/cli.mjs'),
      '--import',
      resolve('test/eval/setup.ts'),
    ]);
    expect(result.status).toEqual(0);
    expect(JSON.parse(result.stdout)).toEqual({ key: 'override' });
  });

  test('reports errors reading an existing local dotenv path', () => {
    const result = runPreload({ '.env.local': null });
    expect(result.status).not.toEqual(0);
    expect(result.stderr).toContain('Could not read .env.local');
    expect(result.stdout).toEqual('');
  });

  test('rejects a production Doppler environment even with development mode flags', () => {
    const result = runPreload({ '.env': 'DOPPLER_ENVIRONMENT=dev\n' }, { DOPPLER_PROJECT: 'mmps', DOPPLER_ENVIRONMENT: 'prd' });
    expect(result.status).not.toEqual(0);
    expect(result.stderr).toContain('Local runs require a Doppler development environment');
    expect(result.stdout).toEqual('');
  });

  test('Doppler evaluation setup enforces development mode without the app preload', () => {
    const cwd = mkdtempSync(resolve(tmpdir(), 'mmps-eval-env-'));
    directories.push(cwd);
    const result = spawnSync(process.execPath, ['--import', resolve('test/eval/setup.ts'), '--eval', 'console.log("started")'], {
      cwd,
      env: { DOPPLER_PROJECT: 'mmps', DOPPLER_ENVIRONMENT: 'dev', IS_PROD: 'true', NODE_ENV: 'production' },
      encoding: 'utf8',
    });
    expect(result.status).not.toEqual(0);
    expect(result.stderr).toContain('Local development requires IS_PROD=false and NODE_ENV=development');
    expect(result.stdout).toEqual('');
  });

  test('local-file values win over base-file and shell values on the manual path', () => {
    const result = runPreload({ '.env': 'PORT=3000\nTEST_KEY=base\n', '.env.local': 'PORT=43101\nTEST_KEY=local\n' }, { TEST_KEY: 'shell' }, ['--env-file=.env', '--env-file-if-exists=.env.local']);
    expect(result.status).toEqual(0);
    expect(JSON.parse(result.stdout)).toEqual({ port: '43101', key: 'local' });
  });

  test('dotenv wins over shell values without a local file', () => {
    const result = runPreload({ '.env': 'TEST_KEY=override\n' }, { TEST_KEY: 'shell' });
    expect(result.status).toEqual(0);
    expect(JSON.parse(result.stdout)).toEqual({ key: 'override' });
  });

  test('rejects production mode introduced by local overrides', () => {
    const result = runPreload({ '.env': 'IS_PROD=true\n' });
    expect(result.status).not.toEqual(0);
    expect(result.stderr).toContain('Local development requires');
  });

  test('reports errors reading the base dotenv path', () => {
    const result = runPreload({ '.env': null });
    expect(result.status).not.toEqual(0);
    expect(result.stderr).toContain('Could not read .env.');
  });

  test('manual startup fails when its required dotenv file is missing', () => {
    const result = runPreload({}, {}, ['--env-file=.env']);
    expect(result.status).not.toEqual(0);
    expect(result.stdout).toEqual('');
    expect(result.stderr).toContain('.env');
  });

  test.each([
    { IS_PROD: 'true', NODE_ENV: 'development' },
    { IS_PROD: 'false', NODE_ENV: 'production' },
    { IS_PROD: '', NODE_ENV: '' },
  ])('rejects unsafe or missing local mode flags: %j', (injected) => {
    const result = runPreload({}, injected);
    expect(result.status).not.toEqual(0);
    expect(result.stderr).toContain('Local development requires IS_PROD=false and NODE_ENV=development');
    expect(result.stdout).toEqual('');
  });
});
