#!/usr/bin/env node
/**
 * Kiểm thử end-to-end logic trên stack đang chạy (qua proxy Vite giống trình duyệt).
 *   npm run dev:mem   (terminal khác)
 *   node scripts/e2e-api.mjs [http://localhost:5173]
 * Đồng thời tạo dữ liệu mẫu cho tài khoản demo.
 */
import assert from 'node:assert/strict';

const BASE = process.argv[2] ?? 'http://localhost:5173';
let passed = 0;

function client() {
  let cookie = '';
  let token = '';
  const call = async (method, path, { body, form, headers = {}, raw } = {}) => {
    const h = { ...headers };
    if (cookie) h.cookie = cookie;
    if (token) h.authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      h['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, { method, headers: h, body: payload, redirect: 'manual' });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) if (c.startsWith('fs_refresh=')) cookie = c.split(';')[0];
    if (raw) return res;
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, body: json, headers: res.headers };
  };
  return {
    call,
    setToken: (t) => (token = t),
    clearToken: () => (token = ''),
  };
}

async function step(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}\n       ${err.message}`);
    process.exitCode = 1;
    throw err;
  }
}

function fileForm(name, content, type, folderId) {
  const fd = new FormData();
  if (folderId) fd.append('folderId', folderId);
  fd.append('files', new Blob([content], { type }), name);
  return fd;
}

/** PDF tối giản hợp lệ (1 trang, có chữ) để trình duyệt hiển thị được. */
function makePdf(lines) {
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 20 : 12} Tf 60 ${760 - i * 28} Td (${l}) Tj ET`).join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
}

/** Ảnh PNG mẫu (sinh bằng sharp từ SVG, màu phẳng, không gradient). */
async function makePng(w, h, bg, shapes) {
  const { default: sharp } = await import('../server/node_modules/sharp/lib/index.js').catch(() => import('sharp'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/>${shapes}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

console.log(`E2E API trên ${BASE}\n`);

const demo = client();
const admin = client();
const guest = client();
const ids = {};

await step('health check qua proxy', async () => {
  const r = await guest.call('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.db, true);
});

await step('đăng nhập sai bị từ chối, đúng thì nhận token + cookie httpOnly', async () => {
  assert.equal((await demo.call('POST', '/api/auth/login', { body: { email: 'demo@fileshare.vn', password: 'sai-mat-khau1' } })).status, 401);
  const r = await demo.call('POST', '/api/auth/login', { body: { email: 'demo@fileshare.vn', password: 'Demo12345' } });
  assert.equal(r.status, 200);
  assert.ok(r.body.accessToken);
  demo.setToken(r.body.accessToken);
  const a = await admin.call('POST', '/api/auth/login', { body: { email: 'admin@fileshare.vn', password: 'Admin12345' } });
  assert.equal(a.body.user.role, 'admin');
  admin.setToken(a.body.accessToken);
});

await step('dọn dữ liệu cũ của tài khoản demo (chạy lại nhiều lần được)', async () => {
  const d = await demo.call('GET', '/api/drive');
  await demo.call('POST', '/api/drive/trash', { body: { fileIds: d.body.files.map((f) => f.id), folderIds: d.body.folders.map((f) => f.id) } });
  await demo.call('DELETE', '/api/trash');
  const after = await demo.call('GET', '/api/drive');
  assert.equal(after.body.files.length + after.body.folders.length, 0);
});

await step('refresh token xoay vòng qua cookie', async () => {
  const r = await demo.call('POST', '/api/auth/refresh');
  assert.equal(r.status, 200);
  demo.setToken(r.body.accessToken);
});

await step('tạo cây thư mục', async () => {
  const mk = async (name, parentId = null) => (await demo.call('POST', '/api/folders', { body: { name, parentId } })).body.folder.id;
  ids.work = await mk('Công việc');
  ids.q3 = await mk('Báo cáo quý 3', ids.work);
  ids.design = await mk('Thiết kế');
  ids.personal = await mk('Cá nhân');
  const d = await demo.call('GET', '/api/drive', { headers: {} });
  assert.equal(d.body.folders.length, 3);
});

await step('tải lên nhiều loại file, giữ tên tiếng Việt', async () => {
  const up = async (name, content, type, folderId) => {
    const r = await demo.call('POST', '/api/files/upload', { form: fileForm(name, content, type, folderId) });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body.files[0];
  };
  const pdf = makePdf(['Bao cao doanh thu Q3 2026', 'Doanh thu thuan: 4.218.600.000 VND', 'Tang truong so voi Q2: 12,4%', 'Chi phi van hanh: 1.906.300.000 VND']);
  ids.report = (await up('Báo cáo doanh thu Q3-2026.pdf', pdf, 'application/pdf', ids.q3)).id;
  await up('Biên bản họp 12-11.txt', 'Biên bản họp nhóm sản phẩm\n\nThành phần: Minh Anh, Quốc Huy, Thu Hà\n\n1. Chốt phạm vi bản phát hành tháng 12\n2. Rà soát phản hồi khách hàng\n3. Phân công kiểm thử\n', 'text/plain', ids.work);
  await up('ke-hoach-2027.md', '# Kế hoạch 2027\n\n- Mở rộng thị trường miền Trung\n- Ra mắt gói doanh nghiệp\n', 'text/markdown', ids.work);
  await up('Hợp đồng thuê văn phòng.docx', 'PK fake docx content', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ids.work);
  await up('Bảng lương tháng 10.xlsx', 'PK fake xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ids.work);
  await up('Đề xuất dự án.pptx', 'PK fake pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  await up('ma-nguon-v2.zip', Buffer.alloc(180_000, 7), 'application/zip');
  const banner = await makePng(1600, 900, '#E9EEF8', '<rect x="120" y="140" width="760" height="70" rx="8" fill="#1F2225"/><rect x="120" y="250" width="560" height="28" rx="6" fill="#8A8883"/><rect x="120" y="300" width="480" height="28" rx="6" fill="#8A8883"/><rect x="120" y="390" width="220" height="64" rx="8" fill="#2D5BD7"/><circle cx="1220" cy="450" r="250" fill="#2D5BD7" opacity="0.18"/><rect x="1040" y="300" width="360" height="300" rx="16" fill="#FFFFFF"/>');
  const photo = await makePng(1200, 800, '#F4EFE6', '<circle cx="360" cy="420" r="210" fill="#EB6834"/><rect x="620" y="200" width="420" height="420" rx="24" fill="#2F6B3A"/><rect x="0" y="660" width="1200" height="140" fill="#1F2225" opacity="0.85"/>');
  const ids2 = (await up('Banner chiến dịch Tết.png', banner, 'image/png', ids.design)).id;
  ids.photo = (await up('Ảnh sản phẩm mùa thu.png', photo, 'image/png', ids.design)).id;
  ids.banner = ids2;
  const top = await demo.call('GET', '/api/drive', { headers: {} });
  assert.ok(top.body.files.some((f) => f.name === 'Đề xuất dự án.pptx'));
  const design = await demo.call('GET', `/api/drive?folderId=${ids.design}`);
  assert.ok(design.body.files.every((f) => f.thumbUrl), 'ảnh phải có thumbnail');
});

await step('thumbnail tải được qua signed URL, file gốc thì không truy cập trực tiếp', async () => {
  const design = await demo.call('GET', `/api/drive?folderId=${ids.design}`);
  const thumb = await guest.call('GET', design.body.files[0].thumbUrl, { raw: true });
  assert.equal(thumb.status, 200);
  assert.equal(thumb.headers.get('content-type'), 'image/webp');
  const noToken = await guest.call('GET', `/api/media/${ids.report}/content`, { raw: true });
  assert.equal(noToken.status, 403);
  assert.equal((await guest.call('GET', `/api/files/${ids.report}`)).status, 401);
});

await step('xem trước PDF inline và tải xuống tăng lượt tải', async () => {
  const links = (await demo.call('GET', `/api/files/${ids.report}/links`)).body;
  const view = await guest.call('GET', links.viewUrl, { raw: true });
  assert.equal(view.headers.get('content-type'), 'application/pdf');
  assert.match(view.headers.get('content-disposition'), /^inline/);
  for (let i = 0; i < 3; i++) {
    const dl = await guest.call('GET', links.downloadUrl, { raw: true });
    assert.match(dl.headers.get('content-disposition'), /^attachment/);
    await dl.arrayBuffer();
  }
  const f = await demo.call('GET', `/api/files/${ids.report}`);
  assert.equal(f.body.file.downloadCount, 3);
});

await step('chia sẻ có mật khẩu: khách phải mở khoá', async () => {
  const s = await demo.call('POST', `/api/files/${ids.report}/shares`, { body: { access: 'private', password: 'q3-2026', expiresInHours: 168 } });
  assert.equal(s.status, 201);
  ids.pwShare = s.body.share.token;
  const meta = await guest.call('GET', `/api/public/s/${ids.pwShare}`);
  assert.deepEqual(meta.body, { requiresPassword: true });
  assert.equal((await guest.call('POST', `/api/public/s/${ids.pwShare}/unlock`, { body: { password: 'sai' } })).status, 401);
  const ok = await guest.call('POST', `/api/public/s/${ids.pwShare}/unlock`, { body: { password: 'q3-2026' } });
  const meta2 = await guest.call('GET', `/api/public/s/${ids.pwShare}`, { headers: { 'x-share-access': ok.body.accessToken } });
  assert.equal(meta2.body.file.name, 'Báo cáo doanh thu Q3-2026.pdf');
  assert.equal(meta2.body.share.ownerName, 'Nguyễn Minh Anh');
});

await step('chia sẻ giới hạn 2 lượt tải: lượt thứ 3 bị chặn (410)', async () => {
  const s = await demo.call('POST', `/api/files/${ids.photo}/shares`, { body: { access: 'public', maxDownloads: 2 } });
  ids.limited = s.body.share.token;
  const url = `/api/public/s/${ids.limited}/content?dl=1`;
  for (let i = 0; i < 2; i++) assert.equal((await guest.call('GET', url, { raw: true })).status, 200);
  assert.equal((await guest.call('GET', url, { raw: true })).status, 410);
  assert.equal((await guest.call('GET', `/api/public/s/${ids.limited}`)).status, 410);
});

await step('link công khai thường + thu hồi', async () => {
  const s = await demo.call('POST', `/api/files/${ids.banner}/shares`, { body: { access: 'public' } });
  ids.openShare = s.body.share.token;
  assert.equal((await guest.call('GET', `/api/public/s/${ids.openShare}`)).body.file.previewable, true);
  const temp = await demo.call('POST', `/api/files/${ids.banner}/shares`, { body: { access: 'public', expiresInHours: 1 } });
  assert.equal((await demo.call('DELETE', `/api/shares/${temp.body.share.id}`)).status, 204);
  assert.equal((await guest.call('GET', `/api/public/s/${temp.body.share.token}`)).status, 404);
  const mine = await demo.call('GET', '/api/shares');
  assert.equal(mine.body.shares.length, 3);
});

await step('thùng rác: xoá thư mục kèm nội dung, khôi phục nguyên vẹn', async () => {
  await demo.call('POST', '/api/drive/trash', { body: { folderIds: [ids.personal], fileIds: [] } });
  const note = await demo.call('POST', '/api/files/upload', { form: fileForm('Ghi chú cũ.txt', 'nháp', 'text/plain') });
  await demo.call('DELETE', `/api/files/${note.body.files[0].id}`);
  await demo.call('DELETE', `/api/folders/${ids.work}`);
  const t = await demo.call('GET', '/api/trash');
  const work = t.body.items.find((i) => i.name === 'Công việc');
  assert.equal(work.itemCount, 5);
  assert.equal((await demo.call('POST', `/api/trash/${work.batch}/restore`)).status, 204);
  const q3 = await demo.call('GET', `/api/drive?folderId=${ids.q3}`);
  assert.equal(q3.body.files.length, 1);
  assert.deepEqual(q3.body.breadcrumbs.map((c) => c.name), ['Công việc', 'Báo cáo quý 3']);
});

await step('di chuyển file, không cho tạo vòng lặp thư mục', async () => {
  assert.equal((await demo.call('PATCH', `/api/folders/${ids.work}`, { body: { parentId: ids.q3 } })).status, 400);
  const d = await demo.call('GET', '/api/drive');
  const pptx = d.body.files.find((f) => f.name === 'Đề xuất dự án.pptx');
  assert.equal((await demo.call('POST', '/api/drive/move', { body: { fileIds: [pptx.id], folderIds: [], targetId: ids.work } })).status, 204);
  await demo.call('POST', '/api/drive/move', { body: { fileIds: [pptx.id], folderIds: [], targetId: 'root' } });
});

await step('tìm kiếm tiếng Việt và lọc theo loại', async () => {
  const r = await demo.call('GET', `/api/files?q=${encodeURIComponent('hợp đồng')}`);
  assert.equal(r.body.total, 1);
  const imgs = await demo.call('GET', '/api/files?kind=image');
  assert.equal(imgs.body.total, 2);
});

await step('thống kê phản ánh đúng hoạt động', async () => {
  await new Promise((r) => setTimeout(r, 300));
  const s = await demo.call('GET', '/api/stats');
  assert.equal(s.body.counts.files, 9);
  assert.ok(s.body.counts.downloads >= 5);
  assert.equal(s.body.counts.activeShares, 2);
  assert.equal(s.body.daily.length, 30);
  assert.ok(s.body.daily.at(-1).uploads >= 10);
  assert.equal(s.body.topFiles[0].name, 'Báo cáo doanh thu Q3-2026.pdf');
});

await step('quản trị: user thường bị chặn, admin xem được danh sách', async () => {
  assert.equal((await demo.call('GET', '/api/admin/users')).status, 403);
  const r = await admin.call('GET', '/api/admin/users');
  assert.ok(r.body.items.some((u) => u.email === 'demo@fileshare.vn' && u.fileCount === 9));
});

await step('đăng xuất huỷ phiên', async () => {
  assert.equal((await admin.call('POST', '/api/auth/logout')).status, 204);
  const r = await admin.call('POST', '/api/auth/refresh');
  assert.notEqual(r.status, 200);
  assert.ok(!r.body?.accessToken);
});

console.log(`\n${passed} bước đều đạt. Link mẫu: ${BASE}/s/${ids.openShare} (công khai), ${BASE}/s/${ids.pwShare} (mật khẩu q3-2026)`);
