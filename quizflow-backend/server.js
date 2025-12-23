const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quizflow', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB подключен'))
.catch(err => console.error('❌ Ошибка подключения MongoDB:', err));

// Модели
const Lesson = require('./models/Lesson');
const Quiz = require('./models/Quiz');

// Маршруты
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/quizzes', require('./routes/quizzes'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'QuizFlow Backend работает',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Подключен' : 'Отключен'
    });
});

// Для production: отдаем frontend
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../quizflow-frontend/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../quizflow-frontend/build', 'index.html'));
    });
}

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Что-то пошло не так!' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Backend сервер запущен на http://localhost:${PORT}`);
    console.log(`📡 API доступен по http://localhost:${PORT}/api/`);
});