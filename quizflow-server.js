const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000; // Единый порт для всего

// Middleware
app.use(cors());
app.use(express.json());

// =================== БАЗА ДАННЫХ SQLite ===================
const db = new sqlite3.Database('./quizflow.db', (err) => {
    if (err) {
        console.error('❌ Ошибка SQLite:', err.message);
    } else {
        console.log('✅ База данных SQLite подключена');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Таблица уроков
    db.run(`
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content_html TEXT,
            content_text TEXT,
            content_media TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица тестов
    db.run(`
        CREATE TABLE IF NOT EXISTS quizzes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lesson_id INTEGER,
            title TEXT NOT NULL,
            questions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log('✅ Таблицы созданы');
}

// =================== API МАРШРУТЫ ===================

// Health check
app.get('/api/health', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM lessons', (err, row) => {
        res.json({
            status: 'OK',
            message: 'QuizFlow Server работает',
            timestamp: new Date().toISOString(),
            database: 'SQLite',
            lessons: row?.count || 0,
            port: PORT
        });
    });
});

// Получить все уроки
app.get('/api/lessons', (req, res) => {
    db.all('SELECT * FROM lessons ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const lessons = rows.map(row => ({
            id: row.id,
            title: row.title,
            content: {
                html: row.content_html || '',
                text: row.content_text || '',
                media: row.content_media ? JSON.parse(row.content_media) : []
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
        
        res.json(lessons);
    });
});

// Получить урок по ID
app.get('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    
    db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        const lesson = {
            id: row.id,
            title: row.title,
            content: {
                html: row.content_html || '',
                text: row.content_text || '',
                media: row.content_media ? JSON.parse(row.content_media) : []
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
        
        res.json(lesson);
    });
});

// Создать новый урок
app.post('/api/lessons', (req, res) => {
    const { title, content } = req.body;
    
    db.run(
        'INSERT INTO lessons (title, content_html, content_text, content_media) VALUES (?, ?, ?, ?)',
        [
            title || 'Новый урок',
            content?.html || '<p>Начните писать здесь...</p>',
            content?.text || 'Новый урок',
            JSON.stringify(content?.media || [])
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            db.get('SELECT * FROM lessons WHERE id = ?', [this.lastID], (err, row) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const lesson = {
                    id: row.id,
                    title: row.title,
                    content: {
                        html: row.content_html,
                        text: row.content_text,
                        media: row.content_media ? JSON.parse(row.content_media) : []
                    },
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
                
                res.status(201).json({ lesson });
            });
        }
    );
});

// Обновить урок
app.put('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    const { title, content } = req.body;
    
    db.run(
        'UPDATE lessons SET title = ?, content_html = ?, content_text = ?, content_media = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
            title,
            content?.html || '',
            content?.text || '',
            JSON.stringify(content?.media || []),
            lessonId
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Урок не найден' });
            }
            
            db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, row) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const lesson = {
                    id: row.id,
                    title: row.title,
                    content: {
                        html: row.content_html,
                        text: row.content_text,
                        media: row.content_media ? JSON.parse(row.content_media) : []
                    },
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
                
                res.json({ lesson });
            });
        }
    );
});

// Тесты
app.post('/api/quizzes', (req, res) => {
    const { lessonId, title, questions } = req.body;
    
    db.run(
        'INSERT INTO quizzes (lesson_id, title, questions) VALUES (?, ?, ?)',
        [lessonId, title, JSON.stringify(questions || [])],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.status(201).json({
                quiz: {
                    id: this.lastID,
                    lessonId,
                    title,
                    questions: questions || []
                }
            });
        }
    );
});

app.get('/api/quizzes/lesson/:lessonId', (req, res) => {
    const lessonId = req.params.lessonId;
    
    db.get('SELECT * FROM quizzes WHERE lesson_id = ?', [lessonId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        res.json({
            id: row.id,
            lessonId: row.lesson_id,
            title: row.title,
            questions: row.questions ? JSON.parse(row.questions) : []
        });
    });
});

// =================== СТАТИЧЕСКИЕ ФАЙЛЫ ===================

// Обслуживаем все статические файлы
app.use(express.static(__dirname));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Для загрузки файлов
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// =================== FRONTEND ===================

// Все остальные GET запросы отправляют index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =================== ЗАПУСК ===================

app.listen(PORT, () => {
    console.log(`
    🚀 QUIZFLOW PLATFORM ЗАПУЩЕНА
    ==================================
    📍 Адрес: http://localhost:${PORT}
    📡 API:    http://localhost:${PORT}/api/
    💾 БД:     SQLite (quizflow.db)
    ==================================
    
    📋 Проверка файлов:
    ${fs.existsSync('index.html') ? '✅ index.html' : '❌ index.html'}
    ${fs.existsSync('style.css') ? '✅ style.css' : '❌ style.css'}
    ${fs.existsSync('src/') ? '✅ src/ папка' : '❌ src/ папка'}
    
    📌 Для проверки API откройте:
        http://localhost:${PORT}/api/health
    
    📌 Для работы с приложением откройте:
        http://localhost:${PORT}
    `);
});