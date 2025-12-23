class QuizEditor {
    constructor() {
        this.api = window.EduPlatformAPI;
        this.questions = [];
        this.currentLessonId = null;
        this.currentTestQuestion = 0;
        this.testAnswers = [];
        
        this.init();
    }

    init() {
        console.log('QuizEditor initialized');
        this.setupEventListeners();
        this.loadFromLocalStorage();
    }

    setupEventListeners() {
        console.log('Setting up QuizEditor event listeners');
        
        // Добавление вопроса
        const addQuestionBtn = document.getElementById('addQuestion');
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addQuestion();
            });
        }

        // Предпросмотр теста
        const previewQuizBtn = document.getElementById('previewQuiz');
        if (previewQuizBtn) {
            previewQuizBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.previewQuiz();
            });
        }

        // Сохранение теста - отдельная кнопка в редакторе теста
        this.setupSaveButton();
    }

    setupSaveButton() {
        // Создаем кнопку сохранения теста, если ее нет
        const quizForm = document.querySelector('.quiz-form');
        if (quizForm && !document.getElementById('saveQuizBtn')) {
            const saveBtn = document.createElement('button');
            saveBtn.id = 'saveQuizBtn';
            saveBtn.className = 'btn btn-success';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить тест';
            saveBtn.style.marginTop = '20px';
            saveBtn.style.width = '100%';
            saveBtn.style.padding = '15px';
            saveBtn.style.fontSize = '16px';
            
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.saveQuiz();
            });
            
            quizForm.appendChild(saveBtn);
        }
    }

    addQuestion() {
        console.log('Adding new question');
        const questionType = document.querySelector('input[name="questionType"]:checked').value;
        const questionNumber = this.questions.length + 1;
        
        const question = {
            id: `q${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Уникальный ID
            number: questionNumber,
            text: '',
            type: questionType,
            answers: [
                { id: `a${Date.now()}_1`, text: '', isCorrect: false },
                { id: `a${Date.now()}_2`, text: '', isCorrect: false }
            ],
            points: 1
        };
        
        this.questions.push(question);
        this.renderQuestions();
        
        // Фокусировка на новом вопросе
        setTimeout(() => {
            const newQuestionInput = document.querySelector(`[data-question-id="${question.id}"] .question-text-input`);
            if (newQuestionInput) {
                newQuestionInput.focus();
            }
        }, 100);
        
        this.saveToLocalStorage();
    }

    renderQuestions() {
        const questionsList = document.getElementById('questionsList');
        if (!questionsList) return;
        
        if (this.questions.length === 0) {
            questionsList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-question-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                    <p>Пока нет вопросов. Добавьте первый вопрос!</p>
                </div>
            `;
            return;
        }
        
        questionsList.innerHTML = this.questions.map((question, index) => `
            <div class="question-card" data-question-id="${question.id}" data-question-index="${index}">
                <div class="question-header">
                    <div class="question-number">Вопрос ${index + 1}</div>
                    <div class="question-actions">
                        <button class="btn btn-sm btn-danger delete-question-btn" 
                                data-question-id="${question.id}"
                                title="Удалить вопрос">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${index > 0 ? `
                            <button class="btn btn-sm move-up-btn" 
                                    data-question-id="${question.id}"
                                    title="Переместить вверх">
                                <i class="fas fa-arrow-up"></i>
                            </button>
                        ` : ''}
                        ${index < this.questions.length - 1 ? `
                            <button class="btn btn-sm move-down-btn" 
                                    data-question-id="${question.id}"
                                    title="Переместить вниз">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <textarea class="question-text-input" 
                          data-question-id="${question.id}"
                          placeholder="Введите текст вопроса..."
                          rows="2">${this.escapeHtml(question.text)}</textarea>
                
                <div class="answers-list">
                    ${question.answers.map((answer, answerIndex) => `
                        <div class="answer-item" data-answer-id="${answer.id}">
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                                <input type="${question.type === 'multiple' ? 'checkbox' : 'radio'}" 
                                       class="answer-checkbox"
                                       name="question_${question.id}"
                                       ${answer.isCorrect ? 'checked' : ''}
                                       data-question-id="${question.id}"
                                       data-answer-id="${answer.id}"
                                       style="width: 18px; height: 18px;">
                                
                                <input type="text" 
                                       class="answer-input"
                                       placeholder="Вариант ответа ${answerIndex + 1}"
                                       value="${this.escapeHtml(answer.text)}"
                                       data-question-id="${question.id}"
                                       data-answer-id="${answer.id}">
                            </div>
                            
                            <div class="answer-actions">
                                ${question.answers.length > 2 ? `
                                    <button class="btn btn-sm btn-danger delete-answer-btn" 
                                            data-question-id="${question.id}"
                                            data-answer-id="${answer.id}"
                                            title="Удалить ответ">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <button class="btn btn-sm btn-primary add-answer-btn" 
                                data-question-id="${question.id}">
                            <i class="fas fa-plus"></i> Добавить вариант ответа
                        </button>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <span>Баллы:</span>
                            <input type="number" 
                                   class="points-input"
                                   data-question-id="${question.id}"
                                   min="1" 
                                   max="10" 
                                   value="${question.points}"
                                   style="width: 70px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                        </label>
                        
                        <div style="font-size: 0.9rem; color: #666;">
                            Правильных: ${question.answers.filter(a => a.isCorrect).length}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Назначаем обработчики событий
        this.setupQuestionEventListeners();
    }

    setupQuestionEventListeners() {
        // Удаление вопроса
        document.querySelectorAll('.delete-question-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const questionId = btn.dataset.questionId;
                this.removeQuestion(questionId);
            });
        });
        
        // Перемещение вопроса вверх
        document.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const questionId = btn.dataset.questionId;
                this.moveQuestionUp(questionId);
            });
        });
        
        // Перемещение вопроса вниз
        document.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const questionId = btn.dataset.questionId;
                this.moveQuestionDown(questionId);
            });
        });
        
        // Добавление варианта ответа
        document.querySelectorAll('.add-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const questionId = btn.dataset.questionId;
                this.addAnswer(questionId);
            });
        });
        
        // Удаление варианта ответа
        document.querySelectorAll('.delete-answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const questionId = btn.dataset.questionId;
                const answerId = btn.dataset.answerId;
                this.removeAnswer(questionId, answerId);
            });
        });
        
        // Изменение текста вопроса
        document.querySelectorAll('.question-text-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = input.dataset.questionId;
                const value = input.value;
                this.updateQuestion(questionId, 'text', value);
            });
        });
        
        // Изменение текста ответа
        document.querySelectorAll('.answer-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionId = input.dataset.questionId;
                const answerId = input.dataset.answerId;
                const value = input.value;
                this.updateAnswer(questionId, answerId, value);
            });
        });
        
        // Изменение баллов
        document.querySelectorAll('.points-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const questionId = input.dataset.questionId;
                const value = parseInt(input.value) || 1;
                this.updateQuestion(questionId, 'points', value);
            });
        });
        
        // Изменение правильности ответа
        document.querySelectorAll('.answer-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const questionId = checkbox.dataset.questionId;
                const answerId = checkbox.dataset.answerId;
                const isChecked = checkbox.checked;
                
                // Находим вопрос
                const question = this.questions.find(q => q.id === questionId);
                if (question) {
                    this.toggleAnswerCorrect(questionId, answerId, isChecked, question.type);
                }
            });
        });
    }

    // Методы управления вопросами
    updateQuestion(questionId, field, value) {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
            question[field] = value;
            this.saveToLocalStorage();
        }
    }

    removeQuestion(questionId) {
        const questionIndex = this.questions.findIndex(q => q.id === questionId);
        if (questionIndex === -1) return;
        
        const question = this.questions[questionIndex];
        if (!question) return;
        
        if (confirm(`Удалить вопрос ${questionIndex + 1}?`)) {
            // Удаляем вопрос
            this.questions.splice(questionIndex, 1);
            
            // Перенумеровываем оставшиеся вопросы
            this.questions.forEach((q, index) => {
                q.number = index + 1;
            });
            
            this.renderQuestions();
            this.saveToLocalStorage();
        }
    }

    moveQuestionUp(questionId) {
        const index = this.questions.findIndex(q => q.id === questionId);
        if (index > 0) {
            // Меняем местами
            const temp = this.questions[index];
            this.questions[index] = this.questions[index - 1];
            this.questions[index - 1] = temp;
            
            // Перенумеровываем
            this.questions.forEach((q, i) => {
                q.number = i + 1;
            });
            
            this.renderQuestions();
            this.saveToLocalStorage();
        }
    }

    moveQuestionDown(questionId) {
        const index = this.questions.findIndex(q => q.id === questionId);
        if (index < this.questions.length - 1) {
            // Меняем местами
            const temp = this.questions[index];
            this.questions[index] = this.questions[index + 1];
            this.questions[index + 1] = temp;
            
            // Перенумеровываем
            this.questions.forEach((q, i) => {
                q.number = i + 1;
            });
            
            this.renderQuestions();
            this.saveToLocalStorage();
        }
    }

    // Методы управления ответами
    addAnswer(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (question && question.answers.length < 6) {
            const newAnswerId = `a${Date.now()}_${question.answers.length + 1}`;
            question.answers.push({
                id: newAnswerId,
                text: '',
                isCorrect: false
            });
            this.renderQuestions();
            this.saveToLocalStorage();
        } else {
            alert('Максимум 6 вариантов ответа');
        }
    }

    removeAnswer(questionId, answerId) {
        const question = this.questions.find(q => q.id === questionId);
        if (question && question.answers.length > 2) {
            question.answers = question.answers.filter(a => a.id !== answerId);
            this.renderQuestions();
            this.saveToLocalStorage();
        } else {
            alert('Минимум 2 варианта ответа');
        }
    }

    updateAnswer(questionId, answerId, text) {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
            const answer = question.answers.find(a => a.id === answerId);
            if (answer) {
                answer.text = text;
                this.saveToLocalStorage();
            }
        }
    }

    toggleAnswerCorrect(questionId, answerId, isCorrect, questionType) {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
            const answer = question.answers.find(a => a.id === answerId);
            if (answer) {
                if (questionType === 'single') {
                    // Для одиночного выбора снимаем выделение с других ответов
                    question.answers.forEach(a => {
                        a.isCorrect = a.id === answerId ? isCorrect : false;
                    });
                } else {
                    // Для множественного выбора просто меняем состояние
                    answer.isCorrect = isCorrect;
                }
                this.renderQuestions();
                this.saveToLocalStorage();
            }
        }
    }

    // Валидация теста
    validateQuiz() {
        const errors = [];
        
        if (this.questions.length === 0) {
            errors.push('Добавьте хотя бы один вопрос');
            return { isValid: false, errors };
        }
        
        // Проверяем каждый вопрос
        this.questions.forEach((question, index) => {
            const questionNum = index + 1;
            
            // Проверяем текст вопроса
            if (!question.text || question.text.trim() === '') {
                errors.push(`Заполните текст вопроса ${questionNum}`);
                return;
            }
            
            // Проверяем, что есть хотя бы 2 ответа с текстом
            const validAnswers = question.answers.filter(a => a.text && a.text.trim() !== '');
            if (validAnswers.length < 2) {
                errors.push(`У вопроса ${questionNum} должно быть минимум 2 заполненных варианта ответа`);
                return;
            }
            
            // Проверяем, что есть хотя бы один правильный ответ
            const hasCorrect = question.answers.some(a => a.isCorrect);
            if (!hasCorrect) {
                errors.push(`Выберите правильный ответ для вопроса ${questionNum}`);
                return;
            }
            
            // Проверяем баллы
            if (!question.points || question.points < 1) {
                errors.push(`Укажите баллы для вопроса ${questionNum} (минимум 1)`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Сохранение теста
    async saveQuiz() {
        console.log('Saving quiz...');
        
        // Валидация
        const validation = this.validateQuiz();
        if (!validation.isValid) {
            const errorMessage = validation.errors.join('\n');
            alert(`Исправьте следующие ошибки:\n\n${errorMessage}`);
            return;
        }
        
        const quizTitleInput = document.getElementById('quizTitle');
        if (!quizTitleInput) {
            alert('Не найден элемент для названия теста');
            return;
        }
        
        const quizTitle = quizTitleInput.value.trim();
        
        if (!quizTitle) {
            alert('Введите название теста');
            return;
        }
        
        if (!this.currentLessonId) {
            alert('Сначала создайте или выберите урок');
            return;
        }
        
        try {
            console.log('Saving quiz with', this.questions.length, 'questions');
            
            // Очищаем пустые ответы перед сохранением
            const questionsToSave = this.questions.map(q => ({
                ...q,
                answers: q.answers.filter(a => a.text && a.text.trim() !== '')
            }));
            
            const result = await this.api.createQuiz(
                this.currentLessonId,
                quizTitle,
                JSON.stringify(questionsToSave)
            );
            
            alert('✅ Тест успешно сохранен! Теперь его можно пройти в режиме обучения.');
            console.log('Quiz saved:', result);
            
            // Очищаем localStorage после успешного сохранения
            this.clearLocalStorage();
            
            // Обновляем состояние приложения
            if (window.app) {
                window.app.updatePassTestButton();
            }
            
            // Возвращаемся к редактору урока
            setTimeout(() => {
                if (window.app) {
                    window.app.showEditor();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error saving quiz:', error);
            alert('❌ Ошибка при сохранении теста: ' + (error.message || 'Неизвестная ошибка'));
        }
    }

    // Остальные методы остаются такими же (startTest, renderTest, и т.д.)
    // ... [остальной код из предыдущей версии] ...

    showTestMode() {
        // Показываем секцию тестирования через основной app
        if (window.app) {
            window.app.showSection('testSection');
        } else {
            // Fallback: напрямую показываем секцию
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById('testSection').classList.add('active');
        }
        
        // Отображаем тест для прохождения
        this.renderTest();
    }

    renderTest() {
        const testContainer = document.getElementById('testContainer');
        if (!testContainer) return;
        
        testContainer.innerHTML = `
            <div class="test-header">
                <h2><i class="fas fa-graduation-cap"></i> Тестирование</h2>
                <p>Ответьте на все вопросы. Выберите один или несколько правильных ответов.</p>
                <div class="test-progress">
                    <div class="progress-info">
                        <span id="currentQuestion">1</span> из <span id="totalQuestions">${this.questions.length}</span> вопросов
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="testProgressFill" style="width: ${(1/this.questions.length)*100}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="questions-container" id="testQuestions">
                <!-- Вопросы будут рендериться динамически -->
            </div>
            
            <div class="test-navigation">
                <button class="btn btn-outline" id="prevQuestionBtn" disabled>
                    <i class="fas fa-arrow-left"></i> Назад
                </button>
                
                <div class="question-counter">
                    <span id="currentQuestionDisplay">1</span> / ${this.questions.length}
                </div>
                
                <button class="btn btn-primary" id="nextQuestionBtn">
                    Далее <i class="fas fa-arrow-right"></i>
                </button>
                
                <button class="btn btn-success" id="finishTestBtn" style="display: none;">
                    <i class="fas fa-flag-checkered"></i> Завершить тест
                </button>
            </div>
        `;
        
        // Назначаем обработчики для кнопок навигации
        document.getElementById('prevQuestionBtn').addEventListener('click', () => this.prevTestQuestion());
        document.getElementById('nextQuestionBtn').addEventListener('click', () => this.nextTestQuestion());
        document.getElementById('finishTestBtn').addEventListener('click', () => this.submitTest());
        
        // Инициализируем тестирование
        this.currentTestQuestion = 0;
        this.testAnswers = new Array(this.questions.length).fill([]);
        this.renderCurrentTestQuestion();
    }

    renderCurrentTestQuestion() {
        const testQuestions = document.getElementById('testQuestions');
        if (!testQuestions || !this.questions[this.currentTestQuestion]) return;
        
        const currentQuestion = this.questions[this.currentTestQuestion];
        
        testQuestions.innerHTML = `
            <div class="test-question active">
                <h3>Вопрос ${this.currentTestQuestion + 1}</h3>
                <div class="question-text">${this.escapeHtml(currentQuestion.text)}</div>
                
                <div class="test-answers">
                    ${currentQuestion.answers.map((answer, index) => {
                        const isSelected = this.testAnswers[this.currentTestQuestion]?.includes(answer.id);
                        const letter = String.fromCharCode(65 + index); // A, B, C, D
                        
                        return `
                            <div class="test-answer ${isSelected ? 'selected' : ''}" 
                                 data-answer-id="${answer.id}">
                                <div class="answer-selector">
                                    <div class="selector-${currentQuestion.type}">
                                        ${currentQuestion.type === 'multiple' ? 
                                            (isSelected ? '✓' : '') : 
                                            (isSelected ? '●' : '')
                                        }
                                    </div>
                                </div>
                                <div class="answer-letter">${letter}.</div>
                                <div class="answer-text">${this.escapeHtml(answer.text)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="question-hint">
                    <i class="fas fa-info-circle"></i>
                    ${currentQuestion.type === 'multiple' ? 
                        'Выберите один или несколько правильных ответов' : 
                        'Выберите один правильный ответ'}
                    ${currentQuestion.points > 1 ? ` (${currentQuestion.points} баллов)` : ''}
                </div>
            </div>
        `;
        
        // Назначаем обработчики для ответов
        document.querySelectorAll('.test-answer').forEach(answerEl => {
            answerEl.addEventListener('click', () => {
                const answerId = answerEl.dataset.answerId;
                this.selectTestAnswer(answerId, this.currentTestQuestion);
            });
        });
        
        // Обновляем навигацию
        this.updateTestNavigation();
        this.updateTestProgress();
    }

    selectTestAnswer(answerId, questionIndex) {
        const question = this.questions[questionIndex];
        
        if (!this.testAnswers[questionIndex]) {
            this.testAnswers[questionIndex] = [];
        }
        
        if (question.type === 'single') {
            // Для одиночного выбора
            this.testAnswers[questionIndex] = [answerId];
        } else {
            // Для множественного выбора
            const index = this.testAnswers[questionIndex].indexOf(answerId);
            if (index > -1) {
                this.testAnswers[questionIndex].splice(index, 1);
            } else {
                this.testAnswers[questionIndex].push(answerId);
            }
        }
        
        // Перерендериваем текущий вопрос
        this.renderCurrentTestQuestion();
    }

    updateTestNavigation() {
        const prevBtn = document.getElementById('prevQuestionBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const finishBtn = document.getElementById('finishTestBtn');
        const currentDisplay = document.getElementById('currentQuestionDisplay');
        
        if (!prevBtn || !nextBtn || !finishBtn || !currentDisplay) return;
        
        currentDisplay.textContent = this.currentTestQuestion + 1;
        
        // Кнопка "Назад"
        prevBtn.disabled = this.currentTestQuestion === 0;
        
        // Кнопка "Далее" / "Завершить"
        if (this.currentTestQuestion === this.questions.length - 1) {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            finishBtn.style.display = 'none';
        }
        
        // Проверяем, есть ли ответ на текущий вопрос
        const hasAnswer = this.testAnswers[this.currentTestQuestion]?.length > 0;
        nextBtn.disabled = !hasAnswer;
        
        // Для последнего вопроса проверяем все ответы
        if (this.currentTestQuestion === this.questions.length - 1) {
            const allAnswered = this.testAnswers.every(answers => answers.length > 0);
            finishBtn.disabled = !allAnswered;
        }
    }

    updateTestProgress() {
        const progressFill = document.getElementById('testProgressFill');
        const currentQuestionEl = document.getElementById('currentQuestion');
        const totalQuestionsEl = document.getElementById('totalQuestions');
        
        if (!progressFill || !currentQuestionEl || !totalQuestionsEl) return;
        
        // Подсчитываем количество отвеченных вопросов
        const answeredCount = this.testAnswers.filter(answers => answers.length > 0).length;
        const progress = (answeredCount / this.questions.length) * 100;
        
        progressFill.style.width = `${progress}%`;
        currentQuestionEl.textContent = answeredCount;
        totalQuestionsEl.textContent = this.questions.length;
    }

    prevTestQuestion() {
        if (this.currentTestQuestion > 0) {
            this.currentTestQuestion--;
            this.renderCurrentTestQuestion();
        }
    }

    nextTestQuestion() {
        if (this.currentTestQuestion < this.questions.length - 1) {
            this.currentTestQuestion++;
            this.renderCurrentTestQuestion();
        }
    }

    async submitTest() {
        // Проверяем, что на все вопросы есть ответы
        const allAnswered = this.testAnswers.every(answers => answers.length > 0);
        
        if (!allAnswered) {
            alert('Ответьте на все вопросы перед завершением теста');
            return;
        }
        
        try {
            // Собираем ответы в нужном формате
            const answers = this.questions.map((question, index) => ({
                questionId: question.id,
                answers: this.testAnswers[index]
            }));
            
            // Рассчитываем результаты
            const result = await this.calculateResults(answers);
            
            // Показываем результаты
            this.showResults(result);
            
        } catch (error) {
            console.error('Error submitting test:', error);
            alert('Ошибка при отправке результатов: ' + error.message);
        }
    }

    async calculateResults(userAnswers) {
        let score = 0;
        let maxScore = 0;
        const results = [];
        
        this.questions.forEach(question => {
            maxScore += question.points || 1;
            const userAnswer = userAnswers.find(a => a.questionId === question.id);
            
            let isCorrect = false;
            if (userAnswer) {
                if (question.type === 'multiple') {
                    const correctAnswers = question.answers
                        .filter(a => a.isCorrect)
                        .map(a => a.id);
                    isCorrect = JSON.stringify(userAnswer.answers.sort()) === 
                               JSON.stringify(correctAnswers.sort());
                } else {
                    const correctAnswer = question.answers.find(a => a.isCorrect);
                    isCorrect = userAnswer.answers[0] === correctAnswer?.id;
                }
                
                if (isCorrect) {
                    score += question.points || 1;
                }
            }
            
            results.push({
                questionId: question.id,
                questionText: question.text,
                isCorrect,
                userAnswers: userAnswer?.answers || [],
                correctAnswers: question.answers.filter(a => a.isCorrect).map(a => a.id)
            });
        });
        
        const percentage = Math.round((score / maxScore) * 100);
        
        return {
            score,
            maxScore,
            percentage,
            results,
            grade: percentage >= 90 ? 'Отлично! 🏆' :
                   percentage >= 70 ? 'Хорошо! 👍' :
                   percentage >= 50 ? 'Удовлетворительно. 👌' : 'Попробуйте еще раз. 📚',
            color: percentage >= 90 ? '#28a745' :
                   percentage >= 70 ? '#17a2b8' :
                   percentage >= 50 ? '#ffc107' : '#dc3545'
        };
    }

    showResults(result) {
        const testContainer = document.getElementById('testContainer');
        if (!testContainer) return;
        
        testContainer.innerHTML = `
            <div class="test-results">
                <div class="result-header" style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 4rem; color: ${result.color}; margin-bottom: 10px;">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <h2 style="color: #333; margin-bottom: 10px;">Тестирование завершено!</h2>
                    <p style="color: #666;">Ваши результаты:</p>
                </div>
                
                <div class="result-score" style="text-align: center; margin-bottom: 40px;">
                    <div style="font-size: 5rem; font-weight: bold; color: ${result.color}; line-height: 1;">
                        ${result.percentage}%
                    </div>
                    <div style="font-size: 1.8rem; color: #333; margin-top: 10px;">
                        ${result.grade}
                    </div>
                </div>
                
                <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; text-align: center;">
                        <div>
                            <div style="font-size: 2.5rem; font-weight: bold; color: #4a6fa5;">
                                ${result.score}/${result.maxScore}
                            </div>
                            <div style="font-size: 1rem; color: #666;">набрано баллов</div>
                        </div>
                        <div>
                            <div style="font-size: 2.5rem; font-weight: bold; color: #4a6fa5;">
                                ${result.results.filter(r => r.isCorrect).length}/${this.questions.length}
                            </div>
                            <div style="font-size: 1rem; color: #666;">правильных ответов</div>
                        </div>
                    </div>
                </div>
                
                <div class="result-details" style="margin-bottom: 40px;">
                    <h4 style="margin-bottom: 20px; color: #333;">
                        <i class="fas fa-list-check"></i> Детали результатов:
                    </h4>
                    ${result.results.map((item, index) => `
                        <div style="padding: 15px; margin-bottom: 10px; 
                                    border-radius: 8px;
                                    background: ${item.isCorrect ? '#e8f5e9' : '#ffebee'};
                                    border-left: 4px solid ${item.isCorrect ? '#28a745' : '#dc3545'};">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong style="color: #333;">Вопрос ${index + 1}</strong>
                                <span style="font-weight: bold; color: ${item.isCorrect ? '#28a745' : '#dc3545'};">
                                    ${item.isCorrect ? '✓ Правильно' : '✗ Неправильно'}
                                </span>
                            </div>
                            ${!item.isCorrect ? `
                                <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                                    <div>Правильные ответы: <strong>${this.getAnswerLetters(item.correctAnswers, index)}</strong></div>
                                    <div>Ваши ответы: <strong>${this.getAnswerLetters(item.userAnswers, index)}</strong></div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center;">
                    <button class="btn btn-primary" id="retryTestBtn" style="margin-right: 10px;">
                        <i class="fas fa-redo"></i> Пройти еще раз
                    </button>
                    <button class="btn btn-outline" id="closeTestBtn">
                        <i class="fas fa-times"></i> Закрыть
                    </button>
                </div>
            </div>
        `;
        
        // Назначаем обработчики для кнопок результатов
        document.getElementById('retryTestBtn').addEventListener('click', () => this.retryTest());
        document.getElementById('closeTestBtn').addEventListener('click', () => this.closeTest());
    }

    getAnswerLetters(answerIds, questionIndex) {
        const question = this.questions[questionIndex];
        if (!question) return '';
        
        const letters = answerIds.map(answerId => {
            const answerIndex = question.answers.findIndex(a => a.id === answerId);
            return answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : '';
        }).filter(letter => letter);
        
        return letters.length > 0 ? letters.join(', ') : '—';
    }

    retryTest() {
        this.showTestMode();
    }

    closeTest() {
        // Возвращаемся к редактору урока через основной app
        if (window.app) {
            window.app.showEditor();
        } else {
            // Fallback
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById('editorSection').classList.add('active');
        }
    }

    previewQuiz() {
        console.log('Preview quiz clicked');
        if (this.questions.length === 0) {
            alert('Нет вопросов для предпросмотра. Сначала добавьте вопросы в тест.');
            return;
        }
        
        this.showTestMode();
    }

    // Работа с localStorage
    saveToLocalStorage() {
        if (this.currentLessonId) {
            const data = {
                title: document.getElementById('quizTitle')?.value || '',
                questions: this.questions
            };
            localStorage.setItem(`quiz_draft_${this.currentLessonId}`, JSON.stringify(data));
        }
    }

    loadFromLocalStorage() {
        if (this.currentLessonId) {
            const saved = localStorage.getItem(`quiz_draft_${this.currentLessonId}`);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    const quizTitleInput = document.getElementById('quizTitle');
                    if (quizTitleInput && data.title) {
                        quizTitleInput.value = data.title;
                    }
                    this.questions = data.questions || [];
                    this.renderQuestions();
                } catch (e) {
                    console.error('Error loading quiz draft:', e);
                }
            }
        }
    }

    clearLocalStorage() {
        if (this.currentLessonId) {
            localStorage.removeItem(`quiz_draft_${this.currentLessonId}`);
        }
    }

    // Вспомогательные методы
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setLessonId(lessonId) {
        this.currentLessonId = lessonId;
        this.loadFromLocalStorage();
        this.setupSaveButton();
    }

    clear() {
        this.questions = [];
        const quizTitleInput = document.getElementById('quizTitle');
        if (quizTitleInput) {
            quizTitleInput.value = '';
        }
        this.renderQuestions();
        this.clearLocalStorage();
    }

    // Проверка существования теста
    hasTest() {
        return this.questions.length > 0;
    }
}

// Экспортируем редактор тестов
window.QuizEditor = new QuizEditor();
console.log('QuizEditor created');