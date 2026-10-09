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
// 2. BUSCA DA BÍBLIA EM PORTUGUÊS
// ==========================================

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

        // Limpa acentos e caracteres especiais para a busca na API
        const cleanRef = inputEl.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (statusEl) statusEl.innerText = "Carregando versículo...";
        e.target.disabled = true;

        try {
            const response = await fetch(`https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=almeida`);
            
            if (!response.ok) {
                throw new Error("Versículo não encontrado.");
            }

            const data = await response.json();

            if (data && data.text) {
                if (statusEl) statusEl.innerText = "";
                const verseFormat = `\n\n📖 ${data.reference} (Almeida)\n"${data.text.trim()}"\n`;
                
                if (editorEl) {
                    editorEl.value += verseFormat;
                } else {
                    alert(`${data.reference}:\n\n${data.text.trim()}`);
                }
            } else {
                if (statusEl) statusEl.innerText = "⚠️ Versículo não encontrado.";
            }
        } catch (err) {
            console.error(err);
            if (statusEl) statusEl.innerText = "⚠️ Referência não encontrada ou falha na rede.";
        } finally {
            e.target.disabled = false;
        }
    }
});

// ==========================================
// 3. GRAVAÇÃO E CARREGAMENTO DE SERMÕES (FIRESTORE)
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

    sermonsList.innerHTML
