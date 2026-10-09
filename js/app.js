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

// AUTENTICAÇÃO
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

// BUSCA DA BÍBLIA COM TRATAMENTO DIRETO
document.addEventListener('click', async (e) => {
    const target = e.target;
    
    // Verifica se o elemento clicado é o botão de busca
    if (target && (target.innerText?.trim().toLowerCase() === 'buscar' || target.id === 'search-bible-btn')) {
        e.preventDefault();

        // Procura a caixa de texto da referência
        const inputRef = document.querySelector('input[placeholder*="joao"], input[placeholder*="joão"]') || 
                         Array.from(document.querySelectorAll('input')).find(i => i.value.trim().length > 0);

        if (!inputRef || !inputRef.value.trim()) {
            alert("Digite a referência bíblica (ex: joao 3:16)");
            return;
        }

        const rawRef = inputRef.value.trim();
        const cleanRef = rawRef.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Procura a área para avisar o utilizador
        let loadingText = document.getElementById('bible-loading-msg');
        if (!loadingText) {
            loadingText = document.createElement('p');
            loadingText.id = 'bible-loading-msg';
            loadingText.className = 'text-xs text-amber-400 mt-2 text-center';
            target.parentElement.appendChild(loadingText);
        }

        loadingText.innerText = "Carregando versículo...";
        target.disabled = true;

        try {
            // Requisição com tradução em Português (almeida)
            const response = await fetch(`https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=almeida`);
            
            if (!response.ok) {
                throw new Error("Versículo não encontrado");
            }

            const data = await response.json();
            
            if (data && data.text) {
                loadingText.innerText = ""; // Limpa a mensagem de carregamento
                
                const formattedVerse = `\n\n📖 ${data.reference} (Almeida)\n"${data.text.trim()}"\n`;
                
                // Insere na caixa de texto do sermão
                const editor = document.querySelector('textarea');
                if (editor) {
                    editor.value += formattedVerse;
                    alert(`Versículo ${data.reference} inserido com sucesso!`);
                } else {
                    alert(`${data.reference}:\n\n${data.text.trim()}`);
                }
            } else {
                loadingText.innerText = "⚠️ Referência não encontrada.";
            }
        } catch (err) {
            console.error(err);
            loadingText.innerText = "⚠️ Erro ao procurar versículo. Verifique a referência.";
        } finally {
            target.disabled = false;
        }
    }
});

// FIRESTORE: SALVAR E CARREGAR
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
            console.error("Erro ao salvar:", error);
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
            sermonsList.innerHTML = '<p class="text-gray-400 text-sm">Nenhum sermão salvo.</p>';
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
