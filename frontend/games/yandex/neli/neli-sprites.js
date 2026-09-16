/**
 * Illustrated world characters, closer to dialogue portraits.
 */
(function (global) {
  const INK = '#1a1210';

  const PAL = {
    neli: {
      skin: '#edd0bc',
      skin2: '#d4a894',
      hair: '#c4b49a',
      hair2: '#9a8a74',
      eye: '#1a1412',
      shirt: '#3c4568',
      shirt2: '#2a324c',
      shirt3: '#4e5878',
      pants: '#1e2438',
      shoes: '#141218',
      accent: '#e0c04a',
      blush: '#e89aa0',
      lip: '#7a3848'
    },
    rey: {
      skin: '#e0c0b0',
      skin2: '#c49a8c',
      hair: '#8a2834',
      hair2: '#5a1420',
      hair3: '#a83848',
      eye: '#1a1410',
      shirt: '#f4f2ee',
      shirt2: '#d0cec8',
      pants: '#2c2a32',
      shoes: '#161418',
      accent: '#1a1818',
      stubble: '#6a4c44',
      nail: '#1c2840'
    },
    liam: {
      skin: '#d4a882',
      skin2: '#b88864',
      hair: '#dcc060',
      hair2: '#b89838',
      hair3: '#eed878',
      eye: '#1a1410',
      shirt: '#f6f3ec',
      shirt2: '#d8d4cc',
      pants: '#3a3c48',
      shoes: '#161418',
      accent: '#d4b45c'
    },
    hans: {
      skin: '#e0c0ac',
      skin2: '#c49c88',
      hair: '#2c2826',
      hair2: '#1a1614',
      eye: '#1a1410',
      shirt: '#3a3e4c',
      shirt2: '#2a2c38',
      collar: '#1c1e28',
      pants: '#2c2a28',
      shoes: '#141210',
      stubble: '#3a322c'
    },
    boss: {
      skin: '#d4b08a',
      skin2: '#b8906c',
      hair: '#a8a49c',
      hair2: '#78746c',
      eye: '#1a1410',
      shirt: '#2c3858',
      shirt2: '#1e2840',
      shirt3: '#3c4868',
      pants: '#1a2030',
      shoes: '#101018',
      accent: '#e0c04a',
      stubble: '#5a4c40'
    }
  };

  const portraits = Object.create(null);

  function palOf(key) {
    return PAL[key] || PAL.neli;
  }

  function bulky(key) {
    return key === 'hans' || key === 'liam' || key === 'boss';
  }

  function ellipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function fillStroke(ctx, fill, width) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = width || 2.35;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function blob(ctx, fill, pts, width) {
    if (pts.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      ctx.quadraticCurveTo(a[0], a[1], mx, my);
    }
    ctx.closePath();
    fillStroke(ctx, fill, width);
  }

  function limb(ctx, x1, y1, x2, y2, width, fill) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = width + 2.6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function patch(ctx, x, y, rx, ry, color) {
    ellipse(ctx, x, y, rx, ry);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function stubble(ctx, cx, cy, rx, ry, color) {
    if (!color) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    hatch(ctx, cx, cy, rx * 2.4, ry * 2.4, color, 1.35);
    ctx.restore();
  }

  function chinShade(ctx, x, y, color) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    patch(ctx, x, y, 4.2, 2.8, color);
    ctx.restore();
  }

  function hatch(ctx, x, y, w, h, color, step) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.05;
    ctx.globalAlpha = 0.7;
    for (let i = -w / 2; i <= w / 2; i += step || 1.6) {
      ctx.beginPath();
      ctx.moveTo(x + i, y - h / 2);
      ctx.lineTo(x + i + 1.2, y + h / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function hairNeli(ctx, pal, view, hx, hy) {
    if (view === 'up') {
      blob(ctx, pal.hair, [
        [hx - 14, hy + 2], [hx - 10, hy - 14], [hx + 4, hy - 17],
        [hx + 13, hy - 11], [hx + 14, hy + 3], [hx + 5, hy + 9], [hx - 6, hy + 9]
      ]);
      return;
    }
    if (view === 'side') {
      blob(ctx, pal.hair, [
        [hx - 2, hy - 16], [hx + 10, hy - 14], [hx + 13, hy + 1],
        [hx + 6, hy + 10], [hx - 5, hy + 6], [hx - 8, hy - 4]
      ]);
      blob(ctx, pal.hair2, [[hx + 8, hy - 16], [hx + 15, hy - 18], [hx + 11, hy - 8]]);
      blob(ctx, pal.hair, [[hx + 9, hy - 1], [hx + 16, hy + 3], [hx + 10, hy + 6]]);
      blob(ctx, pal.hair2, [[hx + 4, hy - 17], [hx + 7, hy - 22], [hx + 8, hy - 14]]);
      return;
    }
    blob(ctx, pal.hair, [
      [hx - 13, hy], [hx - 16, hy - 12], [hx - 8, hy - 20],
      [hx + 3, hy - 21], [hx + 13, hy - 15], [hx + 16, hy - 6],
      [hx + 13, hy + 4], [hx + 5, hy + 6], [hx - 8, hy + 5]
    ]);
    blob(ctx, pal.hair2, [[hx + 4, hy - 20], [hx + 12, hy - 24], [hx + 10, hy - 14]]);
    blob(ctx, pal.hair2, [[hx - 12, hy - 10], [hx - 19, hy - 8], [hx - 13, hy]]);
    blob(ctx, pal.hair, [[hx + 13, hy - 4], [hx + 19, hy + 2], [hx + 12, hy + 6]]);
    blob(ctx, pal.hair, [[hx - 7, hy - 18], [hx - 4, hy - 24], [hx - 1, hy - 16]]);
    blob(ctx, pal.hair2, [[hx + 7, hy - 8], [hx + 12, hy - 3], [hx + 6, hy - 1]]);
  }

  function hairRey(ctx, pal, view, hx, hy) {
    if (view === 'up') {
      blob(ctx, pal.hair, [
        [hx - 17, hy + 4], [hx - 12, hy - 17], [hx + 6, hy - 20],
        [hx + 17, hy - 8], [hx + 15, hy + 12], [hx - 10, hy + 16]
      ], 2.5);
      blob(ctx, pal.hair, [[hx + 2, hy - 20], [hx + 7, hy - 26], [hx + 6, hy - 16]]);
      return;
    }
    if (view === 'side') {
      blob(ctx, pal.hair2, [
        [hx - 19, hy - 2], [hx - 22, hy + 16], [hx - 8, hy + 22], [hx - 2, hy + 8]
      ], 2.5);
      blob(ctx, pal.hair, [
        [hx - 8, hy - 18], [hx + 10, hy - 15], [hx + 13, hy + 3],
        [hx + 2, hy + 13], [hx - 12, hy + 6]
      ], 2.5);
      blob(ctx, pal.hair, [[hx + 3, hy - 19], [hx + 9, hy - 26], [hx + 7, hy - 14]]);
      return;
    }
    blob(ctx, pal.hair, [
      [hx - 15, hy - 2], [hx - 14, hy - 20], [hx - 2, hy - 24],
      [hx + 12, hy - 19], [hx + 20, hy - 4], [hx + 17, hy + 14],
      [hx + 8, hy + 20], [hx - 8, hy + 10]
    ], 2.6);
    blob(ctx, pal.hair3 || pal.hair, [[hx + 1, hy - 24], [hx + 7, hy - 30], [hx + 6, hy - 18]]);
    blob(ctx, pal.hair2, [
      [hx + 4, hy - 10], [hx + 16, hy - 6], [hx + 17, hy + 8],
      [hx + 10, hy + 12], [hx + 2, hy + 4]
    ], 2.4);
  }

  function hairLiam(ctx, pal, view, hx, hy) {
    if (view === 'up') {
      blob(ctx, pal.hair, [
        [hx - 17, hy], [hx - 10, hy - 20], [hx + 8, hy - 20],
        [hx + 17, hy], [hx + 12, hy + 13], [hx - 12, hy + 13]
      ]);
      return;
    }
    if (view === 'side') {
      blob(ctx, pal.hair2, [
        [hx - 17, hy], [hx - 22, hy + 16], [hx - 6, hy + 20], [hx - 2, hy + 4]
      ]);
      blob(ctx, pal.hair, [
        [hx - 6, hy - 20], [hx + 10, hy - 16], [hx + 12, hy + 6], [hx - 4, hy + 10]
      ]);
      limb(ctx, hx + 10, hy + 1, hx + 21, hy + 2, 2.5, pal.hair);
      limb(ctx, hx + 11, hy + 4, hx + 22, hy + 8, 2.1, pal.hair2);
      return;
    }
    blob(ctx, pal.hair, [
      [hx - 16, hy - 1], [hx - 14, hy - 20], [hx - 2, hy - 24],
      [hx + 12, hy - 20], [hx + 18, hy - 4], [hx + 14, hy + 12],
      [hx + 4, hy + 14], [hx - 10, hy + 10]
    ]);
    blob(ctx, pal.hair3 || pal.hair, [[hx - 4, hy - 22], [hx + 3, hy - 28], [hx + 5, hy - 18]]);
    blob(ctx, pal.hair2, [[hx - 14, hy + 4], [hx - 18, hy + 16], [hx - 6, hy + 10]]);
    blob(ctx, pal.hair2, [[hx + 12, hy + 4], [hx + 18, hy + 14], [hx + 6, hy + 10]]);
    blob(ctx, pal.hair, [[hx - 11, hy - 12], [hx - 4, hy - 16], [hx + 2, hy - 10]], 2);
    limb(ctx, hx + 14, hy + 1, hx + 26, hy + 0, 2.8, pal.hair);
    limb(ctx, hx + 15, hy + 4, hx + 27, hy + 7, 2.3, pal.hair2);
    limb(ctx, hx + 14, hy + 7, hx + 25, hy + 12, 2.1, pal.hair2);
    blob(ctx, pal.hair2, [[hx + 24, hy - 1], [hx + 28, hy + 2], [hx + 24, hy + 5]], 1.8);
    blob(ctx, pal.hair2, [[hx + 25, hy + 8], [hx + 29, hy + 11], [hx + 25, hy + 14]], 1.8);
  }

  function hairHans(ctx, pal, view, hx, hy) {
    if (view === 'up') {
      blob(ctx, pal.hair, [
        [hx - 14, hy], [hx - 6, hy - 14], [hx + 8, hy - 14], [hx + 14, hy], [hx, hy + 8]
      ]);
      return;
    }
    if (view === 'side') {
      blob(ctx, pal.hair, [
        [hx - 2, hy - 14], [hx + 12, hy - 10], [hx + 10, hy + 6], [hx - 6, hy + 4]
      ]);
      blob(ctx, pal.hair2, [[hx + 4, hy - 15], [hx + 8, hy - 20], [hx + 9, hy - 12]]);
      return;
    }
    blob(ctx, pal.hair, [
      [hx - 15, hy - 1], [hx - 12, hy - 17], [hx + 2, hy - 20],
      [hx + 14, hy - 12], [hx + 15, hy + 4], [hx + 6, hy + 8],
      [hx - 8, hy + 8]
    ]);
    blob(ctx, pal.hair2, [[hx - 2, hy - 18], [hx + 4, hy - 24], [hx + 5, hy - 14]]);
  }

  function hairBoss(ctx, pal, view, hx, hy) {
    if (view === 'up' || view === 'side') {
      blob(ctx, pal.hair, [
        [hx - 12, hy - 2], [hx - 4, hy - 12], [hx + 6, hy - 10], [hx + 12, hy], [hx, hy + 5]
      ]);
      return;
    }
    blob(ctx, pal.hair2, [[hx - 13, hy - 4], [hx - 14, hy + 6], [hx - 6, hy + 3]]);
    blob(ctx, pal.hair2, [[hx + 13, hy - 4], [hx + 14, hy + 6], [hx + 6, hy + 3]]);
    rr(ctx, hx - 8, hy - 15, 16, 7, 3);
    fillStroke(ctx, pal.hair, 2);
  }

  function hairOf(ctx, pal, key, view, hx, hy) {
    if (key === 'neli') hairNeli(ctx, pal, view, hx, hy);
    else if (key === 'rey') hairRey(ctx, pal, view, hx, hy);
    else if (key === 'liam') hairLiam(ctx, pal, view, hx, hy);
    else if (key === 'hans') hairHans(ctx, pal, view, hx, hy);
    else hairBoss(ctx, pal, view, hx, hy);
  }

  function bangs(ctx, pal, key, view, hx, hy) {
    if (view !== 'down') return;
    if (key === 'neli') {
      blob(ctx, pal.hair, [[hx - 10, hy - 12], [hx - 2, hy - 16], [hx + 3, hy - 10]], 2);
      blob(ctx, pal.hair2, [[hx + 2, hy - 13], [hx + 10, hy - 10], [hx + 3, hy - 6]], 2);
      blob(ctx, pal.hair, [[hx - 8, hy - 4], [hx - 12, hy + 1], [hx - 6, hy + 2]], 1.8);
    } else if (key === 'hans') {
      blob(ctx, pal.hair2, [
        [hx - 12, hy - 7], [hx - 3, hy + 4], [hx + 4, hy + 4], [hx + 12, hy - 7], [hx, hy - 12]
      ], 2.2);
    } else if (key === 'rey') {
      blob(ctx, pal.hair2, [
        [hx + 3, hy - 13], [hx + 16, hy - 9], [hx + 17, hy + 4],
        [hx + 9, hy + 8], [hx + 1, hy + 2]
      ], 2.3);
      blob(ctx, pal.hair, [[hx + 8, hy - 14], [hx + 14, hy - 18], [hx + 10, hy - 8]], 2);
    } else if (key === 'liam') {
      blob(ctx, pal.hair, [[hx - 10, hy - 14], [hx + 9, hy - 14], [hx + 7, hy - 5], [hx - 7, hy - 4]], 2);
      blob(ctx, pal.hair2, [[hx - 12, hy - 8], [hx - 6, hy + 2], [hx - 2, hy - 6]], 2);
      blob(ctx, pal.hair3 || pal.hair, [[hx + 10, hy - 6], [hx + 14, hy - 2], [hx + 9, hy + 1]], 1.8);
    }
  }

  function nose(ctx, pal, hx, hy, kind) {
    ctx.strokeStyle = pal.skin2;
    ctx.lineWidth = kind === 'long' ? 1.55 : 1.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (kind === 'long') {
      ctx.moveTo(hx + 0.2, hy - 3);
      ctx.lineTo(hx - 0.4, hy + 4.6);
      ctx.lineTo(hx + 2.4, hy + 5.4);
    } else if (kind === 'wide') {
      ctx.moveTo(hx, hy - 1);
      ctx.lineTo(hx - 1.6, hy + 4.2);
      ctx.lineTo(hx + 2.4, hy + 4.4);
    } else {
      ctx.moveTo(hx, hy - 1.5);
      ctx.lineTo(hx - 0.8, hy + 4);
      ctx.lineTo(hx + 2, hy + 4.6);
    }
    ctx.stroke();
  }

  function face(ctx, pal, key, view, hx, hy) {
    if (view === 'up') return;
    const ox = view === 'side' ? 2.4 : 0;

    if (key === 'neli') {
      blob(ctx, pal.skin, [
        [hx + ox, hy - 15], [hx + ox + 9, hy - 11], [hx + ox + 11.5, hy - 1],
        [hx + ox + 9, hy + 11], [hx + ox, hy + 16], [hx + ox - 9, hy + 11],
        [hx + ox - 11.5, hy - 1], [hx + ox - 9, hy - 11]
      ], 2.4);
    } else if (key === 'hans') {
      blob(ctx, pal.skin, [
        [hx + ox, hy - 12], [hx + ox + 12, hy - 8], [hx + ox + 14, hy + 1],
        [hx + ox + 11, hy + 11], [hx + ox, hy + 14], [hx + ox - 11, hy + 11],
        [hx + ox - 14, hy + 1], [hx + ox - 12, hy - 8]
      ], 2.5);
    } else if (key === 'liam') {
      blob(ctx, pal.skin, [
        [hx + ox, hy - 13], [hx + ox + 11, hy - 9], [hx + ox + 13, hy + 1],
        [hx + ox + 10, hy + 12], [hx + ox, hy + 15], [hx + ox - 10, hy + 12],
        [hx + ox - 13, hy + 1], [hx + ox - 11, hy - 9]
      ], 2.45);
    } else {
      blob(ctx, pal.skin, [
        [hx + ox, hy - 13], [hx + ox + 10, hy - 9], [hx + ox + 12, hy],
        [hx + ox + 9, hy + 12], [hx + ox, hy + 15], [hx + ox - 9, hy + 12],
        [hx + ox - 12, hy], [hx + ox - 10, hy - 9]
      ], 2.45);
    }
    if (key === 'neli') chinShade(ctx, hx + ox, hy + 7, pal.skin2);

    if (view === 'side') {
      ctx.fillStyle = pal.eye;
      ctx.beginPath();
      ctx.arc(hx + 7, hy - 1.4, key === 'neli' ? 1.9 : 1.55, 0, Math.PI * 2);
      ctx.fill();
      if (key === 'neli') {
        patch(ctx, hx + 6, hy + 3.4, 2.6, 1.7, pal.blush);
        nose(ctx, pal, hx + 5, hy, 'long');
        ctx.strokeStyle = pal.lip;
        ctx.lineWidth = 1.55;
        ctx.beginPath();
        ctx.moveTo(hx + 4.4, hy + 8);
        ctx.quadraticCurveTo(hx + 6.4, hy + 8.8, hx + 8, hy + 8.1);
        ctx.stroke();
      } else if (key === 'rey') {
        nose(ctx, pal, hx + 4, hy, 'long');
        ctx.fillStyle = '#f4ece4';
        ellipse(ctx, hx + 6.6, hy - 0.8, 2, 1.35);
        ctx.fill();
        ctx.fillStyle = pal.eye;
        ctx.beginPath();
        ctx.arc(hx + 6.7, hy - 0.5, 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(hx + 4.2, hy - 2.8);
        ctx.quadraticCurveTo(hx + 7, hy - 4, hx + 9.2, hy - 2.2);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hx + 12.4, hy + 0.6);
        ctx.lineTo(hx + 12.4, hy + 6.8);
        ctx.moveTo(hx + 11.2, hy + 3.2);
        ctx.lineTo(hx + 13.6, hy + 3.2);
        ctx.moveTo(hx + 11.2, hy + 5.2);
        ctx.lineTo(hx + 13.6, hy + 5.2);
        ctx.stroke();
      } else if (key === 'liam') {
        nose(ctx, pal, hx + 5, hy, 'wide');
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.95;
        ctx.beginPath();
        ctx.moveTo(hx + 4.2, hy - 1.4);
        ctx.quadraticCurveTo(hx + 7, hy - 3.2, hx + 9.4, hy - 1.2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx + 7.2, hy + 6.2, 5.4, 0.15, Math.PI - 0.2);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.45;
        ctx.beginPath();
        ctx.arc(hx + 12.8, hy + 4.6, 1.8, 0.4, Math.PI * 2 - 0.4);
        ctx.stroke();
      }
      if (pal.stubble && key !== 'rey' && key !== 'liam' && key !== 'hans') stubble(ctx, hx + 5, hy + 9, 4.5, 2.8, pal.stubble);
      return;
    }

    if (key === 'neli') {
      patch(ctx, hx - 7.4, hy + 4, 4, 2.6, pal.blush);
      patch(ctx, hx + 7.4, hy + 4, 4, 2.6, pal.blush);
      patch(ctx, hx, hy + 1.8, 2.8, 2, pal.blush);
      nose(ctx, pal, hx, hy, 'long');
      ctx.fillStyle = '#f7efe8';
      ellipse(ctx, hx - 4.4, hy - 1.6, 3.4, 2.6);
      ctx.fill();
      ellipse(ctx, hx + 4.4, hy - 1.6, 3.4, 2.6);
      ctx.fill();
      ctx.fillStyle = pal.eye;
      ellipse(ctx, hx - 3.8, hy - 0.2, 1.65, 1.5);
      ctx.fill();
      ellipse(ctx, hx + 4.8, hy, 1.65, 1.5);
      ctx.fill();
      ctx.fillStyle = pal.skin;
      ellipse(ctx, hx - 4.4, hy - 3.2, 3.5, 1.9);
      ctx.fill();
      ellipse(ctx, hx + 4.4, hy - 3.2, 3.5, 1.9);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      ctx.moveTo(hx - 7.4, hy - 2.4);
      ctx.lineTo(hx - 6.8, hy + 0.8);
      ctx.moveTo(hx - 5.6, hy - 2.6);
      ctx.lineTo(hx - 5.2, hy + 1);
      ctx.moveTo(hx + 5.6, hy - 2.6);
      ctx.lineTo(hx + 6.1, hy + 1);
      ctx.moveTo(hx + 7.2, hy - 2.4);
      ctx.lineTo(hx + 7.8, hy + 0.8);
      ctx.stroke();
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(hx - 7.8, hy - 5.2);
      ctx.quadraticCurveTo(hx - 4.2, hy - 7.2, hx - 1.2, hy - 4.8);
      ctx.moveTo(hx + 1.2, hy - 4.8);
      ctx.quadraticCurveTo(hx + 4.2, hy - 7.2, hx + 7.8, hy - 5.2);
      ctx.stroke();
      ctx.strokeStyle = pal.lip;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(hx - 2.8, hy + 9.2);
      ctx.quadraticCurveTo(hx, hy + 10.2, hx + 2.8, hy + 9.2);
      ctx.stroke();
    } else if (key === 'hans') {
      nose(ctx, pal, hx, hy, 'wide');
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 0.4, 3.8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx + 5, hy - 0.4, 3.8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx - 10, hy - 5.8);
      ctx.quadraticCurveTo(hx - 5, hy - 10, hx - 0.6, hy - 6);
      ctx.moveTo(hx + 0.6, hy - 6);
      ctx.quadraticCurveTo(hx + 5, hy - 10, hx + 10, hy - 5.8);
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(hx, hy + 7.4, 3.4, 0.15, Math.PI - 0.15);
      ctx.stroke();
      ellipse(ctx, hx - 14.4, hy + 1.4, 3.5, 4.4);
      fillStroke(ctx, pal.skin, 2);
      ellipse(ctx, hx + 14.4, hy + 1.4, 3.5, 4.4);
      fillStroke(ctx, pal.skin, 2);
    } else if (key === 'liam') {
      nose(ctx, pal, hx + 0.5, hy, 'wide');
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.05;
      ctx.beginPath();
      ctx.moveTo(hx - 7.6, hy - 1.1);
      ctx.quadraticCurveTo(hx - 4.8, hy - 3.5, hx - 2.1, hy - 1.5);
      ctx.moveTo(hx + 2.3, hy - 1.7);
      ctx.quadraticCurveTo(hx + 5, hy - 3.7, hx + 7.8, hy - 1.4);
      ctx.stroke();
      ctx.lineWidth = 1.55;
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy - 4.4);
      ctx.quadraticCurveTo(hx - 4.6, hy - 5.6, hx - 2.2, hy - 4.1);
      ctx.moveTo(hx + 2.4, hy - 4.3);
      ctx.quadraticCurveTo(hx + 5.2, hy - 5.8, hx + 8, hy - 4.2);
      ctx.stroke();
      ctx.lineWidth = 2.15;
      ctx.beginPath();
      ctx.arc(hx + 0.5, hy + 6.2, 6.2, 0.2, 0.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx + 0.5, hy + 6.2, 6.2, 0.72, Math.PI - 0.18);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.55;
      ctx.beginPath();
      ctx.arc(hx + 13.6, hy + 4.9, 2.2, 0.5, Math.PI * 2 - 0.5);
      ctx.stroke();
    } else if (key === 'rey') {
      nose(ctx, pal, hx - 0.5, hy, 'long');
      ctx.fillStyle = '#f4ece4';
      ellipse(ctx, hx - 4.6, hy - 0.8, 2.2, 1.45);
      ctx.fill();
      ctx.fillStyle = pal.eye;
      ellipse(ctx, hx - 4.5, hy - 0.45, 1.15, 1.05);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.85;
      ctx.beginPath();
      ctx.moveTo(hx - 7.4, hy - 2.9);
      ctx.quadraticCurveTo(hx - 4.9, hy - 4.3, hx - 2.1, hy - 2.5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(90,60,50,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx - 8.4, hy + 2.1);
      ctx.lineTo(hx - 5.5, hy + 2.5);
      ctx.moveTo(hx - 8.6, hy + 4.3);
      ctx.lineTo(hx - 5.7, hy + 4.7);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx - 3.4, hy + 7.6);
      ctx.quadraticCurveTo(hx - 0.6, hy + 8.5, hx + 1.6, hy + 7.2);
      ctx.stroke();
      chinShade(ctx, hx - 0.5, hy + 8.8, pal.skin2);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.65;
      ctx.beginPath();
      ctx.moveTo(hx - 13.4, hy + 0.2);
      ctx.lineTo(hx - 13.4, hy + 7.6);
      ctx.moveTo(hx - 14.9, hy + 3.4);
      ctx.lineTo(hx - 11.9, hy + 3.4);
      ctx.moveTo(hx - 14.9, hy + 5.6);
      ctx.lineTo(hx - 11.9, hy + 5.6);
      ctx.stroke();
    } else {
      nose(ctx, pal, hx, hy, 'wide');
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.ellipse(hx - 4.4, hy - 1.1, 3.8, 2.7, 0, 0, Math.PI * 2);
      ctx.ellipse(hx + 4.4, hy - 1.1, 3.8, 2.7, 0, 0, Math.PI * 2);
      ctx.moveTo(hx - 0.5, hy - 1.1);
      ctx.lineTo(hx + 0.5, hy - 1.1);
      ctx.stroke();
      ctx.fillStyle = pal.eye;
      ctx.beginPath();
      ctx.arc(hx - 4.4, hy - 1.1, 1.2, 0, Math.PI * 2);
      ctx.arc(hx + 4.4, hy - 1.1, 1.2, 0, Math.PI * 2);
      ctx.fill();
      stubble(ctx, hx, hy + 9.5, 7, 3.8, pal.stubble);
    }
  }

  function drawHead(ctx, pal, key, view, hx, hy) {
    ctx.save();
    ctx.translate(hx, hy);
    const headScale = key === 'rey' || key === 'liam' ? 1.3 : 1.22;
    ctx.scale(headScale, headScale);
    hairOf(ctx, pal, key, view, 0, 0);
    face(ctx, pal, key, view, 0, 0);
    bangs(ctx, pal, key, view, 0, 0);
    ctx.restore();
  }

  function torso(ctx, pal, key, view, tx, ty) {
    const wide = bulky(key);
    const w = key === 'hans' ? 26 : (wide ? 23 : 18);
    const h = key === 'hans' ? 24 : 22;

    if (key === 'hans') {
      rr(ctx, tx - w / 2, ty - 2, w, h + 4, 8);
      fillStroke(ctx, pal.shirt, 2.5);
      rr(ctx, tx - 8, ty - 9, 16, 12, 5);
      fillStroke(ctx, pal.shirt, 2.4);
      rr(ctx, tx - 7, ty - 9, 14, 5, 2);
      fillStroke(ctx, pal.collar || pal.shirt2, 2);
      ctx.strokeStyle = pal.shirt2;
      ctx.lineWidth = 1.4;
      for (let i = -5; i <= 5; i += 2.5) {
        ctx.beginPath();
        ctx.moveTo(tx + i, ty - 8);
        ctx.lineTo(tx + i, ty - 4);
        ctx.stroke();
      }
      return;
    }

    rr(ctx, tx - w / 2, ty, w, h, key === 'rey' ? 9 : 6);
    fillStroke(ctx, pal.shirt, 2.4);
    if (pal.shirt3 && view !== 'up') {
      patch(ctx, tx - 4, ty + 8, 5, 4, pal.shirt3);
      patch(ctx, tx + 5, ty + 12, 4, 3.5, pal.shirt2);
    }

    if (key === 'neli' && view !== 'up') {
      ctx.strokeStyle = pal.shirt2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx - w / 2 + 2, ty + 2);
      ctx.lineTo(tx - 1, ty + 9);
      ctx.lineTo(tx + w / 2 - 2, ty + 2);
      ctx.stroke();
      if (view !== 'side') {
        rr(ctx, tx - 7, ty + 10, 6, 5, 1.5);
        fillStroke(ctx, pal.shirt2, 1.6);
        rr(ctx, tx + 1, ty + 10, 6, 5, 1.5);
        fillStroke(ctx, pal.shirt2, 1.6);
        ctx.fillStyle = pal.accent;
        ctx.beginPath();
        ctx.arc(tx - 4, ty + 12.4, 1.1, 0, Math.PI * 2);
        ctx.arc(tx + 4, ty + 12.4, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ellipse(ctx, tx - 10, ty + 4, 4.2, 4.2);
        fillStroke(ctx, pal.accent, 1.8);
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.moveTo(tx - 10, ty + 1.4);
        ctx.lineTo(tx - 8.4, ty + 6.4);
        ctx.lineTo(tx - 11.6, ty + 6.4);
        ctx.closePath();
        ctx.fill();
        rr(ctx, tx + 3, ty + 5, 6.5, 2.2, 0.8);
        fillStroke(ctx, pal.accent, 1.5);
      }
    }

    if (key === 'boss' && view === 'down') {
      ctx.fillStyle = pal.accent;
      ctx.fillRect(tx - 9, ty + 2, 3.5, 2.2);
      ctx.fillRect(tx + 5.5, ty + 2, 3.5, 2.2);
      ellipse(ctx, tx - 4, ty + 11, 3.4, 3.4);
      fillStroke(ctx, pal.accent, 1.7);
    }

    if (key === 'rey' && view !== 'up') {
      ctx.strokeStyle = pal.shirt2;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(tx - 3.2, ty + 3);
      ctx.lineTo(tx - 3.2, ty + 14);
      ctx.moveTo(tx + 3.2, ty + 3);
      ctx.lineTo(tx + 3.2, ty + 14);
      ctx.stroke();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(tx - 4.4, ty + 14, 2.4, 3);
      ctx.fillRect(tx + 2, ty + 14, 2.4, 3);
      if (view === 'up') {
        ellipse(ctx, tx, ty - 4, 10, 5);
        fillStroke(ctx, pal.hair2, 2);
      }
    }

    if (key === 'liam') {
      patch(ctx, tx, ty + 8, 3.5, 6, pal.skin2);
      ctx.strokeStyle = pal.stubble;
      ctx.lineWidth = 1.1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(tx + i * 1.4, ty + 4);
        ctx.lineTo(tx + i * 1.2, ty + 13);
        ctx.stroke();
      }
    }
  }

  function paintChar(ctx, opts) {
    const key = PAL[opts.key] ? opts.key : 'neli';
    const pal = palOf(key);
    const dir = opts.dir || 'down';
    const bound = !!opts.bound;
    const sit = !!opts.sit && !bound;
    const moving = !!opts.moving && !bound && !sit;
    const phase = opts.animT || 0;
    const idle = opts.idleT || 0;
    const swing = moving ? Math.sin(phase * Math.PI) : 0;
    const bob = bound || sit ? 0 : (moving ? Math.abs(Math.sin(phase * Math.PI)) * 2.2 : Math.sin(idle * 2.1) * 0.65);
    const side = dir === 'left' || dir === 'right';
    const view = dir === 'up' ? 'up' : (side ? 'side' : 'down');
    const fat = bulky(key);
    const hans = key === 'hans';

    ctx.save();
    if (dir === 'left') ctx.scale(-1, 1);
    ctx.translate(0, -bob);

    const hipY = hans ? -26 : -24;
    const shoulderY = hans ? -46 : -43;
    const headX = view === 'side' ? 3 : 0;
    const headY = hans ? -62 : (key === 'neli' ? -58 : -59);

    if (bound || sit) {
      if (sit) {
        limb(ctx, -7, -14, -9, 2, 7.4, pal.pants);
        limb(ctx, 7, -14, 9, 2, 7.4, pal.pants);
        limb(ctx, -9, 2, -8, 8, 6.4, pal.shoes);
        limb(ctx, 9, 2, 8, 8, 6.4, pal.shoes);
        torso(ctx, pal, key, 'down', 0, -36);
        if (key === 'rey') {
          limb(ctx, -10, -32, 4, -24, 6.2, pal.shirt);
          limb(ctx, 10, -32, -3, -22, 6.2, pal.shirt);
        } else {
          limb(ctx, -10, -32, -12, -18, 6.2, pal.skin);
          limb(ctx, 10, -32, 12, -18, 6.2, pal.skin);
        }
      } else {
        limb(ctx, -8, -18, -17, -6, 7.2, pal.pants);
        limb(ctx, 8, -18, 17, -6, 7.2, pal.pants);
        limb(ctx, -17, -6, -19, 1, 6.6, pal.shoes);
        limb(ctx, 17, -6, 19, 1, 6.6, pal.shoes);
        torso(ctx, pal, key, 'down', 0, -42);
        limb(ctx, -11, -38, -5, -24, 6.2, pal.skin2);
        limb(ctx, 11, -38, 5, -24, 6.2, pal.skin2);
        ctx.strokeStyle = '#6a5040';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-5, -26);
        ctx.lineTo(5, -26);
        ctx.stroke();
      }
      const hx = 0;
      const hy = sit ? -50 : -55;
      drawHead(ctx, pal, key, 'down', hx, hy);
      ctx.restore();
      return;
    }

    const stride = view === 'side' ? 10 : 8;
    const footL = (view === 'side' ? -2 : -6) + swing * stride;
    const footR = (view === 'side' ? 6 : 6) - swing * stride;
    const arm = swing * 7.5;
    const legW = hans ? 9.2 : (fat ? 8.4 : 7.1);
    const armW = key === 'liam' ? 6.4 : 6.6;
    const sleeve = key === 'liam' ? pal.skin : pal.shirt;

    limb(ctx, view === 'side' ? -1 : -5, hipY, footL, -2, legW, pal.pants);
    limb(ctx, view === 'side' ? 4 : 5, hipY, footR, -2, legW, pal.pants);
    limb(ctx, footL, -2, footL + (view === 'side' ? 4 : 0), 2.4, 6.6, pal.shoes);
    limb(ctx, footR, -2, footR + (view === 'side' ? 4 : 0), 2.4, 6.6, pal.shoes);

    if (view !== 'up') {
      limb(ctx, view === 'side' ? 2 : -9, shoulderY, (view === 'side' ? 11 : -12), -25 + arm, armW, sleeve);
    }
    torso(ctx, pal, key, view, view === 'side' ? 2 : 0, hans ? -48 : -47);
    if (view === 'up') {
      limb(ctx, -10, shoulderY, -13, -27 + arm, armW, pal.shirt2);
      limb(ctx, 10, shoulderY, 13, -27 - arm, armW, pal.shirt2);
    } else if (view === 'side') {
      limb(ctx, 5, shoulderY, 13, -25 - arm, armW, sleeve);
    } else {
      limb(ctx, 9, shoulderY, 12, -25 - arm, armW, sleeve);
    }

    drawHead(ctx, pal, key, view === 'up' ? 'up' : view, view === 'up' ? 0 : headX, headY);

    ctx.restore();
  }

  function dirFrom(dx, dy) {
    if (!dx && !dy) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  function tick(actor, dt, moving, sprint) {
    if (!actor) return;
    actor.dir = actor.dir || 'down';
    actor.idleT = (actor.idleT || 0) + dt;
    actor.moving = !!moving;
    if (moving) actor.animT = (actor.animT || 0) + dt * (sprint ? 10.5 : 7.5);
    else actor.animT = (actor.animT || 0) * Math.max(0, 1 - dt * 7);
  }

  function draw(ctx, x, y, opts) {
    const fx = x + 11;
    const fy = y + 16;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(fx, fy + 2, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(fx, fy);
    paintChar(ctx, opts);
    if (opts.label) {
      ctx.fillStyle = '#efe6d8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(opts.label, 0, -84);
      ctx.fillText(opts.label, 0, -84);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function portraitUrl(key) {
    const id = PAL[key] ? key : 'neli';
    if (portraits[id]) return portraits[id];
    const c = document.createElement('canvas');
    c.width = 560;
    c.height = 720;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
    g.translate(280, 860);
    g.scale(7.4, 7.4);
    paintChar(g, { key: id, dir: 'down', animT: 0, idleT: 0, moving: false });
    portraits[id] = c.toDataURL();
    return portraits[id];
  }

  global.NeliSprites = { draw, tick, dirFrom, portraitUrl };
})(typeof window !== 'undefined' ? window : globalThis);
