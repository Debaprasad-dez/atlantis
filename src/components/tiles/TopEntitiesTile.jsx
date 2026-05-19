import { useNavigate } from 'react-router-dom';
import { Tile, DataTable, RiskBar } from '@/components/primitives';
import { useDexie } from '@/hooks/useDexie';
import { useRefreshable } from '@/hooks/useRefreshable';
import { db } from '@/db/schema';
import { copyText } from '@/lib/clipboard';
import { toCSV, downloadCSV } from '@/lib/csv';
import { toast } from '@/stores/toastStore';
import { audit } from '@/lib/audit';
import { useAuthStore } from '@/stores/authStore';

const columns = [
  { key: 'id', label: 'ID', width: 110, mono: true },
  { key: 'type', label: 'TYPE', width: 70, render: (r) => (
      <span className="section-label text-viz-cyan">{r.type}</span>
    ) },
  { key: 'name', label: 'NAME' },
  { key: 'country', label: 'CC', width: 32, mono: true, align: 'center' },
  { key: 'riskScore', label: 'RISK', width: 88, render: (r) => <RiskBar score={r.riskScore} /> },
];

export function TopEntitiesTile({ span }) {
  const [tick, refresh] = useRefreshable();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data, loading } = useDexie(
    async () => db.entities.orderBy('riskScore').reverse().limit(80).toArray(),
    [tick],
  );
  const rows = data ?? [];

  const exportCSV = () => {
    const csv = toCSV(rows, [
      { key: 'id' },
      { key: 'type' },
      { key: 'name' },
      { key: 'country' },
      { key: 'riskScore', header: 'risk' },
    ]);
    downloadCSV(`atlantis-top-risk-${Date.now()}.csv`, csv);
    audit(user?.id, 'export_top_risk', null, { count: rows.length });
  };

  return (
    <Tile
      title="TOP-RISK ENTITIES"
      span={span}
      footer="Click a row to inspect · sorted by composite risk"
      onRefresh={() => { refresh(); toast.info('Reloaded top-risk'); }}
      onExpand={() => navigate('/entities?seedQuery=risk:%3E80')}
      onCopy={async () => {
        const ok = await copyText(JSON.stringify(rows, null, 2));
        ok ? toast.success('Top-risk JSON copied') : toast.warning('Copy failed');
      }}
      onExport={exportCSV}
      loading={loading}
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/entities?focus=${r.id}`)}
      />
    </Tile>
  );
}
