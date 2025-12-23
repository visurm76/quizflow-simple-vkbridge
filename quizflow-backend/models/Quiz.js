const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    isCorrect: {
        type: Boolean,
        default: false
    },
    points: {
        type: Number,
        default: 0
    }
});

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['single', 'multiple'],
        default: 'single'
    },
    answers: [answerSchema],
    points: {
        type: Number,
        default: 1
    },
    explanation: String
});

const quizSchema = new mongoose.Schema({
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    questions: [questionSchema],
    timeLimit: Number, // в минутах
    passingScore: {
        type: Number,
        default: 70
    },
    attempts: {
        type: Number,
        default: 1
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Обновляем updatedAt при изменении
quizSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Quiz', quizSchema);