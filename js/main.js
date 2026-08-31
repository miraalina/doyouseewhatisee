/* =========================================================
   Bild-Fallback: fehlt eine Datei (z.B. noch nicht hochgeladenes
   Portrait), zeigt der Browser sonst ein Kaputt-Icon. Ersetzt die src
   bei Ladefehler durch ein graues 1x1-SVG. 'error' bubbelt nicht,
   daher capture-Phase (true).
   ========================================================= */
var IMG_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='%23ccc'/%3E%3C/svg%3E";
document.addEventListener('error', function(e){
  var el = e.target;
  if(el.tagName === 'IMG' && el.src !== IMG_FALLBACK){
    el.src = IMG_FALLBACK;
  }
}, true);

/* =========================================================
   Navigations-Zustand + Menü-Helfer
   ========================================================= */
let currentMode = null;
let currentSession = null;
let currentInterview = null;
let currentSub = null;

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

/* =========================================================
   URL-Routing: aktuelle Auswahl landet als Hash in der Adresszeile,
   z.B. #Workmode/Handschrift/Exercise oder #Interviewmode/Ivobrouwer,
   damit sich ein Link zu einer Unterseite kopieren/verschicken lässt.
   Segmente sind die echten Menü-Beschriftungen (Leerzeichen entfernt,
   erster Buchstabe groß) statt einer separat gepflegten Namensliste,
   bleiben so automatisch bei Umbenennungen aktuell. replaceState statt
   pushState: jeder Klick aktualisiert nur die URL, ohne die Browser-
   History mit einem Eintrag pro Menüklick vollzustopfen.
   ========================================================= */
function slugifyLabel(label){
  var noSpaces = (label || '').replace(/\s+/g, '');
  if(!noSpaces) return '';
  return noSpaces.charAt(0).toUpperCase() + noSpaces.slice(1).toLowerCase();
}

function navLabel(selector){
  var el = document.querySelector(selector);
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function updateHash(){
  var parts = [];
  if(currentMode === 'work'){
    parts.push(slugifyLabel(navLabel('#level1-items .nav-item[data-mode="work"]')));
    if(currentSession){
      parts.push(slugifyLabel(navLabel('.nav-item[data-session="' + currentSession + '"]')));
      if(currentSub){
        parts.push(slugifyLabel(navLabel('.nav-item[data-sub="' + currentSub + '"]')));
      }
    }
  } else if(currentMode === 'interview'){
    parts.push(slugifyLabel(navLabel('#level1-items .nav-item[data-mode="interview"]')));
    if(currentInterview){
      parts.push(slugifyLabel(navLabel('.nav-item[data-interview="' + currentInterview + '"]')));
    }
  } else if(currentMode){
    parts.push(slugifyLabel(navLabel('#level1-items .nav-item[data-mode="' + currentMode + '"]')));
  }
  var hash = parts.length ? '#' + parts.join('/') : '';
  if(location.hash !== hash){
    history.replaceState(null, '', hash || (location.pathname + location.search));
  }
}

// Findet zu einem Hash-Segment den passenden Menüpunkt (case-insensitiv,
// funktioniert auch bei von Hand getippten/veränderten Links) und
// liefert dessen data-*-Wert zurück.
function findByLabelSlug(items, slug){
  var target = slug.toLowerCase();
  for(var i = 0; i < items.length; i++){
    if(slugifyLabel(items[i].textContent.replace(/\s+/g, ' ').trim()).toLowerCase() === target){
      return items[i];
    }
  }
  return null;
}

function restoreFromHash(){
  var raw = location.hash.replace(/^#/, '');
  // Umlaute/Akzente landen in location.hash percent-encodiert, auch bei
  // direkt eingetippter URL — decodeURIComponent für den Abgleich mit
  // den unencodierten Menü-Beschriftungen.
  var segments = raw.split('/').filter(Boolean).map(function(seg){
    try { return decodeURIComponent(seg); } catch(e) { return seg; }
  });
  if(segments.length === 0){
    goHome();
    return;
  }
  var modeItems = Array.prototype.slice.call(document.querySelectorAll('#level1-items .nav-item[data-mode]'));
  var modeItem = findByLabelSlug(modeItems, segments[0]);
  if(!modeItem){
    goHome();
    return;
  }
  var mode = modeItem.getAttribute('data-mode');
  selectMode(mode);

  if(mode === 'work' && segments[1]){
    var sessionItems = Array.prototype.slice.call(document.querySelectorAll('#level2-sessions .nav-item[data-session]'));
    var sessionItem = findByLabelSlug(sessionItems, segments[1]);
    if(sessionItem){
      selectSession(sessionItem.getAttribute('data-session'));
      if(segments[2]){
        var subItems = Array.prototype.slice.call(document.querySelectorAll('#level3-sub .nav-item[data-sub]'));
        var subItem = findByLabelSlug(subItems, segments[2]);
        if(subItem) selectSub(subItem.getAttribute('data-sub'));
      }
    }
  } else if(mode === 'interview' && segments[1]){
    var interviewItems = Array.prototype.slice.call(document.querySelectorAll('#level2-interviews .nav-item[data-interview]'));
    var interviewItem = findByLabelSlug(interviewItems, segments[1]);
    if(interviewItem) selectInterview(interviewItem.getAttribute('data-interview'));
  }
}

/* =========================================================
   Mode/Session/Sub-Navigation
   ========================================================= */
function goHome(){
  currentMode = null;
  currentSession = null;
  currentInterview = null;
  currentSub = null;
  clearActive(document.getElementById('level1-items'));
  document.getElementById('home-link').classList.add('active');
  hideLevels23();
  document.getElementById('page-content').innerHTML = '';
  updateModeToggle(null);
  closeMobileMenu();
  updateHash();
}

// Mobiles Level-1-Dropdown (siehe CSS .site-menu.mobile-open). Auf
// Desktop ist #mode-toggle per CSS ausgeblendet, bleibt dort folgenlos.
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
  currentSub = null;

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
  updateHash();
}

function selectSession(n){
  currentSession = n;
  clearActive(document.getElementById('level2-sessions'));
  document.querySelector('.nav-item[data-session="' + n + '"]').classList.add('active');

  document.getElementById('level3-sub').classList.remove('hidden');
  clearActive(document.getElementById('level3-sub'));
  selectSub('exercise'); // default sub-page
}

// Dateiname-Präfix je Reiter — "Exercise" groß, weil die Datei (z.B.
// Exercise1.html) auch so heißt und Dateinamen case-sensitiv sind.
var subFileMap = { exercise: 'Exercise', type: 'type', notes: 'notes' };

function selectSub(sub){
  currentSub = sub;
  clearActive(document.getElementById('level3-sub'));
  document.querySelector('.nav-item[data-sub="' + sub + '"]').classList.add('active');

  var fileBase = subFileMap[sub];
  if (currentSession && fileBase) {
    loadContent('content/sessions/session' + currentSession + '/' + fileBase + currentSession + '.html', initInterview);
  }
  updateHash();
}

// Hält --menu-height synchron mit der tatsächlichen Höhe des sticky
// Menüs (variiert je nach Seite: 1-3 sichtbare Ebenen). Sticky Elemente
// weiter unten lesen diese Variable als top-Offset.
var siteMenu = document.getElementById('site-menu');
if(siteMenu && 'ResizeObserver' in window){
  var menuObserver = new ResizeObserver(function(entries){
    var height = entries[0].contentRect.height;
    document.documentElement.style.setProperty('--menu-height', height + 'px');
  });
  menuObserver.observe(siteMenu);
}

// init — stellt bei vorhandenem Hash (z.B. per geteiltem Link) die
// passende Unterseite wieder her, sonst normale Startseite.
restoreFromHash();
window.addEventListener('popstate', restoreFromHash);

/* =========================================================
   Content laden: fetch()t ein HTML-Fragment in #page-content, mit
   optionalem Callback für Nachbereitung (z.B. initInterview) — <script>-
   Tags in per innerHTML eingefügten Fragmenten laufen nicht automatisch.

   loadContentRequestId schützt gegen Race Conditions: schnelles Klicken
   zwischen Menüpunkten kann dazu führen, dass ein älterer fetch() erst
   NACH einem neueren zurückkommt. Nur die zum Antwortzeitpunkt aktuellste
   Anfrage darf #page-content noch schreiben.
   ========================================================= */
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
      // Neue Seite beginnt immer oben, statt die Scroll-Position der
      // vorherigen Seite zu übernehmen.
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

function selectInterview(n){
  currentInterview = n;
  clearActive(document.getElementById('level2-interviews'));
  document.querySelector('.nav-item[data-interview="' + n + '"]').classList.add('active');
  loadContent('content/interviews/interview' + n + '.html', initInterview);
  updateHash();
}

/* =========================================================
   initInterview() — nach jedem Laden eines Interview-/Manifesto-/Notes-
   Fragments aufgerufen. Sucht sich sein .interview-grid selbst, macht
   bei Seiten ohne Grid nichts (harmlos aufrufbar).
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
  // darunter + ihre Spalte aus data-col — ohne das packt CSS-Grid
  // Aussagen verschiedener Personen in dieselbe Zeile, sobald deren
  // Spalte frei ist ("gleichzeitig sprechen"-Optik).
  // .interview-highlight (Notes-Seiten) ist kein eigener Redebeitrag,
  // sondern ein Zitat NEBEN dem vorherigen — bekommt daher dessen Zeile.
  headers.forEach(function(h, i){ h.style.gridColumn = i + 1; });
  var row = 1;
  turns.forEach(function(turn){
    turn.style.gridColumn = turn.getAttribute('data-col');
    if(!turn.classList.contains('interview-highlight')){
      row++;
    }
    turn.style.gridRow = row;
  });

  // .interview-highlight braucht eine feste Pixelbreite statt %-Wert:
  // Chromium löst width:calc(100% - …) für Spalte 1 und 4 unterschiedlich
  // auf. Hier die gerenderte 20%-Spaltenbreite messen und als px setzen.
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

  // .col-divider über Kopfzeile + alle Redebeiträge spannen. CSS
  // "grid-row:1/-1" funktioniert hier nicht, da die Zeilen implizit
  // entstehen (kein grid-template-rows).
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

  // Erst ab ca. 5 Zeilen wird gekürzt; kurze Antworten bleiben immer voll sichtbar.
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
        // Echte Höhe messen, damit die max-height-Transition exakt bis
        // zum Textende läuft statt einen groben Schätzwert zu nutzen.
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
      // Rahmen ist standardmäßig 4:3.1 (passt zu den Vektor-Diagrammen).
      // Ein Foto mit eigenem Seitenverhältnis (data-aspect am def-
      // Element) bekommt stattdessen genau dessen Verhältnis.
      var def = document.getElementById('def-' + imgId);
      var aspect = def && def.getAttribute('data-aspect');
      cursorFrame.style.aspectRatio = aspect || '';
    }
    var title = turn.getAttribute('data-title') || '';
    var caption = turn.getAttribute('data-caption') || '';
    // Ohne Titel/Caption keine leere weiße Box unter dem Bild stehen lassen.
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

  // .interview-nav liegt außerhalb von .interview-grid (fixiert unten
  // links), daher bewusst document-weit statt auf grid beschränkt.
  var interviewNav = document.getElementById('interview-nav');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.interview-nav-panel a'));
  navLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if(target){
        // Einen Redebeitrag früher anspringen, damit der Anfang des
        // Sprungziels nicht direkt an der oberen Kante klebt.
        var prev = target.previousElementSibling;
        while(prev && !prev.classList.contains('interview-turn')) prev = prev.previousElementSibling;
        (prev || target).scrollIntoView({behavior:'smooth', block:'start'});
      }
      if(interviewNav) interviewNav.classList.remove('open');
    });
  });

  // Ohne Hover (Touch) öffnet ein Klick auf den Trigger das Panel.
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

  // Manifesto-Seite: .interview-nav bekommt zusätzlich .manifesto-nav
  // und muss die Breite von .manifesto-left treffen statt der festen
  // Sidebar-Breite — per ResizeObserver immer aktuell.
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
   Link-Bild-Popup: einzelne Links im Fließtext (z.B. "Diatype") können
   wie ein ganzer Redebeitrag ein Bild-Popup bekommen (data-img/-title/
   -caption am <a>). Per event delegation auf document statt Listener
   direkt am <a>: initInterview()s 5-Zeilen-Kürzung klont lange
   Redebeiträge (inkl. <a>-Tags) per innerHTML in einen .turn-expand-
   Ausschnitt — dieser Klon ist ein neues DOM-Element ohne die zuvor
   angehängten Listener. Delegation prüft stattdessen bei jedem Hover
   live per closest(), trifft also auch Klone. Einmalig beim Skript-
   Start aufgesetzt (nicht in initInterview, das bei jedem Seitenwechsel
   erneut läuft) — sonst würden sich die Listener aufsummieren.
   ========================================================= */
(function(){
  if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var currentLinkImg = null;

  function cloneImgInto(container, imgId){
    var def = document.getElementById('def-' + imgId);
    if(!def) return;
    container.innerHTML = '';
    var clone = def.cloneNode(true);
    clone.removeAttribute('id');
    container.appendChild(clone);
  }

  function positionFigure(x, y){
    var fig = document.getElementById('cursorFigure');
    var margin = 20, w = fig.offsetWidth || 220, h = fig.offsetHeight || 180;
    var left = x + 26, top = y - h - 22;
    if(left + w > window.innerWidth - margin) left = x - w - 26;
    if(top < margin) top = y + 22;
    fig.style.transform = 'translate(' + left + 'px,' + top + 'px)';
  }

  function showLinkImage(link, x, y){
    var imgId = link.getAttribute('data-img');
    if(!imgId) return;
    var fig = document.getElementById('cursorFigure');
    var frame = document.getElementById('cursorFrame');
    var cap = document.getElementById('cursorCap');
    if(imgId !== currentLinkImg){
      cloneImgInto(frame, imgId);
      currentLinkImg = imgId;
      var def = document.getElementById('def-' + imgId);
      var aspect = def && def.getAttribute('data-aspect');
      frame.style.aspectRatio = aspect || '';
    }
    var title = link.getAttribute('data-title') || '';
    var caption = link.getAttribute('data-caption') || '';
    if(title || caption){
      cap.innerHTML = '<b>' + title + '</b>' + caption;
      cap.style.display = '';
    } else {
      cap.innerHTML = '';
      cap.style.display = 'none';
    }
    fig.classList.add('visible');
    positionFigure(x, y);
  }

  document.addEventListener('mouseover', function(e){
    var link = e.target.closest('a[data-img]');
    if(link) showLinkImage(link, e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function(e){
    if(currentLinkImg && e.target.closest('a[data-img]')) positionFigure(e.clientX, e.clientY);
  });
  document.addEventListener('mouseout', function(e){
    var link = e.target.closest('a[data-img]');
    // relatedTarget = wohin die Maus wandert; bleibt sie innerhalb
    // desselben Links (z.B. verschachteltes <b>), nicht ausblenden.
    if(!link || link.contains(e.relatedTarget)) return;
    document.getElementById('cursorFigure').classList.remove('visible');
    currentLinkImg = null;
  });
})();

/* =========================================================
   Type-Seiten: Live-Schriftprobe links (.type-tool-text) mit Größen-/
   Spacing-Reglern. Wird von initInterview() aufgerufen, sobald ein
   .type-layout im geladenen Fragment gefunden wird.
   ========================================================= */
function initTypeTool(layout){
  var text = layout.querySelector('.type-tool-text');
  var sizeSlider = layout.querySelector('.type-size-slider');
  var spacingSlider = layout.querySelector('.type-spacing-slider');
  if(!text) return;

  // Browser lassen beim Löschen des gesamten Inhalts oft ein leeres <br>
  // im contenteditable-Feld zurück — das würde :empty (Platzhalter-CSS)
  // verhindern, obwohl das Feld für die Nutzer:in leer aussieht.
  text.addEventListener('input', function(){
    if(text.textContent.trim() === ''){ text.innerHTML = ''; }
  });

  // Stylistic-Set-Alternates (aktuell nur Handschrift/2.113.1): die
  // Schrift hat für viele Buchstaben eine zweite Glyphen-Variante über
  // ein OpenType-Feature (z.B. "ss01") — CSS kann das nur komplett ein-/
  // ausschalten, nicht "jedes zweite Vorkommen". Beim Tippen wird daher
  // pro Zeichen mitgezählt und jedes GERADE Vorkommen in einen Span
  // gepackt, der das Feature nur dafür aktiviert. Zählung läuft bei
  // jedem Tastendruck komplett neu, damit Löschen mittendrin die
  // Abwechslung der nachfolgenden Zeichen automatisch korrigiert.
  var altFeature = text.getAttribute('data-alt-feature');
  var altChars = text.getAttribute('data-alt-chars');
  if(altFeature && altChars){
    var getCaretOffset = function(){
      var sel = window.getSelection();
      if(!sel.rangeCount) return null;
      var range = sel.getRangeAt(0);
      if(!text.contains(range.startContainer)) return null;
      var pre = range.cloneRange();
      pre.selectNodeContents(text);
      pre.setEnd(range.endContainer, range.endOffset);
      return pre.toString().length;
    };
    var setCaretOffset = function(offset){
      var sel = window.getSelection();
      var range = document.createRange();
      var count = 0, found = false;
      (function walk(node){
        if(found) return;
        if(node.nodeType === 3){
          var next = count + node.textContent.length;
          if(offset <= next){
            range.setStart(node, offset - count);
            range.collapse(true);
            found = true;
            return;
          }
          count = next;
        } else {
          for(var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
        }
      })(text);
      if(!found){
        range.selectNodeContents(text);
        range.collapse(false);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    };
    var applyAlternates = function(){
      var str = text.textContent;
      var caret = getCaretOffset();
      var counts = {};
      var frag = document.createDocumentFragment();
      var plain = '';
      var flushPlain = function(){
        if(plain){ frag.appendChild(document.createTextNode(plain)); plain = ''; }
      };
      for(var i = 0; i < str.length; i++){
        var ch = str[i];
        if(altChars.indexOf(ch) !== -1){
          counts[ch] = (counts[ch] || 0) + 1;
          if(counts[ch] % 2 === 0){
            flushPlain();
            var span = document.createElement('span');
            span.style.fontFeatureSettings = '"' + altFeature + '" 1';
            span.textContent = ch;
            frag.appendChild(span);
            continue;
          }
        }
        plain += ch;
      }
      flushPlain();
      text.innerHTML = '';
      text.appendChild(frag);
      if(caret !== null) setCaretOffset(caret);
    };
    text.addEventListener('input', applyAlternates);
  }

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

  // Filled/Outlined-Umschalter (aktuell nur Blind Strokes): welche
  // Klasse im aus-/eingeschalteten Zustand gilt, steht am Input selbst
  // (data-font-off/-on), damit main.js keine Font-Namen hartcodiert.
  // data-label-off/-on (optional) macht dasselbe für die Versions-
  // bezeichnung oben links (.type-tool-version).
  var fontToggle = layout.querySelector('.type-font-toggle-input');
  if(fontToggle){
    var offClass = fontToggle.getAttribute('data-font-off');
    var onClass = fontToggle.getAttribute('data-font-on');
    var offLabel = fontToggle.getAttribute('data-label-off');
    var onLabel = fontToggle.getAttribute('data-label-on');
    var versionLabel = layout.querySelector('.type-tool-version');
    fontToggle.addEventListener('change', function(){
      text.classList.toggle(onClass, fontToggle.checked);
      text.classList.toggle(offClass, !fontToggle.checked);
      if(versionLabel && offLabel && onLabel){
        versionLabel.textContent = fontToggle.checked ? onLabel : offLabel;
      }
    });
  }

  // Download-Link mit data-download-extra lädt zusätzlich eine zweite
  // Datei (z.B. Filled + Outlined) — <a download> kann nur eine Datei
  // referenzieren, daher zwei Klicks programmatisch nacheinander.
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
