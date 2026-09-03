import type { Request, Response } from 'express';
import { paramValue } from '../../lib/params';
import * as usersService from './users.service';
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from './users.validation';

export async function list(req: Request, res: Response) {
  const query = listUsersQuerySchema.parse(req.query);
  const users = await usersService.listUsers(query);
  res.json(users);
}

export async function getById(req: Request, res: Response) {
  const user = await usersService.getUserById(paramValue(req, 'id'));
  res.json(user);
}

export async function create(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  const user = await usersService.createUser(input);
  res.status(201).json(user);
}

export async function update(req: Request, res: Response) {
  const input = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(paramValue(req, 'id'), input);
  res.json(user);
}
