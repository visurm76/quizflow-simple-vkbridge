const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

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

// Фильтр файлов
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|ogg|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Неподдерживаемый тип файла'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: fileFilter
});

// POST загрузить файл
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.split('/')[0]; // image, video, audio
        
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
router.get('/', (req, res) => {
    try {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                return res.status(500).json({ error: 'Не удалось прочитать файлы' });
            }
            
            const fileList = files.map(file => {
                const filePath = path.join(uploadDir, file);
                const stats = fs.statSync(filePath);
                
                return {
                    filename: file,
                    url: `/uploads/${file}`,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    type: path.extname(file).substring(1)
                };
            });
            
            res.json(fileList);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE удалить файл
router.delete('/:filename', (req, res) => {
    try {
        const filePath = path.join(uploadDir, req.params.filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ message: 'Файл удален' });
        } else {
            res.status(404).json({ error: 'Файл не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;