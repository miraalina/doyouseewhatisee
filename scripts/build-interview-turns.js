#!/usr/bin/env node
/*
  scripts/build-interview-turns.js

  Liest ein Transkript im Format
      Name: Aussage
  (eine Zeile = ein Absatz, Leerzeilen sind optionale Trenner) und erzeugt
  daraus die .interview-turn-Blöcke für eine content/interviews/interviewN.html.
  Aufeinanderfolgende Zeilen ohne neuen "Name:"-Präfix werden als weitere
  Absätze demselben Redebeitrag zugerechnet. Zeilen, die komplett in
  Klammern stehen, z.B. "(Ivo tries to find the other two Zines)", sowie
  gemeinsame Sprecherzeilen wie "Phuong & Mira: ..." werden als
  spaltenübergreifende Randnotiz gerendert (data-col="1 / 4").

  Ersetzt in der Ziel-HTML-Datei nur den Bereich zwischen
      <!-- AUTO-GENERATED TURNS START ... -->
      <!-- AUTO-GENERATED TURNS END -->
  Sidebar, Kopfzeilen (.content-header) und Sprungleiste bleiben unangetastet.

  Aufruf:
    node scripts/build-interview-turns.js <transcript-datei> <ziel-html-datei>

  Beispiel:
    node scripts/build-interview-turns.js \
      content/transcripts/interview_Ivo \
      content/interviews/interview1.html
*/

const fs = require('fs');

// Sprecher → Spalte. Muss zur Reihenfolge der drei .content-header in der
// Ziel-HTML passen (aktuell: Ivo, Phuong, Mira).
const SPEAKER_COLUMN = {
  'Ivo': 1,
  'Phuong': 2,
  'Phuong Nguyen': 2,
  'Mira': 3,
};
const SPEAKER_DISPLAY = {
  'Ivo': 'Ivo',
  'Phuong': 'Phuong',
  'Phuong Nguyen': 'Phuong',
  'Mira': 'Mira',
};

const SPEAKER_NAMES = Object.keys(SPEAKER_COLUMN).sort((a, b) => b.length - a.length);
const SPEAKER_LINE_RE = new RegExp('^(' + SPEAKER_NAMES.join('|') + ')\\s*:\\s*(.*)$');
const JOINT_SPEAKER_LINE_RE = /^([A-Za-z][A-Za-z\s]*?)\s*&\s*([A-Za-z][A-Za-z\s]*?)\s*:\s*(.*)$/;
const PARENTHETICAL_LINE_RE = /^\(.*\)$/;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseTranscript(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const turns = [];

  for (const line of lines) {
    const speakerMatch = line.match(SPEAKER_LINE_RE);
    if (speakerMatch) {
      const [, name, rest] = speakerMatch;
      turns.push({
        type: 'dialogue',
        speaker: SPEAKER_DISPLAY[name],
        col: SPEAKER_COLUMN[name],
        paragraphs: [rest],
      });
      continue;
    }

    const jointMatch = line.match(JOINT_SPEAKER_LINE_RE);
    if (jointMatch) {
      const [, a, b, rest] = jointMatch;
      turns.push({
        type: 'note',
        paragraphs: [a.trim() + ' & ' + b.trim() + ': ' + rest],
      });
      continue;
    }

    if (PARENTHETICAL_LINE_RE.test(line)) {
      turns.push({ type: 'note', paragraphs: [line] });
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
      '  <div class="interview-turn interview-note" id="' + id + '" data-col="1 / 4">',
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

  const transcriptText = fs.readFileSync(transcriptPath, 'utf8');
  const turns = parseTranscript(transcriptText);

  const turnsHtml = turns.map(renderTurn).join('\n\n');

  const targetHtml = fs.readFileSync(targetPath, 'utf8');
  const startMarker = /<!-- AUTO-GENERATED TURNS START[^>]*-->/;
  const endMarker = /<!-- AUTO-GENERATED TURNS END -->/;

  if (!startMarker.test(targetHtml) || !endMarker.test(targetHtml)) {
    console.error('Marker "AUTO-GENERATED TURNS START/END" nicht in ' + targetPath + ' gefunden.');
    process.exit(1);
  }

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

  console.log('Fertig: ' + turns.length + ' Turns in ' + targetPath + ' geschrieben.');
  console.log('  Dialog-Turns: ' + dialogueCount + ' (' + Object.entries(perSpeaker).map(([k, v]) => k + ': ' + v).join(', ') + ')');
  console.log('  Randnotizen: ' + noteCount);
  console.log('Hinweis: data-img/data-title/data-caption sowie die Sprungleiste (.interview-toc) müssen weiterhin von Hand gepflegt werden.');
}

main();
