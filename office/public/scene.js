/** Original pixel office. Tiles, furniture, and people are drawn in code. */

export const COLS = 28;
export const ROWS = 20;

const HAIR = ['#3a2a22', '#6b4423', '#e6d3a1', '#242424', '#8d3b3b', '#3e6b4a'];
const SKIN = ['#f3c9a4', '#e0ad86', '#c68642', '#8d5524'];
const SHIRT_CURSOR = ['#3d6ea5', '#2f8f9a', '#4d6b8a'];
const SHIRT_GROK = ['#d0892d', '#c46b2c', '#e0b15a'];

const BODY = [
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '....hsssssssh...',
  '....hsseesssh...',
  '....hsssssssh...',
  '.....sssssss....',
  '......cccc......',
  '....cccccccc....',
  '....cccccccc....',
  '...cccccccccc...',
  '...cc..cc..cc...',
  '......pppp......',
  '......p..p......',
  '......p..p......',
  '.....pp..pp.....',
];

const SEATS = {
  cursor: [
    { x: 16, y: 7 },
    { x: 19, y: 7 },
    { x: 23, y: 7 },
  ],
  grok: [
    { x: 16, y: 15 },
    { x: 19, y: 15 },
    { x: 23, y: 15 },
  ],
  reception: [
    { x: 4, y: 6 },
    { x: 8, y: 6 },
    { x: 11, y: 7 },
  ],
  lounge: [
    { x: 4, y: 14 },
    { x: 8, y: 14 },
    { x: 12, y: 15 },
  ],
};

const ROOMS = [
  { id: 'reception', name: '接待', x: 2, y: 2, w: 12, h: 7, floor: 'tile' },
  { id: 'cursor', name: 'Cursor 室', x: 15, y: 2, w: 12, h: 7, floor: 'wood' },
  { id: 'lounge', name: '休息區', x: 2, y: 10, w: 12, h: 7, floor: 'lounge' },
  { id: 'grok', name: 'Grok 室', x: 15, y: 10, w: 12, h: 7, floor: 'sand' },
];

let view = { ox: 0, oy: 0, tile: 32 };
let boxes = [];

export function placeAgents(agents) {
  const placed = [];
  const take = (room, agent) => {
    const seats = SEATS[room];
    const index = placed.filter((item) => item.room === room).length;
    if (index >= seats.length) return false;
    placed.push({ agent, room, seat: seats[index] });
    return true;
  };
  for (const agent of agents || []) {
    if (!agent || !agent.id) continue;
    if (agent.room === 'grok') take('grok', agent) || take('lounge', agent) || take('reception', agent);
    else take('cursor', agent) || take('reception', agent) || take('lounge', agent);
  }
  return placed;
}

export function poseLabel(agent) {
  const pose = { working: '工作中', waiting: '等你', error: '出錯', idle: '待命' }[agent?.status] || '待命';
  return agent?.task ? agent.task : pose;
}

function hash(value) {
  let h = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function look(agent) {
  const h = hash(agent?.id || agent?.name);
  const shirts = agent?.room === 'grok' ? SHIRT_GROK : SHIRT_CURSOR;
  return {
    h: HAIR[h % HAIR.length],
    s: SKIN[(h >>> 4) % SKIN.length],
    e: '#241c16',
    c: shirts[(h >>> 8) % shirts.length],
    p: '#343c55',
  };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function paintPattern(ctx, x, y, rows, colors, z) {
  for (let row = 0; row < rows.length; row += 1) {
    const line = rows[row];
    for (let col = 0; col < line.length; col += 1) {
      const color = colors[line[col]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * z, y + row * z, z, z);
    }
  }
}

export function paintPerson(ctx, x, y, agent, tick, z) {
  const bob = agent?.status === 'working' && Math.floor(tick / 280) % 2 === 0 ? z : 0;
  paintPattern(ctx, x, y + bob, BODY, look(agent), z);
}

function fitText(ctx, text, maxWidth) {
  const chars = [...String(text || '')];
  if (ctx.measureText(chars.join('')).width <= maxWidth) return chars.join('');
  while (chars.length > 1 && ctx.measureText(`${chars.join('')}…`).width > maxWidth) chars.pop();
  return `${chars.join('')}…`;
}

function screenColor(agent) {
  if (!agent) return '#9ec7d6';
  if (agent.status === 'working') return '#7dcea0';
  if (agent.status === 'waiting') return '#f0c36a';
  if (agent.status === 'error') return '#e07a72';
  return '#d5dde4';
}

function drawDesk(ctx, x, y, z, agent, tick) {
  const blink = agent?.status === 'working' && Math.floor(tick / 400) % 2 === 0;
  px(ctx, x + 8 * z, y, 16 * z, 12 * z, '#22262c');
  px(ctx, x + 9 * z, y + z, 14 * z, 9 * z, blink ? '#b7efcf' : screenColor(agent));
  px(ctx, x + 14 * z, y + 12 * z, 4 * z, 2 * z, '#22262c');
  px(ctx, x, y + 14 * z, 32 * z, 8 * z, '#c48a52');
  px(ctx, x, y + 14 * z, 32 * z, 2 * z, '#e0b078');
  px(ctx, x, y + 20 * z, 32 * z, 4 * z, '#8a5a32');
  px(ctx, x + 2 * z, y + 24 * z, 3 * z, 6 * z, '#6b4428');
  px(ctx, x + 27 * z, y + 24 * z, 3 * z, 6 * z, '#6b4428');
  px(ctx, x + 11 * z, y + 16 * z, 10 * z, 3 * z, '#3c414a');
}

function drawPlant(ctx, x, y, z) {
  px(ctx, x + 5 * z, y + 12 * z, 6 * z, 6 * z, '#8a5a32');
  px(ctx, x + 3 * z, y + 11 * z, 10 * z, 2 * z, '#6b4428');
  px(ctx, x + 2 * z, y + 4 * z, 12 * z, 8 * z, '#2f8a3a');
  px(ctx, x + 4 * z, y, 8 * z, 6 * z, '#49b255');
  px(ctx, x, y + 6 * z, 4 * z, 4 * z, '#257a32');
}

function drawSofa(ctx, x, y, z, color, dark) {
  px(ctx, x, y + 4 * z, 28 * z, 12 * z, color);
  px(ctx, x + 2 * z, y + 6 * z, 24 * z, 6 * z, '#f4efe4');
  px(ctx, x, y + 2 * z, 4 * z, 16 * z, dark);
  px(ctx, x + 24 * z, y + 2 * z, 4 * z, 16 * z, dark);
  px(ctx, x + 2 * z, y + 14 * z, 24 * z, 3 * z, dark);
}

function drawShelf(ctx, x, y, z) {
  px(ctx, x, y, 14 * z, 22 * z, '#6b4428');
  px(ctx, x + z, y + z, 12 * z, 6 * z, '#d7c4a2');
  px(ctx, x + z, y + 8 * z, 12 * z, 6 * z, '#d7c4a2');
  px(ctx, x + z, y + 15 * z, 12 * z, 6 * z, '#d7c4a2');
  const books = ['#c45b4a', '#3d6ea5', '#d0892d', '#3e6b4a', '#8d3b6b'];
  for (let i = 0; i < books.length; i += 1) px(ctx, x + (2 + i * 2) * z, y + 2 * z, z, 4 * z, books[i]);
}

function drawTable(ctx, x, y, z) {
  px(ctx, x, y, 16 * z, 10 * z, '#a56b3c');
  px(ctx, x, y, 16 * z, 2 * z, '#c48a52');
  px(ctx, x + z, y + 10 * z, 2 * z, 4 * z, '#6b4428');
  px(ctx, x + 13 * z, y + 10 * z, 2 * z, 4 * z, '#6b4428');
}

function drawCounter(ctx, x, y, z) {
  px(ctx, x, y + 6 * z, 36 * z, 12 * z, '#8a5a32');
  px(ctx, x, y + 6 * z, 36 * z, 3 * z, '#c48a52');
  px(ctx, x + 4 * z, y, 10 * z, 6 * z, '#f4efe4');
  px(ctx, x + 16 * z, y + z, 8 * z, 5 * z, '#3d6ea5');
}

function drawTree(ctx, x, y, z) {
  px(ctx, x + 6 * z, y + 12 * z, 4 * z, 8 * z, '#6b4428');
  px(ctx, x + 2 * z, y + 4 * z, 12 * z, 10 * z, '#2f7d32');
  px(ctx, x + 4 * z, y, 8 * z, 8 * z, '#3fa34a');
  px(ctx, x, y + 6 * z, 4 * z, 6 * z, '#276b2c');
}

function drawRug(ctx, x, y, w, h) {
  px(ctx, x, y, w, h, '#2c6844');
  px(ctx, x + 4, y + 4, w - 8, h - 8, '#3e8a58');
  px(ctx, x, y, w, 3, '#f2e6c9');
  px(ctx, x, y + h - 3, w, 3, '#f2e6c9');
  px(ctx, x, y, 3, h, '#f2e6c9');
  px(ctx, x + w - 3, y, 3, h, '#f2e6c9');
}

function isWall(tx, ty) {
  if (tx < 1 || ty < 1 || tx > 26 || ty > 17) return false;
  const edge = tx === 1 || tx === 26 || ty === 1 || ty === 17 || tx === 14 || ty === 9;
  if (!edge) return false;
  if (ty === 17 && tx >= 12 && tx <= 15) return false;
  if (tx === 14 && ty >= 4 && ty <= 6) return false;
  if (tx === 14 && ty >= 12 && ty <= 14) return false;
  if (ty === 9 && tx >= 6 && tx <= 8) return false;
  return true;
}

function drawGrass(ctx, tile) {
  px(ctx, 0, 0, COLS * tile, ROWS * tile, '#3f8f32');
  for (let y = 0; y < ROWS * tile; y += 4) {
    for (let x = 0; x < COLS * tile; x += 4) {
      const n = (x * 3 + y * 5) % 17;
      if (n === 0) px(ctx, x, y, 2, 2, '#4ea03c');
      else if (n === 1) px(ctx, x, y, 2, 2, '#2f7328');
      else if (n === 2) px(ctx, x, y, 2, 2, '#f2d26a');
    }
  }
}

function drawFloor(ctx, room, tile) {
  const x = room.x * tile;
  const y = room.y * tile;
  const w = room.w * tile;
  const h = room.h * tile;
  if (room.floor === 'wood' || room.floor === 'lounge') {
    px(ctx, x, y, w, h, '#c9a36a');
    ctx.fillStyle = '#b68d55';
    for (let row = 0; row < h; row += tile / 2) {
      const shift = (row / (tile / 2)) % 2 === 0 ? 0 : tile / 2;
      for (let col = -tile; col < w; col += tile) ctx.fillRect(x + col + shift, y + row, 2, tile / 2);
    }
    return;
  }
  const base = room.floor === 'sand' ? '#f0ddb0' : '#e7e0d2';
  const alt = room.floor === 'sand' ? '#e4cc96' : '#d9d0be';
  for (let ty = 0; ty < room.h; ty += 1) {
    for (let tx = 0; tx < room.w; tx += 1) {
      px(ctx, x + tx * tile, y + ty * tile, tile, tile, (tx + ty) % 2 === 0 ? base : alt);
    }
  }
}

function drawDoors(ctx, tile) {
  const wood = [
    [14, 4],
    [14, 5],
    [14, 6],
    [14, 12],
    [14, 13],
    [14, 14],
    [6, 9],
    [7, 9],
    [8, 9],
  ];
  for (const [tx, ty] of wood) px(ctx, tx * tile, ty * tile, tile, tile, '#c9a36a');
}

function drawWalls(ctx, tile) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (!isWall(tx, ty)) continue;
      const x = tx * tile;
      const y = ty * tile;
      px(ctx, x, y, tile, tile, '#5c5348');
      px(ctx, x, y, tile, Math.max(3, tile / 6), '#8d8070');
      px(ctx, x, y + tile - Math.max(2, tile / 8), tile, Math.max(2, tile / 8), '#3e382f');
    }
  }
}

function drawBubble(ctx, x, y, text, tile) {
  ctx.font = `bold ${Math.max(11, Math.round(tile * 0.42))}px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif`;
  ctx.textBaseline = 'middle';
  const shown = fitText(ctx, text, tile * 3.2);
  const width = Math.ceil(ctx.measureText(shown).width) + 12;
  const height = Math.max(16, Math.round(tile * 0.62));
  const left = Math.round(x - width / 2);
  const top = Math.round(y - height - 6);
  px(ctx, left, top, width, height, '#fffdf8');
  px(ctx, left, top, width, 2, '#2a241c');
  px(ctx, left, top + height - 2, width, 2, '#2a241c');
  px(ctx, left, top, 2, height, '#2a241c');
  px(ctx, left + width - 2, top, 2, height, '#2a241c');
  px(ctx, x - 3, top + height, 6, 4, '#fffdf8');
  ctx.fillStyle = '#2a241c';
  ctx.fillText(shown, left + 6, top + height / 2 + 1);
}

function drawPlaque(ctx, room, tile) {
  const text = room.name;
  ctx.font = `bold ${Math.max(12, Math.round(tile * 0.46))}px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif`;
  ctx.textBaseline = 'middle';
  const width = Math.ceil(ctx.measureText(text).width) + 16;
  const height = Math.max(16, Math.round(tile * 0.7));
  const x = Math.round((room.x + room.w / 2) * tile - width / 2);
  const y = room.y * tile + 4;
  px(ctx, x, y, width, height, '#2c2824');
  px(ctx, x, y, width, 3, '#f0c36a');
  ctx.fillStyle = '#f6edd4';
  ctx.fillText(text, x + 8, y + height / 2 + 1);
}

function drawPath(ctx, tile) {
  for (let ty = 17; ty < ROWS; ty += 1) {
    for (let tx = 11; tx <= 16; tx += 1) {
      px(ctx, tx * tile, ty * tile, tile, tile, (tx + ty) % 2 === 0 ? '#b08968' : '#c4a484');
    }
  }
}

function furniture(ctx, tile, placed, tick) {
  const z = tile / 16;
  const at = (tx, ty) => ({ x: tx * tile, y: ty * tile });
  drawCounter(ctx, at(3, 3).x, at(3, 3).y, z);
  drawPlant(ctx, at(12, 3).x, at(12, 3).y, z);
  drawSofa(ctx, at(5, 7).x, at(5, 7).y, z, '#3d6ea5', '#2c5282');
  drawSofa(ctx, at(9, 7).x, at(9, 7).y, z, '#8d4a3b', '#6b3428');
  drawShelf(ctx, at(2, 11).x, at(2, 11).y, z);
  drawSofa(ctx, at(5, 11).x, at(5, 11).y, z, '#3e6b4a', '#2c4a34');
  drawTable(ctx, at(10, 12).x, at(10, 12).y, z);
  drawPlant(ctx, at(12, 15).x, at(12, 15).y, z);
  drawPlant(ctx, at(2, 15).x, at(2, 15).y, z);
  drawShelf(ctx, at(15, 3).x, at(15, 3).y, z);
  drawPlant(ctx, at(25, 6).x, at(25, 6).y, z);
  drawPlant(ctx, at(25, 14).x, at(25, 14).y, z);
  for (const seat of SEATS.cursor) {
    const agent = placed.find((item) => item.room === 'cursor' && item.seat === seat)?.agent;
    drawDesk(ctx, (seat.x - 1) * tile, (seat.y - 4) * tile, z, agent, tick);
  }
  for (const seat of SEATS.grok) {
    const agent = placed.find((item) => item.room === 'grok' && item.seat === seat)?.agent;
    drawDesk(ctx, (seat.x - 1) * tile, (seat.y - 4) * tile, z, agent, tick);
  }
  drawTree(ctx, 0, tile, z);
  drawTree(ctx, 26 * tile + 8, tile, z);
  drawTree(ctx, 0, 15 * tile, z);
}

function chooseTile(width, height) {
  if (width >= COLS * 32 + 8 && height >= ROWS * 32 + 8) return 32;
  return 16;
}

export function renderOffice(canvas, state, tick, selectedId) {
  const ctx = canvas.getContext('2d');
  const tile = chooseTile(canvas.width, canvas.height);
  const mapW = COLS * tile;
  const mapH = ROWS * tile;
  view = {
    tile,
    ox: Math.floor((canvas.width - mapW) / 2),
    oy: Math.max(4, Math.floor((canvas.height - mapH) / 5)),
  };
  boxes = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#163018';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, view.ox, view.oy);
  drawGrass(ctx, tile);
  drawPath(ctx, tile);
  for (const room of ROOMS) drawFloor(ctx, room, tile);
  drawDoors(ctx, tile);
  drawWalls(ctx, tile);
  const placed = placeAgents(state?.agents || []);
  furniture(ctx, tile, placed, tick);
  const z = tile / 16;
  const pz = z * 2;
  const people = placed
    .map((item) => {
      const width = 16 * pz;
      const height = BODY.length * pz;
      const footX = item.seat.x * tile + tile / 2 - width / 2;
      const footY = (item.seat.y + 1) * tile;
      return { ...item, x: footX, y: footY - height, w: width, h: height };
    })
    .sort((a, b) => a.y - b.y);
  for (const person of people) {
    if (person.agent.id === selectedId) {
      px(ctx, person.x - 3, person.y - 3, person.w + 6, person.h + 6, '#f0c36a');
    }
    px(ctx, person.x + 2, person.y + person.h - 3, person.w - 4, 4, 'rgba(20, 30, 16, 0.35)');
    paintPerson(ctx, person.x, person.y, person.agent, tick, pz);
    boxes.push({ id: person.agent.id, x: view.ox + person.x, y: view.oy + person.y, w: person.w, h: person.h + 8 });
  }
  for (const person of people) {
    const busy = person.agent.id === selectedId || person.agent.status === 'working' || person.agent.status === 'waiting' || person.agent.status === 'error';
    const caption = busy ? poseLabel(person.agent) : person.agent.name;
    drawBubble(ctx, person.x + person.w / 2, person.y, caption, tile);
  }
  for (const room of ROOMS) drawPlaque(ctx, room, tile);
  if (!placed.length) {
    ctx.font = `bold ${Math.max(14, tile * 0.5)}px "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2c2824';
    const text = '還沒有人進辦公室';
    const width = ctx.measureText(text).width + 20;
    const x = 8 * tile;
    const y = 5 * tile;
    px(ctx, x, y, width, tile);
    ctx.fillStyle = '#f6edd4';
    ctx.fillText(text, x + 10, y + tile / 2);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function pickAgent(x, y) {
  for (let i = boxes.length - 1; i >= 0; i -= 1) {
    const box = boxes[i];
    if (x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) return box.id;
  }
  return '';
}

export function drawAvatar(canvas, agent) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paintPerson(ctx, 2, 0, agent, 0, 2);
}
