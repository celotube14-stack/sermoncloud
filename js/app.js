async function searchBible(referenceText) {
    try {
        // 1. Limpa acentos e converte espaços/dois pontos para formato limpo
        const cleanRef = referenceText
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/\s+/g, ' ');

        // 2. Garante o uso da tradução 'almeida' suportada pela API
        const url = `https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=almeida`;

        const response = await fetch(url, { method: 'GET' });
        
        if (!response.ok) {
            throw new Error("Referência não encontrada.");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro na requisição da Bíblia:", error);
        return null;
    }
}
