import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
