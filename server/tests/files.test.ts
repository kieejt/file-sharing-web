import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { app, signup, uploadFile } from './helpers.js';
import { User } from '../src/models/User.js';

const binaryParser = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('upload và quyền truy cập file', () => {
  it('giữ đúng tên tiếng Việt, nhận diện loại file, cộng dung lượng', async () => {
    const { auth, user } = await signup();
    const res = await uploadFile(auth, 'Báo cáo tài chính quý 3.pdf', 'pdf-content', { contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    const f = res.body.files[0];
    expect(f.name).toBe('Báo cáo tài chính quý 3.pdf');
    expect(f.kind).toBe('pdf');
    expect(f.previewable).toBe(true);
    expect(f.size).toBe(11);
    const u = await User.findById(user.id);
    expect(u!.storageUsed).toBe(11);
  });

  it('file được lưu với tên ngẫu nhiên, không lộ qua /uploads', async () => {
    const { auth, user } = await signup();
    await uploadFile(auth, 'bi-mat.txt', 'top secret');
    const dir = path.join(process.env.UPLOAD_DIR!, user.id);
    const names = fs.readdirSync(dir);
    expect(names).toHaveLength(1);
    expect(names[0]).not.toContain('bi-mat');
    expect((await request(app).get(`/uploads/${user.id}/${names[0]}`)).status).toBe(404);
  });

  it('người khác không xem / sửa / xoá được file', async () => {
    const owner = await signup();
    const stranger = await signup();
    const id = (await uploadFile(owner.auth, 'a.txt')).body.files[0].id;
    expect((await request(app).get(`/api/files/${id}`).set(stranger.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/files/${id}`).set(stranger.auth).send({ name: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/api/files/${id}`).set(stranger.auth)).status).toBe(404);
    expect((await request(app).get(`/api/files/${id}/links`).set(stranger.auth)).status).toBe(404);
    expect((await request(app).get(`/api/files/${id}`).set(owner.auth)).status).toBe(200);
  });

  it('signed URL: thiếu / sai token bị chặn, đúng token tải được và tăng lượt tải', async () => {
    const { auth } = await signup();
    const id = (await uploadFile(auth, 'ghi-chu.txt', 'nội dung')).body.files[0].id;
    expect((await request(app).get(`/api/media/${id}/content`)).status).toBe(403);
    expect((await request(app).get(`/api/media/${id}/content?t=abc`)).status).toBe(403);

    const links = (await request(app).get(`/api/files/${id}/links`).set(auth)).body;
    const view = await request(app).get(links.viewUrl);
    expect(view.status).toBe(200);
    expect(view.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(view.headers['content-security-policy']).toMatch(/sandbox/);
    expect(view.headers['x-content-type-options']).toBe('nosniff');
    expect(view.text).toBe('nội dung');

    const dl = await request(app).get(links.downloadUrl);
    expect(dl.status).toBe(200);
    expect(dl.headers['content-disposition']).toMatch(/^attachment/);
    expect(dl.headers['content-disposition']).toContain('filename=ghi-chu.txt');
    const after = await request(app).get(`/api/files/${id}`).set(auth);
    expect(after.body.file.downloadCount).toBe(1);
  });

  it('file HTML chỉ hiển thị dạng mã nguồn, SVG không xem trước được (chống XSS)', async () => {
    const { auth } = await signup();
    const payload = '<script>alert(1)</script>';

    const html = (await uploadFile(auth, 'trang.html', payload, { contentType: 'text/html' })).body.files[0];
    const htmlLinks = (await request(app).get(`/api/files/${html.id}/links`).set(auth)).body;
    const view = await request(app).get(htmlLinks.viewUrl);
    expect(view.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(view.headers['content-security-policy']).toMatch(/sandbox/);

    const svg = (await uploadFile(auth, 'logo.svg', payload, { contentType: 'image/svg+xml' })).body.files[0];
    expect(svg.previewable).toBe(false);
    const svgLinks = (await request(app).get(`/api/files/${svg.id}/links`).set(auth)).body;
    expect((await request(app).get(svgLinks.viewUrl)).status).toBe(403);
    const dl = await request(app).get(svgLinks.downloadUrl);
    expect(dl.headers['content-type']).toBe('application/octet-stream');
    expect(dl.headers['content-disposition']).toMatch(/^attachment/);
  });

  it('tải xuống giữ đúng tên tiếng Việt (RFC 5987)', async () => {
    const { auth } = await signup();
    const id = (await uploadFile(auth, 'Hóa đơn.txt', 'x')).body.files[0].id;
    const { downloadUrl } = (await request(app).get(`/api/files/${id}/links`).set(auth)).body;
    const dl = await request(app).get(downloadUrl);
    expect(dl.headers['content-disposition']).toContain(`filename*=UTF-8''${encodeURIComponent('Hóa đơn.txt')}`);
  });

  it('hỗ trợ HTTP Range (tua video / tải tiếp)', async () => {
    const { auth } = await signup();
    const id = (await uploadFile(auth, 'so.txt', '0123456789')).body.files[0].id;
    const { viewUrl } = (await request(app).get(`/api/files/${id}/links`).set(auth)).body;
    const res = await request(app).get(viewUrl).set('Range', 'bytes=2-5');
    expect(res.status).toBe(206);
    expect(res.text).toBe('2345');
  });

  it('tạo ảnh thu nhỏ WebP cho ảnh', async () => {
    const { auth } = await signup();
    const png = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#3366cc' } }).png().toBuffer();
    const f = (await uploadFile(auth, 'anh.png', png, { contentType: 'image/png' })).body.files[0];
    expect(f.kind).toBe('image');
    expect(f.thumbUrl).toMatch(/\/api\/media\/.+\/thumb\?t=/);
    const thumb = await request(app).get(f.thumbUrl).buffer(true).parse(binaryParser);
    expect(thumb.status).toBe(200);
    expect(thumb.headers['content-type']).toBe('image/webp');
    const meta = await sharp(thumb.body as Buffer).metadata();
    expect(meta.width).toBe(480);
  });

  it('vượt hạn mức dung lượng: từ chối và không trừ dung lượng', async () => {
    const { auth, user } = await signup();
    await User.updateOne({ _id: user.id }, { $set: { storageQuota: 100 } });
    const ok = await uploadFile(auth, 'nho.txt', 'x'.repeat(60));
    expect(ok.status).toBe(201);
    const over = await uploadFile(auth, 'to.txt', 'y'.repeat(60));
    expect(over.status).toBe(413);
    expect(over.body.error.code).toBe('QUOTA_EXCEEDED');
    expect((await User.findById(user.id))!.storageUsed).toBe(60);
    expect(fs.readdirSync(path.join(process.env.UPLOAD_DIR!, user.id))).toHaveLength(1);
  });

  it('file vượt giới hạn kích thước bị từ chối (413)', async () => {
    const { auth, user } = await signup();
    await User.updateOne({ _id: user.id }, { $set: { storageQuota: 50 * 1024 * 1024 } });
    const res = await uploadFile(auth, 'lon.bin', Buffer.alloc(6 * 1024 * 1024));
    expect(res.status).toBe(413);
  });

  it('tìm kiếm an toàn với ký tự regex, lọc theo loại', async () => {
    const { auth } = await signup();
    await uploadFile(auth, 'Hợp đồng (bản cuối).docx');
    await uploadFile(auth, 'anh-chup.jpg', 'x', { contentType: 'image/jpeg' });
    const evil = await request(app).get('/api/files').query({ q: '(a+)+$' }).set(auth);
    expect(evil.status).toBe(200);
    expect(evil.body.total).toBe(0);
    const paren = await request(app).get('/api/files').query({ q: '(bản' }).set(auth);
    expect(paren.body.items.map((i: { name: string }) => i.name)).toEqual(['Hợp đồng (bản cuối).docx']);
    const imgs = await request(app).get('/api/files').query({ kind: 'image' }).set(auth);
    expect(imgs.body.total).toBe(1);
  });

  it('đổi tên, mô tả, loại bỏ ký tự đường dẫn', async () => {
    const { auth } = await signup();
    const id = (await uploadFile(auth, 'a.txt')).body.files[0].id;
    const res = await request(app).patch(`/api/files/${id}`).set(auth).send({ name: '../../etc/passwd', description: 'mô tả' });
    expect(res.status).toBe(200);
    expect(res.body.file.name).toBe('....etcpasswd');
    expect(res.body.file.description).toBe('mô tả');
    expect((await request(app).patch(`/api/files/${id}`).set(auth).send({ name: '   ' })).status).toBe(400);
  });
});
