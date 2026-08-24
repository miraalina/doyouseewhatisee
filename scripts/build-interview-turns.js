#!/usr/bin/env node
/*
  scripts/build-interview-turns.js

  Liest ein Transkript im Format
      Name: Aussage
  (eine Zeile = ein Absatz, Leerzeilen sind optionale Trenner) und erzeugt
  daraus .interview-turn-Blöcke für eine beliebige interview-grid-Seite
  (Interviews mit 3 Spalten, Notes mit 2 — die Anzahl Spalten und die
  Sprecher-Reihenfolge werden aus den vorhandenen .content-header-Zellen
  der Ziel-Datei gelesen, nicht hartkodiert).

  Aufeinanderfolgende Zeilen ohne neuen "Name:"-Präfix werden als weitere
  Absätze demselben Redebeitrag zugerechnet. Zeilen, die komplett in
  Klammern stehen, z.B. "(Pause)", sowie gemeinsame Sprecherzeilen wie
  "Phuong & Mira: ..." werden als spaltenübergreifende Randnotiz
  gerendert (data-col="1 / N+1", N = Spaltenzahl).

  Highlights (nur bei 4-spaltigem Notes-Layout: leere Rand-Spalte, Phuong,
  Mira, leere Rand-Spalte): eine Textstelle mit =={irgendwas}= davor UND
  danach markieren (dieselbe Marker-Zeichenkette dient als Auf/Zu-Toggle,
  ihr Inhalt ist egal — HIGHLIGHT_MARKER_RE matcht "==" + beliebige
  Zeichen außer "=" + "="). Die Marker werden aus dem Fließtext entfernt;
  die markierte Stelle erscheint zusätzlich als eigener, größer gesetzter
  Redebeitrag in der äußeren Spalte neben dem Sprecher (Phuong → Spalte 1
  links, Mira → Spalte 4 rechts), direkt nach dem Original-Turn.

  Ersetzt in der Ziel-HTML-Datei nur den Bereich zwischen
      <!-- AUTO-GENERATED TURNS START ... -->
      <!-- AUTO-GENERATED TURNS END -->
  Sidebar, Kopfzeilen (.content-header) und Sprungleiste bleiben unangetastet.

  Aufruf:
    node scripts/build-interview-turns.js <transcript-datei> <ziel-html-datei>

  Beispiele:
    node scripts/build-interview-turns.js \
      content/transcripts/interview_Ivo \
      content/interviews/interview1.html
    node scripts/build-interview-turns.js \
      content/transcripts/notes1 \
      content/sessions/session1/notes1.html
*/

const fs = require('fs');

// Bekannte Schreibvarianten eines Namens im Transkript → kanonischer Name,
// wie er auch in den .content-header-Zellen der Ziel-Datei steht.
const NAME_ALIASES = {
  'Phuong Nguyen': 'Phuong',
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Reiner Auf/Zu-Toggle-Marker: "==" als einfache, saubere Markierung,
// ODER die von manchen Editoren per Autokorrektur verunstaltete Variante
// "==dieser Satz=­=" (mit eingestreutem "=" und weichem Trennstrich vor
// dem "=") — beide Varianten matchen komplett, damit nichts vom Marker
// als Textmüll im Highlight/Fließtext übrig bleibt.
const HIGHLIGHT_MARKER_RE = /==dieser Satz=­=|==/g;

// Trennt Marker-Paare aus einer Zeile heraus: gibt den Text ohne Marker
// zurück (clean) sowie die Liste der dazwischenliegenden, markierten
// Ausschnitte (highlights). Bei ungerader Marker-Anzahl (fehlender
// Schließer) wird nicht geraten, welcher Marker der Ausreißer ist —
// stattdessen werden alle Marker in der Zeile nur entfernt (kein
// Highlight erzeugt) und gewarnt.
function extractHighlights(line) {
  const markerCount = (line.match(HIGHLIGHT_MARKER_RE) || []).length;
  if (markerCount === 0) {
    return { clean: line, highlights: [] };
  }
  if (markerCount % 2 !== 0) {
    console.warn('Warnung: ungerade Anzahl Highlight-Marker in Zeile, Marker werden entfernt, kein Highlight erzeugt: ' + line);
    return { clean: line.replace(HIGHLIGHT_MARKER_RE, ''), highlights: [] };
  }
  const parts = line.split(HIGHLIGHT_MARKER_RE);
  const highlights = [];
  let clean = '';
  parts.forEach((part, i) => {
    clean += part; // markierter Text bleibt im normalen Lesefluss stehen
    if (i % 2 === 0 && i + 1 < parts.length) {
      const phrase = parts[i + 1].trim();
      if (phrase) highlights.push(phrase);
    }
  });
  return { clean, highlights };
}

// Liest die Sprecher-Reihenfolge aus den .content-header-Zellen innerhalb
// des .interview-grid-Wrappers, der dem AUTO-GENERATED-Bereich vorausgeht
// — Spalte 1 = erste Zelle usw. Wichtig: nur INNERHALB des Grids suchen,
// nicht im ganzen Dokument, sonst wird z.B. das "Content"-Label der
// Sprungleiste (.interview-toc) fälschlich als eigene Spalte mitgezählt.
function readColumnsFromTarget(targetHtml) {
  const markerIdx = targetHtml.indexOf('<!-- AUTO-GENERATED TURNS START');
  if (markerIdx === -1) {
    throw new Error('AUTO-GENERATED TURNS START Marker nicht gefunden.');
  }
  const gridIdx = targetHtml.lastIndexOf('interview-grid', markerIdx);
  if (gridIdx === -1) {
    throw new Error('Kein .interview-grid vor dem AUTO-GENERATED-Bereich gefunden.');
  }
  const scope = targetHtml.slice(gridIdx, markerIdx);
  // [^<]*? statt +? — auch leere Reiter (keine Überschrift, nur Platz/
  // Farbpunkt) zählen als eigene Spalte, sonst verschiebt sich die
  // erkannte Spaltenreihenfolge für alles danach.
  const headerRe = /<div class="content-header">\s*(?:<span class="dot"><\/span>)?\s*([^<]*?)\s*<\/div>/g;
  const names = [];
  let m;
  while ((m = headerRe.exec(scope))) {
    names.push(m[1].trim());
  }
  if (names.length === 0) {
    throw new Error('Keine .content-header-Zellen im .interview-grid gefunden — Spaltenreihenfolge unbekannt.');
  }
  return names;
}

function buildSpeakerMaps(columnNames) {
  const column = {};
  const display = {};
  columnNames.forEach((name, i) => {
    column[name] = i + 1;
    display[name] = name;
  });
  Object.entries(NAME_ALIASES).forEach(([alias, canonical]) => {
    if (canonical in column) {
      column[alias] = column[canonical];
      display[alias] = canonical;
    }
  });
  return { column, display };
}

function parseTranscript(text, speakerColumn, speakerDisplay, numColumns) {
  const speakerNames = Object.keys(speakerColumn).sort((a, b) => b.length - a.length);
  const speakerLineRe = new RegExp('^(' + speakerNames.join('|') + ')\\s*:\\s*(.*)$');
  const jointSpeakerLineRe = /^([A-Za-z][A-Za-z\s]*?)\s*&\s*([A-Za-z][A-Za-z\s]*?)\s*:\s*(.*)$/;
  const parentheticalLineRe = /^\(.*\)$/;
  // Themen-Überschrift im Transkript, explizit mit "## " markiert (nicht
  // automatisch erkannt/geraten — sonst würde jede kurze Zeile ohne
  // Sprecher-Präfix riskant als Überschrift statt als Fortsetzungsabsatz
  // interpretiert). Wird als eigener, spaltenübergreifender Turn gerendert.
  const sectionHeaderLineRe = /^##\s+(.+)$/;
  const noteSpan = '1 / ' + (numColumns + 1);

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const turns = [];
  const sectionMarkers = [];

  // Nur bei genau 4 Spalten im leer/Phuong/Mira/leer-Muster gibt es
  // überhaupt Rand-Spalten für Highlights (siehe Datei-Kommentar oben).
  const highlightColFor = {};
  if (numColumns === 4) {
    if (speakerColumn['Phuong'] === 2) highlightColFor[2] = 1;
    if (speakerColumn['Mira'] === 3) highlightColFor[3] = 4;
  }

  for (const rawLine of lines) {
    const { clean: line, highlights } = extractHighlights(rawLine);

    const speakerMatch = line.match(speakerLineRe);
    if (speakerMatch) {
      const [, name, rest] = speakerMatch;
      turns.push({
        type: 'dialogue',
        speaker: speakerDisplay[name],
        col: speakerColumn[name],
        paragraphs: [rest],
        highlights: highlights.slice(),
      });
      continue;
    }

    const jointMatch = line.match(jointSpeakerLineRe);
    if (jointMatch) {
      const [, a, b, rest] = jointMatch;
      turns.push({
        type: 'note',
        span: noteSpan,
        paragraphs: [a.trim() + ' & ' + b.trim() + ': ' + rest],
      });
      continue;
    }

    if (parentheticalLineRe.test(line)) {
      turns.push({ type: 'note', span: noteSpan, paragraphs: [line] });
      continue;
    }

    // "## Titel"-Zeilen werden erkannt (damit sie u.a. nicht fälschlich an
    // den letzten Dialog-Turn drangehängt werden), aber NICHT als eigener
    // sichtbarer Turn gerendert — nur als Sprungmarke für main() protokolliert,
    // damit die Sprungleiste trotzdem auf den jeweils nächsten echten Turn
    // zeigen kann (siehe sectionMarkers/console.log unten in main()).
    const sectionMatch = line.match(sectionHeaderLineRe);
    if (sectionMatch) {
      sectionMarkers.push({ label: sectionMatch[1].trim(), turnIndex: turns.length });
      continue;
    }

    // Fortsetzung ohne neuen Sprecher-Präfix → weiterer Absatz im letzten
    // DIALOG-Turn (nicht im zuletzt gepushten Turn allgemein) — sonst würde
    // z.B. eine Themen-Überschrift, die eine Redner:in mitten im Sprechen
    // ohne neuen Namens-Präfix einstreut, die nachfolgende Fortsetzung an
    // sich reißen statt an ihrem eigentlichen Redebeitrag dranzuhängen.
    const lastDialogueTurn = [...turns].reverse().find(t => t.type === 'dialogue');
    if (lastDialogueTurn) {
      lastDialogueTurn.paragraphs.push(line);
      if (highlights.length) lastDialogueTurn.highlights.push(...highlights);
    } else {
      console.warn('Warnung: Zeile ohne vorherigen Dialog-Turn übersprungen: ' + line);
    }
  }

  // Highlight-Turns direkt nach ihrem Quell-Turn einfügen, in der äußeren
  // Spalte neben dem jeweiligen Sprecher (siehe highlightColFor oben).
  const withHighlights = [];
  turns.forEach(turn => {
    withHighlights.push(turn);
    const targetCol = highlightColFor[turn.col];
    if (turn.highlights && turn.highlights.length && targetCol) {
      turn.highlights.forEach(phrase => {
        withHighlights.push({ type: 'highlight', col: targetCol, paragraphs: [phrase] });
      });
    } else if (turn.highlights && turn.highlights.length) {
      console.warn('Warnung: Highlight(s) in Spalte ' + turn.col + ' gefunden, aber kein 4-Spalten-Notes-Layout mit Rand-Spalten — Highlights werden verworfen: ' + turn.highlights.join(' / '));
    }
  });

  return { turns: withHighlights, sectionMarkers };
}

function renderTurn(turn, index) {
  const id = 'turn-' + (index + 1);
  const paragraphsHtml = turn.paragraphs
    .map(p => '        <p>' + escapeHtml(p) + '</p>')
    .join('\n');

  if (turn.type === 'note') {
    return [
      '  <div class="interview-turn interview-note" id="' + id + '" data-col="' + turn.span + '">',
      '    <div class="text-wrap">',
      '      <div class="turn-text">',
      paragraphsHtml.replace(/<p>(.*)<\/p>/, '<p><em>$1</em></p>'),
      '      </div>',
      '    </div>',
      '  </div>',
    ].join('\n');
  }

  if (turn.type === 'highlight') {
    return [
      '  <div class="interview-turn interview-highlight" id="' + id + '" data-col="' + turn.col + '">',
      '    <div class="text-wrap">',
      '      <div class="turn-text">',
      paragraphsHtml,
      '      </div>',
      '    </div>',
      '  </div>',
    ].join('\n');
  }

  return [
    '  <div class="interview-turn" id="' + id + '" data-col="' + turn.col + '">',
    '    <span class="turn-name">' + turn.speaker + '</span>',
    '    <div class="text-wrap">',
    '      <div class="turn-text">',
    paragraphsHtml,
    '      </div>',
    '    </div>',
    '  </div>',
  ].join('\n');
}

function main() {
  const [, , transcriptPath, targetPath] = process.argv;
  if (!transcriptPath || !targetPath) {
    console.error('Nutzung: node scripts/build-interview-turns.js <transcript-datei> <ziel-html-datei>');
    process.exit(1);
  }

  const targetHtml = fs.readFileSync(targetPath, 'utf8');
  const startMarker = /<!-- AUTO-GENERATED TURNS START[^>]*-->/;
  const endMarker = /<!-- AUTO-GENERATED TURNS END -->/;

  if (!startMarker.test(targetHtml) || !endMarker.test(targetHtml)) {
    console.error('Marker "AUTO-GENERATED TURNS START/END" nicht in ' + targetPath + ' gefunden.');
    process.exit(1);
  }

  const columnNames = readColumnsFromTarget(targetHtml);
  const { column: speakerColumn, display: speakerDisplay } = buildSpeakerMaps(columnNames);

  const transcriptText = fs.readFileSync(transcriptPath, 'utf8');
  const { turns, sectionMarkers } = parseTranscript(transcriptText, speakerColumn, speakerDisplay, columnNames.length);

  const turnsHtml = turns.map(renderTurn).join('\n\n');

  const startMatch = targetHtml.match(startMarker)[0];
  const newHtml = targetHtml.replace(
    new RegExp(startMarker.source + '[\\s\\S]*?' + endMarker.source),
    startMatch + '\n' + turnsHtml + '\n  <!-- AUTO-GENERATED TURNS END -->'
  );

  fs.writeFileSync(targetPath, newHtml, 'utf8');

  const dialogueCount = turns.filter(t => t.type === 'dialogue').length;
  const noteCount = turns.filter(t => t.type === 'note').length;
  const highlightCount = turns.filter(t => t.type === 'highlight').length;
  const perSpeaker = {};
  turns.forEach(t => {
    if (t.type === 'dialogue') perSpeaker[t.speaker] = (perSpeaker[t.speaker] || 0) + 1;
  });

  console.log('Spalten erkannt: ' + columnNames.join(', '));
  console.log('Fertig: ' + turns.length + ' Turns in ' + targetPath + ' geschrieben.');
  console.log('  Dialog-Turns: ' + dialogueCount + ' (' + Object.entries(perSpeaker).map(([k, v]) => k + ': ' + v).join(', ') + ')');
  console.log('  Randnotizen: ' + noteCount);
  if (sectionMarkers.length) {
    console.log('  Themen-Überschriften (nicht gerendert, nur als Sprungziel-Hinweis):');
    sectionMarkers.forEach(m => {
      const targetId = m.turnIndex < turns.length ? 'turn-' + (m.turnIndex + 1) : '(kein nachfolgender Turn)';
      console.log('    "' + m.label + '" -> #' + targetId);
    });
  }
  if (highlightCount) console.log('  Highlights: ' + highlightCount);
  console.log('Hinweis: data-img/data-title/data-caption sowie die Sprungleiste (.interview-toc) müssen weiterhin von Hand gepflegt werden.');
}

main();
