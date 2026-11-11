#!/usr/bin/env node
/**
 * Shrinks a `pnpm deploy --prod` folder for the Docker image (apps/api/Dockerfile).
 *
 * pnpm links OPTIONAL peer dependencies when the workspace happens to have them.
 * Here that drags the whole Prisma CLI (+ Studio, TypeScript, React…) into the
 * API image through @prisma/client's optional `prisma` peer, although at run
 * time only @prisma/client/runtime is used. This script keeps every package
 * reachable from the app's dependencies through `dependencies`,
 * `optionalDependencies` and REQUIRED peers, and removes the rest.
 *
 * Usage: node prune-runtime-deps.mjs <deploy-dir>
 */
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const store = path.join(root, 'node_modules', '.pnpm');

/** Node's lookup: <dir>/node_modules/<name>, then each parent directory. */
function resolvePackage(fromDir, name) {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (existsSync(path.join(candidate, 'package.json'))) return realpathSync(candidate);
    if (dir === path.dirname(dir)) return null;
  }
}

function runtimeDependencies(pkg) {
  const optionalPeers = pkg.peerDependenciesMeta ?? {};
  const peers = Object.keys(pkg.peerDependencies ?? {}).filter((n) => !optionalPeers[n]?.optional);
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
    ...peers,
  ];
}

// Walk the graph from the app itself.
const reached = new Set();
const queue = [realpathSync(root)];
while (queue.length > 0) {
  const dir = queue.pop();
  if (reached.has(dir)) continue;
  reached.add(dir);
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  for (const name of runtimeDependencies(pkg)) {
    const found = resolvePackage(dir, name);
    if (found) queue.push(found);
  }
}

// Remove store entries (.pnpm/<id>) that hold no reached package.
let removed = 0;
for (const entry of readdirSync(store)) {
  if (entry === 'node_modules' || entry.endsWith('.yaml') || entry.endsWith('.json')) continue;
  const entryDir = path.join(store, entry);
  const used = [...reached].some((dir) => dir.startsWith(`${entryDir}${path.sep}`));
  if (!used) {
    rmSync(entryDir, { recursive: true, force: true });
    removed += 1;
  }
}

// Drop links that now point nowhere (hoisted links, .bin shims).
function removeDanglingLinks(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) {
      if (!existsSync(full)) rmSync(full, { force: true });
    } else if (stat.isDirectory() && (entry.startsWith('@') || entry === '.bin')) {
      removeDanglingLinks(full);
    }
  }
}
removeDanglingLinks(path.join(root, 'node_modules'));
removeDanglingLinks(path.join(store, 'node_modules'));

process.stdout.write(`prune-runtime-deps: kept ${reached.size - 1} packages, removed ${removed}\n`);
