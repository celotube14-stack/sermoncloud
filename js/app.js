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
    apiKey: "AIzaSyD-SUAS_CHAVE_AQUI", // Insira sua API Key se necessário
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
// 1. AUTENTICAÇÃO GOOGLE
// ==========================================

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            alert("Falha na autenticação: " + error.message);
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
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
        if (authSection) authSection.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    }
});

// ==========================================
// 2. BUSCA DA BÍBLIA EM PORTUGUÊS (CORRIGIDO)
// ==========================================

async function fetchBibleVerse(reference) {
    try {
        // Formata a referência para a URL da API (ex: Joao 3:16)
        const encodedRef = encodeURIComponent(reference.trim());
        const response = await fetch(`https://bible-api.com/${encodedRef}?translation=almeida`);
        
        if (!response.ok) {
            throw new Error("Não foi possível encontrar a referência digitada.");
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro na busca do versículo:", error);
        return null;
    }
}

// Evento de clique para buscar o versículo
const searchBibleBtn = document.getElementById('search-bible-btn');
if (searchBibleBtn) {
    searchBibleBtn.addEventListener('click', async () => {
        const refInput = document.getElementById('sermon-references') || document.getElementById('bible-reference-input');
        const outputArea = document.getElementById('sermon-content');
        
        if (!refInput || !refInput.value.trim()) {
            alert("Digite a referência no campo (ex: João 3:16 ou Sl 23:1)");
            return;
        }

        // Feedback visual enquanto carrega
        const originalText = searchBibleBtn.innerText;
        searchBibleBtn.innerText = "Buscando...";
        searchBibleBtn.disabled = true;

        const data = await fetchBibleVerse(refInput.value);

        if (data && data.text) {
            const verseFormatted = `\n\n📖 ${data.reference} (Almeida)\n"${data.text.trim()}"\n`;
            if (outputArea) {
                outputArea.value += verseFormatted;
            }
        } else {
            alert("Não foi possível carregar o versículo. Verifique se o nome do livro e capítulo estão corretos.");
        }

        // Restaura o botão
        searchBibleBtn.innerText = originalText;
        searchBibleBtn.disabled = false;
    });
}

// ==========================================
// 3. GESTÃO DE SERMÕES (FIRESTORE)
// ==========================================

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
