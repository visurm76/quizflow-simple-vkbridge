class EduPlatformAPI {
    constructor(baseURL = 'http://localhost:3000/api') {
        this.baseURL = baseURL;
        this.currentLessonId = null;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            // Для автономной работы можно использовать localStorage
            throw error;
        }
    }

    // Уроки
    async createLesson(title, content) {
        return this.request('/lessons', {
            method: 'POST',
            body: JSON.stringify({ title, content })
        });
    }

    async updateLesson(lessonId, title, content) {
        return this.request(`/lessons/${lessonId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, content })
        });
    }

    async getLesson(lessonId) {
        return this.request(`/lessons/${lessonId}`);
    }

    async getAllLessons() {
        return this.request('/lessons');
    }

    // Загрузка файлов
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        
        return await response.json();
    }

    // Тесты
    async createQuiz(lessonId, title, questions) {
        return this.request('/quizzes', {
            method: 'POST',
            body: JSON.stringify({ lessonId, title, questions })
        });
    }

    async getQuizByLesson(lessonId) {
        try {
            return await this.request(`/quizzes/lesson/${lessonId}`);
        } catch (error) {
            // Если тест не найден, возвращаем null
            if (error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    async submitQuiz(quizId, answers, studentName = 'Аноним') {
        return this.request(`/quizzes/${quizId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ answers, studentName })
        });
    }

    // Вспомогательные методы
    async checkHealth() {
        return this.request('/health');
    }

    async getStats() {
        return this.request('/stats');
    }

    // Сохранение в localStorage для автосохранения
    autoSave(content) {
        if (this.currentLessonId) {
            localStorage.setItem(`autosave_${this.currentLessonId}`, content);
        }
    }

    loadAutoSave() {
        if (this.currentLessonId) {
            return localStorage.getItem(`autosave_${this.currentLessonId}`);
        }
        return null;
    }

    clearAutoSave() {
        if (this.currentLessonId) {
            localStorage.removeItem(`autosave_${this.currentLessonId}`);
        }
    }
}

// Экспортируем API
window.EduPlatformAPI = new EduPlatformAPI();
console.log('EduPlatformAPI (SQLite) created');