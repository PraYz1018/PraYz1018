import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { cursorItems, feedItems, fromCursorApi, fromFeed, fromInbox, mergeAgents, splitRooms } from './lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 4760);
const host = '127.0.0.1';
const homeConfig = path.join(os.homedir(), '.cursor-office', 'config.json');
const homeFeed = path.join(os.homedir(), '.cursor-office', 'agents.json');
const inboxTtlMs = 120_000;

const inbox = new Map();
const seen = new Map();
const activity = [];
let snapshot = emptySnapshot('啟動中');

function emptySnapshot(detail) {
  return {
    ok: true,
    now: new Date().toISOString(),
    link: { cursor: 'missing', grok: 'idle', detail },
    agents: [],
    rooms: { cursor: [], grok: [] },
    activity: [],
  };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function cursorApiKey() {
  const fromEnv = process.env.CURSOR_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const config = readJson(homeConfig);
  const key = config && typeof config.cursorApiKey === 'string' ? config.cursorApiKey.trim() : '';
  return key || '';
}

function loadFeed() {
  const file = process.env.CURSOR_OFFICE_FEED?.trim() || homeFeed;
  const payload = readJson(file);
  if (!payload) return [];
  return feedItems(payload)
    .filter((item) => item && typeof item === 'object')
    .map((item) => fromFeed(item))
    .filter((agent) => agent.id);
}

function liveInbox() {
  const now = Date.now();
  const agents = [];
  for (const [id, row] of inbox) {
    if (row.expires <= now) inbox.delete(id);
    else agents.push(row.agent);
  }
  return agents;
}

function remember(agents) {
  const at = new Date().toISOString();
  for (const agent of agents) {
    const sig = `${agent.status}|${agent.task}|${agent.room}`;
    const prev = seen.get(agent.id);
    if (prev !== sig) {
      const pose = { working: '工作中', waiting: '等你', error: '出錯', idle: '待命' }[agent.status] || agent.status;
      const text = agent.task ? `${pose}：${agent.task}` : pose;
      activity.unshift({ at, name: agent.name, room: agent.room, text });
    }
    seen.set(agent.id, sig);
  }
  activity.splice(16);
}

async function fetchCursor(key) {
  const auth = Buffer.from(`${key}:`).toString('base64');
  const response = await fetch('https://api.cursor.com/v1/agents?limit=50&includeArchived=false', {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.message || payload?.error || `Cursor 連線失敗（${response.status}）`;
    throw new Error(String(message));
  }
  return cursorItems(payload).map((item) => fromCursorApi(item)).filter((agent) => agent.id);
}

async function refresh() {
  const link = { cursor: 'missing', grok: 'idle', detail: '' };
  let apiAgents = [];
  const key = cursorApiKey();
  if (key) {
    try {
      apiAgents = await fetchCursor(key);
      link.cursor = 'api';
      link.detail = '已接上 Cursor 雲端代理';
    } catch (error) {
      link.cursor = 'error';
      link.detail = error instanceof Error ? error.message : 'Cursor 連線失敗';
    }
  } else {
    link.detail = '尚未設定 Cursor 金鑰';
  }
  const feed = loadFeed();
  const beats = liveInbox();
  if (feed.length && link.cursor !== 'api') link.detail = '正在顯示本機清單。設定金鑰後會改看雲端代理';
  const agents = mergeAgents([feed, apiAgents, beats]);
  if (agents.some((agent) => agent.room === 'grok')) link.grok = 'live';
  remember(agents);
  snapshot = {
    ok: true,
    now: new Date().toISOString(),
    link,
    agents,
    rooms: splitRooms(agents),
    activity: activity.slice(0, 16),
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 32_768) {
        reject(new Error('內容太大'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('不是有效的 JSON'));
      }
    });
    request.on('error', reject);
  });
}

function send(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(body);
}

function publicFile(urlPath) {
  const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
  const full = path.resolve(publicDir, rel);
  if (full !== publicDir && !full.startsWith(publicDir + path.sep)) return null;
  return full;
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${host}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/office') {
      send(response, 200, JSON.stringify(snapshot));
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/inbox') {
      const agent = fromInbox(await readBody(request));
      if (!agent) {
        send(response, 400, JSON.stringify({ ok: false, error: '需要代號和名稱' }));
        return;
      }
      inbox.set(agent.id, { agent, expires: Date.now() + inboxTtlMs });
      await refresh();
      send(response, 200, JSON.stringify({ ok: true, agent }));
      return;
    }
    if (request.method === 'GET') {
      const file = publicFile(url.pathname);
      if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        send(response, 404, JSON.stringify({ ok: false, error: '找不到' }));
        return;
      }
      const ext = path.extname(file);
      response.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
      return;
    }
    send(response, 405, JSON.stringify({ ok: false, error: '不支援這個方法' }));
  } catch (error) {
    const message = error instanceof Error ? error.message : '發生錯誤';
    send(response, 400, JSON.stringify({ ok: false, error: message }));
  }
});

await refresh();
setInterval(() => {
  refresh().catch((error) => {
    snapshot = { ...snapshot, link: { ...snapshot.link, cursor: 'error', detail: error.message } };
  });
}, 8_000);

server.listen(port, host, () => {
  console.log(`櫃檯 http://${host}:${port}`);
});
