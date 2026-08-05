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
  const noteSpan = '1 / ' + (numColumns + 1);

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const turns = [];

  for (const line of lines) {
    const speakerMatch = line.match(speakerLineRe);
    if (speakerMatch) {
      const [, name, rest] = speakerMatch;
      turns.push({
        type: 'dialogue',
        speaker: speakerDisplay[name],
        col: speakerColumn[name],
        paragraphs: [rest],
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

    // Fortsetzung ohne neuen Sprecher-Präfix → weiterer Absatz im letzten Turn
    if (turns.length > 0) {
      turns[turns.length - 1].paragraphs.push(line);
    } else {
      console.warn('Warnung: Zeile ohne vorherigen Turn übersprungen: ' + line);
    }
  }

  return turns;
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
  const turns = parseTranscript(transcriptText, speakerColumn, speakerDisplay, columnNames.length);

  const turnsHtml = turns.map(renderTurn).join('\n\n');

  const startMatch = targetHtml.match(startMarker)[0];
  const newHtml = targetHtml.replace(
    new RegExp(startMarker.source + '[\\s\\S]*?' + endMarker.source),
    startMatch + '\n' + turnsHtml + '\n  <!-- AUTO-GENERATED TURNS END -->'
  );

  fs.writeFileSync(targetPath, newHtml, 'utf8');

  const dialogueCount = turns.filter(t => t.type === 'dialogue').length;
  const noteCount = turns.filter(t => t.type === 'note').length;
  const perSpeaker = {};
  turns.forEach(t => {
    if (t.type === 'dialogue') perSpeaker[t.speaker] = (perSpeaker[t.speaker] || 0) + 1;
  });

  console.log('Spalten erkannt: ' + columnNames.join(', '));
  console.log('Fertig: ' + turns.length + ' Turns in ' + targetPath + ' geschrieben.');
  console.log('  Dialog-Turns: ' + dialogueCount + ' (' + Object.entries(perSpeaker).map(([k, v]) => k + ': ' + v).join(', ') + ')');
  console.log('  Randnotizen: ' + noteCount);
  console.log('Hinweis: data-img/data-title/data-caption sowie die Sprungleiste (.interview-toc) müssen weiterhin von Hand gepflegt werden.');
}

main();
