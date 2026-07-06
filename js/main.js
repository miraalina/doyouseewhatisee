
  let currentMode = null;
  let currentSession = null;
  let currentInterview = null;

  function clearActive(container){
    container.querySelectorAll('.nav-item, .title-cell').forEach(el => el.classList.remove('active'));
  }

  function showPage(id){
    document.querySelectorAll('.content .page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function hideLevels23(){
    document.getElementById('level2-sessions').classList.add('hidden');
    document.getElementById('level2-interviews').classList.add('hidden');
    document.getElementById('level3-sub').classList.add('hidden');
  }

  function goHome(){
    currentMode = null;
    currentSession = null;
    currentInterview = null;
    clearActive(document.getElementById('level1-items'));
    document.getElementById('home-link').classList.add('active');
    hideLevels23();
    showPage('page-home');
  }

  function selectMode(mode){
    currentMode = mode;
    currentSession = null;
    currentInterview = null;

    clearActive(document.getElementById('level1-items'));
    document.getElementById('home-link').classList.remove('active');
    document.querySelector('.nav-item[data-mode="' + mode + '"]').classList.add('active');

    hideLevels23();

    if(mode === 'work'){
      document.getElementById('level2-sessions').classList.remove('hidden');
      clearActive(document.getElementById('level2-sessions'));
      showPage('page-home'); // nothing selected yet within sessions
    } else if(mode === 'interview'){
      document.getElementById('level2-interviews').classList.remove('hidden');
      clearActive(document.getElementById('level2-interviews'));
      showPage('page-home');
    } else if(mode === 'manifesto'){
      showPage('page-manifesto');
    } else if(mode === 'about'){
      showPage('page-about');
    }
  }

  function selectSession(n){
    currentSession = n;
    clearActive(document.getElementById('level2-sessions'));
    document.querySelector('.nav-item[data-session="' + n + '"]').classList.add('active');

    document.getElementById('level3-sub').classList.remove('hidden');
    clearActive(document.getElementById('level3-sub'));
    // default to Intro sub-page
    selectSub('intro');
  }

  function selectSub(sub){
    if (currentSession === 1 && sub === "notes") {
  loadContent("content/sessions/session1/notes1.html");
  return;
}
}


  function selectInterview(n){
    currentInterview = n;
    clearActive(document.getElementById('level2-interviews'));
    document.querySelector('.nav-item[data-interview="' + n + '"]').classList.add('active');

    document.getElementById('interview-title').textContent = 'Interview ' + n;
    document.getElementById('interview-text').textContent =
      '[ Platzhalter: Inhalt für Interview ' + n + ' ]';

    showPage('page-interview');
  }
 /* content aus seiten laden */
function loadContent(path){
  fetch(path)
    .then(response => {
      if (!response.ok) {
        throw new Error("Content konnte nicht geladen werden: " + path);
      }
      return response.text();
    })
    .then(html => {
      document.getElementById("page-content").innerHTML = html;
    })
    .catch(error => {
      console.error(error);
      document.getElementById("page-content").innerHTML =
        "<p>Inhalt konnte nicht geladen werden.</p>";
    });
}

  // init
  goHome();

  /* =========================================================
   ÄNDERUNG 1: loadContent bekommt einen optionalen Callback,
   der ausgeführt wird, NACHDEM der HTML-Fragment-Inhalt eingefügt
   wurde. Wichtig: <script>-Tags in einem via innerHTML eingefügten
   Fragment werden vom Browser NICHT automatisch ausgeführt — daher
   muss die Interview-Logik von hier aus (main.js) angestoßen werden.
   Ersetzt eure bestehende loadContent()-Funktion.
   ========================================================= */
function loadContent(path, callback){
  fetch(path)
    .then(response => {
      if (!response.ok) {
        throw new Error("Content konnte nicht geladen werden: " + path);
      }
      return response.text();
    })
    .then(html => {
      document.getElementById("page-content").innerHTML = html;
      if (typeof callback === "function") callback();
    })
    .catch(error => {
      console.error(error);
      document.getElementById("page-content").innerHTML =
        "<p>Inhalt konnte nicht geladen werden.</p>";
    });
}

/* =========================================================
   ÄNDERUNG 2: selectInterview lädt jetzt die eigene HTML-Datei
   des jeweiligen Interviews (statt Platzhaltertext zu setzen) und
   initialisiert danach das Grid. Ersetzt eure bestehende
   selectInterview()-Funktion. Passt den Pfad an eure echte
   Ordnerstruktur an, falls nötig.
   ========================================================= */
function selectInterview(n){
  currentInterview = n;
  clearActive(document.getElementById('level2-interviews'));
  document.querySelector('.nav-item[data-interview="' + n + '"]').classList.add('active');
  loadContent('content/interviews/interview' + n + '.html', initInterview);
}

/* =========================================================
   NEU: initInterview() — wird nach jedem Laden eines Interview-
   Fragments aufgerufen. Sucht sich sein .interview-grid selbst,
   macht bei Seiten ohne Interview-Grid nichts (harmlos aufrufbar).
   ========================================================= */
function initInterview(){
  var grid = document.querySelector('.interview-grid');
  if(!grid) return;

  var turns = Array.prototype.slice.call(grid.querySelectorAll('.interview-turn'));
  var headers = Array.prototype.slice.call(grid.querySelectorAll('.content-header'));
  var cursorFig = document.getElementById('cursorFigure');
  var cursorFrame = document.getElementById('cursorFrame');
  var cursorCap = document.getElementById('cursorCap');
  var hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var currentImg = null;

  // Kopfzeile fix in Zeile 1, jede Aussage bekommt ihre eigene Zeile
  // darunter (2, 3, 4 …) und ihre Spalte aus data-col — ohne das würde
  // CSS-Grid Aussagen verschiedener Personen in dieselbe Zeile packen,
  // sobald deren Spalte gerade frei ist (sieht dann nach "gleichzeitig
  // sprechen" aus).
  headers.forEach(function(h, i){ h.style.gridColumn = i + 1; });
  turns.forEach(function(turn, i){
    turn.style.gridColumn = turn.getAttribute('data-col');
    turn.style.gridRow = i + 2;
  });

  function cloneInto(container, imgId){
    var def = document.getElementById('def-' + imgId);
    if(!def) return;
    container.innerHTML = '';
    var clone = def.cloneNode(true);
    clone.removeAttribute('id');
    container.appendChild(clone);
  }

  // Erst ab ca. 5 Zeilen wird gekürzt; kurze Antworten bleiben immer voll sichtbar
  turns.forEach(function(turn){
    var text = turn.querySelector('.turn-text');
    var wrap = turn.querySelector('.text-wrap');
    requestAnimationFrame(function(){
      var lh = parseFloat(getComputedStyle(text).lineHeight) || 22;
      var lines = text.scrollHeight / lh;
      if(lines > 5.3){
        text.classList.add('truncatable');
        var expand = document.createElement('div');
        expand.className = 'turn-expand';
        expand.innerHTML = text.innerHTML;
        wrap.appendChild(expand);
      } else {
        text.classList.add('fits');
      }
    });
  });

  function positionCursorFigure(x, y){
    var margin = 20, w = cursorFig.offsetWidth || 220, h = cursorFig.offsetHeight || 180;
    var left = x + 26, top = y - h - 22;
    if(left + w > window.innerWidth - margin) left = x - w - 26;
    if(top < margin) top = y + 22;
    cursorFig.style.transform = 'translate(' + left + 'px,' + top + 'px)';
  }

  function showCursorImage(turn, x, y){
    var imgId = turn.getAttribute('data-img');
    if(!imgId) return;
    if(imgId !== currentImg){ cloneInto(cursorFrame, imgId); currentImg = imgId; }
    cursorCap.innerHTML = '<b>' + (turn.getAttribute('data-title') || '') + '</b>' + (turn.getAttribute('data-caption') || '');
    cursorFig.classList.add('visible');
    positionCursorFigure(x, y);
  }

  turns.forEach(function(turn){
    var col = turn.getAttribute('data-col');
    if(hasHover){
      turn.addEventListener('mouseenter', function(e){
        showCursorImage(turn, e.clientX, e.clientY);
        headers.forEach(function(h, i){ h.classList.toggle('focused', String(i+1) === col); });
      });
      turn.addEventListener('mousemove', function(e){ positionCursorFigure(e.clientX, e.clientY); });
      turn.addEventListener('mouseleave', function(){
        cursorFig.classList.remove('visible');
        currentImg = null;
        headers.forEach(function(h){ h.classList.remove('focused'); });
      });
    } else {
      turn.addEventListener('click', function(){
        var was = turn.classList.contains('active');
        turns.forEach(function(t){ t.classList.remove('active'); });
        headers.forEach(function(h){ h.classList.remove('focused'); });
        if(!was){
          turn.classList.add('active');
          headers.forEach(function(h, i){ h.classList.toggle('focused', String(i+1) === col); });
          showCursorImage(turn, window.innerWidth/2, 90);
        }
      });
    }
  });

  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('visible'); });
    }, {threshold:.12});
    turns.forEach(function(t){ io.observe(t); });
  } else {
    turns.forEach(function(t){ t.classList.add('visible'); });
  }
}