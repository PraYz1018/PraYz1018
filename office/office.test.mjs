import test from 'node:test';
import assert from 'node:assert/strict';
import { fromCursorApi, fromFeed, fromInbox, mergeAgents, splitRooms, mapStatus } from './lib.mjs';

test('Cursor API status becomes a room and a pose', () => {
  const active = fromCursorApi({
    id: 'bc-1',
    name: 'Add README',
    status: 'ACTIVE',
    url: 'https://cursor.com/agents/bc-1',
  });
  assert.equal(active.room, 'cursor');
  assert.equal(active.status, 'working');
  assert.equal(mapStatus('WAITING_FOR_BACKGROUND_WORK'), 'waiting');
  assert.equal(mapStatus('ERROR'), 'error');
});

test('a Cursor agent on a Grok model sits in the Grok room', () => {
  const agent = fromCursorApi({
    id: 'bc-grok',
    name: 'Set up prayz1018 environment',
    status: 'RUNNING',
    model: { id: 'grok-4.7-high-fast' },
    url: 'https://cursor.com/agents/bc-grok',
  });
  assert.equal(agent.room, 'grok');
  assert.equal(agent.provider, 'grok');
  assert.equal(agent.model, 'grok-4.7-high-fast');
  assert.equal(agent.status, 'working');
});

test('inbox heartbeats require an id and a name, and override the API row', () => {
  assert.equal(fromInbox({ provider: 'grok' }), null);
  const beat = fromInbox({
    id: 'bot-1',
    name: 'Grok',
    provider: 'grok',
    status: 'working',
    task: '正在回覆',
    model: 'grok-4.7',
  });
  const api = fromCursorApi({ id: 'bot-1', name: 'old', status: 'IDLE' });
  const [agent] = mergeAgents([[api], [beat]]);
  assert.equal(agent.name, 'Grok');
  assert.equal(agent.room, 'grok');
  assert.equal(agent.task, '正在回覆');
  assert.equal(agent.source, 'inbox');
});

test('local feed can place a Grok bot without going through the API', () => {
  const rooms = splitRooms([
    fromFeed({ id: 'c1', name: 'Cursor desk', status: 'IDLE', provider: 'cursor' }),
    fromFeed({ id: 'g1', name: '圖片Q版化', status: 'idle', model: 'grok-4.7' }),
  ]);
  assert.equal(rooms.cursor.length, 1);
  assert.equal(rooms.grok[0].name, '圖片Q版化');
});
