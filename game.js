// Hollow Orbit • Milestone 02: touch movement, pathfinding, and proximity interactions.
// No libraries or build step needed. GitHub Pages can serve these files directly.
(function hollowOrbitGame() {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const ui = {
    scrap: document.querySelector('#scrapCount'),
    objective: document.querySelector('#objective'),
    progress: document.querySelector('#progress'),
    status: document.querySelector('#stationStatus'),
    led: document.querySelector('#statusLed'),
    message: document.querySelector('#message'),
    hint: document.querySelector('.hint'),
  };
  const SAVE_KEY = 'hollow-orbit-save-v1';
  const W = 1000, H = 560, COLS = 7, ROWS = 7;
  const TW = 106, TH = 54, OX = 500, OY = 90;
  const debris = [
    { id: 'a', col: 1, row: 2 },
    { id: 'b', col: 4, row: 1 },
    { id: 'c', col: 5, row: 5 },
  ];
  const reactor = { col: 3, row: 3 };
  const SPAWN = { col: 2, row: 5 };
  const initialState = () => ({ scrap: 0, cleared: [], powered: false, engineer: { ...SPAWN } });
  function inside(col, row) { return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 && col < COLS && row < ROWS; }
  function passable(col, row, save) {
    return inside(col, row) &&
      !(col === reactor.col && row === reactor.row) &&
      !(col === 0 && row === 5) &&
      !debris.some(d => d.col === col && d.row === row && !save.cleared.includes(d.id));
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Number.isInteger(saved.scrap) && Array.isArray(saved.cleared) && typeof saved.powered === 'boolean') {
        const progress = {
          scrap: Math.max(0, saved.scrap),
          cleared: [...new Set(saved.cleared.filter(id => debris.some(d => d.id === id)))],
          powered: saved.powered,
          engineer: { ...SPAWN },
        };
        if (saved.engineer && passable(saved.engineer.col, saved.engineer.row, progress)) {
          progress.engineer = { col: saved.engineer.col, row: saved.engineer.row };
        }
        return progress;
      }
    } catch (_) { /* Storage may be unavailable: play without persistence. */ }
    return initialState();
  }
  let state = load();
  const engineer = {
    col: state.engineer.col, row: state.engineer.row,
    x: state.engineer.col, y: state.engineer.row,
    path: [], pending: null, facing: 1,
  };
  let layout = { scale: 1, x: 0, y: 0 };
  let lastFrame = 0;

  // Movement is deliberately grid-based so later crew and enemies can reuse it.
  function neighbors(tile) {
    return [{col:tile.col+1,row:tile.row},{col:tile.col-1,row:tile.row},
      {col:tile.col,row:tile.row+1},{col:tile.col,row:tile.row-1}]
      .filter(t => passable(t.col, t.row, state));
  }
  function pathfind(start, goal) {
    if (!passable(goal.col, goal.row, state)) return null;
    const key = t => t.col + ',' + t.row;
    const queue = [start], cameFrom = new Map([[key(start), null]]);
    for (let i = 0; i < queue.length; i++) {
      const tile = queue[i];
      if (tile.col === goal.col && tile.row === goal.row) {
        const path = [];
        for (let cursor = tile; cursor; cursor = cameFrom.get(key(cursor))) path.push(cursor);
        return path.reverse();
      }
      for (const next of neighbors(tile)) {
        if (!cameFrom.has(key(next))) {
          cameFrom.set(key(next), tile);
          queue.push(next);
        }
      }
    }
    return null;
  }
  function anchorTile() {
    // Replanning mid-step finishes the current tile, avoiding visual teleportation.
    return engineer.path.length ? engineer.path[0] : { col: engineer.col, row: engineer.row };
  }
  function planMove(destination, action = null) {
    const start = anchorTile();
    const route = pathfind(start, destination);
    if (!route) return false;
    const remainingStep = engineer.path.length ? [start] : [];
    engineer.path = remainingStep.concat(route.slice(1));
    engineer.pending = action;
    if (!engineer.path.length) finishAction();
    return true;
  }
  function planInteraction(kind, tile, id = null) {
    const start = anchorTile();
    const candidates = [
      { col:tile.col+1, row:tile.row }, { col:tile.col-1, row:tile.row },
      { col:tile.col, row:tile.row+1 }, { col:tile.col, row:tile.row-1 },
    ];
    let best = null;
    for (const spot of candidates) {
      const route = pathfind(start, spot);
      if (route && (!best || route.length < best.route.length)) best = { spot, route };
    }
    if (!best) { notify('No accessible path to that object.'); return; }
    const action = { kind, col: tile.col, row: tile.row, id };
    planMove(best.spot, action);
    if (engineer.path.length) notify('Engineer moving to ' + (kind === 'salvage' ? 'the salvage pile.' : kind === 'reactor' ? 'the reactor.' : 'the terminal.'));
  }
  function finishAction() {
    const action = engineer.pending;
    engineer.pending = null;
    if (!action) return;
    if (Math.abs(engineer.col - action.col) + Math.abs(engineer.row - action.row) !== 1) return;
    if (action.kind === 'salvage') {
      if (state.cleared.includes(action.id)) return;
      state.cleared.push(action.id);
      state.scrap += 2;
      persist(); updateUI(); notify('Salvage recovered: +2 scrap.');
    } else if (action.kind === 'reactor') {
      if (state.powered) notify('The reactor is already online.');
      else if (state.scrap >= 6) {
        state.scrap -= 6; state.powered = true;
        persist(); updateUI(); notify('REACTOR ONLINE! Emergency power restored.');
      } else notify('Reactor needs 6 scrap. Missing ' + (6 - state.scrap) + '.');
    } else if (action.kind === 'terminal') {
      notify(state.powered ? 'Terminal connected. More station rooms coming soon.' : 'Terminal offline. Restore the reactor first.');
    }
  }
  function updateMovement(dt) {
    let distanceLeft = Math.min(dt, 0.05) * 3.1; // Tiles per second, frame-rate independent.
    while (distanceLeft > 0 && engineer.path.length) {
      const next = engineer.path[0];
      const dx = next.col - engineer.x, dy = next.row - engineer.y;
      const remaining = Math.hypot(dx, dy);
      const projectedDx = (dx - dy) * TW / 2;
      if (Math.abs(projectedDx) > 0.01) engineer.facing = projectedDx > 0 ? 1 : -1;
      if (remaining <= distanceLeft + 0.00001) {
        engineer.x = next.col; engineer.y = next.row;
        engineer.col = next.col; engineer.row = next.row;
        engineer.path.shift(); distanceLeft -= remaining;
        state.engineer = { col: engineer.col, row: engineer.row };
        persist();
      } else {
        engineer.x += dx / remaining * distanceLeft;
        engineer.y += dy / remaining * distanceLeft;
        distanceLeft = 0;
      }
    }
    if (!engineer.path.length && engineer.pending) finishAction();
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {} }
  function notify(message) { ui.message.textContent = message; }
  function updateUI() {
    const count = state.cleared.length;
    ui.scrap.textContent = String(state.scrap);
    ui.led.classList.toggle('on', state.powered);
    ui.status.textContent = state.powered ? 'Emergency power restored' : 'Station systems offline';
    ui.objective.textContent = state.powered ? 'Reactor online!' : count < 3 ? 'Salvage three debris piles' : 'Restore the central reactor';
    ui.progress.textContent = state.powered ? 'Milestone 02 complete · Explore the deck!' : count < 3 ? `${count} / 3 debris cleared` : `Reactor repair costs 6 scrap · You have ${state.scrap}`;
    ui.hint.textContent = state.powered ? 'TAP ANY OPEN TILE TO WALK AROUND' : count < 3 ? 'TAP TO WALK · TAP DEBRIS TO SALVAGE' : 'TAP THE REACTOR TO WALK OVER AND REPAIR';
  }
  function stationPos(col, row) { return { x: OX + (col - row) * TW / 2, y: OY + (col + row) * TH / 2 }; }
  function poly(points, fill, stroke, width = 1) {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function diamond(x, y, w, h, fill, stroke) {
    poly([[x, y-h/2], [x+w/2, y], [x,y+h/2], [x-w/2,y]], fill, stroke);
  }
  function ellipse(x,y,rx,ry,color) { ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); }
  function line(x1,y1,x2,y2,color,width=1) { ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(); }
  const stars = Array.from({length: 100}, (_,i) => ({ x: (i*839+43)%1000, y: (i*167+83)%560, s: i%7===0?1.9:0.9 }));
  function drawBackground(t) {
    const bg=ctx.createLinearGradient(0,0,1000,560);bg.addColorStop(0,'#121f3b');bg.addColorStop(.65,'#080d20');bg.addColorStop(1,'#100f28');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    for (const s of stars) {ctx.globalAlpha=.3 + .25*Math.sin(t*.001 + s.x);ellipse(s.x,s.y,s.s,s.s,'#bbd9fb');}ctx.globalAlpha=1;
    const halo=ctx.createRadialGradient(816,137,25,816,137,220);halo.addColorStop(0,'#476999aa');halo.addColorStop(1,'#111b3500');ctx.fillStyle=halo;ctx.fillRect(590,0,410,350);
    ellipse(827,130,113,113,'#1f345b');ellipse(810,119,91,91,'#253f69');
    for(let i=0;i<6;i++)line(755+i*12,95+i*9,865+i*10,126+i*10,'#45618a33',8);
    ctx.font='11px monospace';ctx.fillStyle='#7b93b7aa';ctx.fillText('SECTOR 07 // UNKNOWN ORBIT',30,530);
  }
  function drawDeck() {
    for(let sum=0;sum<COLS+ROWS-1;sum++)for(let row=0;row<ROWS;row++){
      const col=sum-row;if(col<0||col>=COLS)continue;
      const {x,y}=stationPos(col,row);
      const edge = [[x-TW/2,y],[x,y+TH/2],[x+TW/2,y],[x+TW/2,y+11],[x,y+TH/2+11],[x-TW/2,y+11]];
      poly(edge,'#121c33','#213453');
      const checked=(col+row)%2===0;
      const color=state.powered ? (checked?'#304b60':'#345465') : (checked?'#243249':'#29374e');
      diamond(x,y,TW-2,TH-2,color,'#47617c');
      diamond(x,y,TW-24,TH-12,'#ffffff05','#8dadbb14');
      if ((col===0||row===0||col===6||row===6)) {
        const color = state.powered?'#60f5d6':'#e3aa74';
        ellipse(x,y-12,2.3,2.3,color);
      }
      if((col===1&&row===5)||(col===6&&row===1)){
        line(x-13,y-2,x+5,y+8,'#b58e84',2);line(x+5,y+8,x+17,y+5,'#b58e84',2);
      }
    }
  }
  function drawTerminal(x,y) {
    ellipse(x,y+7,29,10,'#01081775');
    poly([[x-17,y-6],[x+17,y-6],[x+17,y-32],[x-17,y-32]],'#1a2847','#7da1bd',2);
    poly([[x-12,y-29],[x+12,y-29],[x+12,y-10],[x-12,y-10]],state.powered?'#37cbbd':'#5f4054');
    line(x-6,y-19,x+5,y-19,state.powered?'#b7fff2':'#fa8d82',2);
    poly([[x-23,y],[x+23,y],[x+17,y+7],[x-17,y+7]],'#293b56','#82a9c1');
  }
  function drawReactor(t) {
    const {x,y}=stationPos(reactor.col,reactor.row);
    const pulse=.5+.5*Math.sin(t*.003);
    ellipse(x,y+15,38,15,'#040b1b99');ellipse(x,y+6,31,15,'#152942');
    ellipse(x,y+4,26,12,state.powered?'#32a99b':'#723f49');
    ctx.save();ctx.shadowBlur=state.powered?24+pulse*18:12+pulse*10;ctx.shadowColor=state.powered?'#6cffd6':'#ff766b';
    ellipse(x,y-16,20,20,state.powered?'#58f6cf':'#e36e70');ctx.restore();
    ellipse(x,y-19,11,12,state.powered?'#a4ffe5':'#ffd1a9');
    poly([[x-30,y+3],[x-20,y-24],[x-15,y-24],[x-22,y+5]],'#5f7189','#a6c4d5');
    poly([[x+30,y+3],[x+20,y-24],[x+15,y-24],[x+22,y+5]],'#5f7189','#a6c4d5');
    ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillStyle=state.powered?'#85f3d7':'#ffb6a4';
    ctx.fillText(state.powered?'ONLINE':'REACTOR · 6 SCRAP',x,y-56);ctx.textAlign='left';
  }
  function drawDebris(d,t) {
    if(state.cleared.includes(d.id))return;
    const {x,y}=stationPos(d.col,d.row);
    ellipse(x,y+9,24,9,'#06101e99');
    poly([[x-24,y+2],[x-10,y-7],[x+2,y-2],[x-7,y+10]],'#778da3','#c2d4db',1.5);
    poly([[x-5,y+7],[x+10,y-17],[x+25,y-12],[x+19,y+9]],'#455970','#8daabd',1.5);
    poly([[x-5,y-14],[x+6,y-24],[x+14,y-8]],'#8f685b','#e3a789',1.5);
    const spark=1.5+1.6*Math.sin(t*.006+d.col);
    ctx.save();ctx.shadowBlur=16;ctx.shadowColor='#f8ca83';ellipse(x+20,y-23,spark,spark,'#ffe2a3');ctx.restore();
    ctx.font='bold 10px system-ui';ctx.fillStyle='#f9d29a';ctx.textAlign='center';ctx.fillText('+2 SCRAP',x,y-37);ctx.textAlign='left';
  }
  function drawAstronaut(t) {
    const {x,y} = stationPos(engineer.x, engineer.y);
    const walking = engineer.path.length > 0;
    const bob = walking ? Math.sin(t * 0.022) * 2 : Math.sin(t * 0.0025) * 1.2;
    const leg = walking ? Math.sin(t * 0.022) * 4 : 0;
    ellipse(x,y+9,15,6,'#030b1d99');
    poly([[x-9,y-18+bob],[x+9,y-18+bob],[x+11,y+5+bob],[x-11,y+5+bob]],'#d1dce9','#8eaac4',1.5);
    line(x-5,y+1+bob,x-5+leg,y+12+bob,'#d7e9f4',4);
    line(x+5,y+1+bob,x+5-leg,y+12+bob,'#d7e9f4',4);
    poly([[x-14,y-17+bob],[x-8,y-14+bob],[x-8,y-1+bob],[x-14,y-5+bob]],'#7c9bb9');
    ellipse(x,y-25+bob,14,15,'#e4e8ea');
    ellipse(x+engineer.facing*2,y-27+bob,10,9,'#335d7b');
    ellipse(x+engineer.facing*5,y-30+bob,3,2,'#a5e6eb');
    ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#bed2e7';
    ctx.fillText('ENGINEER',x,y-48);ctx.textAlign='left';
  }
  function drawRoute(t) {
    if (!engineer.path.length) return;
    const nodes = [{ col: engineer.x, row: engineer.y }, ...engineer.path];
    ctx.beginPath();
    for (let i = 0; i < nodes.length; i++) {
      const p = stationPos(nodes[i].col, nodes[i].row);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.setLineDash([5, 8]);ctx.lineWidth=2;ctx.strokeStyle='#8bf3dfbb';ctx.stroke();ctx.setLineDash([]);
    const goal = stationPos(nodes[nodes.length-1].col, nodes[nodes.length-1].row);
    const size=13+2*Math.sin(t*.008);
    ellipse(goal.x,goal.y+3,size,size*.45,'#79ffdc55');
  }
  function render(t) {
    const dt = lastFrame ? Math.max(0, (t - lastFrame) / 1000) : 0;
    lastFrame = t;
    updateMovement(dt);
    const { scale, x, y }=layout;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.setTransform(scale,0,0,scale,x,y);
    drawBackground(t);drawDeck();drawRoute(t);
    const terminalPos=stationPos(0,5);
    const objects = [
      { depth: 5, draw: () => drawTerminal(terminalPos.x,terminalPos.y) },
      { depth: reactor.col+reactor.row, draw: () => drawReactor(t) },
      ...debris.map(d => ({ depth:d.col+d.row, draw: () => drawDebris(d,t) })),
      { depth: engineer.x+engineer.y+0.01, draw: () => drawAstronaut(t) },
    ];
    objects.sort((a,b)=>a.depth-b.depth);
    for (const object of objects) object.draw();
    requestAnimationFrame(render);
  }
  function resize() {
    const bounds=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(bounds.width*dpr);canvas.height=Math.round(bounds.height*dpr);
    const scale=Math.min(canvas.width/W,canvas.height/H);
    layout={scale,x:(canvas.width-W*scale)/2,y:(canvas.height-H*scale)/2};
  }
  function selectTile(px,py) {
    for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
      const p=stationPos(col,row);
      if(Math.abs(px-p.x)/(TW/2)+Math.abs(py-p.y)/(TH/2)<=1)return {col,row};
    }
    return null;
  }
  function onPointer(e) {
    if (e.cancelable) e.preventDefault();
    const rect=canvas.getBoundingClientRect();
    const px=((e.clientX-rect.left)*canvas.width/rect.width-layout.x)/layout.scale;
    const py=((e.clientY-rect.top)*canvas.height/rect.height-layout.y)/layout.scale;
    const hitDebris=debris.find(d=>!state.cleared.includes(d.id)&&(()=>{
      const p=stationPos(d.col,d.row);
      return Math.abs(px-p.x)<33 && py>p.y-45 && py<p.y+20;
    })());
    if (hitDebris) { planInteraction('salvage',hitDebris,hitDebris.id); return; }
    const rp=stationPos(reactor.col,reactor.row);
    if(Math.abs(px-rp.x)<39&&py>rp.y-62&&py<rp.y+24) {
      planInteraction('reactor',reactor);return;
    }
    const tp=stationPos(0,5);
    if(Math.abs(px-tp.x)<25&&py>tp.y-35&&py<tp.y+12) {
      planInteraction('terminal',{col:0,row:5});return;
    }
    const tile=selectTile(px,py);
    if(!tile)return;
    const onDebris=debris.find(d=>d.col===tile.col&&d.row===tile.row&&!state.cleared.includes(d.id));
    if(onDebris){planInteraction('salvage',onDebris,onDebris.id);return;}
    if(tile.col===reactor.col&&tile.row===reactor.row){planInteraction('reactor',reactor);return;}
    if(tile.col===0&&tile.row===5){planInteraction('terminal',tile);return;}
    if(planMove(tile))notify(engineer.path.length?'Moving across the station.':'Engineer is already here.');
    else notify('That location cannot be reached.');
  }
  document.querySelector('#resetButton').addEventListener('click',()=>{
    state=initialState();
    engineer.col=SPAWN.col;engineer.row=SPAWN.row;
    engineer.x=SPAWN.col;engineer.y=SPAWN.row;
    engineer.path=[];engineer.pending=null;engineer.facing=1;
    persist();updateUI();notify('New salvage run started.');
  });
  canvas.addEventListener('pointerdown',onPointer);
  window.addEventListener('resize',resize);
  resize();updateUI();requestAnimationFrame(render);
})();
