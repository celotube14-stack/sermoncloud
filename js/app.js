import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbO420ovZakAyEHnabb9PpMo6G-UnfAcc",
  authDomain: "sermoncloud-3cef2.firebaseapp.com",
  projectId: "sermoncloud-3cef2",
  storageBucket: "sermoncloud-3cef2.firebasestorage.app",
  messagingSenderId: "1039977716746",
  appId: "1:1039977716746:web:11cafebe0158823f1653f3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// ==========================================
// 1. AUTENTICAÇÃO COM GOOGLE (FORÇADA NO DOM)
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
        loginBtn.onclick = async () => {
            try {
                console.log("A tentar iniciar sessão com o Google...");
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Erro detalhado no login:", error);
                alert("Erro ao autenticar: " + error.message);
            }
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => signOut(auth);
    }
});

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const authSection = document.getElementById('auth-section');
    const mainApp = document.getElementById('main-app');
    const userProfile = document.getElementById('user-profile');
    const logoutBtn = document.getElementById('logout-btn');

    if (user) {
        if (authSection) authSection.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (userProfile) {
            userProfile.innerHTML = `
                <img src="${user.photoURL}" class="w-8 h-8 rounded-full border border-slate-600">
                <span class="text-sm font-medium text-slate-200">${user.displayName}</span>
            `;
        }
        loadSermons();
    } else {
        if (authSection) authSection.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (userProfile) userProfile.innerHTML = '';
    }
});

// ==========================================
// 2. BUSCA DA BÍBLIA (ABÍBLIADIGITAL)
// ==========================================

function parseBibleReference(reference) {
    const text = reference.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const match = text.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;

    const bookRaw = match[1].replace(/\s+/g, '');
    const chapter = match[2];
    const verse = match[3];

    const bookMap = {
        'genesis': 'gn', 'exodo': 'ex', 'levitico': 'lv', 'numeros': 'num', 'deuteronomio': 'dt',
        'josue': 'jos', 'juizes': 'jz', 'rute': 'rt', '1samuel': '1sm', '2samuel': '2sm',
        '1reis': '1rs', '2reis': '2rs', '1cronicas': '1cr', '2cronicas': '2cr', 'esdras': 'ezr',
        'neemias': 'ne', 'ester': 'et', 'jo': 'job', 'salmos': 'ps', 'salmo': 'ps', 'proverbios': 'pv',
        'eclesiastes': 'ec', 'cantares': 'ct', 'isaias': 'is', 'jeremias': 'jr', 'lamentacoes': 'lm',
        'ezequiel': 'ez', 'daniel': 'dn', 'oseias': 'ho', 'joel': 'jl', 'amos': 'am', 'obadias': 'ob',
        'jonas': 'jn', 'miqueias': 'mi', 'naum': 'na', 'habacuque': 'hk', 'sofoniantes': 'zp', 'ageu': 'hg',
        'zacarias': 'zc', 'malaquias': 'ml', 'mateus': 'mt', 'marcos': 'mc', 'lucas': 'lk', 'joao': 'jn',
        'atos': 'act', 'romanos': 'rm', '1corintios': '1co', '2corintios': '2co', 'galatas': 'gl',
        'efesios': 'ep', 'filipenses': 'php', 'colossenses': 'col', '1tessalonicenses': '1ts',
        '2tessalonicenses': '2ts', '1timoteo': '1tm', '2timoteo': '2tm', 'tito': 'tt', 'filemon': 'phm',
        'hebreus': 'hb', 'tiago': 'jas', '1pedro': '1pe', '2pedro': '2pe', '1joao': '1jn',
        '2joao': '2jn', '3joao': '3jn', 'judas': 'jd', 'apocalipse': 'ap'
    };

    const bookAbbrev = bookMap[bookRaw] || bookRaw.substring(0, 3);
    return { book: bookAbbrev, chapter, verse };
}

document.addEventListener('click', async (e) => {
    if (e.target && (e.target.id === 'search-bible-btn' || e.target.innerText.trim().toLowerCase() === 'buscar')) {
        e.preventDefault();

        const inputEl = document.getElementById('bible-search-input') || document.querySelector('input[placeholder*="joao"]');
        const statusEl = document.getElementById('bible-loading-msg');
        const editorEl = document.getElementById('sermon-content');

        if (!inputEl || !inputEl.value.trim()) {
            alert("Digite a referência bíblica (ex: joao 3:16)");
            return;
        }

        const parsed = parseBibleReference(inputEl.value);
        if (!parsed) {
            if (statusEl) statusEl.innerText = "⚠️ Formato inválido. Exemplo: joao 3:16";
            return;
        }

        if (statusEl) statusEl.innerText = "Carregando versículo...";
        e.target.disabled = true;

        try {
            let url = `https://www.abibliadigital.com.br/api/verses/acf/${parsed.book}/${parsed.chapter}`;
            if (parsed.verse) {
                url += `/${parsed.verse}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error("Não encontrado");

            const data = await response.json();
            if (statusEl) statusEl.innerText = "";

            let verseFormatted = "";
            if (parsed.verse && data.text) {
                verseFormatted = `\n\n📖 ${data.book.name} ${data.chapter}:${data.number} (ACF)\n"${data.text}"\n`;
            } else if (data.verses) {
                const textCombined = data.verses.map(v => `${v.number}. ${v.text}`).join(' ');
                verseFormatted = `\n\n📖 ${data.book.name} ${data.chapter} (ACF)\n"${textCombined}"\n`;
            }

            if (editorEl && verseFormatted) {
                editorEl.value += verseFormatted;
            } else if (verseFormatted) {
                alert(verseFormatted);
            }

        } catch (err) {
            console.error(err);
            if (statusEl) statusEl.innerText = "⚠️ Versículo não encontrado.";
        } finally {
            e.target.disabled = false;
        }
    }
});

// ==========================================
// 3. GRAVAÇÃO E CARREGAMENTO DE SERMÕES
// ==========================================

const sermonForm = document.getElementById('sermon-form');
if (sermonForm) {
    sermonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const title = document.getElementById('sermon-title')?.value || '';
        const category = document.getElementById('sermon-category')?.value || '';
        const tagsInput = document.getElementById('sermon-tags')?.value || '';
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()) : [];
        const references = document.getElementById('sermon-references')?.value || '';
        const content = document.getElementById('sermon-content')?.value || '';

        try {
            await addDoc(collection(db, "sermons"), {
                userId: currentUser.uid,
                title,
                category,
                tags,
                references,
                content,
                createdAt: serverTimestamp()
            });

            sermonForm.reset();
            alert("Sermão salvo com sucesso!");
            loadSermons();
        } catch (error) {
            console.error("Erro ao salvar sermão:", error);
            alert("Erro ao salvar o sermão.");
        }
    });
}

async function loadSermons() {
    const sermonsList = document.getElementById('sermons-list');
    if (!currentUser || !sermonsList) return;

    sermonsList.innerHTML = '<p class="text-slate-400 text-sm">Carregando sermões...</p>';

    try {
        const q = query(
            collection(db, "sermons"), 
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        sermonsList.innerHTML = '';

        if (querySnapshot.empty) {
            sermonsList.innerHTML = '<p class="text-slate-400 text-sm">Nenhum sermão salvo ainda.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = "bg-slate-800 p-4 rounded-lg border border-slate-700 mb-3 shadow-sm";
            card.innerHTML = `
                <h3 class="font-bold text-lg text-amber-400">${data.title}</h3>
                <p class="text-xs text-slate-400 mb-2">${data.category || 'Geral'} • ${data.references || ''}</p>
                <p class="text-sm text-slate-300 line-clamp-2">${data.content}</p>
            `;
            sermonsList.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar sermões:", error);
        sermonsList.innerHTML = '<p class="text-red-400 text-sm">Erro ao carregar lista de sermões.</p>';
    }
}
