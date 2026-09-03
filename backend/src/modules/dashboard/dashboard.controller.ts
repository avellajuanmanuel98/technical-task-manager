import type { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';
import { dashboardQuerySchema } from './dashboard.validation';

export async function getStats(req: Request, res: Response) {
  const query = dashboardQuerySchema.parse(req.query);
  const stats = await dashboardService.getDashboardStats(query);
  res.json(stats);
}
