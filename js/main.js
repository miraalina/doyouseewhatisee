
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