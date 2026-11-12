import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, signup, uploadFile } from './helpers.js';
import { User } from '../src/models/User.js';

async function mkdir(auth: Record<string, string>, name: string, parentId?: string) {
  const res = await request(app).post('/api/folders').set(auth).send({ name, parentId: parentId ?? null });
  expect(res.status).toBe(201);
  return res.body.folder.id as string;
}

describe('thư mục', () => {
  it('tạo cây thư mục, breadcrumbs, upload vào thư mục', async () => {
    const { auth } = await signup();
    const a = await mkdir(auth, 'Công việc');
    const b = await mkdir(auth, '2026', a);
    await uploadFile(auth, 'ke-hoach.txt', 'x', { folderId: b });

    const root = await request(app).get('/api/drive').set(auth);
    expect(root.body.folders.map((f: { name: string }) => f.name)).toEqual(['Công việc']);
    expect(root.body.files).toHaveLength(0);

    const inner = await request(app).get('/api/drive').query({ folderId: b }).set(auth);
    expect(inner.body.breadcrumbs.map((c: { name: string }) => c.name)).toEqual(['Công việc', '2026']);
    expect(inner.body.files[0].name).toBe('ke-hoach.txt');
  });

  it('không cho di chuyển thư mục vào chính nó / con của nó', async () => {
    const { auth } = await signup();
    const a = await mkdir(auth, 'A');
    const b = await mkdir(auth, 'B', a);
    const c = await mkdir(auth, 'C', b);
    expect((await request(app).patch(`/api/folders/${a}`).set(auth).send({ parentId: c })).status).toBe(400);
    expect((await request(app).patch(`/api/folders/${a}`).set(auth).send({ parentId: a })).status).toBe(400);

    // Di chuyển B ra gốc: C phải cập nhật breadcrumbs theo
    expect((await request(app).patch(`/api/folders/${b}`).set(auth).send({ parentId: 'root' })).status).toBe(200);
    const inC = await request(app).get('/api/drive').query({ folderId: c }).set(auth);
    expect(inC.body.breadcrumbs.map((x: { name: string }) => x.name)).toEqual(['B', 'C']);
  });

  it('không truy cập được thư mục của người khác', async () => {
    const owner = await signup();
    const other = await signup();
    const a = await mkdir(owner.auth, 'Riêng tư');
    expect((await request(app).get('/api/drive').query({ folderId: a }).set(other.auth)).status).toBe(404);
    expect((await uploadFile(other.auth, 'x.txt', 'x', { folderId: a })).status).toBe(404);
    expect((await request(app).post('/api/folders').set(other.auth).send({ name: 'x', parentId: a })).status).toBe(404);
  });

  it('di chuyển hàng loạt', async () => {
    const { auth } = await signup();
    const target = await mkdir(auth, 'Đích');
    const sub = await mkdir(auth, 'Con');
    const f1 = (await uploadFile(auth, '1.txt')).body.files[0].id;
    const f2 = (await uploadFile(auth, '2.txt')).body.files[0].id;
    const res = await request(app).post('/api/drive/move').set(auth).send({ fileIds: [f1, f2], folderIds: [sub], targetId: target });
    expect(res.status).toBe(204);
    const inT = await request(app).get('/api/drive').query({ folderId: target }).set(auth);
    expect(inT.body.files).toHaveLength(2);
    expect(inT.body.folders).toHaveLength(1);
  });
});

describe('thùng rác', () => {
  it('xoá thư mục đưa cả cây con vào thùng rác; khôi phục trả lại toàn bộ', async () => {
    const { auth } = await signup();
    const a = await mkdir(auth, 'Dự án');
    const b = await mkdir(auth, 'Tài liệu', a);
    await uploadFile(auth, 'x.txt', 'abc', { folderId: b });
    await uploadFile(auth, 'y.txt', 'abcd', { folderId: a });

    expect((await request(app).delete(`/api/folders/${a}`).set(auth)).status).toBe(204);
    expect((await request(app).get('/api/drive').set(auth)).body.folders).toHaveLength(0);
    expect((await request(app).get('/api/files').set(auth)).body.total).toBe(0);
    expect((await request(app).get('/api/drive').query({ folderId: b }).set(auth)).status).toBe(404);

    const trash = await request(app).get('/api/trash').set(auth);
    expect(trash.body.items).toHaveLength(1);
    expect(trash.body.items[0]).toMatchObject({ type: 'folder', name: 'Dự án', itemCount: 2, size: 7 });

    expect((await request(app).post(`/api/trash/${trash.body.items[0].batch}/restore`).set(auth)).status).toBe(204);
    const inB = await request(app).get('/api/drive').query({ folderId: b }).set(auth);
    expect(inB.body.files).toHaveLength(1);
    expect((await request(app).get('/api/trash').set(auth)).body.items).toHaveLength(0);
  });

  it('khôi phục file khi thư mục cha đã bị xoá: đưa về thư mục gốc', async () => {
    const { auth } = await signup();
    const a = await mkdir(auth, 'A');
    const id = (await uploadFile(auth, 'f.txt', 'x', { folderId: a })).body.files[0].id;
    await request(app).delete(`/api/files/${id}`).set(auth);
    await request(app).delete(`/api/folders/${a}`).set(auth);
    const items = (await request(app).get('/api/trash').set(auth)).body.items;
    const fileItem = items.find((i: { type: string }) => i.type === 'file');
    await request(app).post(`/api/trash/${fileItem.batch}/restore`).set(auth);
    const root = await request(app).get('/api/drive').set(auth);
    expect(root.body.files.map((f: { id: string }) => f.id)).toEqual([id]);
  });

  it('xoá vĩnh viễn giải phóng dung lượng và xoá file trên đĩa', async () => {
    const { auth, user } = await signup();
    const id = (await uploadFile(auth, 'f.txt', '12345')).body.files[0].id;
    expect((await User.findById(user.id))!.storageUsed).toBe(5);
    await request(app).delete(`/api/files/${id}`).set(auth);
    // File trong thùng rác vẫn tính dung lượng
    expect((await User.findById(user.id))!.storageUsed).toBe(5);
    const { batch } = (await request(app).get('/api/trash').set(auth)).body.items[0];
    expect((await request(app).delete(`/api/trash/${batch}`).set(auth)).status).toBe(204);
    expect((await User.findById(user.id))!.storageUsed).toBe(0);
    expect(fs.readdirSync(path.join(process.env.UPLOAD_DIR!, user.id))).toHaveLength(0);
  });

  it('dọn sạch thùng rác', async () => {
    const { auth, user } = await signup();
    const ids = [];
    for (const n of ['1.txt', '2.txt', '3.txt']) ids.push((await uploadFile(auth, n, 'ab')).body.files[0].id);
    await request(app).post('/api/drive/trash').set(auth).send({ fileIds: ids.slice(0, 2) });
    const res = await request(app).delete('/api/trash').set(auth);
    expect(res.body.freed).toBe(4);
    expect((await User.findById(user.id))!.storageUsed).toBe(2);
  });

  it('người khác không khôi phục / xoá được thùng rác của mình', async () => {
    const owner = await signup();
    const other = await signup();
    const id = (await uploadFile(owner.auth, 'f.txt')).body.files[0].id;
    await request(app).delete(`/api/files/${id}`).set(owner.auth);
    const { batch } = (await request(app).get('/api/trash').set(owner.auth)).body.items[0];
    expect((await request(app).post(`/api/trash/${batch}/restore`).set(other.auth)).status).toBe(404);
    expect((await request(app).delete(`/api/trash/${batch}`).set(other.auth)).status).toBe(404);
  });
});
