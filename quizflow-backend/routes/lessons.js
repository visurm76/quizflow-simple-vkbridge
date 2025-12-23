const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');

// GET все уроки
router.get('/', async (req, res) => {
    try {
        const lessons = await Lesson.find().sort({ order: 1, createdAt: -1 });
        res.json(lessons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET один урок по ID
router.get('/:id', async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        res.json(lesson);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST создать новый урок
router.post('/', async (req, res) => {
    try {
        const { title, content } = req.body;
        
        const lesson = new Lesson({
            title,
            content: content || {
                html: '<p>Новый урок</p>',
                text: 'Новый урок',
                media: []
            }
        });
        
        await lesson.save();
        res.status(201).json(lesson);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT обновить урок
router.put('/:id', async (req, res) => {
    try {
        const { title, content, order, isPublished } = req.body;
        
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        if (title !== undefined) lesson.title = title;
        if (content !== undefined) lesson.content = content;
        if (order !== undefined) lesson.order = order;
        if (isPublished !== undefined) lesson.isPublished = isPublished;
        
        await lesson.save();
        res.json(lesson);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE удалить урок
router.delete('/:id', async (req, res) => {
    try {
        const lesson = await Lesson.findByIdAndDelete(req.params.id);
        if (!lesson) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        res.json({ message: 'Урок удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;