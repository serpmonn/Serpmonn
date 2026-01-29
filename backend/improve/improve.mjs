import express from 'express';
import { body, validationResult } from 'express-validator';
import { sendImprovementEmail } from '../utils/improvementEmail.mjs';                                                                                                   // Импорт .mjs файла

const router = express.Router();

// Валидация данных формы
const improvementValidation = [
  body('name').optional().isLength({ max: 100 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('category').isString().notEmpty().isIn(['functionality', 'design', 'performance', 'content', 'bug', 'other']),
  body('title').isString().notEmpty().trim().isLength({ min: 5, max: 200 }),
  body('description').isString().notEmpty().trim().isLength({ min: 10, max: 2000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('language').optional().isString(),
  body('page').optional().isString()
];

// Единственный маршрут для отправки предложений
router.post('/', improvementValidation, async (req, res) => { 
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }

    const {
      name,
      email,
      category,
      title,
      description,
      priority = 'medium',
      language = 'ru',
      page = 'improve'
    } = req.body;

    // Отправляем письмо
    const result = await sendImprovementEmail({
      name,
      email,
      category,
      title,
      description,
      priority,
      language,
      page
    });

    console.log('✅ Improvement suggestion submitted:', { 
      category, 
      title: title.substring(0, 50) + '...',
      language 
    });

    return res.status(200).json({
      success: true,
      message: 'Предложение успешно отправлено',
      data: {
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error submitting improvement:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке предложения',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;