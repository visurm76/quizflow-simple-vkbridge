const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// Создаем папку uploads если ее нет
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Инициализация базы данных SQLite
const db = new sqlite3.Database('./quizflow.db', (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        initializeDatabase();
    }
});

// Создаем таблицы
function initializeDatabase() {
    // Таблица уроков
    db.run(`
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content_html TEXT,
            content_text TEXT,
            content_media TEXT,
            is_published BOOLEAN DEFAULT 0,
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
            time_limit INTEGER,
            passing_score INTEGER DEFAULT 70,
            attempts INTEGER DEFAULT 1,
            is_published BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        )
    `);

    // Таблица загруженных файлов
    db.run(`
        CREATE TABLE IF NOT EXISTS media_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            originalname TEXT NOT NULL,
            mimetype TEXT,
            size INTEGER,
            url TEXT NOT NULL,
            type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Таблица результатов тестов
    db.run(`
        CREATE TABLE IF NOT EXISTS quiz_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER,
            student_name TEXT,
            score INTEGER,
            max_score INTEGER,
            percentage INTEGER,
            answers TEXT,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        )
    `);

    console.log('✅ Таблицы созданы/проверены');
}

// =================== API МАРШРУТЫ ===================

// Health check
app.get('/api/health', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM lessons', (err, row) => {
        res.json({
            status: 'OK',
            message: 'SQLite Backend работает',
            timestamp: new Date().toISOString(),
            database: 'SQLite',
            lessons_count: row?.count || 0,
            version: '1.0.0'
        });
    });
});

// =================== УРОКИ ===================

// GET все уроки
app.get('/api/lessons', (req, res) => {
    db.all(`
        SELECT l.*, 
               (SELECT COUNT(*) FROM quizzes WHERE lesson_id = l.id) as has_quiz
        FROM lessons l
        ORDER BY created_at DESC
    `, (err, rows) => {
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
            isPublished: row.is_published === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            hasQuiz: row.has_quiz > 0
        }));
        
        res.json(lessons);
    });
});

// GET урок по ID
app.get('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    
    db.get(`
        SELECT l.*, 
               (SELECT COUNT(*) FROM quizzes WHERE lesson_id = l.id) as has_quiz
        FROM lessons l
        WHERE id = ?
    `, [lessonId], (err, row) => {
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
            isPublished: row.is_published === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            hasQuiz: row.has_quiz > 0
        };
        
        res.json(lesson);
    });
});

// POST создать урок
app.post('/api/lessons', (req, res) => {
    const { title, content } = req.body;
    
    const contentHtml = content?.html || '<p>Новый урок</p>';
    const contentText = content?.text || 'Новый урок';
    const contentMedia = JSON.stringify(content?.media || []);
    
    db.run(`
        INSERT INTO lessons (title, content_html, content_text, content_media, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `, [title, contentHtml, contentText, contentMedia], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Получаем созданный урок
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
                isPublished: row.is_published === 1,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            
            res.status(201).json({ lesson });
        });
    });
});

// PUT обновить урок
app.put('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    const { title, content, isPublished } = req.body;
    
    let updateFields = [];
    let values = [];
    
    if (title !== undefined) {
        updateFields.push('title = ?');
        values.push(title);
    }
    
    if (content?.html !== undefined) {
        updateFields.push('content_html = ?');
        values.push(content.html);
    }
    
    if (content?.text !== undefined) {
        updateFields.push('content_text = ?');
        values.push(content.text);
    }
    
    if (content?.media !== undefined) {
        updateFields.push('content_media = ?');
        values.push(JSON.stringify(content.media));
    }
    
    if (isPublished !== undefined) {
        updateFields.push('is_published = ?');
        values.push(isPublished ? 1 : 0);
    }
    
    // Всегда обновляем updated_at
    updateFields.push("updated_at = datetime('now')");
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'Нет полей для обновления' });
    }
    
    values.push(lessonId);
    
    const sql = `UPDATE lessons SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.run(sql, values, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        // Получаем обновленный урок
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
                isPublished: row.is_published === 1,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            
            res.json({ lesson });
        });
    });
});

// DELETE удалить урок
app.delete('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    
    db.run('DELETE FROM lessons WHERE id = ?', [lessonId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        // Удаляем связанные тесты
        db.run('DELETE FROM quizzes WHERE lesson_id = ?', [lessonId]);
        
        res.json({ message: 'Урок удален' });
    });
});

// =================== ТЕСТЫ ===================

// GET все тесты
app.get('/api/quizzes', (req, res) => {
    db.all(`
        SELECT q.*, l.title as lesson_title
        FROM quizzes q
        LEFT JOIN lessons l ON q.lesson_id = l.id
        ORDER BY q.created_at DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const quizzes = rows.map(row => ({
            id: row.id,
            lessonId: row.lesson_id,
            title: row.title,
            questions: row.questions ? JSON.parse(row.questions) : [],
            timeLimit: row.time_limit,
            passingScore: row.passing_score,
            attempts: row.attempts,
            isPublished: row.is_published === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lessonTitle: row.lesson_title
        }));
        
        res.json(quizzes);
    });
});

// GET тест по ID урока
app.get('/api/quizzes/lesson/:lessonId', (req, res) => {
    const lessonId = req.params.lessonId;
    
    db.get(`
        SELECT q.*, l.title as lesson_title
        FROM quizzes q
        LEFT JOIN lessons l ON q.lesson_id = l.id
        WHERE q.lesson_id = ?
    `, [lessonId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        const quiz = {
            id: row.id,
            lessonId: row.lesson_id,
            title: row.title,
            questions: row.questions ? JSON.parse(row.questions) : [],
            timeLimit: row.time_limit,
            passingScore: row.passing_score,
            attempts: row.attempts,
            isPublished: row.is_published === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lessonTitle: row.lesson_title
        };
        
        res.json(quiz);
    });
});

// POST создать тест
app.post('/api/quizzes', (req, res) => {
    const { lessonId, title, questions } = req.body;
    
    // Проверяем существование урока
    db.get('SELECT id FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        // Проверяем, нет ли уже теста для этого урока
        db.get('SELECT id FROM quizzes WHERE lesson_id = ?', [lessonId], (err, existingQuiz) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (existingQuiz) {
                return res.status(400).json({ error: 'Для этого урока уже создан тест' });
            }
            
            const questionsJson = JSON.stringify(questions || []);
            
            db.run(`
                INSERT INTO quizzes (lesson_id, title, questions, updated_at)
                VALUES (?, ?, ?, datetime('now'))
            `, [lessonId, title, questionsJson], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Получаем созданный тест
                db.get(`
                    SELECT q.*, l.title as lesson_title
                    FROM quizzes q
                    LEFT JOIN lessons l ON q.lesson_id = l.id
                    WHERE q.id = ?
                `, [this.lastID], (err, row) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const quiz = {
                        id: row.id,
                        lessonId: row.lesson_id,
                        title: row.title,
                        questions: row.questions ? JSON.parse(row.questions) : [],
                        timeLimit: row.time_limit,
                        passingScore: row.passing_score,
                        attempts: row.attempts,
                        isPublished: row.is_published === 1,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        lessonTitle: row.lesson_title
                    };
                    
                    res.status(201).json({ quiz });
                });
            });
        });
    });
});

// PUT обновить тест
app.put('/api/quizzes/:id', (req, res) => {
    const quizId = req.params.id;
    const { title, questions, timeLimit, passingScore, attempts, isPublished } = req.body;
    
    let updateFields = [];
    let values = [];
    
    if (title !== undefined) {
        updateFields.push('title = ?');
        values.push(title);
    }
    
    if (questions !== undefined) {
        updateFields.push('questions = ?');
        values.push(JSON.stringify(questions));
    }
    
    if (timeLimit !== undefined) {
        updateFields.push('time_limit = ?');
        values.push(timeLimit);
    }
    
    if (passingScore !== undefined) {
        updateFields.push('passing_score = ?');
        values.push(passingScore);
    }
    
    if (attempts !== undefined) {
        updateFields.push('attempts = ?');
        values.push(attempts);
    }
    
    if (isPublished !== undefined) {
        updateFields.push('is_published = ?');
        values.push(isPublished ? 1 : 0);
    }
    
    // Всегда обновляем updated_at
    updateFields.push("updated_at = datetime('now')");
    
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'Нет полей для обновления' });
    }
    
    values.push(quizId);
    
    const sql = `UPDATE quizzes SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.run(sql, values, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        // Получаем обновленный тест
        db.get(`
            SELECT q.*, l.title as lesson_title
            FROM quizzes q
            LEFT JOIN lessons l ON q.lesson_id = l.id
            WHERE q.id = ?
        `, [quizId], (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const quiz = {
                id: row.id,
                lessonId: row.lesson_id,
                title: row.title,
                questions: row.questions ? JSON.parse(row.questions) : [],
                timeLimit: row.time_limit,
                passingScore: row.passing_score,
                attempts: row.attempts,
                isPublished: row.is_published === 1,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                lessonTitle: row.lesson_title
            };
            
            res.json({ quiz });
        });
    });
});

// DELETE удалить тест
app.delete('/api/quizzes/:id', (req, res) => {
    const quizId = req.params.id;
    
    db.run('DELETE FROM quizzes WHERE id = ?', [quizId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        // Удаляем результаты этого теста
        db.run('DELETE FROM quiz_results WHERE quiz_id = ?', [quizId]);
        
        res.json({ message: 'Тест удален' });
    });
});

// POST отправить ответы на тест
app.post('/api/quizzes/:id/submit', (req, res) => {
    const quizId = req.params.id;
    const { answers, studentName = 'Аноним' } = req.body;
    
    // Получаем тест
    db.get('SELECT * FROM quizzes WHERE id = ?', [quizId], (err, quizRow) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!quizRow) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        const questions = quizRow.questions ? JSON.parse(quizRow.questions) : [];
        
        // Подсчет результатов
        let score = 0;
        let maxScore = 0;
        const results = [];
        
        questions.forEach((question, index) => {
            maxScore += question.points || 1;
            
            const userAnswer = answers.find(a => a.questionIndex === index);
            let isCorrect = false;
            
            if (userAnswer) {
                if (question.type === 'multiple') {
                    const correctAnswers = question.answers
                        .filter(a => a.isCorrect)
                        .map(a => a.id);
                    
                    const userAnswers = userAnswer.answers || [];
                    
                    // Сравниваем отсортированные массивы
                    isCorrect = JSON.stringify(correctAnswers.sort()) === 
                               JSON.stringify(userAnswers.sort());
                } else {
                    const correctAnswer = question.answers.find(a => a.isCorrect);
                    isCorrect = correctAnswer && 
                               userAnswer.answer === correctAnswer.id;
                }
                
                if (isCorrect) {
                    score += question.points || 1;
                }
            }
            
            results.push({
                questionIndex: index,
                questionText: question.text,
                isCorrect,
                correctAnswers: question.answers.filter(a => a.isCorrect).map(a => a.text)
            });
        });
        
        const percentage = Math.round((score / maxScore) * 100);
        const passingScore = quizRow.passing_score || 70;
        const passed = percentage >= passingScore;
        
        // Сохраняем результат в базу
        const resultData = {
            score,
            maxScore,
            percentage,
            results,
            answers: answers
        };
        
        db.run(`
            INSERT INTO quiz_results (quiz_id, student_name, score, max_score, percentage, answers)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [quizId, studentName, score, maxScore, percentage, JSON.stringify(resultData)], function(err) {
            if (err) {
                console.error('Ошибка сохранения результата:', err);
            }
            
            res.json({
                studentName,
                score,
                maxScore,
                percentage,
                passed,
                results,
                quizTitle: quizRow.title,
                passingScore: passingScore,
                submittedAt: new Date().toISOString(),
                resultId: this.lastID
            });
        });
    });
});

// =================== ЗАГРУЗКА ФАЙЛОВ ===================

// POST загрузить файл
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.split('/')[0];
        
        // Сохраняем информацию о файле в базу
        db.run(`
            INSERT INTO media_files (filename, originalname, mimetype, size, url, type)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            fileUrl,
            fileType
        ]);
        
        res.json({
            message: 'Файл успешно загружен',
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: fileUrl,
            type: fileType
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET список загруженных файлов
app.get('/api/upload', (req, res) => {
    db.all('SELECT * FROM media_files ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const files = rows.map(row => ({
            id: row.id,
            filename: row.filename,
            originalname: row.originalname,
            mimetype: row.mimetype,
            size: row.size,
            url: row.url,
            type: row.type,
            createdAt: row.created_at
        }));
        
        res.json(files);
    });
});

// DELETE удалить файл
app.delete('/api/upload/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    // Удаляем файл с диска
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    
    // Удаляем запись из базы
    db.run('DELETE FROM media_files WHERE filename = ?', [filename], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Файл удален' });
    });
});

// =================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ===================

// GET статистика
app.get('/api/stats', (req, res) => {
    db.serialize(() => {
        const stats = {};
        
        db.get('SELECT COUNT(*) as count FROM lessons', (err, row) => {
            if (!err) stats.lessons = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM quizzes', (err, row) => {
            if (!err) stats.quizzes = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM media_files', (err, row) => {
            if (!err) stats.mediaFiles = row.count;
        });
        
        db.get('SELECT COUNT(*) as count FROM quiz_results', (err, row) => {
            if (!err) stats.quizResults = row.count;
        });
        
        db.get('SELECT AVG(percentage) as avg_score FROM quiz_results', (err, row) => {
            if (!err) stats.averageScore = Math.round(row.avg_score || 0);
        });
        
        // Ждем завершения всех запросов
        setTimeout(() => {
            res.json(stats);
        }, 100);
    });
});

// GET автосохранение
app.get('/api/autosave/:lessonId', (req, res) => {
    const lessonId = req.params.lessonId;
    
    // Здесь можно реализовать автосохранение
    // Например, хранить в отдельной таблице или в памяти
    res.json({ exists: false });
});

// POST автосохранение
app.post('/api/autosave/:lessonId', (req, res) => {
    const lessonId = req.params.lessonId;
    const { content } = req.body;
    
    // Здесь можно сохранять автосохранение
    // Например, во временную таблицу
    res.json({ message: 'Автосохранение выполнено' });
});

// =================== ЗАПУСК СЕРВЕРА ===================

// Обслуживаем frontend файлы
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 SQLite Backend запущен на http://localhost:${PORT}`);
    console.log(`📡 API доступен по http://localhost:${PORT}/api/`);
    console.log(`💾 База данных: ./quizflow.db`);
    console.log(`📁 Загрузки: ./uploads/`);
    console.log('\n📋 Доступные API эндпоинты:');
    console.log('  GET  /api/health           - Проверка работы');
    console.log('  GET  /api/lessons          - Список уроков');
    console.log('  POST /api/lessons          - Создать урок');
    console.log('  GET  /api/quizzes/lesson/:id - Тест урока');
    console.log('  POST /api/quizzes          - Создать тест');
    console.log('  POST /api/upload           - Загрузить файл');
    console.log('  GET  /api/stats            - Статистика');
});
// Добавьте в server-sqlite.js
app.get('/api/backup', (req, res) => {
    const backupFile = `quizflow_backup_${Date.now()}.db`;
    fs.copyFileSync('./quizflow.db', `./backups/${backupFile}`);
    res.json({ message: 'Бэкап создан', file: backupFile });
});

app.get('/api/export', (req, res) => {
    db.all('SELECT * FROM lessons', (err, lessons) => {
        db.all('SELECT * FROM quizzes', (err, quizzes) => {
            const data = { lessons, quizzes };
            res.json(data);
        });
    });
});