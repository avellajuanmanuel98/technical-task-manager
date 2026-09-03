import type { Request, Response } from 'express';
import { paramValue } from '../../lib/params';
import { ValidationError } from '../../lib/errors';
import * as tasksService from './tasks.service';
import { buildTasksCsv, buildTasksXlsx } from './tasks.export';
import {
  cancelTaskSchema,
  createTaskSchema,
  exportTasksQuerySchema,
  finishTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from './tasks.validation';

function parseTaskId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Id de tarea inválido');
  }
  return id;
}

export async function create(req: Request, res: Response) {
  const input = createTaskSchema.parse(req.body);
  const task = await tasksService.createTask(req.user!, input);
  res.status(201).json(task);
}

export async function list(req: Request, res: Response) {
  const query = listTasksQuerySchema.parse(req.query);
  const result = await tasksService.listTasks(req.user!, query);
  res.json(result);
}

export async function exportTasks(req: Request, res: Response) {
  const query = exportTasksQuerySchema.parse(req.query);
  const tasks = await tasksService.getTasksForExport(req.user!, query);

  const timestamp = new Date().toISOString().slice(0, 10);
  if (query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tareas-${timestamp}.csv"`);
    res.send(buildTasksCsv(tasks));
    return;
  }

  const buffer = await buildTasksXlsx(tasks);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="tareas-${timestamp}.xlsx"`);
  res.send(buffer);
}

export async function getById(req: Request, res: Response) {
  const id = parseTaskId(paramValue(req, 'id'));
  const task = await tasksService.getTaskById(req.user!, id);
  res.json(task);
}

export async function update(req: Request, res: Response) {
  const id = parseTaskId(paramValue(req, 'id'));
  const input = updateTaskSchema.parse(req.body);
  const task = await tasksService.updateTask(req.user!, id, input);
  res.json(task);
}

export async function start(req: Request, res: Response) {
  const id = parseTaskId(paramValue(req, 'id'));
  const task = await tasksService.startTask(req.user!, id);
  res.json(task);
}

export async function finish(req: Request, res: Response) {
  const id = parseTaskId(paramValue(req, 'id'));
  const input = finishTaskSchema.parse(req.body ?? {});
  const task = await tasksService.finishTask(req.user!, id, input.observations);
  res.json(task);
}

export async function cancel(req: Request, res: Response) {
  const id = parseTaskId(paramValue(req, 'id'));
  const input = cancelTaskSchema.parse(req.body);
  const task = await tasksService.cancelTask(req.user!, id, input.reason);
  res.json(task);
}
