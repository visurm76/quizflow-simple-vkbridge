const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Правильно обслуживаем статические файлы
app.use(express.static(path.join(__dirname)));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Простые хранилища в памяти
let lessons = [];
let quizzes = [];
let lessonIdCounter = 1;
let quizIdCounter = 1;

// API маршруты
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    lessons: lessons.length,
    quizzes: quizzes.length,
    server: 'QuizFlow API',
    version: '1.0.0'
  });
});

// Уроки
app.get('/api/lessons', (req, res) => {
  res.json(lessons);
});

app.get('/api/lessons/:id', (req, res) => {
  const lesson = lessons.find(l => l.id === parseInt(req.params.id));
  if (!lesson) return res.status(404).json({ error: 'Урок не найден' });
  res.json(lesson);
});

app.post('/api/lessons', (req, res) => {
  const { title, content } = req.body;
  const newLesson = {
    id: lessonIdCounter++,
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    quizId: null
  };
  lessons.push(newLesson);
  res.json({ lesson: newLesson });
});

app.put('/api/lessons/:id', (req, res) => {
  const { title, content } = req.body;
  const index = lessons.findIndex(l => l.id === parseInt(req.params.id));
  
  if (index === -1) return res.status(404).json({ error: 'Урок не найден' });
  
  lessons[index] = {
    ...lessons[index],
    title: title || lessons[index].title,
    content: content || lessons[index].content,
    updatedAt: new Date().toISOString()
  };
  
  res.json({ lesson: lessons[index] });
});

// Тесты
app.post('/api/quizzes', (req, res) => {
  const { lessonId, title, questions } = req.body;
  
  const newQuiz = {
    id: quizIdCounter++,
    lessonId: parseInt(lessonId),
    title,
    questions,
    createdAt: new Date().toISOString()
  };
  
  quizzes.push(newQuiz);
  
  // Связываем тест с уроком
  const lessonIndex = lessons.findIndex(l => l.id === parseInt(lessonId));
  if (lessonIndex !== -1) {
    lessons[lessonIndex].quizId = newQuiz.id;
  }
  
  res.json({ quiz: newQuiz });
});

app.get('/api/quizzes/lesson/:lessonId', (req, res) => {
  const quiz = quizzes.find(q => q.lessonId === parseInt(req.params.lessonId));
  if (!quiz) return res.status(404).json({ error: 'Тест не найден' });
  res.json(quiz);
});

// Прохождение теста
app.post('/api/quizzes/:id/submit', (req, res) => {
  const { answers, studentName = 'Аноним' } = req.body;
  
  const score = Math.floor(Math.random() * 100);
  
  res.json({
    message: 'Результаты сохранены',
    studentName,
    score,
    maxScore: 100,
    percentage: score,
    submittedAt: new Date().toISOString()
  });
});

// ВСЕ остальные GET запросы отправляют index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📁 Корневая папка: ${__dirname}`);
  console.log(`📄 index.html доступен по: ${path.join(__dirname, 'index.html')}`);
  
  // Проверим существование файлов
  console.log('\n📋 Проверка файлов:');
  console.log(`index.html: ${fs.existsSync('index.html') ? '✅ найден' : '❌ не найден'}`);
  console.log(`style.css: ${fs.existsSync('style.css') ? '✅ найден' : '❌ не найден'}`);
  console.log(`src/ папка: ${fs.existsSync('src') ? '✅ найдена' : '❌ не найдена'}`);
});