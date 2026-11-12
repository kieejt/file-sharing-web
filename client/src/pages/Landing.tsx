import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Check, Minus, Plus } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { cx } from '@/components/ui';

/** Thêm class is-visible khi phần tử đi vào khung nhìn (IntersectionObserver, không lắng nghe scroll). */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    root.classList.add('reveal-ready');
    const els = root.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Ảnh chụp màn hình thật của ứng dụng, có bản sáng và tối. */
function Shot({ name, alt, className, priority }: { name: string; alt: string; className?: string; priority?: boolean }) {
  const common = cx('block w-full rounded-box border border-line object-cover object-left-top', className);
  return (
    <>
      <img src={`/landing/${name}-light.webp`} alt={alt} width={1440} height={900} loading={priority ? 'eager' : 'lazy'} decoding="async" className={cx(common, 'dark:hidden')} />
      <img src={`/landing/${name}-dark.webp`} alt={alt} width={1440} height={900} loading="lazy" decoding="async" className={cx(common, 'hidden dark:block')} />
    </>
  );
}

function PrimaryCta({ authed }: { authed: boolean }) {
  return (
    <Link
      to={authed ? '/drive' : '/register'}
      className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-ctl bg-primary px-5 text-[15px] font-medium text-on-primary transition-[background-color,transform] hover:bg-primary-hover active:translate-y-px"
    >
      {authed ? 'Mở FileShare' : 'Bắt đầu miễn phí'}
    </Link>
  );
}

const FAQ: { q: string; a: ReactNode }[] = [
  { q: 'Tôi được dùng bao nhiêu dung lượng?', a: 'Mỗi tài khoản có 2 GB miễn phí, mỗi file tối đa 200 MB. Quản trị viên có thể nâng hạn mức cho từng người.' },
  { q: 'Người nhận có cần tài khoản không?', a: 'Không. Người nhận chỉ cần mở link. Nếu link có mật khẩu, họ nhập mật khẩu bạn gửi riêng để xem và tải file.' },
  { q: 'Khi link hết hạn hoặc hết lượt tải thì sao?', a: 'Link ngừng hoạt động ngay, file vẫn an toàn trong kho của bạn. Bạn có thể tạo link mới bất cứ lúc nào, hoặc thu hồi link cũ trước hạn.' },
  { q: 'Xem trước được những loại file nào?', a: 'Ảnh, PDF, video, âm thanh, văn bản thô và mã nguồn. Các định dạng như Word hay Excel cần tải xuống để mở.' },
  { q: 'Xoá nhầm file có lấy lại được không?', a: 'Được. File và thư mục đã xoá nằm trong thùng rác 30 ngày. Bạn khôi phục chỉ với một lần bấm, kể cả cả thư mục cùng nội dung bên trong.' },
];

function FaqItem({ q, a }: { q: string; a: ReactNode }) {
  return (
    <details className="group border-b border-line py-1 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[15px] font-medium text-ink">
        {q}
        <Plus size={16} weight="bold" className="shrink-0 text-ink-2 group-open:hidden" />
        <Minus size={16} weight="bold" className="hidden shrink-0 text-ink-2 group-open:block" />
      </summary>
      <p className="max-w-[60ch] pb-5 text-[14px] leading-relaxed text-ink-2">{a}</p>
    </details>
  );
}

const SECURITY = [
  {
    title: 'Tài khoản',
    items: [
      'Mật khẩu được băm bằng bcrypt, không ai đọc được',
      'Phiên đăng nhập lưu trong cookie httpOnly, tự làm mới',
      'Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác',
      'Giới hạn số lần thử đăng nhập sai',
    ],
  },
  {
    title: 'File và link chia sẻ',
    items: [
      'File riêng tư theo mặc định, chỉ mở được bằng link bạn tạo',
      'Link có thể đặt mật khẩu, hạn dùng và số lượt tải',
      'Thu hồi link bất cứ lúc nào, có hiệu lực ngay',
      'File HTML, SVG không bao giờ chạy trên trình duyệt người xem',
    ],
  },
];

export default function Landing() {
  const { status } = useAuth();
  const authed = status === 'authed';
  const root = useReveal();

  useEffect(() => {
    document.title = 'FileShare - Lưu trữ và chia sẻ tài liệu';
  }, []);

  return (
    <div ref={root} className="overflow-x-clip">
      <header className="sticky top-0 z-20 border-b border-transparent bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8" aria-label="Điều hướng">
          <Logo />
          <div className="hidden items-center gap-6 text-[13.5px] text-ink-2 md:flex">
            <a href="#tinh-nang" className="hover:text-ink">
              Tính năng
            </a>
            <a href="#bao-mat" className="hover:text-ink">
              Bảo mật
            </a>
            <a href="#cau-hoi" className="hover:text-ink">
              Câu hỏi
            </a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!authed ? (
              <Link to="/login" className="inline-flex h-9 items-center rounded-ctl px-3 text-[14px] font-medium text-ink hover:bg-surface-2">
                Đăng nhập
              </Link>
            ) : null}
            <Link
              to={authed ? '/drive' : '/register'}
              className="inline-flex h-9 items-center whitespace-nowrap rounded-ctl bg-primary px-4 text-[14px] font-medium text-on-primary hover:bg-primary-hover"
            >
              {authed ? 'Mở FileShare' : 'Bắt đầu miễn phí'}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero: chữ bên trái, ảnh chụp thật của ứng dụng tràn ra mép phải */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:pb-28 lg:pt-20">
        <div>
          <h1 className="enter text-[40px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[54px]">
            Chia sẻ tài liệu
            <br />
            có kiểm soát.
          </h1>
          <p className="enter mt-5 max-w-[44ch] text-[16.5px] leading-relaxed text-ink-2" style={{ ['--i' as string]: 1 }}>
            Lưu trữ, xem trước và chia sẻ file bằng link có mật khẩu, hạn dùng và giới hạn lượt tải.
          </p>
          <div className="enter mt-8 flex flex-wrap items-center gap-3" style={{ ['--i' as string]: 2 }}>
            <PrimaryCta authed={authed} />
            <a href="#tinh-nang" className="inline-flex h-11 items-center rounded-ctl border border-line-strong bg-surface px-5 text-[15px] font-medium text-ink hover:bg-surface-2">
              Xem tính năng
            </a>
          </div>
        </div>
        <div className="enter relative lg:-mr-[22vw]" style={{ ['--i' as string]: 3 }}>
          <Shot name="drive" alt="Giao diện quản lý file của FileShare" priority className="shadow-pop" />
        </div>
      </section>

      {/* Bento tính năng */}
      <section id="tinh-nang" className="scroll-mt-20 border-t border-line bg-surface-2/50">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <h2 className="reveal max-w-xl text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[36px]">Mọi thứ một kho tài liệu làm việc cần có</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-6">
            <article className="reveal flex flex-col overflow-hidden rounded-box border border-line bg-surface md:col-span-4 md:row-span-2">
              <div className="p-7">
                <h3 className="text-[18px] font-semibold text-ink">Chia sẻ có kiểm soát</h3>
                <p className="mt-2 max-w-[48ch] text-[14px] leading-relaxed text-ink-2">
                  Mỗi file có thể có nhiều link, mỗi link một mật khẩu, hạn dùng và số lượt tải riêng. Bạn thấy ai đã xem, đã tải bao nhiêu lần.
                </p>
              </div>
              <div className="mt-auto pl-7">
                <Shot name="share" alt="Hộp thoại tạo link chia sẻ" className="h-[340px] rounded-b-none rounded-r-none border-b-0 border-r-0" />
              </div>
            </article>

            <article className="reveal overflow-hidden rounded-box border border-line bg-surface md:col-span-2" style={{ ['--i' as string]: 1 }}>
              <div className="p-6 pb-4">
                <h3 className="text-[16px] font-semibold text-ink">Xem trước ngay</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">PDF, ảnh, video, âm thanh và mã nguồn mở ngay, không cần tải về.</p>
              </div>
              <Shot name="preview" alt="Xem trước file PDF" className="h-40 rounded-none border-x-0 border-b-0" />
            </article>

            <article className="reveal tone-yellow flex flex-col justify-between rounded-box p-6 md:col-span-2" style={{ ['--i' as string]: 2 }}>
              <p className="text-[44px] font-semibold leading-none tracking-tight">30 ngày</p>
              <div className="mt-6">
                <h3 className="text-[16px] font-semibold">Thùng rác có khôi phục</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed opacity-85">Xoá nhầm cả thư mục cũng lấy lại được nguyên vẹn.</p>
              </div>
            </article>

            <article className="reveal grid overflow-hidden rounded-box border border-line bg-surface md:col-span-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" style={{ ['--i' as string]: 3 }}>
              <div className="p-7">
                <h3 className="text-[18px] font-semibold text-ink">Biết file nào đang được dùng</h3>
                <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed text-ink-2">
                  Theo dõi lượt tải lên, tải xuống theo ngày, dung lượng theo loại file và những file được tải nhiều nhất.
                </p>
                <ul className="mt-6 space-y-2 text-[13.5px] text-ink">
                  {['Thư mục lồng nhau, di chuyển hàng loạt', 'Tải lên nhiều file, kéo thả, có tiến trình', 'Giao diện sáng và tối'].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <Check size={15} weight="bold" className="text-accent" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-line md:border-l md:border-t-0">
                <Shot name="stats" alt="Trang thống kê hoạt động" className="h-full max-h-[360px] rounded-none border-0" />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Bảo mật: hai nhóm cam kết cụ thể */}
      <section id="bao-mat" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <h2 className="reveal max-w-2xl text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[36px]">Riêng tư theo mặc định</h2>
          <p className="reveal mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">Không ai xem được file của bạn cho tới khi bạn chủ động tạo link.</p>
          <div className="mt-12 grid gap-x-16 gap-y-10 md:grid-cols-2">
            {SECURITY.map((g, gi) => (
              <div key={g.title} className="reveal" style={{ ['--i' as string]: gi }}>
                <h3 className="border-b border-line pb-3 text-[14px] font-semibold text-ink">{g.title}</h3>
                <ul className="mt-4 space-y-3.5">
                  {g.items.map((it) => (
                    <li key={it} className="flex gap-3 text-[14.5px] text-ink">
                      <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Câu hỏi thường gặp */}
      <section id="cau-hoi" className="scroll-mt-20 border-t border-line bg-surface-2/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <h2 className="reveal text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[36px]">Câu hỏi thường gặp</h2>
          <div className="reveal border-t border-line" style={{ ['--i' as string]: 1 }}>
            {FAQ.map((f) => (
              <FaqItem key={f.q} {...f} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-20 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="reveal">
            <h2 className="text-[26px] font-semibold tracking-tight text-ink">Bắt đầu với 2 GB lưu trữ</h2>
            <p className="mt-1.5 text-[15px] text-ink-2">Tạo tài khoản trong chưa tới một phút.</p>
          </div>
          <div className="reveal" style={{ ['--i' as string]: 1 }}>
            <PrimaryCta authed={authed} />
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-[13px] text-ink-2 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <div className="flex gap-6">
            <a href="https://github.com/kieejt/file-sharing-web" target="_blank" rel="noreferrer" className="hover:text-ink">
              Mã nguồn
            </a>
            <span>© 2026 FileShare</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
