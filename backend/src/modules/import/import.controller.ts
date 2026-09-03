import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../lib/errors';
import * as importService from './import.service';
import { buildTemplateBuffer } from './import.template';
import { confirmImportSchema } from './import.validation';

const previewOptionsSchema = z.object({
  defaultDate: z.string().trim().min(1).optional(),
});

export async function preview(req: Request, res: Response) {
  if (!req.file) {
    throw new ValidationError('Debe adjuntar un archivo (.xlsx)');
  }
  const options = previewOptionsSchema.parse(req.body ?? {});
  const result = await importService.previewImport(req.file.buffer, options);
  res.json(result);
}

export async function confirm(req: Request, res: Response) {
  const input = confirmImportSchema.parse(req.body);
  const result = await importService.confirmImport(req.user!.id, input.rows);
  res.json(result);
}

export async function template(_req: Request, res: Response) {
  const buffer = await buildTemplateBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-importacion-tareas.xlsx"');
  res.send(buffer);
}
