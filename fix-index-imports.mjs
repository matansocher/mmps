import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname, resolve } from 'path';

async function* walk(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const path = join(dir, file.name);
    if (file.isDirectory()) {
      yield* walk(path);
    } else if (file.name.endsWith('.js')) {
      yield path;
    }
  }
}

async function fixImports() {
  for await (const filePath of walk('./dist')) {
    const content = await readFile(filePath, 'utf-8');
    let changed = false;

    // Fix imports like: from "./something" to from "./something.js" or "./something/index.js"
    const lines = content.split('\n');
    const fixed = await Promise.all(
      lines.map(async (line) => {
        // Match both import and export from statements
        const match = line.match(/(?:import|export).*from ["'](\.[^"']+)["']/);
        if (!match) return line;

        const importPath = match[1];
        // Skip if already has .js extension
        if (importPath.endsWith('.js')) return line;

        // Resolve the path relative to the current file
        const fileDir = dirname(filePath);
        const resolvedPath = resolve(fileDir, importPath);

        try {
          // Check if the path exists
          const stats = await stat(resolvedPath);
          if (stats.isDirectory()) {
            // It's a directory, add /index.js
            changed = true;
            return line.replace(importPath, `${importPath}/index.js`);
          }
        } catch (e) {
          // Path doesn't exist, try with .js
          try {
            await stat(resolvedPath + '.js');
            // File exists with .js extension
            changed = true;
            return line.replace(importPath, `${importPath}.js`);
          } catch (e2) {
            // Neither exists, leave it as is
            console.warn(`Warning: Cannot resolve ${importPath} from ${filePath}`);
          }
        }

        return line;
      })
    );

    if (changed) {
      await writeFile(filePath, fixed.join('\n'), 'utf-8');
      console.log(`Fixed: ${filePath}`);
    }
  }
}

fixImports().catch(console.error);
