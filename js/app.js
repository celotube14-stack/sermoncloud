// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCbO420ovZakAyEHnabb9PpMo6G-UnfAcc",
  authDomain: "sermoncloud-3cef2.firebaseapp.com",
  projectId: "sermoncloud-3cef2",
  storageBucket: "sermoncloud-3cef2.firebasestorage.app",
  messagingSenderId: "1039977716746",
  appId: "1:1039977716746:web:11cafebe0158823f1653f3"
};

// Inicialização Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Estado Global
let currentUser = null;
let currentSermonId = null;
let activeTagFilter = "ALL";
let userSermonsCache = [];

// Elementos da DOM
const authContainer = document.getElementById("authContainer");
const appContainer = document.getElementById("appContainer");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sermonList = document.getElementById("sermonList");
const newSermonBtn = document.getElementById("newSermonBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");

const sermonTitle = document.getElementById("sermonTitle");
const sermonCategory = document.getElementById("sermonCategory");
const sermonTags = document.getElementById("sermonTags");
const sermonReferences = document.getElementById("sermonReferences");
const sermonContent = document.getElementById("sermonContent");
const sermonCover = document.getElementById("sermonCover");
const coverFileInput = document.getElementById("coverFileInput");
const coverPreviewContainer = document.getElementById("coverPreviewContainer");
const coverPreview = document.getElementById("coverPreview");
const removeCoverBtn = document.getElementById("removeCoverBtn");
const tagFilterSelect = document.getElementById("tagFilterSelect");

// 66 Livros da Bíblia
const BIBLE_BOOKS = [
  { name: "Gênesis", abbrev: "gn", chapters: 50 },
  { name: "Êxodo", abbrev: "ex", chapters: 40 },
  { name: "Levítico", abbrev: "lv", chapters: 27 },
  { name: "Números", abbrev: "nm", chapters: 36 },
  { name: "Deuteronômio", abbrev: "dt", chapters: 34 },
  { name: "Josué", abbrev: "js", chapters: 24 },
  { name: "Juízes", abbrev: "jz", chapters: 21 },
  { name: "Rute", abbrev: "rt", chapters: 4 },
  { name: "1 Samuel", abbrev: "1sm", chapters: 31 },
  { name: "2 Samuel", abbrev: "2sm", chapters: 24 },
  { name: "1 Reis", abbrev: "1kc", chapters: 22 },
  { name: "2 Reis", abbrev: "2kc", chapters: 25 },
  { name: "1 Crônicas", abbrev: "1ch", chapters: 29 },
  { name: "2 Crônicas", abbrev: "2ch", chapters: 36 },
  { name: "Esdras", abbrev: "ez", chapters: 10 },
  { name: "Neemias", abbrev: "ne", chapters: 13 },
  { name: "Ester", abbrev: "et", chapters: 10 },
  { name: "Jó", abbrev: "job", chapters: 42 },
  { name: "Salmos", abbrev: "ps", chapters: 150 },
  { name: "Provérbios", abbrev: "prv", chapters: 31 },
  { name: "Eclesiastes", abbrev: "ec", chapters: 12 },
  { name: "Cânticos", abbrev: "so", chapters: 8 },
  { name: "Isaías", abbrev: "is", chapters: 66 },
  { name: "Jeremias", abbrev: "jr", chapters: 52 },
  { name: "Lamentações", abbrev: "lm", chapters: 5 },
  { name: "Ezequiel", abbrev: "ezk", chapters: 48 },
  { name: "Daniel", abbrev: "dn", chapters: 12 },
  { name: "Oséias", abbrev: "ho", chapters: 14 },
  { name: "Joel", abbrev: "jl", chapters: 3 },
  { name: "Amós", abbrev: "am", chapters: 9 },
  { name: "Obadias", abbrev: "ob", chapters: 1 },
  { name: "Jonas", abbrev: "jn", chapters: 4 },
  { name: "Miquéias", abbrev: "mi", chapters: 7 },
  { name: "Naum", abbrev: "na", chapters: 3 },
  { name: "Habacuque", abbrev: "hk", chapters: 3 },
  { name: "Sofonias", abbrev: "zp", chapters: 3 },
  { name: "Ageu", abbrev: "hg", chapters: 2 },
  { name: "Zacarias", abbrev: "zc", chapters: 14 },
  { name: "Malaquias", abbrev: "ml", chapters: 4 },
  { name: "Mateus", abbrev: "mt", chapters: 28 },
  { name: "Marcos", abbrev: "mk", chapters: 16 },
  { name: "Lucas", abbrev: "lk", chapters: 24 },
  { name: "João", abbrev: "jn", chapters: 21 },
  { name: "Atos", abbrev: "act", chapters: 28 },
  { name: "Romanos", abbrev: "rm", chapters: 16 },
  { name: "1 Coríntios", abbrev: "1co", chapters: 16 },
  { name: "2 Coríntios", abbrev: "2co", chapters: 13 },
  { name: "Gálatas", abbrev: "gl", chapters: 6 },
  { name: "Efésios", abbrev: "ep", chapters: 6 },
  { name: "Filipenses", abbrev: "ph", chapters: 4 },
  { name: "Colossenses", abbrev: "cl", chapters: 4 },
  { name: "1 Tessalonicenses", abbrev: "1th", chapters: 5 },
  { name: "2 Tessalonicenses", abbrev: "2th", chapters: 3 },
  { name: "1 Timóteo", abbrev: "1tm", chapters: 6 },
  { name: "2 Timóteo", abbrev: "2tm", chapters: 4 },
  { name: "Tito", abbrev: "tit", chapters: 3 },
  { name: "Filemom", abbrev: "phm", chapters: 1 },
  { name: "Hebreus", abbrev: "eb", chapters: 13 },
  { name: "Tiago", abbrev: "jas", chapters: 5 },
  { name: "1 Pedro", abbrev: "1pe", chapters: 5 },
  { name: "2 Pedro", abbrev: "2pe", chapters: 3 },
  { name: "1 João", abbrev: "1jn", chapters: 5 },
  { name: "2 João", abbrev: "2jn", chapters: 1 },
  { name: "3 João", abbrev: "3jn", chapters: 1 },
  { name: "Judas", abbrev: "jud", chapters: 1 },
  { name: "Apocalipse", abbrev: "rev", chapters: 22 }
];

let selectedBookObj = null;

function initBibleBooks() {
  const bibleBookSelect = document.getElementById("bibleBookSelect");
  if (!bibleBookSelect) return;

  bibleBookSelect.innerHTML = '<option value="">-- Escolha um Livro --</option>';
  BIBLE_BOOKS.forEach((b, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = b.name;
    bibleBookSelect.appendChild(opt);
  });
}

// Evento Login Google
googleLoginBtn.onclick = function() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => console.log("Sucesso no login:", result.user))
    .catch((error) => alert("Erro ao fazer login: " + error.message));
};

logoutBtn.onclick = function() {
  auth.signOut();
};

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
    document.getElementById("userName").innerText = user.displayName || user.email;
    document.getElementById("userAvatar").src = user.photoURL || "";
    
    listenToSermons();
    initBibleBooks();
  } else {
    currentUser = null;
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
  }
});

// Compressão de Imagens
function compressImage(file, maxWidth = 600, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    };
  });
}

sermonCover.addEventListener("input", (e) => {
  const url = e.target.value.trim();
  if (url) {
    coverPreview.src = url;
    coverPreviewContainer.classList.remove("hidden");
  } else {
    coverPreviewContainer.classList.add("hidden");
  }
});

coverFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    const compressedDataUrl = await compressImage(file);
    sermonCover.value = compressedDataUrl;
    coverPreview.src = compressedDataUrl;
    coverPreviewContainer.classList.remove("hidden");
  }
});

removeCoverBtn.onclick = function() {
  sermonCover.value = "";
  coverPreview.src = "";
  coverPreviewContainer.classList.add("hidden");
};

// Listener do Firestore
function listenToSermons() {
  db.collection("sermons")
    .where("userId", "==", currentUser.uid)
    .onSnapshot((snapshot) => {
      userSermonsCache = [];
      snapshot.forEach((docSnap) => {
        userSermonsCache.push({ id: docSnap.id, ...docSnap.data() });
      });
      updateTagFilterDropdown();
      renderSermonList();
    });
}

function updateTagFilterDropdown() {
  const tagsSet = new Set();
  userSermonsCache.forEach(s => {
    if (Array.isArray(s.tags)) {
      s.tags.forEach(t => tagsSet.add(t));
    }
  });

  tagFilterSelect.innerHTML = '<option value="ALL">Todos os Marcadores</option>';
  tagsSet.forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    if (tag === activeTagFilter) opt.selected = true;
    tagFilterSelect.appendChild(opt);
  });
}

tagFilterSelect.onchange = function(e) {
  activeTagFilter = e.target.value;
  renderSermonList();
};

function renderSermonList() {
  sermonList.innerHTML = "";

  const filtered = userSermonsCache.filter(s => {
    if (activeTagFilter === "ALL") return true;
    return Array.isArray(s.tags) && s.tags.includes(activeTagFilter);
  });

  filtered.forEach((data) => {
    const div = document.createElement("div");
    div.className = `p-3 rounded-xl border border-slate-700/50 cursor-pointer transition hover:bg-slate-700/40 flex gap-3 items-center ${currentSermonId === data.id ? 'bg-slate-700 border-amber-500/50' : 'bg-slate-800/80'}`;
    div.onclick = () => selectSermon(data.id, data);
    
    const imgHtml = data.cover 
      ? `<img src="${data.cover}" class="w-12 h-12 rounded-lg object-cover border border-slate-600 flex-shrink-0">` 
      : `<div class="w-12 h-12 rounded-lg bg-slate-700/60 flex items-center justify-center text-amber-500 font-bold text-xs flex-shrink-0">📖</div>`;

    let tagsHtml = "";
    if (Array.isArray(data.tags) && data.tags.length > 0) {
      tagsHtml = `<div class="flex flex-wrap gap-1 mt-1">` + 
        data.tags.map(t => `<span class="bg-amber-500/10 text-amber-400 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-amber-500/20">${t}</span>`).join('') +
        `</div>`;
    }

    div.innerHTML = `
      ${imgHtml}
      <div class="overflow-hidden flex-1">
        <h3 class="font-bold text-sm text-slate-100 truncate">${data.title || 'Sem título'}</h3>
        <p class="text-xs text-slate-400 font-medium truncate">${data.category || 'Geral'}</p>
        ${tagsHtml}
      </div>
    `;
    sermonList.appendChild(div);
  });
}

function selectSermon(id, data) {
  currentSermonId = id;
  sermonTitle.value = data.title || "";
  sermonCategory.value = data.category || "";
  sermonTags.value = Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");
  sermonReferences.value = data.references || "";
  sermonCover.value = data.cover || "";
  sermonContent.innerHTML = data.content || "";

  if (data.cover) {
    coverPreview.src = data.cover;
    coverPreviewContainer.classList.remove("hidden");
  } else {
    coverPreviewContainer.classList.add("hidden");
  }

  deleteBtn.classList.remove("hidden");
}

newSermonBtn.onclick = function() {
  currentSermonId = null;
  sermonTitle.value = "";
  sermonCategory.value = "";
  sermonTags.value = "";
  sermonReferences.value = "";
  sermonCover.value = "";
  sermonContent.innerHTML = "";
  coverPreviewContainer.classList.add("hidden");
  deleteBtn.classList.add("hidden");
};

saveBtn.onclick = async function() {
  if (!currentUser) return;

  const tagsArray = sermonTags.value
    .split(",")
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const sermonData = {
    title: sermonTitle.value,
    category: sermonCategory.value,
    tags: tagsArray,
    references: sermonReferences.value,
    cover: sermonCover.value,
    content: sermonContent.innerHTML,
    userId: currentUser.uid,
    updatedAt: new Date()
  };

  try {
    if (currentSermonId) {
      await db.collection("sermons").doc(currentSermonId).update(sermonData);
    } else {
      const docRef = await db.collection("sermons").add(sermonData);
      currentSermonId = docRef.id;
    }
    alert("Sermão salvo com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar no Firestore:", error);
    alert("Erro ao salvar sermão: " + error.message);
  }
};

// Excluir Sermão
deleteBtn.onclick = async function() {
  if (!currentSermonId) return;

  const confirmDelete = confirm("Tem certeza de que deseja excluir este sermão permanentemente?");
  if (confirmDelete) {
    try {
      await db.collection("sermons").doc(currentSermonId).delete();
      alert("Sermão excluído com sucesso!");
      newSermonBtn.click();
    } catch (error) {
      console.error("Erro ao excluir sermão:", error);
      alert("Erro ao excluir sermão: " + error.message);
    }
  }
};

// Formatação Rich Text
window.execCmd = function(command, value = null) {
  document.execCommand(command, false, value);
};

window.highlightText = function(color) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const mark = document.createElement("mark");
  mark.style.backgroundColor = color;
  mark.style.color = "#000";
  
  mark.appendChild(range.extractContents());
  range.insertNode(mark);
};

// Alternância de abas Navegar / Pesquisar
const tabBrowseBtn = document.getElementById("tabBrowseBtn");
const tabSearchBtn = document.getElementById("tabSearchBtn");
const browseContainer = document.getElementById("browseContainer");
const searchContainer = document.getElementById("searchContainer");

if (tabBrowseBtn && tabSearchBtn) {
  tabBrowseBtn.onclick = function() {
    tabBrowseBtn.className = "flex-1 py-1.5 font-bold border-b-2 border-amber-500 text-amber-400";
    tabSearchBtn.className = "flex-1 py-1.5 text-slate-400 hover:text-slate-200 font-semibold";
    browseContainer.classList.remove("hidden");
    searchContainer.classList.add("hidden");
  };

  tabSearchBtn.onclick = function() {
    tabSearchBtn.className = "flex-1 py-1.5 font-bold border-b-2 border-amber-500 text-amber-400";
    tabBrowseBtn.className = "flex-1 py-1.5 text-slate-400 hover:text-slate-200 font-semibold";
    searchContainer.classList.remove("hidden");
    browseContainer.classList.add("hidden");
  };
}

const bibleBookSelect = document.getElementById("bibleBookSelect");
if (bibleBookSelect) {
  bibleBookSelect.onchange = function(e) {
    const index = e.target.value;
    const chapterContainer = document.getElementById("chapterContainer");
    const chapterGrid = document.getElementById("chapterGrid");
    const verseContainer = document.getElementById("verseContainer");

    verseContainer.classList.add("hidden");
    document.getElementById("bibleResult").innerHTML = "";

    if (index === "") {
      chapterContainer.classList.add("hidden");
      return;
    }

    selectedBookObj = BIBLE_BOOKS[index];
    chapterGrid.innerHTML = "";

    for (let i = 1; i <= selectedBookObj.chapters; i++) {
      const btn = document.createElement("button");
      btn.className = "p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold rounded text-xs transition text-slate-200";
      btn.textContent = i;
      btn.onclick = () => selectChapter(i);
      chapterGrid.appendChild(btn);
    }

    chapterContainer.classList.remove("hidden");
  };
}

function selectChapter(chNum) {
  const verseContainer = document.getElementById("verseContainer");
  const verseGrid = document.getElementById("verseGrid");
  verseGrid.innerHTML = "";

  document.getElementById("bibleResult").innerHTML = "<p class='text-center text-slate-400'>Carregando capítulo...</p>";

  const version = document.getElementById("bibleVersion").value;
  fetch(`https://bible-api.com/${encodeURIComponent(selectedBookObj.name)} ${chNum}?translation=${version}`)
    .then(res => res.json())
    .then(data => {
      if (data.verses) {
        document.getElementById("bibleResult").innerHTML = "";
        
        const fullCapBtn = document.createElement("button");
        fullCapBtn.className = "w-full mb-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold py-1 px-2 rounded border border-amber-500/20";
        fullCapBtn.textContent = `+ Inserir Capítulo ${chNum} Inteiro`;
        fullCapBtn.onclick = () => {
          const textFull = data.verses.map(v => `${v.verse}. ${v.text.trim()}`).join(" ");
          sermonContent.innerHTML += `<blockquote class="border-l-4 border-amber-500 pl-3 my-3 italic text-slate-300 bg-slate-800/40 py-2">"${textFull}" (<strong>${data.reference} - ${version.toUpperCase()}</strong>)</blockquote><p></p>`;
        };
        document.getElementById("bibleResult").appendChild(fullCapBtn);

        data.verses.forEach(v => {
          const btn = document.createElement("button");
          btn.className = "p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold rounded text-xs transition text-slate-200";
          btn.textContent = v.verse;
          btn.onclick = () => fetchAndDisplayVerse(`${selectedBookObj.name} ${chNum}:${v.verse}`);
          verseGrid.appendChild(btn);
        });

        verseContainer.classList.remove("hidden");
      }
    });
}

async function fetchAndDisplayVerse(query) {
  const version = document.getElementById("bibleVersion").value;
  const resultDiv = document.getElementById("bibleResult");
  
  resultDiv.innerHTML = "<p class='text-center text-slate-400'>Carregando versículo...</p>";

  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=${version}`);
    const data = await res.json();

    if (data.text) {
      const verseText = data.text.trim();
      const reference = `${data.reference} (${version.toUpperCase()})`;

      resultDiv.innerHTML = `
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 mb-2">
          <p class="italic text-slate-200 mb-2">"${verseText}"</p>
          <p class="font-bold text-amber-400 text-xs text-right">- ${reference}</p>
        </div>
        <button id="insertVerseBtn" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-1.5 rounded-lg text-xs transition">
          Inserir no Sermão
        </button>
      `;

      document.getElementById("insertVerseBtn").onclick = () => {
        sermonContent.innerHTML += `<blockquote class="border-l-4 border-amber-500 pl-3 my-3 italic text-slate-300 bg-slate-800/40 py-2">"${verseText}" (<strong>${reference}</strong>)</blockquote><p></p>`;
      };
    }
  } catch (err) {
    resultDiv.innerHTML = "<p class='text-red-400 text-xs text-center'>Erro ao buscar versículo.</p>";
  }
}

const searchBibleBtn = document.getElementById("searchBibleBtn");
if (searchBibleBtn) {
  searchBibleBtn.onclick = function() {
    const queryInput = document.getElementById("bibleSearchInput").value.trim();
    if (queryInput) fetchAndDisplayVerse(queryInput);
  };
}

// Modo Púlpito
let pulpitFontSize = 24;
const pulpitModal = document.getElementById("pulpitModal");

const pulpitModeBtn = document.getElementById("pulpitModeBtn");
if (pulpitModeBtn) {
  pulpitModeBtn.onclick = function() {
    document.getElementById("pulpitTitle").innerText = sermonTitle.value || "Sem título";
    document.getElementById("pulpitMeta").innerText = `${sermonCategory.value} | ${sermonReferences.value}`;
    document.getElementById("pulpitBody").innerHTML = sermonContent.innerHTML;
    pulpitModal.classList.remove("hidden");
  };
}

const closePulpitBtn = document.getElementById("closePulpitBtn");
if (closePulpitBtn) {
  closePulpitBtn.onclick = function() {
    pulpitModal.classList.add("hidden");
  };
}

const zoomInBtn = document.getElementById("zoomInBtn");
if (zoomInBtn) {
  zoomInBtn.onclick = function() {
    pulpitFontSize += 2;
    document.getElementById("pulpitBody").style.fontSize = `${pulpitFontSize}px`;
  };
}

const zoomOutBtn = document.getElementById("zoomOutBtn");
if (zoomOutBtn) {
  zoomOutBtn.onclick = function() {
    if (pulpitFontSize > 14) pulpitFontSize -= 2;
    document.getElementById("pulpitBody").style.fontSize = `${pulpitFontSize}px`;
  };
}

initBibleBooks();
