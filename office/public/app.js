import { drawAvatar, pickAgent, poseLabel, renderOffice } from './scene.js';

const floor = document.querySelector('#floor');
const roster = document.querySelector('#roster');
const activity = document.querySelector('#activity');
const link = document.querySelector('#link');
const stats = document.querySelector('#stats');
const filter = document.querySelector('#filter');

const statusLabel = { working: '工作中', waiting: '等你', error: '出錯', idle: '待命' };
const roomLabel = { grok: 'Grok 室', cursor: 'Cursor 室' };
const sourceLabel = { 'cursor-api': '雲端', inbox: '心跳', 'cursor-cloud': '本機清單', local: '本機清單' };

let office = null;
let selected = '';
let query = '';

function paintMark() {
  const canvas = document.querySelector('#mark');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 28, 28);
  ctx.fillStyle = '#3f8f32';
  ctx.fillRect(0, 0, 28, 28);
  ctx.fillStyle = '#c9a36a';
  ctx.fillRect(4, 10, 20, 14);
  ctx.fillStyle = '#5c5348';
  ctx.fillRect(4, 8, 20, 3);
  ctx.fillStyle = '#7dcea0';
  ctx.fillRect(8, 16, 4, 4);
  ctx.fillStyle = '#f0c36a';
  ctx.fillRect(16, 16, 4, 4);
}

function resize() {
  const rect = floor.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  if (floor.width !== width || floor.height !== height) {
    floor.width = width;
    floor.height = height;
  }
}

function linkText(snapshot) {
  const cursor = snapshot?.link?.cursor;
  const grok = snapshot?.link?.grok === 'live' ? 'Grok 已進房' : 'Grok 待命';
  if (cursor === 'api') return `Cursor 已接上 · ${grok}`;
  if (cursor === 'error') return `Cursor 連線失敗 · ${grok}`;
  return `尚未設定金鑰 · ${grok}`;
}

function renderStats(snapshot) {
  const agents = snapshot?.agents || [];
  const working = agents.filter((agent) => agent.status === 'working').length;
  const grok = agents.filter((agent) => agent.room === 'grok').length;
  const items = [
    ['4', '房間'],
    [String(agents.length), '代理'],
    [String(working), '工作中'],
    [String(grok), 'Grok'],
  ];
  stats.replaceChildren();
  for (const [value, label] of items) {
    const node = document.createElement('div');
    node.className = 'stat';
    const number = document.createElement('b');
    number.textContent = value;
    const caption = document.createElement('span');
    caption.textContent = label;
    node.append(number, caption);
    stats.append(node);
  }
}

function matches(agent) {
  if (!query) return true;
  const haystack = `${agent.name} ${agent.task} ${agent.model} ${roomLabel[agent.room] || ''}`.toLowerCase();
  return haystack.includes(query);
}

function renderRoster(snapshot) {
  const agents = (snapshot?.agents || []).filter(matches);
  roster.replaceChildren();
  if (!snapshot?.agents?.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '把金鑰寫進 ~/.cursor-office/config.json，或讓 Grok 機器人對本機心跳回報狀態。';
    roster.append(empty);
    return;
  }
  if (!agents.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = '沒有符合的代理。';
    roster.append(empty);
    return;
  }
  for (const room of ['grok', 'cursor']) {
    const group = agents.filter((agent) => (room === 'grok' ? agent.room === 'grok' : agent.room !== 'grok'));
    if (!group.length) continue;
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = `${roomLabel[room]} · ${group.length}`;
    roster.append(title);
    for (const agent of group) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `card${agent.id === selected ? ' selected' : ''}`;
      const avatar = document.createElement('canvas');
      avatar.width = 36;
      avatar.height = 36;
      drawAvatar(avatar, agent);
      const text = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = agent.name;
      const task = document.createElement('div');
      task.className = 'task';
      const dot = document.createElement('i');
      dot.className = `dot ${agent.status}`;
      task.append(dot, document.createTextNode(`${statusLabel[agent.status] || '待命'} · ${poseLabel(agent)}`));
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = [agent.model, sourceLabel[agent.source] || '本機清單'].filter(Boolean).join(' · ');
      text.append(name, task, meta);
      card.append(avatar, text);
      card.addEventListener('click', () => {
        selected = agent.id;
        renderRoster(office);
      });
      roster.append(card);
    }
  }
}

function renderActivity(snapshot) {
  activity.replaceChildren();
  const rows = snapshot?.activity || [];
  if (!rows.length) {
    const item = document.createElement('li');
    item.textContent = '還沒有動靜。';
    activity.append(item);
    return;
  }
  for (const row of rows) {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = new Date(row.at).toLocaleTimeString('zh-Hant', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Taipei',
    });
    const text = document.createElement('span');
    text.textContent = `${row.name}　${row.text}`;
    item.append(time, text);
    activity.append(item);
  }
}

function render(tick) {
  resize();
  renderOffice(floor, office || { agents: [] }, tick, selected);
}

async function poll() {
  const response = await fetch('/api/office');
  office = await response.json();
  if (selected && !(office.agents || []).some((agent) => agent.id === selected)) selected = '';
  link.textContent = linkText(office);
  renderStats(office);
  renderRoster(office);
  renderActivity(office);
}

filter.addEventListener('input', () => {
  query = filter.value.trim().toLowerCase();
  renderRoster(office);
});

floor.addEventListener('click', (event) => {
  const rect = floor.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (floor.width / rect.width);
  const y = (event.clientY - rect.top) * (floor.height / rect.height);
  selected = pickAgent(x, y);
  renderRoster(office);
});

paintMark();
requestAnimationFrame(function frame(tick) {
  render(tick);
  requestAnimationFrame(frame);
});
poll().catch(() => {
  link.textContent = '辦公室還沒準備好';
});
setInterval(() => {
  poll().catch(() => {
    link.textContent = '辦公室還沒準備好';
  });
}, 2000);
