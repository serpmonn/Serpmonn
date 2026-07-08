import express from 'express';
import { body, validationResult } from 'express-validator';
import { sendImprovementEmail } from '../utils/improvementEmail.mjs';
import { getImproveStats, saveImprovementSuggestion } from './improve.model.mjs';

const router = express.Router();

const improvementValidation = [
  body('name').optional().isLength({ max: 100 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('category').isString().notEmpty().isIn(['functionality', 'design', 'performance', 'content', 'bug', 'other']),
  body('title').isString().notEmpty().trim().isLength({ min: 5, max: 200 }),
  body('description').isString().notEmpty().trim().isLength({ min: 10, max: 2000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('language').optional().isString(),
  body('page').optional().isString(),
];

router.get('/stats', async (req, res) => {
  try {
    const stats = await getImproveStats();
    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error loading improvement stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка загрузки статистики',
      stats: {
        accepted: 2,
        in_progress: 0,
        implemented: 0,
        this_week: 0,
      },
    });
  }
});

router.post('/', improvementValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array(),
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
      page = 'improve',
    } = req.body;

    const suggestionId = await saveImprovementSuggestion({
      name,
      email,
      category,
      title,
      description,
      priority,
      language,
      page,
    });

    const result = await sendImprovementEmail({
      name,
      email,
      category,
      title,
      description,
      priority,
      language,
      page,
    });

    const stats = await getImproveStats();

    console.log('✅ Improvement suggestion submitted:', {
      id: suggestionId,
      category,
      title: `${title.substring(0, 50)}...`,
      language,
    });

    return res.status(200).json({
      success: true,
      message: 'Предложение успешно отправлено',
      data: {
        id: suggestionId,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
      },
      stats,
    });
  } catch (error) {
    console.error('❌ Error submitting improvement:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке предложения',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
