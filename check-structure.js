const fs = require('fs');
const path = require('path');

console.log('📁 Проверка структуры проекта:');
console.log('==============================\n');

const files = [
    { name: 'index.html', required: true },
    { name: 'style.css', required: false },
    { name: 'quizflow-server.js', required: true },
    { name: 'src/api.js', required: true },
    { name: 'src/app.js', required: true },
    { name: 'src/editor.js', required: true },
    { name: 'src/quiz.js', required: true }
];

let allOk = true;

files.forEach(file => {
    const exists = fs.existsSync(file.name);
    const status = exists ? '✅' : file.required ? '❌' : '⚠️';
    const message = exists ? 'найден' : file.required ? 'ОБЯЗАТЕЛЕН!' : 'не найден (опционально)';
    
    console.log(`${status} ${file.name} - ${message}`);
    
    if (file.required && !exists) {
        allOk = false;
    }
});

console.log('\n📦 Проверка папок:');
const folders = ['src', 'uploads'];
folders.forEach(folder => {
    const exists = fs.existsSync(folder);
    console.log(`${exists ? '✅' : '📁'} ${folder}/ ${exists ? '' : '(будет создана при запуске)'}`);
});

console.log('\n' + (allOk ? '✅ Все файлы на месте!' : '⚠️ Некоторые файлы отсутствуют'));

if (!allOk) {
    console.log('\n🛠 Создаем недостающие файлы...');
    
    // Создаем папки
    folders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
            console.log(`📁 Создана папка: ${folder}/`);
        }
    });
    
    // Проверяем и создаем основные файлы
    if (!fs.existsSync('quizflow-server.js')) {
        console.log('❌ quizflow-server.js не найден!');
        console.log('👉 Создайте его с кодом из шага 1');
    }
}