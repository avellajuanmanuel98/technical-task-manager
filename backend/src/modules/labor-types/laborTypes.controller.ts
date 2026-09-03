import type { Request, Response } from 'express';
import { paramValue } from '../../lib/params';
import { z } from 'zod';
import * as laborTypesService from './laborTypes.service';
import { createLaborTypeSchema, updateLaborTypeSchema } from './laborTypes.validation';

const listQuerySchema = z.object({ active: z.coerce.boolean().optional() });

export async function list(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  const laborTypes = await laborTypesService.listLaborTypes(query);
  res.json(laborTypes);
}

export async function create(req: Request, res: Response) {
  const input = createLaborTypeSchema.parse(req.body);
  const laborType = await laborTypesService.createLaborType(input);
  res.status(201).json(laborType);
}

export async function update(req: Request, res: Response) {
  const input = updateLaborTypeSchema.parse(req.body);
  const laborType = await laborTypesService.updateLaborType(paramValue(req, 'id'), input);
  res.json(laborType);
}
