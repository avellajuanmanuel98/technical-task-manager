import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import { ValidationError } from '../../lib/errors';
import * as importController from './import.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const okExt = /\.xlsx$/i.test(file.originalname);
    const okMime = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!okExt && !okMime) {
      cb(new ValidationError('Solo se admiten archivos .xlsx'));
      return;
    }
    cb(null, true);
  },
});

export const importRouter = Router();

importRouter.use(authenticate, requireRole(Role.ADMIN));

importRouter.get('/template', asyncHandler(importController.template));
importRouter.post('/preview', upload.single('file'), asyncHandler(importController.preview));
importRouter.post('/confirm', asyncHandler(importController.confirm));
