
  // Fehlt eine Bilddatei (z.B. noch nicht hochgeladenes Portrait), zeigt
  // der Browser sonst ein Kaputt-Icon + Alt-Text. Statt das mit CSS zu
  // kaschieren (das Icon selbst lässt sich damit nicht zuverlässig
  // ausblenden), wird die src bei Ladefehler auf ein einfarbig graues
  // SVG umgeschaltet — ein "erfolgreich geladenes" Bild zeigt nie das
  // Kaputt-Icon, und alle bestehenden width/height/object-fit-Regeln für
  // <img> greifen unverändert weiter. 'error' bubble nicht, daher capture.
  var IMG_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23ccc'/%3E%3C/svg%3E";
  document.addEventListener('error', function(e){
    var el = e.target;
    if(el.tagName === 'IMG' && el.src !== IMG_FALLBACK){
      el.src = IMG_FALLBACK;
    }
  }, true);

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
      loadContent('content/about/about.html');
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
// Zählt jeden loadContent()-Aufruf hoch — schnelles Klicken zwischen
// Menüpunkten kann dazu führen, dass ein ÄLTERER fetch() erst NACH einem
// neueren zurückkommt (Netzwerk-Timing ist nicht garantiert in Aufruf-
// Reihenfolge). Ohne diese Prüfung würde die verspätete alte Antwort den
// bereits geladenen neuen Inhalt wieder überschreiben ("es wird trotzdem
// noch der alte Inhalt angezeigt"). Nur die zum Zeitpunkt der ANTWORT
// jeweils aktuellste Anfrage darf #page-content noch schreiben.
var loadContentRequestId = 0;
function loadContent(path, callback){
  var requestId = ++loadContentRequestId;
  fetch(path)
    .then(response => {
      if (!response.ok) {
        throw new Error("Content konnte nicht geladen werden: " + path);
      }
      return response.text();
    })
    .then(html => {
      if (requestId !== loadContentRequestId) return; // inzwischen überholt
      document.getElementById("page-content").innerHTML = html;
      // Neue Seite soll immer oben beginnen, statt die Scroll-Position der
      // vorherigen Seite (z.B. weit unten in einem langen Transkript) zu
      // übernehmen.
      window.scrollTo(0, 0);
      if (typeof callback === "function") callback();
    })
    .catch(error => {
      if (requestId !== loadContentRequestId) return;
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
  var typeLayout = document.querySelector('.type-layout');
  if(typeLayout){ initTypeTool(typeLayout); }

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
  // .interview-highlight (Notes/Feedback-Seiten) ist keine eigene Aussage,
  // sondern nur ein Zitat NEBEN dem vorherigen Redebeitrag — bekommt daher
  // dessen Zeile statt einer eigenen, sonst entstünde in der mittleren
  // Spalte an der Stelle eine leere Lücke.
  headers.forEach(function(h, i){ h.style.gridColumn = i + 1; });
  var row = 1;
  turns.forEach(function(turn){
    turn.style.gridColumn = turn.getAttribute('data-col');
    if(!turn.classList.contains('interview-highlight')){
      row++;
    }
    turn.style.gridRow = row;
  });

  // .interview-highlight (Notes/Feedback-Seiten) braucht eine feste
  // Pixelbreite statt %-basiertem CSS calc(): width:calc(100% - …) löst
  // sich für Spalte 1 und Spalte 4 in Chromium unterschiedlich auf
  // (Spalte 4 landete auf einem winzigen Bruchteil der echten Breite),
  // deshalb hier die tatsächlich gerenderte 20%-Spaltenbreite messen und
  // als Pixelwert setzen — funktioniert für beide Seiten gleich.
  if(grid.classList.contains('cols-4-notes')){
    var syncHighlightWidth = function(){
      var gapPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-gap')) || 2;
      var colWidth = (grid.getBoundingClientRect().width - 3 * gapPx) * 0.2;
      grid.style.setProperty('--highlight-col-width', colWidth + 'px');
    };
    syncHighlightWidth();
    if('ResizeObserver' in window){
      new ResizeObserver(syncHighlightWidth).observe(grid);
    } else {
      window.addEventListener('resize', syncHighlightWidth);
    }
  }

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
    if(imgId !== currentImg){
      cloneInto(cursorFrame, imgId);
      currentImg = imgId;
      // Rahmen ist standardmäßig fest 4:3.1 (passt zu den Vektor-Diagrammen).
      // Ein Foto mit eigenem Seitenverhältnis (data-aspect am def-Element)
      // bekommt stattdessen genau dessen Verhältnis, statt object-fit:cover
      // es hineinzuquetschen/-schneiden.
      var def = document.getElementById('def-' + imgId);
      var aspect = def && def.getAttribute('data-aspect');
      cursorFrame.style.aspectRatio = aspect || '';
    }
    var title = turn.getAttribute('data-title') || '';
    var caption = turn.getAttribute('data-caption') || '';
    // Ohne Titel/Caption keine leere weiße Box unter dem Bild stehen
    // lassen — .cap komplett ausblenden statt nur leeren.
    if(title || caption){
      cursorCap.innerHTML = '<b>' + title + '</b>' + caption;
      cursorCap.style.display = '';
    } else {
      cursorCap.innerHTML = '';
      cursorCap.style.display = 'none';
    }
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

  // Einzelne Links im Fließtext (z.B. "Zine", "Diatype") können genau wie
  // ein ganzer Redebeitrag ein eigenes Bild-Popup bekommen — data-img/
  // -title/-caption direkt am <a> statt am .interview-turn, showCursorImage()
  // liest die Attribute generisch vom übergebenen Element. Nur Desktop
  // (hasHover): auf Touch würde ein Tap den Link direkt öffnen, ein
  // zusätzliches Popup davor ergibt dort keinen Sinn.
  if(hasHover){
    // document-weit statt auf grid beschränkt, damit auch Links im
    // Bio-Text (.interview-intro-text, außerhalb von .interview-grid)
    // ein Popup bekommen können.
    var linkPreviews = Array.prototype.slice.call(document.querySelectorAll('a[data-img]'));
    linkPreviews.forEach(function(link){
      link.addEventListener('mouseenter', function(e){
        showCursorImage(link, e.clientX, e.clientY);
      });
      link.addEventListener('mousemove', function(e){ positionCursorFigure(e.clientX, e.clientY); });
      link.addEventListener('mouseleave', function(){
        cursorFig.classList.remove('visible');
        currentImg = null;
      });
    });
  }

  // .interview-nav liegt außerhalb von .interview-grid (fixiert unten
  // links), darum hier bewusst document-weit statt auf grid beschränkt
  // suchen.
  var interviewNav = document.getElementById('interview-nav');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.interview-nav-panel a'));
  navLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if(target){
        // Einen Redebeitrag früher anspringen als das eigentliche Sprungziel,
        // damit dessen Anfang nicht direkt an der oberen Kante klebt, sondern
        // mit ein bisschen Vorlauf sichtbar bleibt.
        var prev = target.previousElementSibling;
        while(prev && !prev.classList.contains('interview-turn')) prev = prev.previousElementSibling;
        (prev || target).scrollIntoView({behavior:'smooth', block:'start'});
      }
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

/* =========================================================
   Type-Seiten: Live-Schriftprobe links (.type-tool-text) mit
   Größen-/Spacing-Reglern. Wird von initInterview() aufgerufen, sobald
   ein .type-layout im geladenen Fragment gefunden wird.
   ========================================================= */
function initTypeTool(layout){
  var text = layout.querySelector('.type-tool-text');
  var sizeSlider = layout.querySelector('.type-size-slider');
  var spacingSlider = layout.querySelector('.type-spacing-slider');
  if(!text) return;

  // Browser lassen beim Löschen des gesamten Inhalts oft ein leeres <br>
  // im contenteditable-Feld zurück — das würde :empty (Platzhalter-CSS)
  // verhindern, obwohl für die Nutzer:in das Feld leer aussieht.
  text.addEventListener('input', function(){
    if(text.textContent.trim() === ''){ text.innerHTML = ''; }
  });

  if(sizeSlider){
    sizeSlider.addEventListener('input', function(){
      text.style.fontSize = sizeSlider.value + 'px';
    });
  }
  if(spacingSlider){
    spacingSlider.addEventListener('input', function(){
      text.style.letterSpacing = spacingSlider.value + 'px';
    });
  }

  // Filled/Outlined-Umschalter (aktuell nur Blind Strokes): welche Klasse
  // im aus-/eingeschalteten Zustand gilt, steht am Input selbst
  // (data-font-off/-on), damit main.js generisch bleibt und nicht die
  // Font-Namen hartcodieren muss.
  var fontToggle = layout.querySelector('.type-font-toggle-input');
  if(fontToggle){
    var offClass = fontToggle.getAttribute('data-font-off');
    var onClass = fontToggle.getAttribute('data-font-on');
    fontToggle.addEventListener('change', function(){
      text.classList.toggle(onClass, fontToggle.checked);
      text.classList.toggle(offClass, !fontToggle.checked);
    });
  }

  // Download-Link mit data-download-extra lädt zusätzlich zur eigenen
  // href noch eine zweite Datei herunter (z.B. Filled + Outlined
  // zusammen) — ein <a download> kann selbst nur eine Datei referenzieren,
  // daher hier zwei per Klick programmatisch nacheinander ausgelöst.
  var downloadLink = layout.querySelector('.type-tool-topbar a[data-download-extra]');
  if(downloadLink){
    downloadLink.addEventListener('click', function(e){
      e.preventDefault();
      [downloadLink.getAttribute('href'), downloadLink.getAttribute('data-download-extra')].forEach(function(url){
        var a = document.createElement('a');
        a.href = url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    });
  }
}