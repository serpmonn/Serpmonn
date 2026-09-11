/** Top-down walls, doors and furniture for Neli */
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath();
  if (!r) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRR(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  rr(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRR(ctx, x, y, w, h, r, color, lw) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw || 1;
  rr(ctx, x, y, w, h, r);
  ctx.stroke();
}

function inferPropKind(p) {
  if (p.kind) return p.kind;
  const L = (p.label || '').toLowerCase();
  if (!L) return 'none';
  if (L.includes('фургон')) return 'van';
  if (L.includes('дверь') || L.includes('тропинк') || L === 'вход' || L.includes('вход ↓')) return 'door';
  if (L.includes('ворот')) return 'garageDoor';
  if (L.includes('стекл')) return 'window';
  if (L.includes('диван')) return 'sofa';
  if (L.includes('стул')) return 'chair';
  if (L.includes('кроват')) return 'bed';
  if (L.includes('стол')) return 'table';
  if (L.includes('шкаф') || L.includes('гардероб')) return 'cabinet';
  if (L.includes('короб')) return 'boxes';
  if (L.includes('полк')) return 'shelf';
  if (L.includes('сейф')) return 'safe';
  if (L.includes('кондей')) return 'ac';
  if (L.includes('слив')) return 'drain';
  if (L.includes('инструмент')) return 'tools';
  if (L.includes('ванн')) return 'tub';
  if (L.includes('лестн')) return 'stairs';
  if (L.includes('чердак') || L.includes('подвал')) return 'hatch';
  if (L.includes('кухн')) return 'counter';
  if (L.includes('ресепшен')) return 'desk';
  if (L.includes('разделоч')) return 'butcher';
  if (L.includes('лес')) return 'trees';
  if (L.includes('дорожк')) return 'rug';
  if (
    L.includes('гостин') ||
    L.includes('прихож') ||
    L.includes('гостев') ||
    L.includes('склад') ||
    L.includes('комната')
  ) {
    return 'rug';
  }
  return 'block';
}

function drawWoodFloor(ctx, x, y, w, h, base) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = 1;
  const plank = 16;
  for (let py = y; py < y + h; py += plank) {
    ctx.beginPath();
    ctx.moveTo(x, py + 0.5);
    ctx.lineTo(x + w, py + 0.5);
    ctx.stroke();
    const off = ((py / plank) % 2) * 36;
    for (let px = x + off; px < x + w; px += 72) {
      ctx.beginPath();
      ctx.moveTo(px + 0.5, py);
      ctx.lineTo(px + 0.5, Math.min(py + plank, y + h));
      ctx.stroke();
    }
  }
}

function drawTiles(ctx, x, y, w, h, a, b) {
  const s = 28;
  for (let py = y; py < y + h; py += s) {
    for (let px = x; px < x + w; px += s) {
      ctx.fillStyle = ((px + py) / s) % 2 < 1 ? a : b;
      ctx.fillRect(px, py, Math.min(s, x + w - px), Math.min(s, y + h - py));
    }
  }
}

function drawConcrete(ctx, x, y, w, h, base) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 8; i++) {
    const gx = x + ((i * 97) % w);
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + w * 0.15, y + h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h * 0.4, 40, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawAsphalt(ctx, x, y, w, h, base) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  const vert = h >= w;
  if (vert) {
    ctx.fillRect(x, y, 6, h);
    ctx.fillRect(x + w - 6, y, 6, h);
  } else {
    ctx.fillRect(x, y, w, 6);
    ctx.fillRect(x, y + h - 6, w, 6);
  }
  ctx.strokeStyle = '#c8b060';
  ctx.setLineDash([28, 22]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (vert) {
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
  } else {
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}

function drawMoss(ctx, x, y, w, h, base) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(20, 40, 18, 0.35)';
  for (let i = 0; i < 18; i++) {
    const px = x + ((i * 53) % w);
    const py = y + ((i * 79) % h);
    ctx.beginPath();
    ctx.ellipse(px, py, 18 + (i % 7), 10 + (i % 5), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSceneFloor(ctx, scene) {
  const id = scene.id || '';
  if (id === 'garage') drawConcrete(ctx, 0, 0, scene.w, scene.h, scene.floor);
  else if (id === 'station') drawTiles(ctx, 0, 0, scene.w, scene.h, '#2c3038', '#262a32');
  else if (id === 'road') {
    ctx.fillStyle = '#1a2814';
    ctx.fillRect(0, 0, scene.w, scene.h);
    drawAsphalt(ctx, 188, 200, 264, scene.h - 200, '#3a3a32');
  } else if (id === 'forest') drawMoss(ctx, 0, 0, scene.w, scene.h, scene.floor);
  else if (id === 'kitchen') drawTiles(ctx, 0, 0, scene.w, scene.h, '#3a342c', '#322c26');
  else if (id === 'butcher') drawTiles(ctx, 0, 0, scene.w, scene.h, '#2a1c1c', '#241616');
  else drawWoodFloor(ctx, 0, 0, scene.w, scene.h, scene.floor);

  scene.floors?.forEach((f) => {
    ctx.fillStyle = f.color || '#2a241c';
    if (f.ellipse) {
      ctx.beginPath();
      ctx.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2, f.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.stroke();
    } else if ((f.label || '').includes('машин')) {
      drawConcrete(ctx, f.x, f.y, f.w, f.h, f.color);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeRect(f.x + 8, f.y + 8, f.w - 16, f.h - 16);
    } else {
      ctx.fillRect(f.x, f.y, f.w, f.h);
    }
  });
}

function indoorWalls(scene) {
  const id = scene && scene.id;
  return id && id !== 'road' && id !== 'forest';
}

function northWallY(scene) {
  let y = Infinity;
  (scene.walls || []).forEach((w) => {
    if (w.w >= w.h) y = Math.min(y, w.y);
  });
  return y;
}

function isNorthFace(w, scene) {
  if (!indoorWalls(scene)) return false;
  return w.w >= w.h && w.y <= northWallY(scene) + 8;
}

function isSideFace(w, scene) {
  if (!indoorWalls(scene)) return false;
  return w.h > w.w && w.y <= northWallY(scene) + 8;
}

function wallTones(scene) {
  const id = scene && scene.id;
  if (id === 'garage') return ['#6a6e66', '#5c6058', '#646860'];
  if (id === 'station') return ['#5a6068', '#4e545c', '#555c64'];
  if (id === 'forest') return ['#3a4a34', '#32422c', '#364630'];
  return ['#6e5e52', '#5e5046', '#66564c'];
}

function drawWallFace(ctx, x, y, bw, bh, scene, opts) {
  opts = opts || {};
  if (bw < 2 || bh < 2) return;
  ctx.fillStyle = '#1a1814';
  ctx.fillRect(x, y, bw, bh);
  const brickH = 16;
  const brickW = 36;
  const tones = wallTones(scene);
  let row = 0;
  const topPad = opts.cap === false ? 2 : 8;
  for (let py = y + topPad; py < y + bh - 8; py += brickH) {
    const off = (row % 2) * (brickW / 2);
    for (let px = x - off; px < x + bw; px += brickW) {
      const rx = Math.max(x + 1, px + 1);
      const rw = Math.min(x + bw - 1, px + brickW - 2) - rx;
      if (rw < 4) continue;
      ctx.fillStyle = tones[(row + Math.floor(px / brickW)) % tones.length];
      ctx.fillRect(rx, py + 1, rw, brickH - 3);
    }
    row += 1;
  }
  if (opts.cap !== false) {
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(x, y, bw, 7);
    ctx.fillStyle = '#2e2a24';
    ctx.fillRect(x, y + 7, bw, 3);
  }
  ctx.fillStyle = '#141210';
  ctx.fillRect(x, y + bh - 8, bw, 8);
  ctx.fillStyle = '#c4a060';
  ctx.fillRect(x, y + bh - 8, bw, 2);
  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y + bh, bw, 6);
  }
  if (opts.garage) {
    const winH = Math.min(52, bh - 16);
    const toolH = Math.min(46, bh - 16);
    drawGarageWindow(ctx, x + 16, y + 10, Math.min(150, bw * 0.28), winH);
    drawWallTools(ctx, x + 180, y + 12, Math.min(190, bw * 0.34), toolH);
  }
  ctx.strokeStyle = '#0a0806';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
}

function drawThinWall(ctx, w) {
  const horiz = w.w >= w.h;
  if (w.w < 1 || w.h < 1) return;
  ctx.fillStyle = '#2a221c';
  ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.fillStyle = '#3a3228';
  if (horiz) ctx.fillRect(w.x, w.y, w.w, 3);
  else ctx.fillRect(w.x, w.y, 3, w.h);
  ctx.fillStyle = '#15110e';
  if (horiz) ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
  else ctx.fillRect(w.x + w.w - 3, w.y, 3, w.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  if (horiz) {
    for (let x = w.x + 10; x < w.x + w.w; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, w.y);
      ctx.lineTo(x + 0.5, w.y + w.h);
      ctx.stroke();
    }
  } else {
    for (let y = w.y + 10; y < w.y + w.h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(w.x, y + 0.5);
      ctx.lineTo(w.x + w.w, y + 0.5);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#5a4a3a';
  ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
}

function drawWall(ctx, w, scene) {
  if (isNorthFace(w, scene)) {
    const y = Math.max(0, w.y - 36);
    const h = w.y + w.h - y;
    drawWallFace(ctx, w.x, y, w.w, h, scene, { garage: false });
    return;
  }
  if (isSideFace(w, scene)) {
    const y = Math.max(0, w.y - 36);
    const h = Math.min(w.h + (w.y - y), 64);
    drawWallFace(ctx, w.x, y, w.w, h, scene, { cap: false, shadow: false });
    drawThinWall(ctx, w);
    return;
  }
  drawThinWall(ctx, w);
}

function drawDoorFace(ctx, p) {
  const locked = !!p.locked;
  const frame = locked ? '#585856' : '#3a281c';
  const stroke = locked ? '#787876' : '#6a5040';
  const panel = locked ? '#484846' : '#4a3424';
  const panelLine = locked ? '#323230' : '#2a1c12';
  const knob = locked ? '#8a8a84' : '#c4a060';
  fillRR(ctx, p.x, p.y, p.w, p.h, 2, frame);
  strokeRR(ctx, p.x, p.y, p.w, p.h, 2, stroke, 2);
  const ix = p.x + 6;
  const iy = p.y + 8;
  const iw = p.w - 12;
  const ih = p.h - 16;
  ctx.fillStyle = panel;
  ctx.fillRect(ix, iy, iw, ih / 2 - 5);
  ctx.fillRect(ix, iy + ih / 2 + 3, iw, ih / 2 - 5);
  ctx.strokeStyle = panelLine;
  ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih / 2 - 6);
  ctx.strokeRect(ix + 0.5, iy + ih / 2 + 3.5, iw - 1, ih / 2 - 6);
  ctx.fillStyle = knob;
  ctx.beginPath();
  ctx.arc(p.x + p.w - 12, p.y + p.h * 0.52, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawDoor(ctx, p) {
  if (p.h >= 56 && p.w >= 40) {
    drawDoorFace(ctx, p);
    return;
  }
  const locked = !!p.locked;
  const frame = locked ? '#585856' : '#4a3424';
  const panelLine = locked ? '#323230' : '#2a1c12';
  const knob = locked ? '#8a8a84' : '#c4a060';
  const stroke = locked ? '#787876' : '#6a5038';
  const vert = p.h >= p.w;
  fillRR(ctx, p.x, p.y, p.w, p.h, 2, frame);
  ctx.fillStyle = panelLine;
  if (vert) {
    ctx.fillRect(p.x + 3, p.y + 6, p.w - 6, p.h / 2 - 10);
    ctx.fillRect(p.x + 3, p.y + p.h / 2 + 4, p.w - 6, p.h / 2 - 10);
    ctx.fillStyle = knob;
    ctx.beginPath();
    ctx.arc(p.x + p.w - 7, p.y + p.h / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = panelLine;
    ctx.fillRect(p.x + 6, p.y + 3, p.w / 2 - 10, p.h - 6);
    ctx.fillRect(p.x + p.w / 2 + 4, p.y + 3, p.w / 2 - 10, p.h - 6);
    ctx.fillStyle = knob;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h - 7, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  strokeRR(ctx, p.x, p.y, p.w, p.h, 2, stroke, 1.5);
}

function drawGarageDoor(ctx, p) {
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#3a342c';
  for (let y = p.y + 4; y < p.y + p.h; y += 6) {
    ctx.beginPath();
    ctx.moveTo(p.x, y + 0.5);
    ctx.lineTo(p.x + p.w, y + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(p.x + p.w / 2 - 10, p.y + p.h / 2 - 4, 20, 8);
  strokeRR(ctx, p.x, p.y, p.w, p.h, 0, '#6a5040', 2);
}

function drawVan(ctx, p) {
  const horiz = p.w >= p.h;
  const facing = p.facing || (horiz ? 'e' : 's');
  const len = horiz ? p.w : p.h;
  const wid = horiz ? p.h : p.w;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate({ e: 0, s: Math.PI / 2, w: Math.PI, n: -Math.PI / 2 }[facing] || 0);
  const x = -len / 2;
  const y = -wid / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 4, len / 2, wid / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  const cab = Math.max(28, len * 0.3);
  fillRR(ctx, x, y + 3, len - cab + 6, wid - 6, 7, '#3d2c20');
  fillRR(ctx, x + 5, y + 8, len - cab - 6, wid - 16, 3, '#4a3828');
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const rx = x + ((len - cab) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(rx, y + 8);
    ctx.lineTo(rx, y + wid - 8);
    ctx.stroke();
  }
  fillRR(ctx, x + len - cab, y + 2, cab - 2, wid - 4, 8, '#5a4030');
  fillRR(ctx, x + len - 20, y + 8, 12, wid - 16, 3, '#8ec8d8');
  ctx.fillStyle = 'rgba(20, 40, 50, 0.35)';
  ctx.fillRect(x + len - 18, y + 10, 8, wid - 20);
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(x + len - 7, y + 6, 5, 7);
  ctx.fillRect(x + len - 7, y + wid - 13, 5, 7);
  ctx.fillStyle = '#6a2018';
  ctx.fillRect(x + 2, y + 6, 4, 6);
  ctx.fillRect(x + 2, y + wid - 12, 4, 6);
  ctx.fillStyle = '#1a1a1a';
  const ww = Math.max(10, len * 0.08);
  const wh = 6;
  ctx.fillRect(x + 14, y - 1, ww, wh);
  ctx.fillRect(x + len - cab - 10, y - 1, ww, wh);
  ctx.fillRect(x + 14, y + wid - 5, ww, wh);
  ctx.fillRect(x + len - cab - 10, y + wid - 5, ww, wh);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(x + len - 4, y + 5, 4, wid - 10);
  ctx.fillStyle = '#c4a060';
  ctx.fillRect(x + len - cab + 8, y + wid / 2 - 2, 8, 3);
  ctx.restore();
}

function drawWindow(ctx, p) {
  ctx.fillStyle = '#1a2830';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = 'rgba(120, 170, 190, 0.35)';
  ctx.fillRect(p.x + 3, p.y + 2, p.w - 6, p.h - 4);
  ctx.strokeStyle = '#8aa8b4';
  ctx.strokeRect(p.x + 3.5, p.y + 2.5, p.w - 7, p.h - 5);
  ctx.beginPath();
  ctx.moveTo(p.x + p.w / 2, p.y + 2);
  ctx.lineTo(p.x + p.w / 2, p.y + p.h - 2);
  ctx.stroke();
}

function drawSofa(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 8, '#3d332c');
  fillRR(ctx, p.x + 8, p.y + 10, p.w - 16, p.h - 18, 6, '#5a4a3e');
  const cw = (p.w - 20) / 2;
  fillRR(ctx, p.x + 10, p.y + 12, cw - 4, p.h - 28, 4, '#6a5648');
  fillRR(ctx, p.x + 12 + cw, p.y + 12, cw - 4, p.h - 28, 4, '#624e42');
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 8);
  strokeRR(ctx, p.x, p.y, p.w, p.h, 8, '#1a1612', 1);
}

function drawChair(ctx, p) {
  fillRR(ctx, p.x + 4, p.y + 8, p.w - 8, p.h - 10, 4, '#5a4a38');
  ctx.fillStyle = '#3a3024';
  ctx.fillRect(p.x + 3, p.y, p.w - 6, 10);
  strokeRR(ctx, p.x + 4, p.y + 8, p.w - 8, p.h - 10, 4, '#2a2018', 1);
}

function drawBed(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 4, '#3a3228');
  fillRR(ctx, p.x + 4, p.y + 6, p.w - 8, p.h - 10, 3, '#6a5a4a');
  fillRR(ctx, p.x + 8, p.y + 8, p.w - 16, 16, 3, '#d8c8b0');
  ctx.fillStyle = '#4a3a48';
  ctx.fillRect(p.x + 6, p.y + 26, p.w - 12, p.h - 34);
  strokeRR(ctx, p.x, p.y, p.w, p.h, 4, '#1a1410', 1);
}

function drawTable(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 3, '#5a4634');
  ctx.fillStyle = '#3a2c20';
  const leg = 6;
  ctx.fillRect(p.x + 4, p.y + 4, leg, leg);
  ctx.fillRect(p.x + p.w - 10, p.y + 4, leg, leg);
  ctx.fillRect(p.x + 4, p.y + p.h - 10, leg, leg);
  ctx.fillRect(p.x + p.w - 10, p.y + p.h - 10, leg, leg);
  ctx.fillStyle = 'rgba(80, 50, 30, 0.4)';
  ctx.fillRect(p.x + p.w * 0.3, p.y + p.h * 0.35, 22, 14);
  strokeRR(ctx, p.x, p.y, p.w, p.h, 3, '#2a1c12', 1);
}

function drawCabinet(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 2, '#3a3024');
  const mid = p.w >= p.h;
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 1;
  if (mid) {
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, p.y + 4);
    ctx.lineTo(p.x + p.w / 2, p.y + p.h - 4);
    ctx.stroke();
    ctx.fillStyle = '#c4a060';
    ctx.fillRect(p.x + p.w / 2 - 10, p.y + p.h / 2 - 2, 6, 4);
    ctx.fillRect(p.x + p.w / 2 + 4, p.y + p.h / 2 - 2, 6, 4);
  } else {
    ctx.beginPath();
    ctx.moveTo(p.x + 4, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w - 4, p.y + p.h / 2);
    ctx.stroke();
    ctx.fillStyle = '#c4a060';
    ctx.fillRect(p.x + p.w / 2 - 2, p.y + p.h / 2 - 10, 4, 6);
    ctx.fillRect(p.x + p.w / 2 - 2, p.y + p.h / 2 + 4, 4, 6);
  }
  strokeRR(ctx, p.x, p.y, p.w, p.h, 2, '#6a5a48', 1);
}

function drawBoxes(ctx, p) {
  const a = { x: p.x + 4, y: p.y + p.h * 0.25, w: p.w * 0.55, h: p.h * 0.55 };
  const b = { x: p.x + p.w * 0.35, y: p.y + 6, w: p.w * 0.55, h: p.h * 0.5 };
  fillRR(ctx, a.x, a.y, a.w, a.h, 2, '#8a6a38');
  fillRR(ctx, b.x, b.y, b.w, b.h, 2, '#9a7a44');
  ctx.strokeStyle = '#c4a060';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y + a.h / 2);
  ctx.lineTo(a.x + a.w, a.y + a.h / 2);
  ctx.moveTo(a.x + a.w / 2, a.y);
  ctx.lineTo(a.x + a.w / 2, a.y + a.h);
  ctx.stroke();
  strokeRR(ctx, a.x, a.y, a.w, a.h, 2, '#3a2810', 1);
  strokeRR(ctx, b.x, b.y, b.w, b.h, 2, '#3a2810', 1);
}

function drawShelf(ctx, p) {
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  const rows = 3;
  const rh = p.h / rows;
  for (let i = 0; i < rows; i++) {
    ctx.fillStyle = '#4a4034';
    ctx.fillRect(p.x + 3, p.y + i * rh + 3, p.w - 6, rh - 6);
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(p.x + 8, p.y + i * rh + 8, 12, rh - 16);
    ctx.fillStyle = '#3a5058';
    ctx.fillRect(p.x + 24, p.y + i * rh + 10, 10, rh - 18);
  }
  strokeRR(ctx, p.x, p.y, p.w, p.h, 0, '#1a1410', 1);
}

function drawSafe(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 3, '#2a2e32');
  ctx.fillStyle = '#1a1c1e';
  ctx.fillRect(p.x + 8, p.y + 10, p.w - 16, p.h - 20);
  ctx.strokeStyle = '#6a7078';
  ctx.strokeRect(p.x + 8.5, p.y + 10.5, p.w - 17, p.h - 21);
  ctx.fillStyle = '#c4a060';
  ctx.beginPath();
  ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 3, 0, Math.PI * 2);
  ctx.fill();
  strokeRR(ctx, p.x, p.y, p.w, p.h, 3, '#8a9098', 1);
}

function drawAc(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 3, '#4a5558');
  ctx.strokeStyle = '#1a2022';
  for (let y = p.y + 8; y < p.y + p.h - 6; y += 5) {
    ctx.beginPath();
    ctx.moveTo(p.x + 6, y);
    ctx.lineTo(p.x + p.w - 6, y);
    ctx.stroke();
  }
  strokeRR(ctx, p.x, p.y, p.w, p.h, 3, '#8aa0a8', 1);
}

function drawDrain(ctx, p) {
  ctx.fillStyle = '#1a1814';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a4a4a';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 - 3, p.h / 2 - 3, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTools(ctx, p) {
  ctx.fillStyle = '#2a2620';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  const colors = ['#8a8a8a', '#c45c3a', '#4a4a4a', '#c4a060'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(p.x + 10 + i * 28, p.y + 3, 4, p.h - 6);
  }
}

function drawTub(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 10, '#d0d4d8');
  fillRR(ctx, p.x + 6, p.y + 6, p.w - 12, p.h - 12, 8, '#8aa0b0');
  ctx.fillStyle = '#e8ecee';
  ctx.beginPath();
  ctx.arc(p.x + p.w - 14, p.y + 12, 4, 0, Math.PI * 2);
  ctx.fill();
  strokeRR(ctx, p.x, p.y, p.w, p.h, 10, '#6a7078', 1);
}

function drawStairs(ctx, p) {
  const steps = 6;
  const vert = p.h >= p.w;
  for (let i = 0; i < steps; i++) {
    ctx.fillStyle = i % 2 ? '#4a4034' : '#3a342c';
    if (vert) {
      const sh = p.h / steps;
      ctx.fillRect(p.x, p.y + i * sh, p.w, sh);
    } else {
      const sw = p.w / steps;
      ctx.fillRect(p.x + i * sw, p.y, sw, p.h);
    }
  }
  ctx.strokeStyle = '#1a1410';
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
}

function drawHatch(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 2, '#2a2018');
  ctx.strokeStyle = '#6a5a40';
  ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
  ctx.fillStyle = '#c4a060';
  ctx.fillRect(p.x + p.w / 2 - 6, p.y + 6, 12, 4);
}

function drawCounter(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 2, '#4a4034');
  ctx.fillStyle = '#6a6054';
  ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, 10);
  ctx.fillStyle = '#3a5058';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w * 0.7, p.y + p.h * 0.55, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  strokeRR(ctx, p.x, p.y, p.w, p.h, 2, '#2a2018', 1);
}

function drawDesk(ctx, p) {
  drawTable(ctx, p);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(p.x + 10, p.y + 8, 28, 16);
}

function drawButcher(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 2, '#5a3030');
  ctx.fillStyle = '#3a1818';
  ctx.fillRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
  ctx.fillStyle = '#8a4040';
  ctx.fillRect(p.x + p.w * 0.3, p.y + p.h * 0.4, 24, 10);
  strokeRR(ctx, p.x, p.y, p.w, p.h, 2, '#2a1010', 1);
}

function drawRug(ctx, p) {
  ctx.fillStyle = p.color || '#2a3228';
  ctx.globalAlpha = 0.55;
  rr(ctx, p.x, p.y, p.w, p.h, 6);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.stroke();
}

function drawTrees(ctx, p) {
  ctx.fillStyle = '#142014';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e3318';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2 - 4, p.y + p.h / 2 - 6, p.w / 3, p.h / 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBlock(ctx, p) {
  fillRR(ctx, p.x, p.y, p.w, p.h, 3, p.color || '#3a342c');
  strokeRR(ctx, p.x, p.y, p.w, p.h, 3, '#1a1612', 1);
}

const PROP_DRAW = {
  door: drawDoor,
  garageDoor: drawGarageDoor,
  van: drawVan,
  window: drawWindow,
  sofa: drawSofa,
  chair: drawChair,
  bed: drawBed,
  table: drawTable,
  cabinet: drawCabinet,
  boxes: drawBoxes,
  shelf: drawShelf,
  safe: drawSafe,
  ac: drawAc,
  drain: drawDrain,
  tools: drawTools,
  tub: drawTub,
  stairs: drawStairs,
  hatch: drawHatch,
  counter: drawCounter,
  desk: drawDesk,
  butcher: drawButcher,
  rug: drawRug,
  trees: drawTrees,
  block: drawBlock
};

function drawCreakBoard(ctx, c) {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.08);
  ctx.fillStyle = c._latched ? 'rgba(90, 40, 20, 0.42)' : 'rgba(180, 120, 50, 0.28)';
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.strokeStyle = c._latched ? '#5a3020' : '#c4a060';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-c.w / 2 + 0.5, -c.h / 2 + 0.5, c.w - 1, c.h - 1);
  ctx.strokeStyle = c._latched ? 'rgba(60,30,18,0.5)' : 'rgba(120,80,30,0.35)';
  ctx.beginPath();
  ctx.moveTo(-c.w / 2 + 4, 0);
  ctx.lineTo(c.w / 2 - 4, 0);
  ctx.stroke();
  ctx.restore();
}

function drawWorld(ctx, scene) {
  drawSceneFloor(ctx, scene);
  const walls = scene.walls || [];
  walls.filter((w) => !isNorthFace(w, scene)).forEach((w) => drawWall(ctx, w, scene));
  walls.filter((w) => isNorthFace(w, scene)).forEach((w) => drawWall(ctx, w, scene));
  scene.props?.forEach((p) => {
    if (p.hidden) return;
    try {
      const kind = inferPropKind(p);
      if (kind === 'none') return;
      (PROP_DRAW[kind] || drawBlock)(ctx, p);
    } catch (err) {
      console.error('prop', p.label, err);
    }
  });
  scene.creaks?.forEach((c) => drawCreakBoard(ctx, c));
}
