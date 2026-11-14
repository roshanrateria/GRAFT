import { existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Walk up from a start directory to the nearest ancestor that contains a
 * package.json. Works in both layouts:
 * - dev (tsx):   apps/server/src/... -> apps/server
 * - built (tsc): apps/server/dist/apps/server/src/... -> apps/server
 *
 * The nested built layout exists because tsc's rootDir spans the workspace
 * (the @graft/nerve path mapping pulls packages/nerve sources into the
 * compilation), so plain `__dirname`-relative paths break after a build.
 */
export function findPackageRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return startDir; // filesystem root; bail out
    dir = parent;
  }
}
