const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const dataSeparator = process.platform === 'win32' ? ';' : ':';
const schemaSource = path.join('database', 'schema.sql');
const schemaTarget = 'database';

const args = [
  '-m',
  'PyInstaller',
  '--noconfirm',
  '--onefile',
  '--name',
  'geo-agent-backend',
  '--distpath',
  path.join('resources', 'agent-backend'),
  '--add-data',
  `${schemaSource}${dataSeparator}${schemaTarget}`,
  path.join('agent_core', 'api', 'server.py'),
];

const result = spawnSync('python3', args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
