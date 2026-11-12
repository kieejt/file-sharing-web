import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, signup, uploadFile } from './helpers.js';
import { ShareLink } from '../src/models/ShareLink.js';

async function setup(opts: Record<string, unknown> = {}, file = { name: 'tai-lieu.txt', content: 'chia sẻ' }) {
  const owner = await signup('Lê Thu Hà');
  const f = (await uploadFile(owner.auth, file.name, file.content)).body.files[0];
  const res = await request(app).post(`/api/files/${f.id}/shares`).set(owner.auth).send(opts);
  expect(res.status).toBe(201);
  return { owner, file: f, share: res.body.share };
}

describe('chia sẻ', () => {
  it('link công khai: xem thông tin, xem trước, tải xuống và đếm lượt', async () => {
    const { share, owner, file } = await setup();
    expect(share.path).toBe(`/s/${share.token}`);
    const meta = await request(app).get(`/api/public/s/${share.token}`);
    expect(meta.status).toBe(200);
    expect(meta.body.requiresPassword).toBe(false);
    expect(meta.body.file).toMatchObject({ name: 'tai-lieu.txt', previewable: true });
    expect(meta.body.share.ownerName).toBe('Lê Thu Hà');
    expect(meta.body.file).not.toHaveProperty('storageKey');

    expect((await request(app).get(`/api/public/s/${share.token}/content`)).text).toBe('chia sẻ');
    const dl = await request(app).get(`/api/public/s/${share.token}/content?dl=1`);
    expect(dl.headers['content-disposition']).toMatch(/^attachment/);

    const list = await request(app).get(`/api/files/${file.id}/shares`).set(owner.auth);
    expect(list.body.shares[0]).toMatchObject({ downloadCount: 1, viewCount: 1, status: 'active' });
  });

  it('link có mật khẩu: phải mở khoá mới xem / tải được', async () => {
    const { share } = await setup({ password: 'mo-khoa' });
    expect(share.hasPassword).toBe(true);
    const meta = await request(app).get(`/api/public/s/${share.token}`);
    expect(meta.body).toEqual({ requiresPassword: true });
    expect((await request(app).get(`/api/public/s/${share.token}/content?dl=1`)).status).toBe(401);
    expect((await request(app).post(`/api/public/s/${share.token}/unlock`).send({ password: 'sai' })).status).toBe(401);

    const unlock = await request(app).post(`/api/public/s/${share.token}/unlock`).send({ password: 'mo-khoa' });
    expect(unlock.status).toBe(200);
    const a = unlock.body.accessToken;
    const meta2 = await request(app).get(`/api/public/s/${share.token}`).set('X-Share-Access', a);
    expect(meta2.body.file.name).toBe('tai-lieu.txt');
    expect((await request(app).get(`/api/public/s/${share.token}/content?dl=1&a=${a}`)).status).toBe(200);
  });

  it('token mở khoá của link này không dùng được cho link khác', async () => {
    const one = await setup({ password: 'mot1' });
    const two = await setup({ password: 'hai2' });
    const a = (await request(app).post(`/api/public/s/${one.share.token}/unlock`).send({ password: 'mot1' })).body.accessToken;
    expect((await request(app).get(`/api/public/s/${two.share.token}/content?dl=1&a=${a}`)).status).toBe(401);
  });

  it('giới hạn lượt tải: hết lượt trả 410 và không cho xem trước', async () => {
    const { share } = await setup({ maxDownloads: 2 });
    const meta = await request(app).get(`/api/public/s/${share.token}`);
    expect(meta.body.file.previewable).toBe(false);
    expect(meta.body.share.remainingDownloads).toBe(2);
    expect((await request(app).get(`/api/public/s/${share.token}/content`)).status).toBe(403);

    const results = await Promise.all(
      [1, 2, 3, 4].map(() => request(app).get(`/api/public/s/${share.token}/content?dl=1`)),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(results.filter((r) => r.status === 410)).toHaveLength(2);
    expect((await ShareLink.findById(share.id))!.downloadCount).toBe(2);
  });

  it('link hết hạn trả 410', async () => {
    const { share } = await setup({ expiresInHours: 1 });
    expect(new Date(share.expiresAt).getTime()).toBeGreaterThan(Date.now());
    await ShareLink.updateOne({ _id: share.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get(`/api/public/s/${share.token}`)).status).toBe(410);
  });

  it('thu hồi link và file trong thùng rác đều làm link ngừng hoạt động', async () => {
    const { share, owner, file } = await setup();
    const stranger = await signup();
    expect((await request(app).delete(`/api/shares/${share.id}`).set(stranger.auth)).status).toBe(404);
    expect((await request(app).delete(`/api/shares/${share.id}`).set(owner.auth)).status).toBe(204);
    expect((await request(app).get(`/api/public/s/${share.token}`)).status).toBe(404);

    const s2 = (await request(app).post(`/api/files/${file.id}/shares`).set(owner.auth).send({})).body.share;
    await request(app).delete(`/api/files/${file.id}`).set(owner.auth);
    expect((await request(app).get(`/api/public/s/${s2.token}`)).status).toBe(404);
  });

  it('không tạo được link cho file của người khác', async () => {
    const { file } = await setup();
    const stranger = await signup();
    expect((await request(app).post(`/api/files/${file.id}/shares`).set(stranger.auth).send({})).status).toBe(404);
  });

  it('danh sách link đang chia sẻ của tôi', async () => {
    const { owner } = await setup({ password: 'abcd', maxDownloads: 5 });
    const res = await request(app).get('/api/shares').set(owner.auth);
    expect(res.body.shares).toHaveLength(1);
    expect(res.body.shares[0]).toMatchObject({ hasPassword: true, maxDownloads: 5, file: { name: 'tai-lieu.txt' } });
  });
});
