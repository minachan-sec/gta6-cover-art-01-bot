// Flamingo Key Cover Studio — entry program for make.fun gta6-cover-art-01.
//
// Copies the built app (app/) and its screenshots (screenshots/) from this
// repository into the output directory and writes /output/dossier.json with
// the kit's buildDossier, exactly as the bounty asks. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output. Node 22, standard library only.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
console.log(`Flamingo Key Cover Studio handed in to ${outDir}`);
