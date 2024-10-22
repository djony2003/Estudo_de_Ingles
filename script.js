let phrases = []; // Armazena as frases para filtrar e gerar CSV
let categories = []; // Armazena as categorias cadastradas
let fileHandle; // Variável para armazenar o arquivo carregado
let loadedFileName = ''; // Nome do arquivo CSV carregado

document.addEventListener('DOMContentLoaded', () => {
    loadCategories(); // Carrega as categorias ao iniciar
    loadPhrases(); // Carrega as frases (se necessário)
});

// Função para adicionar uma nova categoria
function addCategory() {
    const newCategory = prompt('Digite o nome da nova categoria:');

    if (newCategory && !categories.includes(newCategory)) {
        categories.push(newCategory);
        saveCategories();
        updateCategorySelect();
    } else if (categories.includes(newCategory)) {
        alert('Esta categoria já está cadastrada.');
    }
}

function updateCategorySelect() {
    const categorySelect = document.getElementById('category-select');
    categorySelect.innerHTML = '<option value="" disabled selected>Selecione uma categoria</option>';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
}

function loadCategories() {
    const savedCategories = localStorage.getItem('categories');
    categories = savedCategories ? JSON.parse(savedCategories) : ['Saudação', 'Pergunta', 'Expressão Comum'];
    updateCategorySelect();
}

async function translatePhrase() {
    const phrasePt = document.getElementById('phrase-pt').value;
    const category = document.getElementById('category-select').value;

    if (!phrasePt || !category) {
        alert('Por favor, insira uma frase em Português e selecione a categoria!');
        return;
    }

    try {
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=en&dt=t&q=${encodeURIComponent(phrasePt)}`);
        if (!response.ok) throw new Error(`Erro na resposta da API: ${response.status} ${response.statusText}`);

        const data = await response.json();
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            const translatedText = data[0][0][0];
            document.getElementById('phrase-en').value = translatedText; // Preenche o campo editável com a tradução
        } else {
            throw new Error('Resposta inválida da API.');
        }
    } catch (error) {
        console.error('Erro ao traduzir:', error);
        alert(`Erro ao traduzir a frase: ${error.message}`);
    }
}

function acceptAndAddPhrase() {
    const category = document.getElementById('category-select').value;
    const phrasePt = document.getElementById('phrase-pt').value;
    const phraseEn = document.getElementById('phrase-en').value;

    if (!category || !phrasePt || !phraseEn) {
        alert('Por favor, preencha todos os campos antes de adicionar a frase!');
        return;
    }

    addPhrase(category, phrasePt, phraseEn);
    clearInputFields();
}


function addPhrase(category, phrasePt, phraseEn) {
    const table = document.getElementById('phrases-table').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();

    newRow.setAttribute('data-category', category);
    newRow.innerHTML = `
        <td>${phrasePt}</td>
        <td>${phraseEn}</td>
        <td><button onclick="playAudio('${phraseEn.replace(/'/g, "\\'")}')">Play</button></td>
    `;

    phrases.push({ category, phrasePt, phraseEn });
}


function generateCSV() {
    if (phrases.length === 0) {
        alert('Nenhuma frase para gerar o CSV.');
        return;
    }

    // Cabeçalho do CSV
    let csvContent = '\uFEFFCategoria;Português;Inglês\n'; // Adiciona o BOM para UTF-8

    // Adiciona cada frase no CSV
    phrases.forEach(({ category, phrasePt, phraseEn }) => {
        csvContent += `"${category}";"${phrasePt}";"${phraseEn}"\n`;
    });

    // Codifica o CSV e prepara para download
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'frases.csv');
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
}

function playAudio(phraseEn) {
    const utterance = new SpeechSynthesisUtterance(phraseEn);
    utterance.lang = 'en-US';
    const speed = parseFloat(document.getElementById('audio-speed').value);
    utterance.rate = speed;
    speechSynthesis.speak(utterance);
}

function clearInputFields() {
    document.getElementById('category-select').value = '';
    document.getElementById('phrase-pt').value = '';
    document.getElementById('phrase-en').value = '';
}

function updateCategoryFilter(newCategory) {
    const filterSelect = document.getElementById('filter-category');
    const existingOption = Array.from(filterSelect.options).some(option => option.value === newCategory);

    if (!existingOption) {
        const option = document.createElement('option');
        option.value = newCategory;
        option.textContent = newCategory;
        filterSelect.appendChild(option);
    }
}

function filterPhrases() {
    const selectedCategory = document.getElementById('filter-category').value;
    const rows = document.querySelectorAll('#phrases-table tbody tr');

    rows.forEach(row => {
        const rowCategory = row.getAttribute('data-category');
        row.style.display = (selectedCategory === 'all' || rowCategory === selectedCategory) ? '' : 'none';
    });
}

document.getElementById('filter-category').addEventListener('change', filterPhrases);

function loadPhrases() {
    // Esta função pode carregar frases armazenadas, se necessário
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) {
        alert('Nenhum arquivo selecionado.');
        return;
    }

    const reader = new FileReader();

    // Força a leitura do arquivo em UTF-8
    reader.onload = function(e) {
        const content = e.target.result.trim();
        const rows = content.split('\n'); // Divide em linhas

        if (rows.length <= 1) {
            alert('O arquivo CSV está vazio ou não é válido.');
            return;
        }

        // Limpa a tabela de frases e o array de frases
        phrases = [];
        clearPhrasesTable();

        // Processa cada linha do arquivo CSV, ignorando o cabeçalho
        rows.slice(1).forEach(row => {
            const columns = row.split(';').map(col => col.replace(/^"|"$/g, '').trim());

            if (columns.length >= 3) {
                const category = columns[0];
                const phrasePt = columns[1];
                const phraseEn = columns[2];

                // Adiciona a frase à tabela e ao array de frases
                if (category && phrasePt && phraseEn) {
                    addPhrase(category, phrasePt, phraseEn);

                    // Adiciona a categoria se não existir
                    if (!categories.includes(category)) {
                        categories.push(category);
                        updateCategorySelect();
                    }
                }
            }
        });

        updateCategoryFilter('all');
        alert('Arquivo CSV carregado com sucesso!');
    };

    reader.onerror = function() {
        alert('Erro ao ler o arquivo CSV.');
    };

    // Define explicitamente a leitura em UTF-8
    reader.readAsText(file, 'UTF-8');
}

// Função para limpar a tabela de frases
function clearPhrasesTable() {
    const tableBody = document.getElementById('phrases-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Limpa todas as linhas da tabela
}

// Função para adicionar frases à tabela
function addPhrase(category, phrasePt, phraseEn) {
    const table = document.getElementById('phrases-table').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();

    newRow.setAttribute('data-category', category);
    newRow.innerHTML = `
        <td>${phrasePt}</td>
        <td>${phraseEn}</td>
        <td><button onclick="playAudio('${phraseEn}')">Play</button></td>
    `;

    phrases.push({ category, phrasePt, phraseEn });
}


async function saveToFileSystem() {
    if (!fileHandle) {
        alert('Nenhum arquivo carregado para salvar.');
        return;
    }

    if (phrases.length === 0) {
        alert('Nenhuma frase para salvar.');
        return;
    }

    let csvContent = "Categoria;Português;Inglês\n";

    phrases.forEach(({ category, phrasePt, phraseEn }) => {
        csvContent += `"${category}";"${phrasePt}";"${phraseEn}"\n`;
    });

    try {
        const writable = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();

        alert('Arquivo CSV salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar o arquivo:', error);
        alert('Erro ao salvar o arquivo CSV.');
    }
}
