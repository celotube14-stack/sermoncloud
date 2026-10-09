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

// Configuração oficial do Firebase SermonCloud
const firebaseConfig = {
  apiKey: "AIzaSyCbO420ovZakAyEHnabb9PpMo6G-UnfAcc",
  authDomain: "sermoncloud-3cef2.firebaseapp.com",
  projectId: "sermoncloud-3cef2",
  storageBucket: "sermoncloud-3cef2.firebasestorage.app",
  messagingSenderId: "1039977716746",
  appId: "1:1039977716746:web:11cafebe0158823f1653f3"
};

// Inicialização das instâncias
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// ==========================================
// 1. AUTENTICAÇÃO COM GOOGLE
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Erro no login com Google:", error);
                alert("Falha na autenticação: " + error.message);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => signOut(auth));
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
// 2. BUSCA DA BÍBLIA EM PORTUGUÊS (ABÍBLIADIGITAL)
// ==========================================

function parseBibleReference(reference) {
    const text = reference.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Separa o livro, capítulo e versículo (ex: "joao 3:16" -> livro: "joao", cap: "3", ver: "16")
    const match = text.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;

    const bookRaw = match[1].replace(/\s+/g, '');
    const chapter = match[2];
    const verse = match[3];

    // Mapeamento das abreviações nativas da API
    const bookMap = {
        'genesis': 'gn', 'exodo': 'ex', 'levitico': 'lv', 'numeros': 'num', 'deuteronomio': 'dt',
        'josue': 'jos', 'juizes': 'jz', 'rute': 'rt', '1samuel': '1sm', '2samuel': '2sm',
        '1reis': '1rs', '2reis': '2rs', '1cronicas': '1cr', '2cronicas': '2cr', 'esdras': 'ezr',
        'neemias': 'ne', 'ester': 'et', 'jo': 'job', 'salmos': 'ps', 'salmo': 'ps', 'proverbios': 'pv',
        'eclesiastes': 'ec', 'cantares': 'ct', 'isaias': 'is', 'jeremias': 'jr', 'lamentacoes': 'lm',
        'ezequiel': 'ez', 'daniel': 'dn', 'oseias': 'ho', 'joel': 'jl', 'amos': 'am', 'obadias': 'ob',
        'jonas': 'jn', 'miqueias': 'mi', 'naum': 'na', 'habacuque': 'hk', 'sofofnias': 'zp', 'ageu': 'hg',
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
            if (statusEl) statusEl.innerText = "⚠️ Formato inválido. Exemplo correto: joao 3:16";
            return;
        }

        if (statusEl) statusEl.innerText = "Carregando versículo...";
        e.target.disabled = true;

        try {
            // Busca a versão Almeida Corrigida Fiel (acf)
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
            if (
