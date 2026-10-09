// Importações e Configuração do Firebase
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

// Configuração do projeto SermonCloud
const firebaseConfig = {
    apiKey: "AIzaSyD-SUAS_CHAVE_AQUI", // Insira a sua API Key do Firebase se necessário
    authDomain: "sermoncloud-3cef2.firebaseapp.com",
    projectId: "sermoncloud-3cef2",
    storageBucket: "sermoncloud-3cef2.appspot.com",
    messagingSenderId: "1039977716746",
    appId: "1:1039977716746:web:sermoncloud"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Elementos do DOM
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authSection = document.getElementById('auth-section');
const mainApp = document.getElementById('main-app');
const userProfile = document.getElementById('user-profile');
const sermonForm = document.getElementById('sermon-form');
const sermonsList = document.getElementById('sermons-list');

let currentUser = null;

// ==========================================
// 1. AUTENTICAÇÃO COM GOOGLE
// ==========================================

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro ao fazer login com Google:", error);
            alert("Falha na autenticação: " + error.message);
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Usuário deslogado com sucesso.");
        });
    });
}

// Monitor de Estado de Autenticação
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // Usuário Autenticado
        if (authSection) authSection.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
        if (userProfile) {
            userProfile.innerHTML = `
                <img src="${user.photoURL}" alt="${user.displayName}" class="w-8 h-8 rounded-full border border-gray-600">
                <span class="text-sm font-medium text-gray-200">${user.displayName}</span>
            `;
        }
        loadSermons();
    } else {
        // Usuário Deslogado
        if (authSection) authSection.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    }
});

// ==========================================
// 2. BUSCA DA BÍBLIA EM PORTUGUÊS
// ==========================================

async function fetchBibleVerse(reference, translation = 'almeida') {
    try {
        // Garantir que a busca utilize a versão em português
        const formattedTranslation = translation === 'kingjames' ? 'almeida' : translation;
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=${formattedTranslation}`);
        
        if (!response.ok) throw new Error("Referência não encontrada.");
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro ao buscar texto bíblico:", error);
        return null;
    }
}

// Exemplo de integração da busca bíblica no editor
const searchBibleBtn = document.getElementById('search-bible-btn');
if (searchBibleBtn) {
    searchBibleBtn.addEventListener('click', async () => {
        const refInput = document.getElementById('bible-reference-input').value;
        const outputArea = document.getElementById('sermon-content');
        
        if (!refInput) {
            alert("Digite uma referência (ex: João 3:16)");
            return;
        }

        const data = await fetchBibleVerse(refInput, 'almeida');
        if (data && data.text) {
            outputArea.value += `\n\n📖 ${data.reference} (${data.translation_name})\n"${data.text.trim()}"\n`;
        } else {
            alert("Não foi possível carregar o texto. Verifique a referência.");
        }
    });
}

// ==========================================
// 3. GESTÃO E GRAVAÇÃO DE SERMÕES (FIRESTORE)
// ==========================================

if (sermonForm) {
    sermonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const title = document.getElementById('sermon-title').value;
        const category = document.getElementById('sermon-category').value;
        const tags = document.getElementById('sermon-tags').value.split(',').map(t => t.trim());
        const references = document.getElementById('sermon-references').value;
        const content = document.getElementById('sermon-content').value;

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
            alert("Erro ao salvar sermão.");
        }
    });
}

// Carregar Lista de Sermões
async function loadSermons() {
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
            sermonsList.innerHTML = '<p class="text-gray-400 text-sm">Nenhum sermão encontrado.</p>';
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
        sermonsList.innerHTML = '<p class="text-red-400 text-sm">Erro ao carregar sermões.</p>';
    }
}
