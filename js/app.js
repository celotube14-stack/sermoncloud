// Importações do Firebase
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

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD-SUAS_CHAVE_AQUI", 
    authDomain: "sermoncloud-3cef2.firebaseapp.com",
    projectId: "sermoncloud-3cef2",
    storageBucket: "sermoncloud-3cef2.appspot.com",
    messagingSenderId: "1039977716746",
    appId: "1:1039977716746:web:sermoncloud"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// ==========================================
// 1. AUTENTICAÇÃO
// ==========================================

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro no login:", error);
            alert("Erro ao conectar: " + error.message);
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const authSection = document.getElementById('auth-section');
    const mainApp = document.getElementById('main-app');
    const userProfile = document.getElementById('user-profile');

    if (user) {
        if (authSection) authSection.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
        if (userProfile) {
            userProfile.innerHTML = `
                <img src="${user.photoURL}" class="w-8 h-8 rounded-full border border-gray-600">
                <span class="text-sm font-medium text-gray-200">${user.displayName}</span>
            `;
        }
        loadSermons();
    } else {
        if (authSection) authSection.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    }
});

// ==========================================
// 2. MÓDULO BÍBLIA SAGRADA (SISTEMA DE BUSCA)
// ==========================================

// Função de busca tratada contra erros
async function searchBible(referenceText, translationSelectValue) {
    try {
        // Mapeia traduções para garantir resposta em Português
        let apiTranslation = 'almeida';
        if (translationSelectValue && translationSelectValue.toLowerCase().includes('kjv')) {
            apiTranslation = 'almeida'; // Força Almeida para garantir textos em PT
        }

        // Remove acentos e caracteres especiais da busca (ex: "joão" -> "joao")
        const cleanRef = referenceText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const url = `https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=${apiTranslation}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Versículo não encontrado.");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro ao carregar o versículo:", error);
        return null;
    }
}

// Escuta cliques em todos os botões de busca da Bíblia
document.addEventListener('click', async (e) => {
    // Detecta se o elemento clicado é o botão de busca da Bíblia
    const searchBtn = e.target.closest('button');
    if (!searchBtn) return;

    // Identifica se é o botão "Buscar" do painel da Bíblia
    const isBibleSearch = searchBtn.innerText.trim().toLowerCase() === 'buscar' || searchBtn.id === 'search-bible-btn';
    
    if (isBibleSearch) {
        // Localiza os campos na tela independente dos IDs
        const inputField = document.querySelector('input[placeholder*="joao"], input[placeholder*="joão"], #bible-search-input') || 
                           Array.from(document.querySelectorAll('input')).find(i => i.value.toLowerCase().includes('joao') || i.value.toLowerCase().includes('joão'));
        
        const feedbackContainer = document.querySelector('.carregando, #bible-result, #bible-loading') || searchBtn.parentElement.parentElement;
        const editorArea = document.querySelector('textarea, #sermon-content');
        const translationSelect = document.querySelector('select');

        if (!inputField || !inputField.value.trim()) {
            alert("Por favor, digite a referência desejada (ex: joao 3:16).");
            return;
        }

        // Procura ou cria o elemento de status visual
        let statusEl = document.getElementById('bible-status-msg');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'bible-status-msg';
            statusEl.className = 'text-xs text-amber-400 mt-2 text-center';
            feedbackContainer.appendChild(statusEl);
        }

        statusEl.innerText = "Carregando versículo...";
        searchBtn.disabled = true;

        const result = await searchBible(inputField.value, translationSelect ? translationSelect.value : 'almeida');

        if (result && result.text) {
            statusEl.innerText = ""; // Limpa a mensagem "Carregando"
            
            const verseText = `\n\n📖 ${result.reference} (Almeida)\n"${result.text.trim()}"\n`;

            // Insere diretamente no editor de sermão se existir
            if (editorArea) {
                editorArea.value += verseText;
                alert(`Versículo ${result.reference} adicionado ao seu esboço!`);
            } else {
                alert(`${result.reference}:\n\n${result.text.trim()}`);
            }
        } else {
            statusEl.innerText = "⚠️ Versículo não encontrado. Verifique a referência.";
        }

        searchBtn.disabled = false;
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
        const content = document.querySelector('textarea')?.value || '';

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
            alert("Erro ao salvar.");
        }
    });
}

async function loadSermons() {
    const sermonsList = document.getElementById('sermons-list');
    if (!currentUser || !sermonsList) return;

    sermonsList.innerHTML = '<p class="text-gray-400 text-sm">Carregando sermões...</p>';

    try {
        const q = query(
            collection(db, "sermons"), 
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        sermonsList.innerHTML = '';

        if (querySnapshot.empty) {
            sermonsList.innerHTML = '<p class="text-gray-400 text-sm">Nenhum sermão salvo ainda.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = "bg-gray-800 p-4 rounded-lg border border-gray-700 mb-3 shadow-sm";
            card.innerHTML = `
                <h3 class="font-bold text-lg text-amber-400">${data.title}</h3>
                <p class="text-xs text-gray-400 mb-2">${data.category || 'Geral'} • ${data.references || ''}</p>
                <p class="text-sm text-gray-300 line-clamp-2">${data.content}</p>
            `;
            sermonsList.appendChild(card);
        });
    } catch (error) {
        console.error("Erro ao carregar sermões:", error);
        sermonsList.innerHTML = '<p class="text-red-400 text-sm">Erro ao carregar lista de sermões.</p>';
    }
}
