const canvas = document.querySelector('#floor');
const ctx = canvas.getContext('2d');
const roster = document.querySelector('#roster');
const activity = document.querySelector('#activity');
const link = document.querySelector('#link');

let office = null;
let selected = null;
let tick = 0;

const poses = { working: '工作中', idle: '待命', waiting: '等你', error: '出錯' };
const sources = { 'cursor-api': '雲端', inbox: '心跳', local: '本機', 'cursor-cloud': '本機清單' };
const uiFont = '12px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';

function people() {
  return office?.agents || [];
}

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawRoom(x, y, w, h, wall, floor, title, titleColor) {
  drawRect(x, y, w, h, wall);
  drawRect(x + 6, y + 22, w - 12, h - 30, floor);
  ctx.fillStyle = titleColor;
  ctx.font = uiFont;
  ctx.fillText(title, x + 10, y + 15);
  drawRect(x + 18, y + 40, 28, 16, '#6d8ea8');
  drawRect(x + 22, y + 44, 20, 8, '#d7f4ff');
  drawRect(x + w - 62, y + 78, 36, 16, '#8b5a3c');
  drawRect(x + w - 58, y + 70, 28, 10, '#223');
  drawRect(x + w - 50, y + 68, 12, 4, '#9be7a4');
  drawRect(x + 16, y + h - 36, 10, 16, '#2f7d32');
  drawRect(x + 14, y + h - 42, 14, 8, '#43a047');
}

function drawPerson(x, y, color, status) {
  const bob = status === 'working' ? Math.round(Math.sin(tick / 8) * 1) : 0;
  const py = y + bob;
  drawRect(x + 1, py + 18, 12, 2, 'rgba(0,0,0,0.28)');
  drawRect(x + 2, py, 10, 4, color);
  drawRect(x + 3, py + 4, 8, 6, '#f3d2b0');
  drawRect(x + 5, py + 6, 1, 1, '#1b1b1b');
  drawRect(x + 8, py + 6, 1, 1, '#1b1b1b');
  drawRect(x + 2, py + 10, 10, 6, color);
  drawRect(x + 3, py + 16, 3, 4, '#243044');
  drawRect(x + 8, py + 16, 3, 4, '#243044');
  const dot = { working: '#7CFF6B', waiting: '#ffd15c', error: '#ff6b6b', idle: '#d7d7d7' }[status] || '#fff';
  drawRect(x + 12, py, 3, 3, dot);
}

function slot(room, index) {
  const baseX = room === 'grok' ? 262 : 18;
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: baseX + 16 + col * 46, y: 78 + row * 42 };
}

function draw() {
  tick += 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRect(0, 0, 480, 300, '#87b84a');
  drawRect(0, 250, 480, 50, '#8d8d8d');
  drawRect(0, 268, 480, 8, '#f2d15a');
  drawRoom(8, 8, 228, 236, '#35556e', '#d7dde6', 'Cursor 房', '#d6ecff');
  drawRoom(244, 8, 228, 236, '#6a4a16', '#f3e2b8', 'Grok 房', '#ffe0a3');
  const agents = people();
  const counts = { cursor: 0, grok: 0 };
  for (const agent of agents) {
    const at = slot(agent.room, counts[agent.room] || 0);
    counts[agent.room] = (counts[agent.room] || 0) + 1;
    const color = agent.room === 'grok' ? '#e2a21b' : '#3d8bfd';
    drawPerson(at.x, at.y, color, agent.status);
    agent._hit = { x: at.x, y: at.y, w: 16, h: 22 };
    if (selected === agent.id) drawRect(at.x - 2, at.y - 3, 16, 1, '#fff');
  }
  if (!agents.length) {
    ctx.fillStyle = '#243044';
    ctx.font = '14px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';
    ctx.fillText('還沒有人進辦公室', 156, 140);
  }
  requestAnimationFrame(draw);
}

function renderChrome() {
  const agents = people();
  const cursorLink = office?.link?.cursor;
  const grokLink = office?.link?.grok;
  const cursorText = cursorLink === 'api' ? 'Cursor 已接上' : cursorLink === 'error' ? `Cursor：${office.link.detail}` : '尚未設定金鑰，先看本機清單';
  const grokText = grokLink === 'live' ? 'Grok 已進房' : 'Grok 待命';
  link.textContent = `${cursorText} · ${grokText}`;

  roster.replaceChildren();
  if (!agents.length) {
    const note = document.createElement('p');
    note.className = 'empty';
    note.textContent = '把金鑰寫進 ~/.cursor-office/config.json，或讓 Grok 機器人對 /api/inbox 回報狀態。';
    roster.append(note);
  }
  for (const agent of agents) {
    const button = document.createElement('button');
    button.className = 'person';
    button.dataset.selected = String(selected === agent.id);
    const via = sources[agent.source] || agent.source || '';
    button.innerHTML = `<strong></strong><small></small>`;
    button.querySelector('strong').textContent = agent.name;
    const room = agent.room === 'grok' ? 'Grok 機器人' : 'Cursor 代理';
    button.querySelector('small').textContent = `${room} · ${poses[agent.status] || agent.status}${agent.model ? ` · ${agent.model}` : ''}${via ? ` · ${via}` : ''}`;
    button.addEventListener('click', () => {
      selected = agent.id;
      renderChrome();
    });
    roster.append(button);
  }

  activity.replaceChildren();
  const rows = office?.activity || [];
  if (!rows.length) {
    const note = document.createElement('div');
    note.className = 'empty';
    note.textContent = '活動會出現在這裡。';
    activity.append(note);
  }
  for (const row of rows) {
    const line = document.createElement('div');
    const who = document.createElement('strong');
    who.textContent = row.name;
    const rest = document.createElement('small');
    rest.textContent = `  ${row.text}`;
    line.append(who, rest);
    activity.append(line);
  }
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const hit = people().find((agent) => agent._hit && x >= agent._hit.x && x <= agent._hit.x + agent._hit.w && y >= agent._hit.y && y <= agent._hit.y + agent._hit.h);
  selected = hit ? hit.id : null;
  renderChrome();
});

async function poll() {
  const response = await fetch('/api/office');
  office = await response.json();
  if (selected && !people().some((agent) => agent.id === selected)) selected = null;
  renderChrome();
}

requestAnimationFrame(draw);
poll().catch((error) => {
  link.textContent = error.message;
});
setInterval(() => {
  poll().catch(() => {});
}, 2000);
