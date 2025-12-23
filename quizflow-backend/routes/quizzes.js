const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');

// GET все тесты
router.get('/', async (req, res) => {
    try {
        const quizzes = await Quiz.find()
            .populate('lessonId', 'title')
            .sort({ createdAt: -1 });
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET тест по ID урока
router.get('/lesson/:lessonId', async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ lessonId: req.params.lessonId })
            .populate('lessonId', 'title');
        
        if (!quiz) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET тест по ID
router.get('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id)
            .populate('lessonId', 'title');
        
        if (!quiz) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST создать тест
router.post('/', async (req, res) => {
    try {
        const { lessonId, title, questions, description, timeLimit, passingScore } = req.body;
        
        // Проверяем существование урока
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        // Проверяем, нет ли уже теста для этого урока
        const existingQuiz = await Quiz.findOne({ lessonId });
        if (existingQuiz) {
            return res.status(400).json({ error: 'Для этого урока уже создан тест' });
        }
        
        const quiz = new Quiz({
            lessonId,
            title,
            questions,
            description,
            timeLimit,
            passingScore
        });
        
        await quiz.save();
        res.status(201).json(quiz);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT обновить тест
router.put('/:id', async (req, res) => {
    try {
        const { title, questions, description, timeLimit, passingScore, attempts, isPublished } = req.body;
        
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        if (title !== undefined) quiz.title = title;
        if (questions !== undefined) quiz.questions = questions;
        if (description !== undefined) quiz.description = description;
        if (timeLimit !== undefined) quiz.timeLimit = timeLimit;
        if (passingScore !== undefined) quiz.passingScore = passingScore;
        if (attempts !== undefined) quiz.attempts = attempts;
        if (isPublished !== undefined) quiz.isPublished = isPublished;
        
        await quiz.save();
        res.json(quiz);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE удалить тест
router.delete('/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndDelete(req.params.id);
        if (!quiz) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        res.json({ message: 'Тест удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST отправить ответы на тест
router.post('/:id/submit', async (req, res) => {
    try {
        const { answers, studentName = 'Аноним' } = req.body;
        const quiz = await Quiz.findById(req.params.id);
        
        if (!quiz) {
            return res.status(404).json({ error: 'Тест не найден' });
        }
        
        // Подсчет результатов
        let score = 0;
        let maxScore = 0;
        const results = [];
        
        quiz.questions.forEach((question, index) => {
            maxScore += question.points || 1;
            
            const userAnswer = answers.find(a => a.questionIndex === index);
            let isCorrect = false;
            
            if (userAnswer) {
                if (question.type === 'multiple') {
                    const correctAnswers = question.answers
                        .filter(a => a.isCorrect)
                        .map(a => a._id.toString());
                    
                    const userAnswers = userAnswer.answers || [];
                    isCorrect = JSON.stringify(correctAnswers.sort()) === 
                               JSON.stringify(userAnswers.sort());
                } else {
                    const correctAnswer = question.answers.find(a => a.isCorrect);
                    isCorrect = correctAnswer && 
                               userAnswer.answer === correctAnswer._id.toString();
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
        const passed = percentage >= quiz.passingScore;
        
        res.json({
            studentName,
            score,
            maxScore,
            percentage,
            passed,
            results,
            quizTitle: quiz.title,
            passingScore: quiz.passingScore,
            submittedAt: new Date().toISOString()
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;