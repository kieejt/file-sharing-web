import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DailyPoint, KindStat } from '@/lib/types';
import { KIND_META } from '@/lib/kinds';
import { formatBytes, formatNumber } from '@/lib/format';
import { cx } from './ui';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Trục y "đẹp": làm tròn giá trị lớn nhất lên mốc 1/2/5 x 10^n. */
function niceMax(v: number, ticks = 4) {
  if (v <= ticks) return ticks;
  const raw = v / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((m) => m * mag >= raw)! * mag;
  return step * ticks;
}

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

interface Series {
  key: 'uploads' | 'downloads';
  label: string;
  color: string;
}

const SERIES: Series[] = [
  { key: 'uploads', label: 'Tải lên', color: 'var(--series-1)' },
  { key: 'downloads', label: 'Tải xuống', color: 'var(--series-2)' },
];

/**
 * Biểu đồ đường 2 chuỗi theo ngày: crosshair bám theo ngày gần nhất,
 * tooltip liệt kê mọi chuỗi, điều khiển được bằng phím mũi tên, có bảng dữ liệu thay thế.
 */
export function ActivityChart({ data, title }: { data: DailyPoint[]; title: string }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const height = 220;
  const pad = { top: 12, right: 72, bottom: 26, left: 36 };
  const w = Math.max(0, width - pad.left - pad.right);
  const h = height - pad.top - pad.bottom;

  const max = useMemo(() => niceMax(Math.max(1, ...data.flatMap((d) => [d.uploads, d.downloads]))), [data]);
  const x = (i: number) => pad.left + (data.length <= 1 ? 0 : (i / (data.length - 1)) * w);
  const y = (v: number) => pad.top + h - (v / max) * h;
  const ticks = [0, 1, 2, 3, 4].map((t) => (max / 4) * t);
  const path = (k: Series['key']) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join('');
  const totals = { uploads: data.reduce((s, d) => s + d.uploads, 0), downloads: data.reduce((s, d) => s + d.downloads, 0) };

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.round(rel * (data.length - 1)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((v) => Math.min(data.length - 1, (v ?? data.length - 2) + 1));
    else if (e.key === 'ArrowLeft') setHover((v) => Math.max(0, (v ?? data.length) - 1));
    else return;
    e.preventDefault();
  };

  const hp = hover !== null ? data[hover] : null;
  const last = data[data.length - 1];

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[14px] font-semibold text-ink">{title}</span>
        <span className="flex items-center gap-4 text-[12.5px] text-ink-2">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
              <span className="tabular font-mono text-ink">{formatNumber(totals[s.key])}</span>
            </span>
          ))}
          <button className="rounded px-1 text-accent-text underline-offset-2 hover:underline" onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
          </button>
        </span>
      </figcaption>

      {showTable ? (
        <div className="scrollbar-thin max-h-[220px] overflow-auto rounded-ctl border border-line">
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 bg-surface-2 text-left text-ink-2">
              <tr>
                <th className="px-3 py-1.5 font-medium">Ngày</th>
                <th className="px-3 py-1.5 text-right font-medium">Tải lên</th>
                <th className="px-3 py-1.5 text-right font-medium">Tải xuống</th>
              </tr>
            </thead>
            <tbody className="tabular font-mono">
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink-2">{shortDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-right text-ink">{d.uploads}</td>
                  <td className="px-3 py-1.5 text-right text-ink">{d.downloads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative">
          {width > 0 ? (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`${title}: tổng ${totals.uploads} lượt tải lên và ${totals.downloads} lượt tải xuống trong ${data.length} ngày`}
              tabIndex={0}
              onKeyDown={onKey}
              onBlur={() => setHover(null)}
              className="block overflow-visible focus-visible:outline-offset-4"
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : '2 4'} />
                  <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 font-mono text-[10.5px]">
                    {Math.round(t)}
                  </text>
                </g>
              ))}
              {data.map((d, i) =>
                i % 7 === (data.length - 1) % 7 ? (
                  <text key={d.date} x={x(i)} y={height - 6} textAnchor="middle" className="fill-ink-3 font-mono text-[10.5px]">
                    {shortDate(d.date)}
                  </text>
                ) : null,
              )}
              {SERIES.map((s) => (
                <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {/* Nhãn trực tiếp ở cuối đường, đẩy tách nhau nếu chồng */}
              {last
                ? (() => {
                    let ya = y(last.uploads);
                    let yb = y(last.downloads);
                    if (Math.abs(ya - yb) < 14) {
                      // Giữ thứ tự trên/dưới, tách đều quanh điểm giữa
                      const mid = (ya + yb) / 2;
                      const aOnTop = ya <= yb;
                      ya = aOnTop ? mid - 7 : mid + 7;
                      yb = aOnTop ? mid + 7 : mid - 7;
                    }
                    return SERIES.map((s, i) => (
                      <text key={s.key} x={pad.left + w + 8} y={i === 0 ? ya : yb} dy="0.32em" className="fill-ink-2 text-[11.5px]">
                        {s.label}
                      </text>
                    ));
                  })()
                : null}
              {hp && hover !== null ? (
                <g pointerEvents="none">
                  <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + h} stroke="var(--border-strong)" />
                  {SERIES.map((s) => (
                    <circle key={s.key} cx={x(hover)} cy={y(hp[s.key])} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                  ))}
                </g>
              ) : null}
              <rect
                x={pad.left - 6}
                y={pad.top}
                width={w + 12}
                height={h}
                fill="transparent"
                onPointerMove={onMove}
                onPointerLeave={() => setHover(null)}
              />
            </svg>
          ) : (
            <div style={{ height }} />
          )}
          {hp && hover !== null ? (
            <div
              className="pointer-events-none absolute top-1 z-10 min-w-36 rounded-ctl border border-line bg-surface px-3 py-2 text-[12px] shadow-pop"
              style={{
                left: Math.min(Math.max(0, x(hover) + 12), Math.max(0, width - 160)),
              }}
              role="status"
            >
              <p className="mb-1 text-ink-2">Ngày {shortDate(hp.date)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="tabular font-mono font-semibold text-ink">{hp[s.key]}</span>
                  <span className="text-ink-2">{s.label.toLowerCase()}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </figure>
  );
}

/** Thanh ngang một chuỗi: dung lượng theo loại file, sắp giảm dần, nhãn giá trị trực tiếp. */
export function KindBars({ data, total }: { data: KindStat[]; total: number }) {
  const max = Math.max(1, ...data.map((d) => d.size));
  if (!data.length) return <p className="py-8 text-center text-[13px] text-ink-2">Chưa có dữ liệu</p>;
  return (
    <ul className="space-y-3" aria-label="Dung lượng theo loại file">
      {data.map((d) => {
        const raw = total ? (d.size / total) * 100 : 0;
        const pct = raw > 0 && raw < 0.1 ? '<0,1' : (Math.round(raw * 10) / 10).toString().replace('.', ',');
        return (
          <li key={d.kind} className="grid grid-cols-[96px_1fr_auto] items-center gap-3" title={`${KIND_META[d.kind].label}: ${formatBytes(d.size)}, ${d.count} file`}>
            <span className="truncate text-[12.5px] text-ink">{KIND_META[d.kind].label}</span>
            <span className="relative h-3">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] bg-[var(--series-1)] transition-[width] duration-500"
                style={{ width: `${Math.max(1.5, (d.size / max) * 100)}%` }}
              />
            </span>
            <span className="tabular w-32 text-right font-mono text-[11.5px] text-ink-2">
              {formatBytes(d.size)} <span className="text-ink-3">· {pct}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function StatRow({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-box border border-line bg-surface lg:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cx('enter px-5 py-4', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line lg:border-t-0', i === 2 && 'lg:border-l')}
          style={{ ['--i' as string]: i }}
        >
          <p className="text-[12.5px] text-ink-2">{it.label}</p>
          <p className="tabular mt-1.5 text-[24px] font-semibold leading-tight tracking-tight text-ink">{it.value}</p>
          {it.sub ? <div className="tabular mt-1 text-[12px] text-ink-2">{it.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
