import { useEffect } from 'react';
import { useStats } from '@/lib/queries';
import { formatBytes, formatNumber } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { ActivityChart, KindBars, StatRow } from '@/components/charts';
import { FileBadge, Meter, Skeleton } from '@/components/ui';

export default function Stats() {
  const stats = useStats();
  useEffect(() => {
    document.title = 'Thống kê - FileShare';
  }, []);
  const s = stats.data;

  return (
    <div>
      <PageHeader title="Thống kê" description="Hoạt động lưu trữ và chia sẻ của bạn trong 30 ngày gần nhất." />
      {!s ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="space-y-5">
          <StatRow
            items={[
              {
                label: 'Đã dùng',
                value: formatBytes(s.storage.used),
                sub: (
                  <>
                    <Meter value={s.storage.used} max={s.storage.quota} className="mb-1.5 mt-1" />
                    trên {formatBytes(s.storage.quota)}
                  </>
                ),
              },
              { label: 'File', value: formatNumber(s.counts.files), sub: `${formatNumber(s.counts.folders)} thư mục` },
              { label: 'Lượt tải xuống', value: formatNumber(s.counts.downloads), sub: 'Tính cả qua link chia sẻ' },
              { label: 'Link đang hoạt động', value: formatNumber(s.counts.activeShares), sub: s.storage.trash ? `Thùng rác ${formatBytes(s.storage.trash)}` : 'Thùng rác trống' },
            ]}
          />

          <section className="rounded-box border border-line bg-surface p-5">
            <ActivityChart data={s.daily} title="Hoạt động 30 ngày" />
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-box border border-line bg-surface p-5">
              <h2 className="mb-4 text-[14px] font-semibold text-ink">Dung lượng theo loại file</h2>
              <KindBars data={s.byKind} total={s.storage.used - s.storage.trash} />
            </section>
            <section className="rounded-box border border-line bg-surface p-5">
              <h2 className="mb-3 text-[14px] font-semibold text-ink">Được tải nhiều nhất</h2>
              {s.topFiles.length ? (
                <ol className="space-y-1">
                  {s.topFiles.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-1.5">
                      <FileBadge name={f.name} kind={f.kind} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{f.name}</span>
                      <span className="tabular font-mono text-[12px] text-ink-2">{formatNumber(f.downloadCount)} lượt</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-8 text-center text-[13px] text-ink-2">Chưa có file nào được tải xuống.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
