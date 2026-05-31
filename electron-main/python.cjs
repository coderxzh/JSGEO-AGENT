const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const PORT_START = 43100;
const PORT_END = 43999;

let backendProcess = null;
let backendConfig = null;

function getBackendBinary(app) {
  const executable = process.platform === 'win32' ? 'geo-agent-backend.exe' : 'geo-agent-backend';
  return path.join(process.resourcesPath, 'agent-backend', executable);
}

function getDevBackendCommand(rootDir, port, token, dataDir) {
  const python = process.env.PYTHON || 'python3';
  return {
    command: python,
    args: [
      '-m',
      'agent_core.api.server',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--token',
      token,
      '--data-dir',
      dataDir,
      '--project-root',
      rootDir,
    ],
    options: {
      cwd: rootDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    },
  };
}

function getProdBackendCommand(app, port, token, dataDir) {
  const binary = getBackendBinary(app);
  const projectRoot = path.dirname(binary);
  return {
    command: binary,
    args: [
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--token',
      token,
      '--data-dir',
      dataDir,
      '--project-root',
      projectRoot,
    ],
    options: {
      cwd: projectRoot,
      env: {
        ...process.env,
      },
    },
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort() {
  for (let port = PORT_START; port <= PORT_END; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`No free backend port found in ${PORT_START}-${PORT_END}`);
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Backend is still booting.
    }
    await wait(250);
  }
  throw new Error('Timed out waiting for Python backend health check.');
}

function ensureDataDir(app) {
  const dataDir = path.join(app.getPath('userData'), 'local-data');
  fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

async function startPythonBackend({ app, rootDir }) {
  if (backendConfig) {
    return backendConfig;
  }

  const port = await findFreePort();
  const token = crypto.randomBytes(32).toString('hex');
  const dataDir = ensureDataDir(app);
  const baseUrl = `http://127.0.0.1:${port}`;
  const launch = app.isPackaged
    ? getProdBackendCommand(app, port, token, dataDir)
    : getDevBackendCommand(rootDir, port, token, dataDir);

  backendProcess = spawn(launch.command, launch.args, {
    ...launch.options,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backendProcess.stdout.on('data', (chunk) => {
    console.log(`[geo-agent-backend] ${chunk.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (chunk) => {
    console.error(`[geo-agent-backend] ${chunk.toString().trim()}`);
  });

  backendProcess.once('exit', (code, signal) => {
    if (backendConfig) {
      console.log(`[geo-agent-backend] exited code=${code} signal=${signal}`);
    }
    backendConfig = null;
    backendProcess = null;
  });

  backendConfig = { baseUrl, token, dataDir, port };
  await waitForHealth(baseUrl);
  return backendConfig;
}

function stopPythonBackend() {
  if (!backendProcess) {
    return;
  }
  const child = backendProcess;
  backendProcess = null;
  backendConfig = null;
  child.kill();
}

async function backendRequest(pathname, options = {}) {
  if (!backendConfig) {
    throw new Error('Python backend is not running.');
  }

  const response = await fetch(`${backendConfig.baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${backendConfig.token}`,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.detail || `Backend request failed: ${response.status}`);
  }

  return data;
}

async function backendStreamRequest(pathname, options = {}, onEvent) {
  if (!backendConfig) {
    throw new Error('Python backend is not running.');
  }

  const response = await fetch(`${backendConfig.baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${backendConfig.token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = null;
    }
    throw new Error(data?.detail || text || `Backend stream failed: ${response.status}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      onEvent(JSON.parse(trimmed));
    }
  }

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer.trim()));
  }
}

module.exports = {
  backendRequest,
  backendStreamRequest,
  startPythonBackend,
  stopPythonBackend,
};
