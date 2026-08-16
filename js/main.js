
  let currentMode = null;
  let currentSession = null;
  let currentInterview = null;

  function clearActive(container){
    container.querySelectorAll('.nav-item, .title-cell').forEach(el => el.classList.remove('active'));
  }

  function showPage(id){
    document.querySelectorAll('.content .page').forEach(p => p.classList.remove('active'));
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
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
    document.getElementById('page-content').innerHTML = '';
    updateModeToggle(null);
    closeMobileMenu();
  }

  /* Mobiles Level-1-Dropdown (siehe CSS .site-menu.mobile-open). Auf Desktop
     ist #mode-toggle per CSS ausgeblendet, die Funktionen bleiben dort also
     folgenlos. */
  function toggleMobileMenu(){
    document.getElementById('site-menu').classList.toggle('mobile-open');
  }

  function closeMobileMenu(){
    document.getElementById('site-menu').classList.remove('mobile-open');
  }

  function updateModeToggle(mode){
    var label = document.getElementById('mode-toggle-label');
    var toggle = document.getElementById('mode-toggle');
    if(mode){
      label.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
      toggle.classList.add('mode-active');
    } else {
      label.textContent = 'Mode';
      toggle.classList.remove('mode-active');
    }
  }

  function selectMode(mode){
    currentMode = mode;
    currentSession = null;
    currentInterview = null;

    clearActive(document.getElementById('level1-items'));
    document.getElementById('home-link').classList.remove('active');
    document.querySelector('.nav-item[data-mode="' + mode + '"]').classList.add('active');
    updateModeToggle(mode);
    closeMobileMenu();

    hideLevels23();

    if(mode === 'work'){
      document.getElementById('level2-sessions').classList.remove('hidden');
      clearActive(document.getElementById('level2-sessions'));
      document.getElementById('page-content').innerHTML = ''; // nothing selected yet within sessions
    } else if(mode === 'interview'){
      document.getElementById('level2-interviews').classList.remove('hidden');
      clearActive(document.getElementById('level2-interviews'));
      document.getElementById('page-content').innerHTML = '';
    } else if(mode === 'manifesto'){
      loadContent('content/Manifesto/manifesto.html', initInterview);
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
    // default to Exercise sub-page
    selectSub('exercise');
  }

  // Dateiname-Präfix je Reiter — "Exercise" mit großem E, weil die Datei
  // (z.B. Exercise1.html) auch so heißt und Dateinamen case-sensitive sind.
  var subFileMap = { exercise: 'Exercise', type: 'type', notes: 'notes' };

  function selectSub(sub){
    clearActive(document.getElementById('level3-sub'));
    document.querySelector('.nav-item[data-sub="' + sub + '"]').classList.add('active');

    var fileBase = subFileMap[sub];
    if (currentSession && fileBase) {
      loadContent('content/sessions/session' + currentSession + '/' + fileBase + currentSession + '.html', initInterview);
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

  /* Hält --menu-height synchron mit der tatsächlich gerenderten Höhe des
     sticky Menüs (variiert je nach Seite: 1, 2 oder 3 sichtbare Ebenen).
     Sticky Elemente weiter unten (.interview-sidebar, .method-text) lesen
     diese Variable als top-Offset, damit sie direkt unter dem Menü andocken
     statt darunter zu verschwinden. */
  var siteMenu = document.getElementById('site-menu');
  if(siteMenu && 'ResizeObserver' in window){
    var menuObserver = new ResizeObserver(function(entries){
      var height = entries[0].contentRect.height;
      document.documentElement.style.setProperty('--menu-height', height + 'px');
    });
    menuObserver.observe(siteMenu);
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

  // Trennlinien-Elemente (.col-divider) über Kopfzeile + alle
  // Redebeiträge spannen. "grid-row:1/-1" in CSS würde hier nicht
  // funktionieren, weil die Zeilen implizit entstehen (kein
  // grid-template-rows) — -1 bezieht sich nur auf explizit definierte
  // Zeilen.
  Array.prototype.slice.call(grid.querySelectorAll('.col-divider')).forEach(function(div){
    div.style.gridRow = '1 / ' + (turns.length + 2);
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
        // Echte Höhe messen, damit die max-height-Transition beim Aufklappen
        // exakt bis zum Textende läuft statt einen groben Schätzwert zu nutzen.
        expand.style.setProperty('--expand-height', expand.scrollHeight + 'px');
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

  // .interview-nav liegt außerhalb von .interview-grid (fixiert unten
  // links), darum hier bewusst document-weit statt auf grid beschränkt
  // suchen.
  var interviewNav = document.getElementById('interview-nav');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.interview-nav-panel a'));
  navLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
      if(interviewNav) interviewNav.classList.remove('open');
    });
  });

  // Ohne Hover (Touch) öffnet ein Klick auf den Trigger das Panel, statt
  // sich auf :hover zu verlassen.
  if(interviewNav && !hasHover){
    var navTrigger = interviewNav.querySelector('.interview-nav-trigger');
    if(navTrigger){
      navTrigger.addEventListener('click', function(){
        interviewNav.classList.toggle('open');
      });
    }
  }

  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('visible'); });
    }, {threshold:.12});
    turns.forEach(function(t){ io.observe(t); });
  } else {
    turns.forEach(function(t){ t.classList.add('visible'); });
  }

  // Manifesto-Seite: .interview-nav bekommt dort zusätzlich die Klasse
  // .manifesto-nav und muss die Breite der linken Spalte (.manifesto-left)
  // treffen statt der festen 342px-Sidebar-Breite der Interview-Seiten —
  // per ResizeObserver immer aktuell, auch beim Umschalten auf den
  // einspaltigen Mobile-Layout.
  var manifestoLeft = document.querySelector('.manifesto-left');
  if(manifestoLeft){
    var syncManifestoNavWidth = function(){
      document.documentElement.style.setProperty('--manifesto-left-width', manifestoLeft.getBoundingClientRect().width + 'px');
    };
    syncManifestoNavWidth();
    if('ResizeObserver' in window){
      new ResizeObserver(syncManifestoNavWidth).observe(manifestoLeft);
    } else {
      window.addEventListener('resize', syncManifestoNavWidth);
    }
  }
}