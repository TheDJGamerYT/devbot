const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = '/workspace';
const NODE_DIR = path.join(ROOT, 'bots', 'node');
const PY_DIR   = path.join(ROOT, 'bots', 'python');
const LOG_DIR  = path.join(ROOT, 'logs');

fs.mkdirSync(LOG_DIR, { recursive: true });

function parseDotEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const l of lines) {
    if (!l || l.trim().startsWith('#')) continue;
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

function backoff(attempt) {
  return Math.min(30000, 1000 * Math.pow(2, attempt)); // cap 30s
}

function runCmdSync(cmd, args, cwd) {
  console.log(`[manager] $ ${cmd} ${args.join(' ')} (cwd=${cwd})`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (res.error) console.error(`[manager] Error running ${cmd}:`, res.error);
}

function ensureNodeDeps(cwd) {
  if (fs.existsSync(path.join(cwd, 'package.json')) && !fs.existsSync(path.join(cwd, 'node_modules'))) {
    runCmdSync('npm', ['i', '--no-audit', '--loglevel', 'error'], cwd);
  }
}

function ensurePyDeps(cwd) {
  if (fs.existsSync(path.join(cwd, 'requirements.txt'))) {
    runCmdSync('pip3', ['install', '--user', '-r', 'requirements.txt'], cwd);
  }
}

function spawnLogged(cmd, args, env, name, cwd) {
  const logPath = path.join(LOG_DIR, `${name}.log`);
  const out = fs.createWriteStream(logPath, { flags: 'a' });
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.pipe(out);
  child.stderr.pipe(out);
  child.on('spawn', () => console.log(`[manager] Started ${name} (pid ${child.pid})`));
  child.on('close', (code, sig) => {
    console.log(`[manager] ${name} exited (code=${code}, sig=${sig})`);
  });
  return child;
}

function discoverDirs(base) {
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(base, d.name));
}

function launchNodeBot(dir) {
  const name = `node:${path.basename(dir)}`;
  const env = parseDotEnv(path.join(dir, '.env'));
  const entry = fs.existsSync(path.join(dir, 'index.js')) ? 'index.js' :
                fs.existsSync(path.join(dir, 'main.js')) ? 'main.js' : null;
  if (!entry) {
    console.warn(`[manager] Skip ${name}: no index.js/main.js`);
    return;
  }
  ensureNodeDeps(dir);
  let attempt = 0;
  const run = () => {
    const child = spawnLogged('node', [entry], env, name, dir);
    child.on('close', () => {
      attempt++;
      setTimeout(run, backoff(attempt));
    });
  };
  run();
}

function launchPyBot(dir) {
  const name = `py:${path.basename(dir)}`;
  const env = parseDotEnv(path.join(dir, '.env'));
  const entry = fs.existsSync(path.join(dir, 'main.py')) ? 'main.py' : null;
  if (!entry) {
    console.warn(`[manager] Skip ${name}: no main.py`);
    return;
  }
  ensurePyDeps(dir);
  let attempt = 0;
  const run = () => {
    const child = spawnLogged('python3', ['-u', entry], env, name, dir);
    child.on('close', () => {
      attempt++;
      setTimeout(run, backoff(attempt));
    });
  };
  run();
}

(function start() {
  console.log('[manager] Discovering bots...');
  const nodeBots = discoverDirs(NODE_DIR);
  const pyBots   = discoverDirs(PY_DIR);
  console.log(`[manager] Node bots: ${nodeBots.map(p => path.basename(p)).join(', ') || '(none)'}`);
  console.log(`[manager] Python bots: ${pyBots.map(p => path.basename(p)).join(', ') || '(none)'}`);
  nodeBots.forEach(launchNodeBot);
  pyBots.forEach(launchPyBot);
  console.log(`[manager] Logs in ${LOG_DIR}. Add/modify bots, they'll restart on crash.`);
})();
