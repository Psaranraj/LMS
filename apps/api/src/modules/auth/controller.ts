import type { Request, Response } from 'express';
import type { LoginInput, RegisterInput } from '@lms/shared-validation';
import { me } from '../../lib/params.js';
import * as service from './service.js';

export async function register(req: Request, res: Response) {
  res.status(201).json(await service.register(req.body as RegisterInput, req, res));
}
export async function login(req: Request, res: Response) {
  res.json(await service.login(req.body as LoginInput, req, res));
}
export async function refresh(req: Request, res: Response) {
  res.json(await service.refresh(req, res));
}
export async function logout(req: Request, res: Response) {
  await service.logout(req, res);
  res.status(204).end();
}
export async function currentUser(req: Request, res: Response) {
  res.json({ user: await service.currentUser(me(req)) });
}
