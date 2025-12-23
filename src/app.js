class EduPlatformApp {
    constructor() {
        this.api = window.EduPlatformAPI;
        this.editor = window.ContentEditor;
        this.quizEditor = window.QuizEditor;
        
        this.currentLesson = null;
        this.lessons = [];
        this.currentMode = 'editor'; // editor, quiz, preview, test
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupUI();
        this.loadLessons();
        this.checkAPIHealth();
    }

    setupUI() {
        // Показываем редактор по умолчанию
        this.showSection('editorSection');
        
        // Настраиваем заголовки
        document.getElementById('toggleMode').innerHTML = '<i class="fas fa-edit"></i> Режим редактора';
        
        // Скрываем кнопку "Пройти тест" по умолчанию
        const passTestBtn = document.getElementById('passTestBtn');
        if (passTestBtn) {
            passTestBtn.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Переключение режимов
        document.getElementById('toggleMode').addEventListener('click', () => {
            this.toggleMode();
        });

        // Создание нового урока
        document.getElementById('newLesson').addEventListener('click', (e) => {
            e.preventDefault();
            this.createNewLesson();
        });

        // Сохранение всего
        document.getElementById('saveAll').addEventListener('click', async (e) => {
            e.preventDefault();
            await this.saveCurrentLesson();
        });

        // Добавление теста - ИСПРАВЛЕНО
        document.getElementById('addQuiz').addEventListener('click', (e) => {
            e.preventDefault();
            this.showQuizEditor();
        });

        // Назад к редактору
        document.getElementById('backToEditor').addEventListener('click', (e) => {
            e.preventDefault();
            this.showEditor();
        });

        // Предпросмотр урока - ИСПРАВЛЕНО
        document.getElementById('previewLesson').addEventListener('click', (e) => {
            e.preventDefault();
            this.previewLesson();
        });

        // Закрытие предпросмотра
        document.getElementById('closePreview').addEventListener('click', (e) => {
            e.preventDefault();
            this.showEditor();
        });

        // Закрытие теста
        document.getElementById('closeTest').addEventListener('click', (e) => {
            e.preventDefault();
            this.showQuizEditor();
        });

        // Кнопка "Пройти тест" - ИСПРАВЛЕНО
        const passTestBtn = document.getElementById('passTestBtn');
        if (passTestBtn) {
            passTestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startTest();
            });
        }

        // Модальное окно загрузки
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.hideModal('uploadModal');
            });
        }

        const cancelUpload = document.getElementById('cancelUpload');
        if (cancelUpload) {
            cancelUpload.addEventListener('click', () => {
                this.hideModal('uploadModal');
            });
        }

        // Футер кнопки
        document.getElementById('exportBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.exportLesson();
        });

        document.getElementById('importBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.importLesson();
        });

        document.getElementById('helpBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });

        // Автосохранение при закрытии вкладки
        window.addEventListener('beforeunload', (e) => {
            if (this.currentLesson) {
                const content = this.editor.getContent();
                this.api.autoSave(JSON.stringify(content));
                e.returnValue = 'Есть несохраненные изменения. Вы уверены, что хотите уйти?';
            }
        });
    }

    showSection(sectionId) {
        // Скрываем все секции
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Показываем нужную секцию
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
        }
        
        // Обновляем текущий режим
        if (sectionId === 'editorSection') {
            this.currentMode = 'editor';
            document.getElementById('toggleMode').innerHTML = '<i class="fas fa-edit"></i> Режим редактора';
        } else if (sectionId === 'quizSection') {
            this.currentMode = 'quiz';
            document.getElementById('toggleMode').innerHTML = '<i class="fas fa-book-open"></i> Режим урока';
        } else if (sectionId === 'previewSection') {
            this.currentMode = 'preview';
        } else if (sectionId === 'testSection') {
            this.currentMode = 'test';
        }
    }

    async checkAPIHealth() {
        try {
            const health = await this.api.checkHealth();
            console.log('API Health:', health);
            
            // Обновляем статистику в UI
            const lessonsCount = document.getElementById('lessonsCount');
            const quizzesCount = document.getElementById('quizzesCount');
            
            if (lessonsCount) {
                lessonsCount.textContent = `${health.lessons || 0} уроков`;
            }
            if (quizzesCount) {
                quizzesCount.textContent = `${health.quizzes || 0} тестов`;
            }
            
        } catch (error) {
            console.error('API не доступен:', error);
            const lessonsCount = document.getElementById('lessonsCount');
            if (lessonsCount) {
                lessonsCount.textContent = 'API недоступен';
            }
        }
    }

    async loadLessons() {
        try {
            const lessons = await this.api.getAllLessons();
            this.lessons = lessons;
            this.renderLessonsList();
            
        } catch (error) {
            console.error('Error loading lessons:', error);
            this.showError('Не удалось загрузить список уроков');
        }
    }

    renderLessonsList() {
        const lessonsList = document.getElementById('lessonsList');
        if (!lessonsList) return;
        
        if (this.lessons.length === 0) {
            lessonsList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                    <p>Нет созданных уроков</p>
                    <p style="font-size: 0.9rem; color: #666;">Создайте первый урок!</p>
                </div>
            `;
            return;
        }
        
        lessonsList.innerHTML = this.lessons.map(lesson => `
            <div class="lesson-item ${this.currentLesson?.id === lesson.id ? 'active' : ''}" 
                 onclick="app.selectLesson('${lesson.id}')">
                <div>
                    <div class="lesson-title">${this.escapeHtml(lesson.title)}</div>
                    <div class="lesson-date">
                        ${new Date(lesson.updatedAt).toLocaleDateString('ru-RU')}
                        ${lesson.quizId ? ' • <i class="fas fa-question-circle"></i> Есть тест' : ''}
                    </div>
                </div>
                <div class="lesson-actions">
                    <button class="btn btn-sm" onclick="app.editLesson('${lesson.id}'); event.stopPropagation();" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm" onclick="app.deleteLesson('${lesson.id}'); event.stopPropagation();" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async createNewLesson() {
        const title = prompt('Введите название нового урока:', 'Новый урок');
        
        if (!title || !title.trim()) {
            return;
        }
        
        try {
            const content = this.editor.getContent();
            const result = await this.api.createLesson(title, JSON.stringify(content));
            
            this.currentLesson = result.lesson;
            this.api.currentLessonId = this.currentLesson.id;
            this.quizEditor.setLessonId(this.currentLesson.id);
            
            // Обновляем список уроков
            await this.loadLessons();
            
            // Устанавливаем заголовок в форме
            document.getElementById('lessonTitle').value = this.currentLesson.title;
            
            // Обновляем кнопку "Пройти тест"
            this.updatePassTestButton();
            
            alert('Урок создан! Теперь вы можете добавить учебный материал и создать тест.');
            
        } catch (error) {
            console.error('Error creating lesson:', error);
            alert('Ошибка при создании урока');
        }
    }

    async selectLesson(lessonId) {
        try {
            const lesson = await this.api.getLesson(lessonId);
            this.currentLesson = lesson;
            this.api.currentLessonId = lessonId;
            this.quizEditor.setLessonId(lessonId);
            
            // Загружаем контент в редактор
            document.getElementById('lessonTitle').value = lesson.title;
            
            if (lesson.content && typeof lesson.content === 'string') {
                this.editor.setContent(JSON.parse(lesson.content));
            } else if (lesson.content) {
                this.editor.setContent(lesson.content);
            } else {
                this.editor.clearEditor();
            }
            
            // Загружаем тест, если есть
            if (lesson.quizId) {
                try {
                    const quiz = await this.api.getQuizByLesson(lessonId);
                    if (quiz && quiz.questions) {
                        this.quizEditor.questions = JSON.parse(quiz.questions);
                        this.quizEditor.renderQuestions();
                    }
                } catch (error) {
                    console.log('No quiz found for this lesson or error loading:', error);
                    this.quizEditor.clear();
                }
            } else {
                this.quizEditor.clear();
            }
            
            // Обновляем список уроков
            this.renderLessonsList();
            
            // Обновляем кнопку "Пройти тест"
            this.updatePassTestButton();
            
            // Показываем редактор
            this.showEditor();
            
        } catch (error) {
            console.error('Error loading lesson:', error);
            alert('Не удалось загрузить урок');
        }
    }

    async editLesson(lessonId) {
        this.selectLesson(lessonId);
    }

    async deleteLesson(lessonId) {
        if (confirm('Удалить этот урок? Все связанные материалы и тесты также будут удалены.')) {
            try {
                // В реальном приложении здесь будет вызов API для удаления
                this.lessons = this.lessons.filter(lesson => lesson.id !== lessonId);
                
                if (this.currentLesson?.id === lessonId) {
                    this.currentLesson = null;
                    this.api.currentLessonId = null;
                    this.editor.clearEditor();
                    document.getElementById('lessonTitle').value = '';
                    this.quizEditor.clear();
                    this.updatePassTestButton();
                }
                
                this.renderLessonsList();
                alert('Урок удален');
                
            } catch (error) {
                console.error('Error deleting lesson:', error);
                alert('Ошибка при удалении урока');
            }
        }
    }

    async saveCurrentLesson() {
        if (!this.currentLesson) {
            const createNew = confirm('Урок не выбран. Создать новый урок?');
            if (createNew) {
                await this.createNewLesson();
                return;
            } else {
                return;
            }
        }
        
        const title = document.getElementById('lessonTitle').value.trim();
        if (!title) {
            alert('Введите название урока');
            return;
        }
        
        try {
            const content = this.editor.getContent();
            
            await this.api.updateLesson(
                this.currentLesson.id,
                title,
                JSON.stringify(content)
            );
            
            this.currentLesson.title = title;
            await this.loadLessons();
            
            // Обновляем кнопку "Пройти тест"
            this.updatePassTestButton();
            
            alert('Урок сохранен!');
            
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('Ошибка при сохранении урока');
        }
    }

    toggleMode() {
        if (this.currentMode === 'editor') {
            // Переключаемся в режим тестирования
            this.showQuizEditor();
        } else {
            // Переключаемся в режим редактора
            this.showEditor();
        }
    }

    showEditor() {
        this.showSection('editorSection');
        this.updatePassTestButton();
    }

    showQuizEditor() {
        if (!this.currentLesson) {
            alert('Сначала создайте или выберите урок');
            return;
        }
        
        this.showSection('quizSection');
        
        // Устанавливаем заголовок теста, если он пустой
        const quizTitleInput = document.getElementById('quizTitle');
        if (quizTitleInput && !quizTitleInput.value.trim()) {
            quizTitleInput.value = `Тест: ${this.currentLesson.title}`;
        }
    }

    previewLesson() {
        if (!this.currentLesson) {
            alert('Сначала создайте или выберите урок');
            return;
        }
        
        // Получаем контент редактора
        const content = this.editor.getContent();
        
        // Показываем секцию предпросмотра
        this.showSection('previewSection');
        
        // Вставляем контент в предпросмотр
        const previewContent = document.getElementById('previewContent');
        if (previewContent) {
            previewContent.innerHTML = content.html;
            
            // Добавляем стили для предпросмотра
            previewContent.style.fontFamily = 'Roboto, Open Sans, sans-serif';
            previewContent.style.lineHeight = '1.8';
            previewContent.style.color = '#333';
            previewContent.style.padding = '20px';
            
            // Добавляем кнопку "Пройти тест" в предпросмотр, если есть тест
            if (this.quizEditor.hasTest()) {
                const testButton = document.createElement('div');
                testButton.innerHTML = `
                    <div style="text-align: center; margin: 40px 0; padding: 30px; background: #f8f9fa; border-radius: 10px; border: 2px solid #4a6fa5;">
                        <h3 style="color: #4a6fa5; margin-bottom: 20px;">Проверьте свои знания!</h3>
                        <p style="margin-bottom: 25px; color: #666;">Пройдите тест по пройденному материалу</p>
                        <button onclick="app.startTestFromPreview()" 
                                style="background: linear-gradient(135deg, #4a6fa5 0%, #6d9dc5 100%); 
                                       color: white; 
                                       border: none; 
                                       padding: 15px 40px; 
                                       font-size: 18px; 
                                       border-radius: 8px; 
                                       cursor: pointer;
                                       font-weight: bold;">
                            <i class="fas fa-graduation-cap"></i> Пройти тест
                        </button>
                    </div>
                `;
                previewContent.appendChild(testButton);
            }
        }
    }

    startTestFromPreview() {
        this.startTest();
    }

    startTest() {
        if (!this.currentLesson) {
            alert('Сначала создайте или выберите урок');
            return;
        }
        
        if (!this.quizEditor.hasTest()) {
            alert('Для этого урока не создан тест. Сначала создайте тест.');
            return;
        }
        
        this.quizEditor.startTest();
    }

    updatePassTestButton() {
        const hasTest = this.quizEditor.hasTest();
        const passTestBtn = document.getElementById('passTestBtn');
        
        if (passTestBtn) {
            if (hasTest && this.currentLesson) {
                passTestBtn.style.display = 'inline-flex';
                passTestBtn.disabled = false;
            } else {
                passTestBtn.style.display = 'none';
            }
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    exportLesson() {
        if (!this.currentLesson) {
            alert('Сначала создайте или выберите урок');
            return;
        }
        
        const lessonData = {
            lesson: this.currentLesson,
            content: this.editor.getContent(),
            quiz: this.quizEditor.questions
        };
        
        const dataStr = JSON.stringify(lessonData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `урок_${this.currentLesson.title}_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    importLesson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                // Импортируем урок
                if (data.lesson && data.content) {
                    const result = await this.api.createLesson(
                        data.lesson.title + ' (импорт)',
                        JSON.stringify(data.content)
                    );
                    
                    this.currentLesson = result.lesson;
                    this.api.currentLessonId = this.currentLesson.id;
                    
                    document.getElementById('lessonTitle').value = this.currentLesson.title;
                    this.editor.setContent(data.content);
                    
                    // Импортируем тест, если есть
                    if (data.quiz && data.quiz.length > 0) {
                        this.quizEditor.questions = data.quiz;
                        this.quizEditor.setLessonId(this.currentLesson.id);
                        this.quizEditor.renderQuestions();
                    }
                    
                    await this.loadLessons();
                    this.updatePassTestButton();
                    alert('Урок успешно импортирован!');
                } else {
                    alert('Некорректный формат файла');
                }
                
            } catch (error) {
                console.error('Error importing lesson:', error);
                alert('Ошибка при импорте урока');
            }
        };
        
        input.click();
    }

    showHelp() {
        alert(`
            🎓 EduPlatform - Руководство пользователя
            
            1. СОЗДАНИЕ УРОКА:
               - Нажмите "Новый урок" в боковой панели
               - Введите название и начните редактирование
            
            2. РЕДАКТИРОВАНИЕ:
               - Используйте панель инструментов для форматирования
               - Загружайте изображения, видео и аудио
               - Настраивайте шрифты, цвета и фон
            
            3. СОЗДАНИЕ ТЕСТА:
               - Нажмите "Добавить тест" в редакторе
               - Создавайте вопросы с одним или несколькими правильными ответами
               - Назначайте баллы за каждый вопрос
            
            4. СОХРАНЕНИЕ:
               - Сохраняйте урок и тест отдельно
               - Используйте "Сохранить всё" для полного сохранения
               - Экспортируйте и импортируйте уроки
            
            5. ТЕСТИРОВАНИЕ:
               - Нажмите "Предпросмотр" чтобы увидеть урок
               - Нажмите "Пройти тест" чтобы начать тестирование
               - Отвечайте на все вопросы и получайте результаты
            
            💡 Совет: Регулярно сохраняйте свою работу!
        `);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 15px; 
                        border-radius: 5px; margin: 10px 0; border: 1px solid #f5c6cb;">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
        
        const main = document.querySelector('.app-main');
        if (main) {
            main.prepend(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Запускаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EduPlatformApp();
    console.log('EduPlatformApp initialized');
});