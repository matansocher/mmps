#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

const SCHEDULER_PATTERN = /-scheduler\.service\.ts$/;
const CRON_NAME_PATTERN = /name:\s*['"]([^'"]+)['"]/g;

function findSchedulerFiles(dir) {
  const files = [];

  function traverse(currentPath) {
    const entries = readdirSync(currentPath);

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (SCHEDULER_PATTERN.test(entry)) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function extractCronNames(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const names = [];

  let match;
  while ((match = CRON_NAME_PATTERN.exec(content)) !== null) {
    names.push({
      name: match[1],
      file: filePath,
    });
  }

  return names;
}

function validateCronNames() {
  const srcDir = join(PROJECT_ROOT, 'src');
  const schedulerFiles = findSchedulerFiles(srcDir);

  console.log(`Found ${schedulerFiles.length} scheduler files\n`);

  const allCronJobs = [];

  for (const file of schedulerFiles) {
    const cronNames = extractCronNames(file);
    allCronJobs.push(...cronNames);
  }

  console.log(`Total cron jobs found: ${allCronJobs.length}\n`);

  // Check for duplicates
  const nameMap = new Map();
  const duplicates = [];

  for (const job of allCronJobs) {
    if (nameMap.has(job.name)) {
      duplicates.push({
        name: job.name,
        files: [nameMap.get(job.name), job.file],
      });
    } else {
      nameMap.set(job.name, job.file);
    }
  }

  if (duplicates.length > 0) {
    console.error('❌ ERROR: Duplicate cron job names found!\n');

    for (const dup of duplicates) {
      console.error(`Duplicate name: "${dup.name}"`);
      console.error('Found in:');
      for (const file of dup.files) {
        console.error(`  - ${file}`);
      }
      console.error('');
    }

    console.error('Each @Cron decorator must have a unique name.');
    console.error('When you copy-paste a cron decorator, make sure to change the name field.\n');

    process.exit(1);
  }

  console.log('✅ All cron job names are unique!\n');

  // List all cron jobs
  console.log('Registered cron jobs:');
  const sortedJobs = Array.from(nameMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, file] of sortedJobs) {
    const relativePath = file.replace(PROJECT_ROOT + '/', '');
    console.log(`  - ${name} (${relativePath})`);
  }

  process.exit(0);
}

validateCronNames();
