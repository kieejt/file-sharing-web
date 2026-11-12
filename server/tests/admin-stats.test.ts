import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, signup, uploadFile, waitFor } from './helpers.js';
import { Activity } from '../src/models/Activity.js';
import { File } from '../src/models/File.js';

describe('quản trị', () => {
  it('chỉ admin truy cập được', async () => {
    const admin = await signup('Admin');
    const user = await signup();
    expect(admin.user.role).toBe('admin');
    expect((await request(app).get('/api/admin/users').set(user.auth)).status).toBe(403);
    expect((await request(app).get('/api/admin/overview').set(admin.auth)).status).toBe(200);
  });

  it('liệt kê, tìm kiếm, đổi hạn mức, khoá tài khoản', async () => {
    const admin = await signup('Admin');
    const user = await signup('Phạm Quốc Huy');
    await uploadFile(user.auth, 'a.txt', 'abc');

    const list = await request(app).get('/api/admin/users').query({ q: 'Quốc' }).set(admin.auth);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ name: 'Phạm Quốc Huy', fileCount: 1, storageUsed: 3 });

    const quota = await request(app).patch(`/api/admin/users/${user.user.id}`).set(admin.auth).send({ storageQuotaMb: 50 });
    expect(quota.body.user.storageQuota).toBe(50 * 1024 * 1024);

    await request(app).patch(`/api/admin/users/${user.user.id}`).set(admin.auth).send({ disabled: true });
    expect((await request(app).get('/api/auth/me').set(user.auth)).status).toBe(403);
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'Matkhau123' })).status).toBe(403);
    expect((await user.agent.post('/api/auth/refresh')).status).toBe(401);
  });

  it('admin không tự hạ quyền / tự khoá / tự xoá', async () => {
    const admin = await signup('Admin');
    const id = admin.user.id;
    expect((await request(app).patch(`/api/admin/users/${id}`).set(admin.auth).send({ role: 'user' })).status).toBe(400);
    expect((await request(app).patch(`/api/admin/users/${id}`).set(admin.auth).send({ disabled: true })).status).toBe(400);
    expect((await request(app).delete(`/api/admin/users/${id}`).set(admin.auth)).status).toBe(400);
  });

  it('xoá người dùng xoá luôn file trên đĩa', async () => {
    const admin = await signup('Admin');
    const user = await signup();
    await uploadFile(user.auth, 'a.txt');
    const dir = path.join(process.env.UPLOAD_DIR!, user.user.id);
    expect(fs.existsSync(dir)).toBe(true);
    expect((await request(app).delete(`/api/admin/users/${user.user.id}`).set(admin.auth)).status).toBe(204);
    expect(fs.existsSync(dir)).toBe(false);
    expect(await File.countDocuments({ userId: user.user.id })).toBe(0);
  });
});

describe('thống kê', () => {
  it('tổng hợp dung lượng, loại file, hoạt động theo ngày', async () => {
    const { auth, user } = await signup();
    await uploadFile(auth, 'a.pdf', 'aaaa', { contentType: 'application/pdf' });
    const id = (await uploadFile(auth, 'b.txt', 'bb')).body.files[0].id;
    const { downloadUrl } = (await request(app).get(`/api/files/${id}/links`).set(auth)).body;
    await request(app).get(downloadUrl);
    await waitFor(async () => (await Activity.countDocuments({ userId: user.id })) >= 3);

    const res = await request(app).get('/api/stats').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.storage.used).toBe(6);
    expect(res.body.counts).toMatchObject({ files: 2, downloads: 1 });
    expect(res.body.byKind.map((k: { kind: string }) => k.kind).sort()).toEqual(['pdf', 'text']);
    expect(res.body.daily).toHaveLength(30);
    const today = res.body.daily.at(-1);
    expect(today).toMatchObject({ uploads: 2, downloads: 1 });
    expect(res.body.topFiles[0]).toMatchObject({ id, downloadCount: 1 });
  });
});
