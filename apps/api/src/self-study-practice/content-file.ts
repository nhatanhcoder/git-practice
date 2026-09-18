import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function contentPath(filename: string): string {
  const candidates = [
    join(process.cwd(), 'content', filename),
    join(process.cwd(), 'apps', 'api', 'content', filename),
    resolve(__dirname, '..', '..', '..', 'content', filename),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // Try the next supported launch location.
    }
  }
  throw new Error(`${filename} not found. Looked in: ${candidates.join(' | ')}`);
}

export function readContentJson<T>(
  filename: string,
  validate: (value: unknown) => value is T,
): T {
  const file = contentPath(filename);
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch (error) {
    throw new Error(`${filename} is not valid JSON: ${(error as Error).message}`);
  }
  if (!validate(value)) {
    throw new Error(`${filename} does not match the accepted corpus shape`);
  }
  return value;
}

