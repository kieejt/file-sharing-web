import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, signup } from './helpers.js';

const cookieOf = (res: request.Response) => ([] as string[]).concat(res.headers['set-cookie'] ?? []).join(';');

describe('auth', () => {
  it('đăng ký: user đầu tiên là admin, cookie refresh là httpOnly + SameSite=Strict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'An', email: 'An@Example.com', password: 'Matkhau123' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.email).toBe('an@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    const cookie = cookieOf(res);
    expect(cookie).toMatch(/fs_refresh=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);

    const second = await signup();
    expect(second.user.role).toBe('user');
  });

  it('validate mật khẩu yếu và email trùng', async () => {
    const weak = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.com', password: '123' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.details.fields.password).toBeTruthy();

    const { email } = await signup();
    const dup = await request(app).post('/api/auth/register').send({ name: 'B', email, password: 'Matkhau123' });
    expect(dup.status).toBe(409);
  });

  it('đăng nhập sai / đúng, /me yêu cầu token', async () => {
    const { email } = await signup();
    expect((await request(app).post('/api/auth/login').send({ email, password: 'sai12345' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'khong@co.vn', password: 'sai12345' })).status).toBe(401);
    const ok = await request(app).post('/api/auth/login').send({ email, password: 'Matkhau123' });
    expect(ok.status).toBe(200);
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc')).status).toBe(401);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ok.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it('refresh token xoay vòng: token cũ không dùng lại được', async () => {
    const { agent } = await signup();
    const r1 = await agent.post('/api/auth/register').send({}); // không ảnh hưởng cookie hiện tại
    expect(r1.status).toBe(400);

    const login = await request(app).post('/api/auth/login').send({ email: (await signup()).email, password: 'Matkhau123' });
    const oldCookie = cookieOf(login).split(';')[0]!;
    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
    expect(reuse.status).toBe(401);
  });

  it('logout huỷ refresh token', async () => {
    const { agent } = await signup();
    expect((await agent.post('/api/auth/refresh')).status).toBe(200);
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    // Cookie đã bị xoá: refresh không còn phiên (204, không cấp token)
    const after = await agent.post('/api/auth/refresh');
    expect(after.status).toBe(204);
    expect(after.body).not.toHaveProperty('accessToken');
  });

  it('refresh không có cookie trả 204, cookie giả trả 401', async () => {
    expect((await request(app).post('/api/auth/refresh')).status).toBe(204);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', 'fs_refresh=gia-mao')).status).toBe(401);
  });

  it('đổi mật khẩu: đăng xuất phiên cũ, đăng nhập bằng mật khẩu mới', async () => {
    const { email, auth } = await signup();
    const other = await request(app).post('/api/auth/login').send({ email, password: 'Matkhau123' });
    const otherCookie = cookieOf(other).split(';')[0]!;

    const wrong = await request(app).post('/api/auth/password').set(auth).send({ currentPassword: 'x', newPassword: 'Moi123456' });
    expect(wrong.status).toBe(401);
    const ok = await request(app).post('/api/auth/password').set(auth).send({ currentPassword: 'Matkhau123', newPassword: 'Moi123456' });
    expect(ok.status).toBe(200);

    expect((await request(app).post('/api/auth/refresh').set('Cookie', otherCookie)).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email, password: 'Matkhau123' })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email, password: 'Moi123456' })).status).toBe(200);
  });

  it('cập nhật tên hiển thị', async () => {
    const { auth } = await signup();
    const res = await request(app).patch('/api/auth/me').set(auth).send({ name: '  Trần Bảo  ' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Trần Bảo');
  });
});

describe('security headers', () => {
  it('CSP không ép upgrade-insecure-requests (chạy được qua HTTP nội bộ)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).not.toMatch(/upgrade-insecure-requests/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
