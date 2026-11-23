/** Pure office rules: Cursor Cloud Agents and Grok bots become people in two rooms. */

export function mapStatus(status) {
  const raw = String(status || '').trim();
  const upper = raw.toUpperCase();
  if (['ACTIVE', 'RUNNING', 'WORKING', 'CREATING'].includes(upper)) return 'working';
  if (['WAITING', 'WAITING_FOR_BACKGROUND_WORK'].includes(upper)) return 'waiting';
  if (['ERROR', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(upper)) return 'error';
  if (['working', 'waiting', 'error', 'idle'].includes(raw.toLowerCase())) return raw.toLowerCase();
  return 'idle';
}

export function modelName(input) {
  if (!input || typeof input !== 'object') return '';
  if (typeof input.model === 'string') return input.model.trim();
  if (input.model && typeof input.model === 'object' && typeof input.model.id === 'string') return input.model.id.trim();
  if (typeof input.originalModelName === 'string') return input.originalModelName.trim();
  if (typeof input.modelId === 'string') return input.modelId.trim();
  return '';
}

export function isGrok(input) {
  if (!input || typeof input !== 'object') return false;
  if (String(input.provider || '').toLowerCase() === 'grok') return true;
  if (String(input.room || '').toLowerCase() === 'grok') return true;
  return /grok/i.test(modelName(input));
}

function repoOf(input) {
  if (typeof input.repo === 'string' && input.repo.trim()) return input.repo.trim();
  if (typeof input.repoUrl === 'string' && input.repoUrl.trim()) return input.repoUrl.trim();
  const repos = Array.isArray(input.repos) ? input.repos : [];
  const first = repos[0];
  if (!first) return '';
  if (typeof first === 'string') return first;
  return String(first.url || first.repoUrl || '');
}

export function toAgent(input, source) {
  const grok = isGrok(input);
  const id = String(input.id || '').trim();
  return {
    id,
    name: String(input.name || id || (grok ? 'Grok' : 'Cursor')).trim(),
    status: mapStatus(input.status),
    model: modelName(input),
    room: grok ? 'grok' : 'cursor',
    provider: grok ? 'grok' : 'cursor',
    task: String(input.task || input.activity || '').trim(),
    url: String(input.url || '').trim(),
    repo: repoOf(input),
    source,
    updatedAt: String(input.updatedAt || ''),
  };
}

export function fromCursorApi(item) {
  return toAgent(item, 'cursor-api');
}

export function fromFeed(item) {
  return toAgent(item, String(item.source || 'local'));
}

export function fromInbox(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const id = String(body.id || '').trim();
  const name = String(body.name || '').trim();
  if (!id || !name) return null;
  return toAgent({ ...body, id, name }, 'inbox');
}

/** Later lists win, so a live inbox heartbeat overrides a stale API row with the same id. */
export function mergeAgents(groups) {
  const map = new Map();
  for (const group of groups) {
    for (const agent of group) {
      if (!agent || !agent.id) continue;
      map.set(agent.id, agent);
    }
  }
  return [...map.values()];
}

export function splitRooms(agents) {
  const rooms = { cursor: [], grok: [] };
  for (const agent of agents) rooms[agent.room === 'grok' ? 'grok' : 'cursor'].push(agent);
  return rooms;
}

export function cursorItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.agents)) return payload.agents;
  return [];
}

export function feedItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.agents)) return payload.agents;
  return [];
}
