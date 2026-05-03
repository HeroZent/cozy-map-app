#!/usr/bin/env node
// Simple wrapper to run Jest with --experimental-vm-modules enabled
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const result = spawnSync('npx', ['jest', ...args], {
  env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
  stdio: 'inherit',
  shell: true,
});

process.exitCode = result.status !== null ? result.status : 1;
