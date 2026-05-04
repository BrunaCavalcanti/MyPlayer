/* =====================================================
   STATE
   ===================================================== */
let allTracks    = tracks.map((t, i) => ({ ...t, originalIndex: i, isLocal: false, objectUrl: null }));
let currentTrack = 0;
let isPlaying    = false;
let isShuffle    = false;
// repeatMode: 0 = off, 1 = repeat all, 2 = repeat one (loop infinito)
let repeatMode   = 0;
let isDark       = true;
let searchQuery  = '';
let showOnlyFavs = false;
let favorites    = new Set(JSON.parse(localStorage.getItem('mp_favorites') || '[]'));
let userPlaylists = JSON.parse(localStorage.getItem('mp_playlists') || '[]');
let editingPlaylistId = null;

/* =====================================================
   WEB AUDIO
   ===================================================== */
let audioCtx = null, analyser = null, freqData = null;
const audioEl = document.getElementById('audioEl');

function ensureAudioCtx() {
  if (audioCtx) return;
  audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  analyser  = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  freqData  = new Uint8Array(analyser.frequencyBinCount);
  audioCtx.createMediaElementSource(audioEl).connect(analyser);
  analyser.connect(audioCtx.destination);
}

/* =====================================================
   DOM REFS
   ===================================================== */
const songTitle    = document.getElementById('songTitle');
const songArtist   = document.getElementById('songArtist');
const progressFill = document.getElementById('progressFill');
const progressThumb= document.getElementById('progressThumb');
const progressBar  = document.getElementById('progressBar');
const curTimeEl    = document.getElementById('curTime');
const totTimeEl    = document.getElementById('totTime');
const playBtn      = document.getElementById('playBtn');
const playIcon     = document.getElementById('playIcon');
const pauseIcon    = document.getElementById('pauseIcon');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const shuffleBtn   = document.getElementById('shuffleBtn');
const repeatBtn    = document.getElementById('repeatBtn');
const volSlider    = document.getElementById('volSlider');
const disk         = document.getElementById('disk');
const playlist     = document.getElementById('playlist');
const trackCount   = document.getElementById('trackCount');
const canvas       = document.getElementById('vizCanvas');
const ctx          = canvas.getContext('2d');
const themeBtn     = document.getElementById('themeBtn');
const searchInput  = document.getElementById('searchInput');
const favFilterBtn = document.getElementById('favFilterBtn');
const fileInput    = document.getElementById('fileInput');
const btnNewPlaylist     = document.getElementById('btnNewPlaylist');
const playlistForm       = document.getElementById('playlistForm');
const playlistNameInput  = document.getElementById('playlistNameInput');
const btnConfirmPlaylist = document.getElementById('btnConfirmPlaylist');
const btnCancelPlaylist  = document.getElementById('btnCancelPlaylist');
const playlistsList      = document.getElementById('playlistsList');

/* =====================================================
   UTILS
   ===================================================== */
function fmt(s) {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

function setProgress(ratio) {
  const pct = (Math.max(0, Math.min(1, ratio)) * 100).toFixed(2) + '%';
  progressFill.style.width = pct;
  progressThumb.style.left = pct;
}

function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)},60%,55%)`;
}

function makeGradient(c) {
  return `conic-gradient(${c} 0deg,${c}99 120deg,${c}55 240deg,${c} 360deg)`;
}

function saveFavorites()  { localStorage.setItem('mp_favorites',  JSON.stringify([...favorites])); }
function savePlaylists()  { localStorage.setItem('mp_playlists',  JSON.stringify(userPlaylists)); }

/* =====================================================
   THEME
   ===================================================== */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  themeBtn.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
}
themeBtn.addEventListener('click', () => { isDark = !isDark; applyTheme(); });

/* =====================================================
   REPEAT MODE
   ===================================================== */
function updateRepeatBtn() {
  // Remove existing badge if any
  const existing = repeatBtn.querySelector('.repeat-one-badge');
  if (existing) existing.remove();

  if (repeatMode === 0) {
    repeatBtn.classList.remove('active');
    repeatBtn.title = 'Repetir';
  } else if (repeatMode === 1) {
    repeatBtn.classList.add('active');
    repeatBtn.title = 'Repetir tudo';
  } else {
    repeatBtn.classList.add('active');
    repeatBtn.title = 'Repetir uma';
    const badge = document.createElement('span');
    badge.className = 'repeat-one-badge';
    badge.textContent = '1';
    repeatBtn.appendChild(badge);
  }
}

repeatBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  updateRepeatBtn();
});

/* =====================================================
   VISUALIZER
   ===================================================== */
let canvasW = 0, canvasH = 0;

function resizeCanvas() {
  const nw = canvas.offsetWidth  * devicePixelRatio;
  const nh = canvas.offsetHeight * devicePixelRatio;
  if (nw === canvasW && nh === canvasH) return;
  canvas.width = canvasW = nw;
  canvas.height = canvasH = nh;
}

function drawVisualizer(ts) {
  const W = canvasW, H = canvasH;
  if (!W || !H) { requestAnimationFrame(drawVisualizer); return; }

  ctx.clearRect(0, 0, W, H);

  const BARS  = 48;
  const gap   = 3 * devicePixelRatio;
  const barW  = (W - (BARS - 1) * gap) / BARS;
  const r     = Math.min(barW / 2, 4 * devicePixelRatio);
  const t     = ts / 1000;
  const track = allTracks[currentTrack];
  // Use palette-aligned colors
  const colors = track?.barColors ?? ['#a230a4', '#cac5e5', '#290087', '#a230a4'];

  // real FFT data when available, synthetic otherwise
  let useReal = false;
  if (analyser && isPlaying && freqData) {
    analyser.getByteFrequencyData(freqData);
    useReal = freqData.some(v => v > 0);
  }

  for (let i = 0; i < BARS; i++) {
    let h;
    if (useReal) {
      h = Math.max(0.03, freqData[Math.floor(i / BARS * freqData.length)] / 255);
    } else {
      const p = (i / BARS) * Math.PI * 2;
      const w1 = Math.sin(t * 2.5 + p) * .5 + .5;
      const w2 = Math.sin(t * 1.3 + p * 1.5) * .5 + .5;
      const w3 = Math.sin(t * 4.1 + p * .7) * .5 + .5;
      h = isPlaying
        ? w1 * .5 + w2 * .3 + w3 * .2
        : .04 + Math.sin(t * .8 + p) * .02;
    }

    const bh = Math.max(4 * devicePixelRatio, h * H * .88);
    const x  = i * (barW + gap);
    const y  = H - bh;
    const ci = Math.min(Math.floor(i / BARS * colors.length), colors.length - 1);

    ctx.fillStyle   = colors[ci];
    ctx.globalAlpha = isPlaying ? .9 : .35;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, H);
    ctx.lineTo(x, H);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(drawVisualizer);
}

/* =====================================================
   TRACK LOADING
   ===================================================== */
function loadTrack(idx) {
  currentTrack = idx;
  const t = allTracks[idx];
  if (!t) return;

  songTitle.textContent  = t.title;
  songArtist.textContent = t.artist;
  disk.style.background  = t.diskGradient || makeGradient(t.color || '#a230a4');
  curTimeEl.textContent  = '0:00';
  totTimeEl.textContent  = '0:00';
  setProgress(0);

  if (t.isLocal && t.objectUrl) {
    audioEl.src = t.objectUrl;
    audioEl.load();
  } else {
    audioEl.src = '';
    totTimeEl.textContent = fmt(t.duration || 0);
  }
  updatePlaylistActive();
}

/* =====================================================
   PLAYBACK
   ===================================================== */
function startPlay() {
  const t = allTracks[currentTrack];
  if (!t) return;

  isPlaying = true;
  playIcon.style.display  = 'none';
  pauseIcon.style.display = '';
  disk.classList.add('spinning');

  if (t.isLocal && t.objectUrl) {
    ensureAudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioEl.volume = volSlider.value / 100;
    audioEl.play().catch(() => {});
  } else {
    clearInterval(window._synthInterval);
    window._synthInterval = setInterval(() => {
      const dur = t.duration || 0;
      t._simTime = Math.min((t._simTime || 0) + 1, dur);
      curTimeEl.textContent = fmt(t._simTime);
      setProgress(t._simTime / dur);
      if (t._simTime >= dur) advanceTrack();
    }, 1000);
  }
  updatePlaylistActive();
}

function stopPlay() {
  isPlaying = false;
  playIcon.style.display  = '';
  pauseIcon.style.display = 'none';
  disk.classList.remove('spinning');
  audioEl.pause();
  clearInterval(window._synthInterval);
  updatePlaylistActive();
}

function advanceTrack() {
  clearInterval(window._synthInterval);
  audioEl.pause();

  if (repeatMode === 2) {
    // Repeat one — loop the same track
    const t = allTracks[currentTrack];
    if (t?.isLocal) audioEl.currentTime = 0; else if (t) t._simTime = 0;
    startPlay();
  } else if (repeatMode === 1) {
    // Repeat all — go to next, wrap around
    const next = isShuffle
      ? Math.floor(Math.random() * allTracks.length)
      : (currentTrack + 1) % allTracks.length;
    loadTrack(next);
    startPlay();
  } else {
    // No repeat — go to next, stop at end
    const next = isShuffle
      ? Math.floor(Math.random() * allTracks.length)
      : currentTrack + 1;
    if (next < allTracks.length) {
      loadTrack(next);
      startPlay();
    } else {
      loadTrack(0);
      stopPlay();
    }
  }
}

/* =====================================================
   AUDIO ELEMENT EVENTS
   ===================================================== */
audioEl.addEventListener('timeupdate', () => {
  if (!allTracks[currentTrack]?.isLocal) return;
  curTimeEl.textContent = fmt(audioEl.currentTime);
  if (audioEl.duration) setProgress(audioEl.currentTime / audioEl.duration);
});
audioEl.addEventListener('ended',           () => { if (allTracks[currentTrack]?.isLocal) advanceTrack(); });
audioEl.addEventListener('loadedmetadata',  () => { totTimeEl.textContent = fmt(audioEl.duration); });
volSlider.addEventListener('input',         () => { audioEl.volume = volSlider.value / 100; });

/* =====================================================
   FILE UPLOAD
   ===================================================== */
fileInput.addEventListener('change', (e) => {
  Array.from(e.target.files).forEach(file => {
    const color = randomColor();
    allTracks.push({
      title:         file.name.replace(/\.[^/.]+$/, ''),
      artist:        'Local',
      duration:      0,
      color,
      diskGradient:  makeGradient(color),
      barColors:     [color, color + 'aa', color + '66', color],
      isLocal:       true,
      objectUrl:     URL.createObjectURL(file),
      originalIndex: allTracks.length,
      _simTime:      0
    });
  });
  fileInput.value = '';
  renderPlaylist();
});

/* =====================================================
   DELETE TRACK
   ===================================================== */
function deleteTrack(idx) {
  const t = allTracks[idx];
  if (!t) return;

  if (t.objectUrl) URL.revokeObjectURL(t.objectUrl);
  if (idx === currentTrack) stopPlay();

  allTracks.splice(idx, 1);

  favorites = new Set([...favorites].map(fi => fi > idx ? fi - 1 : fi).filter(fi => fi !== idx));
  saveFavorites();

  userPlaylists.forEach(pl => {
    pl.trackIndexes = pl.trackIndexes
      .filter(ti => ti !== idx)
      .map(ti => ti > idx ? ti - 1 : ti);
  });
  savePlaylists();

  if (currentTrack >= allTracks.length) currentTrack = Math.max(0, allTracks.length - 1);
  if (allTracks.length) loadTrack(currentTrack);
  else {
    songTitle.textContent  = '—';
    songArtist.textContent = 'Selecione uma faixa';
  }

  renderPlaylist();
  renderPlaylists();
}

/* =====================================================
   BIBLIOTECA — render
   ===================================================== */
function getFilteredTracks() {
  return allTracks
    .map((t, i) => ({ ...t, originalIndex: i }))
    .filter(t => {
      const q  = searchQuery;
      const ok = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
      return ok && (!showOnlyFavs || favorites.has(t.originalIndex));
    });
}

function renderPlaylist() {
  const filtered = getFilteredTracks();
  trackCount.textContent = filtered.length + ' faixas';

  // Ordem: num | color | info | dur | fav | del
  playlist.innerHTML = filtered.map(t => {
    const i      = t.originalIndex;
    const active = i === currentTrack;
    const fav    = favorites.has(i);
    return `
    <div class="track ${active ? 'active' : ''}" data-index="${i}">
      <div class="track-num">${active && isPlaying ? '▶' : i + 1}</div>
      <div class="track-color" style="background:${t.color}"></div>
      <div class="track-info">
        <div class="track-name">${t.title}</div>
        <div class="track-artist">
          ${t.artist}
          ${t.isLocal ? '<span class="badge-local">local</span>' : ''}
        </div>
      </div>
      <div class="track-dur">${t.isLocal && !t.duration ? '—' : fmt(t.duration)}</div>
      <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${i}">${fav ? '♥' : '♡'}</button>
      <button class="delete-btn" data-del="${i}" title="Remover faixa">✕</button>
    </div>`;
  }).join('');

  playlist.querySelectorAll('.track').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.fav-btn') || e.target.closest('.delete-btn')) return;
      loadTrack(parseInt(el.dataset.index));
      startPlay();
    });
  });

  playlist.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.fav);
      favorites.has(i) ? favorites.delete(i) : favorites.add(i);
      saveFavorites();
      btn.classList.toggle('active', favorites.has(i));
      btn.textContent = favorites.has(i) ? '♥' : '♡';
    });
  });

  playlist.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteTrack(parseInt(btn.dataset.del));
    });
  });
}

function updatePlaylistActive() {
  playlist.querySelectorAll('.track').forEach(el => {
    const i = parseInt(el.dataset.index);
    el.classList.toggle('active', i === currentTrack);
    const num = el.querySelector('.track-num');
    if (num) num.textContent = (i === currentTrack && isPlaying) ? '▶' : i + 1;
  });
}

/* =====================================================
   PLAYLISTS PAINEL
   ===================================================== */
function renderPlaylists() {
  if (!userPlaylists.length) {
    playlistsList.innerHTML = '<p class="playlists-empty">Nenhuma playlist criada ainda.</p>';
    return;
  }

  playlistsList.innerHTML = userPlaylists.map(pl => `
    <div class="pl-item" data-id="${pl.id}">
      <div class="pl-item-info">
        <div class="pl-item-name">${pl.name}</div>
        <div class="pl-item-count">${pl.trackIndexes.length} faixa${pl.trackIndexes.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="pl-item-actions">
        <button class="pl-btn pl-play"   data-id="${pl.id}" title="Tocar">▶</button>
        <button class="pl-btn pl-edit"   data-id="${pl.id}" title="Renomear">✏️</button>
        <button class="pl-btn pl-delete" data-id="${pl.id}" title="Deletar">🗑️</button>
      </div>
    </div>`).join('');

  playlistsList.querySelectorAll('.pl-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const pl = userPlaylists.find(p => p.id === btn.dataset.id);
      if (!pl?.trackIndexes.length) return;
      loadTrack(pl.trackIndexes[0]);
      startPlay();
    });
  });

  playlistsList.querySelectorAll('.pl-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const pl = userPlaylists.find(p => p.id === btn.dataset.id);
      if (!pl) return;
      editingPlaylistId = pl.id;
      playlistNameInput.value = pl.name;
      playlistForm.style.display = 'flex';
      playlistNameInput.focus();
    });
  });

  playlistsList.querySelectorAll('.pl-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      userPlaylists = userPlaylists.filter(p => p.id !== btn.dataset.id);
      savePlaylists();
      renderPlaylists();
    });
  });
}

btnNewPlaylist.addEventListener('click', () => {
  editingPlaylistId = null;
  playlistNameInput.value = '';
  playlistForm.style.display = 'flex';
  playlistNameInput.focus();
});

btnConfirmPlaylist.addEventListener('click', () => {
  const name = playlistNameInput.value.trim();
  if (!name) return;
  if (editingPlaylistId) {
    const pl = userPlaylists.find(p => p.id === editingPlaylistId);
    if (pl) pl.name = name;
  } else {
    userPlaylists.push({ id: Date.now().toString(), name, trackIndexes: [] });
  }
  savePlaylists();
  renderPlaylists();
  playlistForm.style.display = 'none';
  editingPlaylistId = null;
});

btnCancelPlaylist.addEventListener('click', () => {
  playlistForm.style.display = 'none';
  editingPlaylistId = null;
});

playlistNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  btnConfirmPlaylist.click();
  if (e.key === 'Escape') btnCancelPlaylist.click();
});

/* =====================================================
   CONTROLES
   ===================================================== */
playBtn.addEventListener('click', () => isPlaying ? stopPlay() : startPlay());

nextBtn.addEventListener('click', () => {
  loadTrack(isShuffle
    ? Math.floor(Math.random() * allTracks.length)
    : (currentTrack + 1) % allTracks.length);
  if (isPlaying) startPlay();
});

prevBtn.addEventListener('click', () => {
  const t    = allTracks[currentTrack];
  const curT = t?.isLocal ? audioEl.currentTime : (t?._simTime || 0);
  if (curT > 3) {
    if (t?.isLocal) audioEl.currentTime = 0;
    else if (t) t._simTime = 0;
    setProgress(0);
    curTimeEl.textContent = '0:00';
  } else {
    loadTrack((currentTrack - 1 + allTracks.length) % allTracks.length);
    if (isPlaying) startPlay();
  }
});

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
});

progressBar.addEventListener('click', e => {
  const ratio = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
  const t     = allTracks[currentTrack];
  if (t?.isLocal && audioEl.duration) {
    audioEl.currentTime = ratio * audioEl.duration;
  } else if (t) {
    t._simTime = Math.round(ratio * (t.duration || 0));
    curTimeEl.textContent = fmt(t._simTime);
    setProgress(ratio);
  }
});

searchInput.addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase().trim();
  renderPlaylist();
});

favFilterBtn.addEventListener('click', () => {
  showOnlyFavs = !showOnlyFavs;
  favFilterBtn.classList.toggle('active', showOnlyFavs);
  renderPlaylist();
});

window.addEventListener('resize', resizeCanvas);

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space')      { e.preventDefault(); isPlaying ? stopPlay() : startPlay(); }
  if (e.code === 'ArrowRight') nextBtn.click();
  if (e.code === 'ArrowLeft')  prevBtn.click();
  if (e.code === 'KeyF')       favFilterBtn.click();
  if (e.code === 'KeyR')       repeatBtn.click();
});

/* =====================================================
   INIT
   ===================================================== */
applyTheme();
updateRepeatBtn();
if (allTracks.length) loadTrack(0);
renderPlaylist();
renderPlaylists();
resizeCanvas();
requestAnimationFrame(drawVisualizer);
