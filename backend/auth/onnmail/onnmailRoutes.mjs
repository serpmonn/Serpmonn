import express from 'express';
import rateLimit from 'express-rate-limit';
import verifyToken from '../verifyToken.mjs';
import {
    createMailbox,
    changeMailboxPassword,
    linkMailbox,
    deleteMailbox
} from './onnmailController.mjs';

const router = express.Router();

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов, попробуйте позже'
});

const passwordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Слишком много запросов, попробуйте позже'
});

router.post('/create-mailbox', apiLimiter, verifyToken, createMailbox);
router.post('/change-password', passwordLimiter, verifyToken, changeMailboxPassword);
router.post('/link-mailbox', passwordLimiter, verifyToken, linkMailbox);
router.post('/delete-mailbox', passwordLimiter, verifyToken, deleteMailbox);

export default router;
