let currentMode = null;
let currentSession = null;

function clearActive(container){
  container.querySelectorAll('.nav-item, .title-cell')
    .forEach(el => el.classList.remove('active'));
}

function clearContent(){
  document.getElementById("page-content").innerHTML = "";
}

function hideLevels23(){
  document.getElementById('level2-sessions').classList.add('hidden');
  document.getElementById('level2-interviews').classList.add('hidden');
  document.getElementById('level3-sub').classList.add('hidden');
}

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

function goHome(){
  currentMode = null;
  currentSession = null;

  clearActive(document.getElementById('level1-items'));
  document.getElementById('home-link').classList.add('active');

  hideLevels23();
  clearContent();
}

function selectMode(mode){
  currentMode = mode;
  currentSession = null;

  clearActive(document.getElementById('level1-items'));
  document.getElementById('home-link').classList.remove('active');

  document.querySelector('.nav-item[data-mode="' + mode + '"]').classList.add('active');

  hideLevels23();
  clearContent();

  if(mode === 'work'){
    document.getElementById('level2-sessions').classList.remove('hidden');
    clearActive(document.getElementById('level2-sessions'));
  }

  if(mode === 'interview'){
    document.getElementById('level2-interviews').classList.remove('hidden');
    clearActive(document.getElementById('level2-interviews'));
  }
}

function selectSession(n){
  currentSession = n;

  clearActive(document.getElementById('level2-sessions'));
  document.querySelector('.nav-item[data-session="' + n + '"]').classList.add('active');

  document.getElementById('level3-sub').classList.remove('hidden');
  clearActive(document.getElementById('level3-sub'));

  clearContent();
}

function selectSub(sub){
  clearActive(document.getElementById('level3-sub'));
  document.querySelector('.nav-item[data-sub="' + sub + '"]').classList.add('active');

  if(currentSession === 1 && sub === "notes"){
    loadContent("content/sessions/session1/notes1.html");
  }
}

function selectInterview(n){
  clearActive(document.getElementById('level2-interviews'));
  document.querySelector('.nav-item[data-interview="' + n + '"]').classList.add('active');

  clearContent();
}

goHome();
