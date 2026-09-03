import type { Request, Response } from 'express';
import { paramValue } from '../../lib/params';
import { ValidationError } from '../../lib/errors';
import * as tasksService from './tasks.service';
import {
  cancelTaskSchema,
  createTaskSchema,
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
