#!/usr/bin/env node

/**
 * Check for [PBT] requirements lacking matching properties
 *
 * Scans requirements.md files and checks if corresponding property tests exist.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, basename } from 'path';

const specsDir = './.kiro/specs';
const propertiesDir = './tests/properties';

function findRequirementsFiles(dir) {
  const files = [];

  function walk(currentDir) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry === 'requirements.md') {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function extractPBTRequirements(content) {
  const requirements = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/###\s+([A-Z]+-\d+):.*\[PBT\]/);
    if (match) {
      requirements.push(match[1]);
    }
  }

  return requirements;
}

function checkPropertyExists(reqId) {
  const propertyFile = join(propertiesDir, `${reqId.toLowerCase()}-property.ts`);
  return existsSync(propertyFile);
}

function main() {
  console.log('Checking for [PBT] requirement gaps...\n');

  const requirementsFiles = findRequirementsFiles(specsDir);
  const gaps = [];

  for (const file of requirementsFiles) {
    const content = readFileSync(file, 'utf-8');
    const requirements = extractPBTRequirements(content);

    console.log(`\n${file}`);
    console.log(`  Found ${requirements.length} [PBT] requirements`);

    for (const reqId of requirements) {
      const exists = checkPropertyExists(reqId);

      if (exists) {
        console.log(`  ✓ ${reqId} has property test`);
      } else {
        console.log(`  ✗ ${reqId} MISSING property test`);
        gaps.push({ reqId, file });
      }
    }
  }

  console.log('\n' + '='.repeat(50));

  if (gaps.length === 0) {
    console.log('✓ All [PBT] requirements have property tests\n');
    process.exit(0);
  } else {
    console.log(`✗ Found ${gaps.length} gaps:\n`);
    for (const gap of gaps) {
      console.log(`  - ${gap.reqId} (${gap.file})`);
    }
    console.log('\nCreate property tests in tests/properties/<id>-property.ts\n');
    process.exit(1);
  }
}

main();
