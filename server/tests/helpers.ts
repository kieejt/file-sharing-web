import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();

let seq = 0;

export async function signup(name = 'Người dùng') {
  seq += 1;
  const agent = request.agent(app);
  const email = `user${seq}-${Date.now()}@example.com`;
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'Matkhau123' });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token: string = res.body.accessToken;
  return {
    agent,
    email,
    token,
    user: res.body.user as { id: string; role: string },
    auth: { Authorization: `Bearer ${token}` },
  };
}

export async function uploadFile(
  auth: Record<string, string>,
  name: string,
  content: Buffer | string = 'xin chào',
  opts: { folderId?: string; contentType?: string } = {},
) {
  const req = request(app).post('/api/files/upload').set(auth);
  if (opts.folderId) req.field('folderId', opts.folderId);
  const res = await req.attach('files', Buffer.isBuffer(content) ? content : Buffer.from(content), {
    filename: name,
    contentType: opts.contentType ?? 'application/octet-stream',
  });
  return res;
}

export const waitFor = async (fn: () => Promise<boolean>, ms = 2000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('waitFor timed out');
};
