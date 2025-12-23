class ContentEditor {
    constructor() {
        this.api = window.EduPlatformAPI;
        this.currentFile = null;
        this.uploading = false;
        this.mediaFiles = [];
        
        this.init();
    }

    init() {
        this.setupToolbar();
        this.setupUpload();
        this.setupColorPickers();
        this.setupMediaInsertion();
        this.setupAutoSave();
    }

    setupToolbar() {
        const toolbar = document.getElementById('toolbar');
        
        // Обработка кнопок форматирования
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.tool-btn[data-command]');
            if (btn) {
                e.preventDefault();
                const command = btn.dataset.command;
                const value = btn.dataset.value;
                
                this.executeCommand(command, value);
                this.updateToolbar();
            }
        });

        // Обработка выбора шрифта
        document.getElementById('fontFamily').addEventListener('change', (e) => {
            this.executeCommand('fontName', e.target.value);
        });

        // Обработка размера шрифта
        document.getElementById('fontSize').addEventListener('change', (e) => {
            this.executeCommand('fontSize', e.target.value);
        });

        // Обновление состояния кнопок при изменении выделения
        document.getElementById('contentEditor').addEventListener('mouseup', () => {
            this.updateToolbar();
        });

        document.getElementById('contentEditor').addEventListener('keyup', () => {
            this.updateToolbar();
        });
    }

    executeCommand(command, value = null) {
        document.execCommand(command, false, value);
        document.getElementById('contentEditor').focus();
    }

    updateToolbar() {
        const editor = document.getElementById('contentEditor');
        const selection = window.getSelection();
        
        if (selection.rangeCount === 0) return;

        // Проверяем активные команды
        const commands = ['bold', 'italic', 'underline'];
        commands.forEach(cmd => {
            const btn = document.querySelector(`.tool-btn[data-command="${cmd}"]`);
            if (btn) {
                btn.classList.toggle('active', document.queryCommandState(cmd));
            }
        });

        // Обновляем шрифт и размер
        const fontFamily = document.queryCommandValue('fontName');
        const fontSize = document.queryCommandValue('fontSize');
        
        if (fontFamily) {
            document.getElementById('fontFamily').value = fontFamily;
        }
        
        if (fontSize) {
            document.getElementById('fontSize').value = fontSize + 'px';
        }
    }

    setupColorPickers() {
        const textColorPicker = document.getElementById('textColorPicker');
        const bgColorPicker = document.getElementById('bgColorPicker');
        const textColorInput = document.getElementById('textColor');
        const bgColorInput = document.getElementById('bgColor');

        textColorPicker.addEventListener('click', () => {
            textColorInput.click();
        });

        bgColorPicker.addEventListener('click', () => {
            bgColorInput.click();
        });

        textColorInput.addEventListener('input', (e) => {
            this.executeCommand('foreColor', e.target.value);
        });

        bgColorInput.addEventListener('input', (e) => {
            this.executeCommand('backColor', e.target.value);
        });
    }

    setupUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const startUploadBtn = document.getElementById('startUpload');
        const cancelUploadBtn = document.getElementById('cancelUpload');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const fileInfo = document.getElementById('fileInfo');

        // Открытие файлового диалога
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Выбор файла через диалог
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Кнопка загрузки
        startUploadBtn.addEventListener('click', async () => {
            if (!this.currentFile || this.uploading) return;
            
            this.uploading = true;
            startUploadBtn.disabled = true;
            cancelUploadBtn.disabled = true;
            progressContainer.style.display = 'block';
            
            try {
                // Симуляция прогресса (в реальном приложении используйте XMLHttpRequest для отслеживания)
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 5;
                    progressFill.style.width = `${progress}%`;
                    progressText.textContent = `${progress}%`;
                    
                    if (progress >= 100) {
                        clearInterval(interval);
                        this.performUpload();
                    }
                }, 100);
                
            } catch (error) {
                console.error('Upload error:', error);
                alert('Ошибка при загрузке файла');
                this.resetUpload();
            }
        });

        // Отмена загрузки
        cancelUploadBtn.addEventListener('click', () => {
            this.resetUpload();
        });
    }

    handleFileSelect(file) {
        this.currentFile = file;
        
        // Проверка размера (макс 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер: 50MB');
            this.resetUpload();
            return;
        }

        // Отображение информации о файле
        const fileInfo = document.getElementById('fileInfo');
        const startUploadBtn = document.getElementById('startUpload');
        
        const fileType = file.type.split('/')[0];
        const fileSize = this.formatFileSize(file.size);
        
        fileInfo.innerHTML = `
            <div><strong>Файл:</strong> ${file.name}</div>
            <div><strong>Тип:</strong> ${fileType}</div>
            <div><strong>Размер:</strong> ${fileSize}</div>
        `;
        
        startUploadBtn.disabled = false;
    }

    async performUpload() {
        try {
            const result = await this.api.uploadFile(this.currentFile);
            
            // Добавляем файл в список медиа
            this.mediaFiles.push({
                url: result.url,
                type: result.mimetype.split('/')[0],
                name: result.originalname
            });
            
            // Обновляем превью медиа
            this.updateMediaPreview();
            
            // Показываем уведомление
            alert('Файл успешно загружен!');
            
            this.resetUpload();
            
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Ошибка при загрузке файла');
            this.resetUpload();
        }
    }

    resetUpload() {
        this.currentFile = null;
        this.uploading = false;
        
        document.getElementById('fileInput').value = '';
        document.getElementById('fileInfo').innerHTML = '';
        document.getElementById('startUpload').disabled = true;
        document.getElementById('cancelUpload').disabled = false;
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
    }

    setupMediaInsertion() {
        document.getElementById('insertImage').addEventListener('click', () => {
            this.insertMedia('image');
        });

        document.getElementById('insertVideo').addEventListener('click', () => {
            this.insertMedia('video');
        });

        document.getElementById('insertAudio').addEventListener('click', () => {
            this.insertMedia('audio');
        });
    }

    insertMedia(type) {
        const editor = document.getElementById('contentEditor');
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Если есть загруженные файлы, предлагаем выбрать
        const mediaOfType = this.mediaFiles.filter(file => file.type === type);
        
        if (mediaOfType.length > 0) {
            const mediaList = mediaOfType.map((file, index) => 
                `<option value="${file.url}">${file.name}</option>`
            ).join('');
            
            const mediaUrl = prompt(`Выберите ${type}:\n\n${mediaOfType.map(f => f.name).join('\n')}\n\nИли введите URL:`, mediaOfType[0].url);
            
            if (mediaUrl) {
                this.insertMediaElement(type, mediaUrl, range);
            }
        } else {
            const mediaUrl = prompt(`Введите URL ${type} или загрузите файл:`, '');
            
            if (mediaUrl) {
                this.insertMediaElement(type, mediaUrl, range);
            }
        }
    }

    insertMediaElement(type, url, range) {
        let html = '';
        
        switch(type) {
            case 'image':
                html = `<img src="${url}" alt="${type}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0;">`;
                break;
            case 'video':
                html = `<video src="${url}" controls style="max-width: 100%; border-radius: 8px; margin: 1em 0;"></video>`;
                break;
            case 'audio':
                html = `<audio src="${url}" controls style="width: 100%; margin: 1em 0;"></audio>`;
                break;
        }
        
        const div = document.createElement('div');
        div.innerHTML = html;
        
        range.insertNode(div);
        document.getElementById('contentEditor').focus();
    }

    updateMediaPreview() {
        const mediaGrid = document.getElementById('mediaGrid');
        
        if (this.mediaFiles.length === 0) {
            mediaGrid.innerHTML = '<p>Нет загруженных файлов</p>';
            return;
        }
        
        mediaGrid.innerHTML = this.mediaFiles.map((file, index) => `
            <div class="media-item">
                ${file.type === 'image' ? 
                    `<img src="${file.url}" alt="${file.name}">` : 
                    file.type === 'video' ?
                    `<video src="${file.url}" style="height: 120px; object-fit: cover;"></video>` :
                    `<div style="height: 120px; display: flex; align-items: center; justify-content: center; background: #f0f0f0;">
                        <i class="fas fa-music" style="font-size: 2rem; color: #666;"></i>
                    </div>`
                }
                <div class="media-info">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${file.name}
                    </div>
                    <div class="media-actions">
                        <button class="btn btn-sm" onclick="editor.insertMediaAtCursor('${file.type}', '${file.url}')" title="Вставить">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-sm" onclick="editor.removeMedia(${index})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    insertMediaAtCursor(type, url) {
        const editor = document.getElementById('contentEditor');
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            this.insertMediaElement(type, url, range);
        } else {
            this.insertMediaElement(type, url, document.createRange());
        }
    }

    removeMedia(index) {
        if (confirm('Удалить этот файл?')) {
            this.mediaFiles.splice(index, 1);
            this.updateMediaPreview();
        }
    }

    setupAutoSave() {
        const editor = document.getElementById('contentEditor');
        
        // Автосохранение каждые 30 секунд
        setInterval(() => {
            if (this.api.currentLessonId) {
                const content = this.getContent();
                this.api.autoSave(JSON.stringify(content));
            }
        }, 30000);

        // Восстановление автосохранения при загрузке
        window.addEventListener('load', () => {
            const autoSaved = this.api.loadAutoSave();
            if (autoSaved) {
                if (confirm('Найдено автосохранение. Восстановить?')) {
                    this.setContent(JSON.parse(autoSaved));
                }
            }
        });
    }

    // Получение содержимого редактора в структурированном виде
    getContent() {
        const editor = document.getElementById('contentEditor');
        const content = {
            html: editor.innerHTML,
            text: editor.innerText,
            media: [...this.mediaFiles]
        };
        return content;
    }

    // Установка содержимого редактора
    setContent(content) {
        const editor = document.getElementById('contentEditor');
        
        if (content.html) {
            editor.innerHTML = content.html;
        }
        
        if (content.media) {
            this.mediaFiles = content.media;
            this.updateMediaPreview();
        }
    }

    // Вспомогательные методы
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    clearEditor() {
        document.getElementById('contentEditor').innerHTML = 
            '<p>Начните вводить текст здесь...</p>' +
            '<p>Используйте панель инструментов для форматирования.</p>';
        
        this.mediaFiles = [];
        this.updateMediaPreview();
        this.api.clearAutoSave();
    }
}

// Экспортируем редактор
window.ContentEditor = new ContentEditor();