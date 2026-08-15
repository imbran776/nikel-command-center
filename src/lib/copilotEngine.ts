import {
  ALERTS,
  DASHBOARD_KPIS,
  DISPATCH_QUEUE,
  EQUIPMENT_COUNTS,
  FLEET,
  FUEL_EVENTS,
  OPERATORS,
  WORK_ORDERS,
} from '../data/enterprise';
import { INITIAL_PRODUCTION, PRODUCTION_TARGET, PRODUCTION_TOTAL } from '../data/mockData';
import type { FleetAsset, NavItemId } from '../types/fms';

export interface CopilotAction {
  id: string;
  label: string;
  kind: 'nav' | 'detail' | 'modal' | 'filter' | 'export';
  nav?: NavItemId;
  assetId?: string;
  modal?: 'assign' | 'shift-report' | 'service';
  unit?: string;
  driver?: string;
}

export interface CopilotReply {
  markdown: string;
  actions?: CopilotAction[];
  suggestions?: string[];
}

export interface CopilotContext {
  activeNav: NavItemId;
  selectedAssetId: string | null;
  mineName: string;
  shiftCode: string;
  opsLead: string;
  alertCount: number;
  /** en | id — replies should match operator language */
  locale?: 'en' | 'id';
}

const NAV_MAP: { keys: string[]; id: NavItemId; label: string }[] = [
  { keys: ['dashboard', 'home', 'main'], id: 'dashboard', label: 'Dashboard' },
  { keys: ['fleet', 'assets list'], id: 'fleet', label: 'Fleet' },
  { keys: ['live ops', 'live operations', 'operations board'], id: 'live-ops', label: 'Live Operations' },
  { keys: ['dispatch', 'assignment'], id: 'dispatch', label: 'Dispatch' },
  { keys: ['production', 'tonnes', 'output'], id: 'production', label: 'Production' },
  { keys: ['equipment', 'asset master'], id: 'equipment', label: 'Equipment' },
  { keys: ['maintenance', 'work order', 'workshop'], id: 'maintenance', label: 'Maintenance' },
  { keys: ['fuel', 'refuel', 'diesel'], id: 'fuel', label: 'Fuel Management' },
  { keys: ['spare', 'parts'], id: 'spare-parts', label: 'Spare Parts' },
  { keys: ['operator', 'crew', 'driver'], id: 'operators', label: 'Operators' },
  { keys: ['alert', 'alarm', 'incident'], id: 'alerts', label: 'Alerts' },
  { keys: ['report'], id: 'reports', label: 'Reports' },
  { keys: ['analytics', 'kpi trend', 'mtbf'], id: 'analytics', label: 'Analytics' },
  { keys: ['user admin', 'users'], id: 'users', label: 'Users' },
  { keys: ['role'], id: 'roles', label: 'Roles' },
  { keys: ['setting', 'preference'], id: 'settings', label: 'Settings' },
  { keys: ['audit'], id: 'audit-logs', label: 'Audit Logs' },
  { keys: ['map', 'live map'], id: 'live-ops', label: 'Live Operations' },
];

function findAsset(q: string): FleetAsset | undefined {
  const compact = q.replace(/\s+/g, '').toUpperCase();
  return FLEET.find(
    (f) =>
      compact.includes(f.unit.replace('-', '')) ||
      q.toUpperCase().includes(f.unit) ||
      f.unit.toLowerCase() === q.trim().toLowerCase(),
  );
}

function listAssets(assets: FleetAsset[], limit = 8): string {
  if (!assets.length) return '_None found._';
  return assets
    .slice(0, limit)
    .map(
      (a) =>
        `- **${a.unit}** · ${a.status} · ${a.operator} · fuel ${a.fuelPct}% · health ${a.health}% · ${a.location}`,
    )
    .join('\n');
}

function assetBrief(a: FleetAsset): string {
  return [
    `### ${a.unit} — ${a.type}`,
    '',
    `| Field | Value |`,
    `|---|---|`,
    `| Status | **${a.status}** |`,
    `| Engine | ${a.engine} |`,
    `| Connectivity | ${a.connectivity} |`,
    `| Operator | ${a.operator} |`,
    `| Health | **${a.health}%** |`,
    `| Fuel | **${a.fuelPct}%** |`,
    `| Engine hours | ${a.engineHours.toLocaleString()} h |`,
    `| Assignment | ${a.assignment} |`,
    `| Location | ${a.location} |`,
    `| Destination | ${a.destination} |`,
    `| Speed | ${a.speedKph} kph |`,
    `| Payload | ${a.payloadT} t |`,
    `| Utilization | ${a.utilization}% |`,
    `| Availability | ${a.availability}% |`,
    `| Last update | ${a.lastUpdate} |`,
  ].join('\n');
}

export const SUGGESTED_PROMPTS = [
  'Show idle trucks',
  'Open active alerts',
  'Which unit has the lowest health?',
  'Find low fuel vehicles',
  'Summarize production vs target',
  'Overdue maintenance',
  'Explain downtime KPI',
  'Generate end-of-shift report',
];

export const SUGGESTED_PROMPTS_ID = [
  'Tampilkan truk idle',
  'Buka alert aktif',
  'Unit mana health terendah?',
  'Cari unit bahan bakar rendah',
  'Ringkas produksi vs target',
  'Maintenance terlambat',
  'Jelaskan KPI downtime',
  'Buat laporan akhir shift',
];

export const PROACTIVE_TIPS = [
  'Review overdue maintenance on HT-07 / HT-14.',
  'Investigate elevated fuel burn on haul circuit.',
  'Check inactive / waiting trucks in the queue.',
  'Generate end-of-shift report before handoff.',
  'Acknowledge open critical alerts.',
  'Analyze production bottlenecks at Face C.',
];

export const PROACTIVE_TIPS_ID = [
  'Tinjau maintenance overdue HT-07 / HT-14.',
  'Periksa konsumsi BBM tinggi di sirkuit haul.',
  'Cek truk menunggu / idle di antrean.',
  'Buat laporan akhir shift sebelum serah terima.',
  'Acknowledge alert kritis yang masih terbuka.',
  'Analisis bottleneck produksi di Face C.',
];

function isId(ctx: CopilotContext) {
  return ctx.locale === 'id';
}

function localizeReply(reply: CopilotReply, ctx: CopilotContext): CopilotReply {
  if (!isId(ctx)) {
    return {
      ...reply,
      suggestions: reply.suggestions ?? SUGGESTED_PROMPTS.slice(0, 4),
    };
  }
  // Prefix Indonesian framing; keep technical unit codes intact
  return {
    ...reply,
    markdown: [
      '_Mode bahasa: **Indonesia** (Ops Copilot)._',
      '',
      reply.markdown,
      '',
      '---',
      '**Ringkas:** Data di atas diagregasikan secara real-time dari telemetri armada dan sensor FMS aktif. Katakan perintah seperti **Buka Fleet**, **Alert aktif**, atau **Unit HT-04**.',
    ].join('\n'),
    suggestions: reply.suggestions?.length
      ? reply.suggestions.map((s, i) => SUGGESTED_PROMPTS_ID[i] ?? s)
      : SUGGESTED_PROMPTS_ID.slice(0, 4),
    actions: reply.actions?.map((a) => ({
      ...a,
      label: a.label
        .replace(/^Open /i, 'Buka ')
        .replace(/^Show /i, 'Tampilkan ')
        .replace(/Active alerts/i, 'Alert aktif')
        .replace(/Shift report/i, 'Laporan shift')
        .replace(/Idle trucks/i, 'Truk idle')
        .replace(/Create work order/i, 'Buat work order')
        .replace(/Assign \/ reassign/i, 'Assign / reassign')
        .replace(/Maintenance/i, 'Maintenance')
        .replace(/Fuel Management/i, 'Manajemen BBM')
        .replace(/Production desk/i, 'Meja produksi')
        .replace(/Dispatch/i, 'Dispatch')
        .replace(/Analytics/i, 'Analitik')
        .replace(/Live Operations/i, 'Operasi Live')
        .replace(/Fleet list/i, 'Daftar armada')
        .replace(/Dashboard/i, 'Dashboard'),
    })),
  };
}

export function runCopilot(input: string, ctx: CopilotContext): CopilotReply {
  const raw = input.trim();
  const q = raw.toLowerCase();

  // Indonesian intent normalization (lightweight)
  const qNorm = q
    .replace(/\bbuka\b/g, 'open')
    .replace(/\btampilkan\b/g, 'show')
    .replace(/\bcari\b/g, 'find')
    .replace(/\bke\b/g, 'to')
    .replace(/\bperingatan\b/g, 'alert')
    .replace(/\balert aktif\b/g, 'active alerts')
    .replace(/\barmada\b/g, 'fleet')
    .replace(/\bproduksi\b/g, 'production')
    .replace(/\bbahan bakar\b|\bbbm\b/g, 'fuel')
    .replace(/\bperawatan\b/g, 'maintenance')
    .replace(/\blaporan\b/g, 'report')
    .replace(/\bshift\b/g, 'shift')
    .replace(/\bunit\b/g, 'unit')
    .replace(/\bjelaskan\b/g, 'explain')
    .replace(/\bringkas\b/g, 'summarize')
    .replace(/\btruk diam\b|\btruk idle\b/g, 'idle trucks')
    .replace(/\bterlambat\b/g, 'overdue');

  if (!q) {
    return localizeReply(
      {
        markdown: isId(ctx)
          ? 'Tanyakan armada, produksi, alert, maintenance, BBM, atau bilang **Buka Dispatch**.'
          : 'Ask me about fleet, production, alerts, maintenance, fuel, or say **Open Dispatch**.',
        suggestions: isId(ctx) ? SUGGESTED_PROMPTS_ID : SUGGESTED_PROMPTS,
      },
      ctx,
    );
  }

  // Use normalized query for matching while preserving raw for display
  const reply = runCopilotCore(raw, qNorm, ctx);
  return localizeReply(reply, ctx);
}

function runCopilotCore(raw: string, q: string, ctx: CopilotContext): CopilotReply {
  if (!q) {
    return {
      markdown: 'Ask me about fleet, production, alerts, maintenance, fuel, or say **Open Dispatch**.',
      suggestions: SUGGESTED_PROMPTS,
    };
  }

  // ---- Navigation ----
  if (/\b(open|go to|goto|show page|navigate|take me|switch to)\b/.test(q) || NAV_MAP.some((n) => n.keys.some((k) => q === k || q === `open ${k}`))) {
    for (const n of NAV_MAP) {
      if (n.keys.some((k) => q.includes(k))) {
        // equipment unit open
        const unitMatch = raw.match(/\b([A-Z]{1,3}-?\d{1,3})\b/i);
        if (unitMatch && (q.includes('equipment') || q.includes('unit') || q.includes('open'))) {
          const asset = findAsset(unitMatch[0]);
          if (asset) {
            return {
              markdown: `Opening **${asset.unit}** detail.\n\n${assetBrief(asset)}`,
              actions: [
                { id: 'open-detail', label: `Open ${asset.unit}`, kind: 'detail', assetId: asset.id },
                { id: 'nav-fleet', label: 'Fleet list', kind: 'nav', nav: 'fleet' },
              ],
              suggestions: ['Show related alerts', 'Create work order', 'Assign this unit'],
            };
          }
        }
        return {
          markdown: `Navigating to **${n.label}**.\n\nYou can keep working on the main screen — I stay docked on the right.`,
          actions: [{ id: `nav-${n.id}`, label: `Open ${n.label}`, kind: 'nav', nav: n.id }],
          suggestions: SUGGESTED_PROMPTS.slice(0, 4),
        };
      }
    }
  }

  // Direct unit open e.g. "Open Equipment EX-03"
  const unitToken = raw.match(/\b([A-Z]{1,3}-\d{1,3})\b/i);
  if (unitToken && (/\bopen\b/.test(q) || /\bshow\b/.test(q) || /\bdetail\b/.test(q) || /\bfind\b/.test(q))) {
    const asset = findAsset(unitToken[0]);
    if (asset) {
      const related = ALERTS.filter((a) => a.unit === asset.unit && !a.acknowledged);
      const wos = WORK_ORDERS.filter((w) => w.unit === asset.unit);
      return {
        markdown: [
          assetBrief(asset),
          '',
          related.length
            ? `**Open alerts (${related.length}):**\n${related.map((a) => `- ${a.code}: ${a.title}`).join('\n')}`
            : '_No open alerts for this unit._',
          '',
          wos.length
            ? `**Work orders:**\n${wos.map((w) => `- ${w.id} · ${w.status} · ${w.title}`).join('\n')}`
            : '',
        ].join('\n'),
        actions: [
          { id: 'detail', label: `Open ${asset.unit}`, kind: 'detail', assetId: asset.id },
          {
            id: 'svc',
            label: 'Create work order',
            kind: 'modal',
            modal: 'service',
            unit: asset.unit,
            driver: asset.operator,
          },
          { id: 'assign', label: 'Assign / reassign', kind: 'modal', modal: 'assign', unit: asset.unit },
        ],
        suggestions: ['Show idle trucks', 'Open active alerts', 'Overdue maintenance'],
      };
    }
  }

  // ---- Search ----
  if (/\b(search|find|lookup|locate)\b/.test(q)) {
    const term = q.replace(/\b(search|find|lookup|locate|for|me|the|a|an)\b/g, ' ').trim();
    const assets = FLEET.filter(
      (f) =>
        f.unit.toLowerCase().includes(term) ||
        f.operator.toLowerCase().includes(term) ||
        f.location.toLowerCase().includes(term) ||
        f.type.toLowerCase().includes(term) ||
        f.assignment.toLowerCase().includes(term),
    );
    const ops = OPERATORS.filter(
      (o) => o.name.toLowerCase().includes(term) || o.role.toLowerCase().includes(term),
    );
    const wos = WORK_ORDERS.filter(
      (w) => w.id.toLowerCase().includes(term) || w.title.toLowerCase().includes(term) || w.unit.toLowerCase().includes(term),
    );
    const alerts = ALERTS.filter(
      (a) => a.title.toLowerCase().includes(term) || a.code.toLowerCase().includes(term),
    );

    return {
      markdown: [
        `### Search results for “${term || raw}”`,
        '',
        `**Equipment (${assets.length})**`,
        listAssets(assets, 6),
        '',
        `**Operators (${ops.length})**`,
        ops.length ? ops.slice(0, 5).map((o) => `- **${o.name}** · ${o.role} · ${o.assignedUnit}`).join('\n') : '_None_',
        '',
        `**Work orders (${wos.length})**`,
        wos.length ? wos.slice(0, 5).map((w) => `- **${w.id}** · ${w.unit} · ${w.status}`).join('\n') : '_None_',
        '',
        `**Alerts (${alerts.length})**`,
        alerts.length ? alerts.slice(0, 5).map((a) => `- **${a.code}** · ${a.title}`).join('\n') : '_None_',
      ].join('\n'),
      actions: [
        { id: 'fleet', label: 'Open Fleet', kind: 'nav', nav: 'fleet' },
        { id: 'maint', label: 'Open Maintenance', kind: 'nav', nav: 'maintenance' },
        { id: 'alerts', label: 'Open Alerts', kind: 'nav', nav: 'alerts' },
      ],
      suggestions: ['Show idle trucks', 'Find low fuel vehicles', 'Open EX-03'],
    };
  }

  // ---- Fleet filters / NL commands ----
  if (/idle truck|idle haul|show idle|trucks? idle/.test(q)) {
    const idle = FLEET.filter((f) => f.type === 'Haul Truck' && (f.status === 'Idle' || f.status === 'Waiting'));
    return {
      markdown: `### Idle / waiting haul trucks (${idle.length})\n\n${listAssets(idle)}`,
      actions: [
        { id: 'fleet', label: 'Open Fleet', kind: 'nav', nav: 'fleet' },
        { id: 'live', label: 'Live Operations', kind: 'nav', nav: 'live-ops' },
        { id: 'dispatch', label: 'Dispatch board', kind: 'nav', nav: 'dispatch' },
      ],
      suggestions: ['Assign idle truck', 'Show excavators idle', 'Open active alerts'],
    };
  }

  if (/under maintenance|in maintenance|maintenance unit|workshop/.test(q)) {
    const m = FLEET.filter((f) => f.status === 'Maintenance');
    return {
      markdown: `### Equipment under maintenance (${m.length})\n\n${listAssets(m)}\n\nOpen **Maintenance** for work orders and hours remaining.`,
      actions: [
        { id: 'maint', label: 'Maintenance queue', kind: 'nav', nav: 'maintenance' },
        { id: 'fleet', label: 'Fleet filter', kind: 'nav', nav: 'fleet' },
      ],
    };
  }

  if (/low fuel|fuel low|below.*fuel|fuel threshold/.test(q)) {
    const low = [...FLEET].filter((f) => f.fuelPct < 40).sort((a, b) => a.fuelPct - b.fuelPct);
    return {
      markdown: `### Low fuel units (< 40%)\n\n${listAssets(low)}\n\n**Recommendation:** Prioritize refuel at Fuel Pad A/B before next haul cycle.`,
      actions: [
        { id: 'fuel', label: 'Fuel Management', kind: 'nav', nav: 'fuel' },
        { id: 'alerts', label: 'Fuel alerts', kind: 'nav', nav: 'alerts' },
      ],
      suggestions: ['Analyze fuel consumption', 'Show fuel trends', 'Abnormal fuel usage'],
    };
  }

  if (/excavator.*pit|pit b|zone b/.test(q)) {
    const ex = FLEET.filter(
      (f) =>
        f.type === 'Excavator' &&
        (f.location.toLowerCase().includes('b') || f.assignment.toLowerCase().includes('b') || f.location.toLowerCase().includes('zone b')),
    );
    return {
      markdown: `### Excavators near Pit / Zone B\n\n${listAssets(ex.length ? ex : FLEET.filter((f) => f.type === 'Excavator'))}`,
      actions: [{ id: 'fleet', label: 'Open Fleet', kind: 'nav', nav: 'fleet' }],
    };
  }

  if (/overload|over.?load|payload high|heavy payload/.test(q)) {
    const heavy = FLEET.filter((f) => f.payloadT >= 170).sort((a, b) => b.payloadT - a.payloadT);
    return {
      markdown: `### High payload units (≥ 170 t)\n\n${listAssets(heavy)}\n\nWatch brake temp and climb grades on Haul Road N.`,
      actions: [{ id: 'live', label: 'Live Operations', kind: 'nav', nav: 'live-ops' }],
    };
  }

  if (/offline|lost comm|communication lost|gps offline/.test(q)) {
    const off = FLEET.filter((f) => f.connectivity === 'Offline' || f.status === 'Offline' || f.status === 'Breakdown');
    return {
      markdown: `### Offline / breakdown / lost comms\n\n${listAssets(off)}`,
      actions: [
        { id: 'alerts', label: 'Open Alerts', kind: 'nav', nav: 'alerts' },
        { id: 'fleet', label: 'Open Fleet', kind: 'nav', nav: 'fleet' },
      ],
    };
  }

  if (/highest utilization|best util|top util/.test(q)) {
    const top = [...FLEET].sort((a, b) => b.utilization - a.utilization)[0];
    return {
      markdown: `**Highest utilization:** **${top.unit}** at **${top.utilization}%** (${top.type}, ${top.operator}, ${top.assignment}).`,
      actions: [{ id: 'd', label: `Open ${top.unit}`, kind: 'detail', assetId: top.id }],
    };
  }

  if (/lowest health|worst health|unhealthy|health low/.test(q)) {
    const worst = [...FLEET].sort((a, b) => a.health - b.health)[0];
    return {
      markdown: `**Lowest health:** **${worst.unit}** at **${worst.health}%** — status ${worst.status}, ${worst.location}.\n\nRecommend workshop inspection and review open work orders.`,
      actions: [
        { id: 'd', label: `Open ${worst.unit}`, kind: 'detail', assetId: worst.id },
        { id: 'm', label: 'Maintenance', kind: 'nav', nav: 'maintenance' },
      ],
    };
  }

  if (/unavailable|not available|out of service/.test(q)) {
    const u = FLEET.filter((f) => ['Maintenance', 'Breakdown', 'Offline'].includes(f.status));
    return {
      markdown: `### Unavailable equipment (${u.length})\n\n${listAssets(u)}`,
      actions: [{ id: 'm', label: 'Maintenance', kind: 'nav', nav: 'maintenance' }],
    };
  }

  if (/idle excavator|excavator.*idle|which excavator is idle/.test(q)) {
    const ex = FLEET.filter((f) => f.type === 'Excavator' && (f.status === 'Idle' || f.utilization < 60));
    return {
      markdown: `### Idle / low-util excavators\n\n${listAssets(ex.length ? ex : FLEET.filter((f) => f.type === 'Excavator'))}`,
      actions: [{ id: 'd', label: 'Dispatch', kind: 'nav', nav: 'dispatch' }],
    };
  }

  // ---- Alerts ----
  if (/active alert|open alert|critical alert|show alert|prioritize alert|explain alert/.test(q)) {
    const open = ALERTS.filter((a) => !a.acknowledged);
    const crit = open.filter((a) => a.severity === 'critical');
    return {
      markdown: [
        `### Active alerts (${open.length} open · ${crit.length} critical)`,
        '',
        ...open.slice(0, 8).map((a) => {
          const unit = a.unit ? ` · **${a.unit}**` : '';
          return `- **[${a.severity.toUpperCase()}]** \`${a.code}\` ${a.title}${unit} · ${a.time}`;
        }),
        '',
        '**Recommended actions**',
        '1. Acknowledge critical engine / immobilization first.',
        '2. Dispatch recovery for breakdown units.',
        '3. Queue refuel for low-fuel haul trucks.',
        '4. Clear maintenance overdue before next blast window.',
      ].join('\n'),
      actions: [{ id: 'a', label: 'Open Alerts Center', kind: 'nav', nav: 'alerts' }],
      suggestions: ['Explain ENG-441', 'Show offline equipment', 'Overdue maintenance'],
    };
  }

  if (/eng-441|fault code|error code/.test(q)) {
    return {
      markdown: [
        '### Fault guidance',
        '',
        '**E-441** — Engine derate / high exhaust temperature (seen on immobilized haul units).',
        '',
        '**Suggested response**',
        '1. Hold unit — do not force climb.',
        '2. Cool-down protocol + field tech diagnostics.',
        '3. Open corrective WO with Critical priority.',
        '4. Reassign circuit load to available trucks.',
      ].join('\n'),
      actions: [
        { id: 'm', label: 'Maintenance', kind: 'nav', nav: 'maintenance' },
        { id: 'a', label: 'Alerts', kind: 'nav', nav: 'alerts' },
      ],
    };
  }

  // ---- Maintenance ----
  if (/overdue|service due|preventive|corrective|work order|maintenance summary|service priority/.test(q)) {
    const open = WORK_ORDERS.filter((w) => w.status !== 'Completed');
    const due = open.filter((w) => w.hoursRemaining < 30 || w.priority === 'Critical' || w.priority === 'High');
    return {
      markdown: [
        '### Maintenance assistant',
        '',
        `Open WOs: **${open.length}** · Priority attention: **${due.length}**`,
        '',
        ...open.map(
          (w) =>
            `- **${w.id}** · ${w.unit} · ${w.type} · **${w.status}** · ${w.priority} · ${w.hoursRemaining}h left · $${w.costUsd.toLocaleString()}\n  ${w.title} · ${w.technician}`,
        ),
        '',
        '**Service priority recommendation:** HT-14 recovery (Critical) → HT-07 cooler leak → HT-09 brake sensor → EX-03 500hr.',
      ].join('\n'),
      actions: [
        { id: 'm', label: 'Open Maintenance', kind: 'nav', nav: 'maintenance' },
        {
          id: 'wo',
          label: 'Create work order',
          kind: 'modal',
          modal: 'service',
          unit: 'HT-14',
          driver: 'A. Rossi',
        },
      ],
    };
  }

  // ---- Fuel ----
  if (/fuel (trend|consum|usage|waste|abnormal|analy|compar)/.test(q) || q.includes('fuel')) {
    const totalL = FUEL_EVENTS.reduce((s, f) => s + f.liters, 0);
    const cost = FUEL_EVENTS.reduce((s, f) => s + f.costUsd, 0);
    const low = FLEET.filter((f) => f.fuelPct < 35);
    return {
      markdown: [
        '### Fuel assistant',
        '',
        `- Refueled today: **${totalL.toLocaleString()} L**`,
        `- Cost: **$${cost.toLocaleString()}**`,
        `- Site burn KPI: **18,240 L/h** (elevated vs previous shift)`,
        `- Units below 35%: **${low.map((u) => u.unit).join(', ') || 'none'}**`,
        '',
        '**Abnormal usage signals**',
        '- Haul climb on HR-N with high payload increases L/100t.',
        '- Waiting queue with engine idle burns fuel without tonnes.',
        '',
        '**Actions:** tighten dispatch spacing, refuel low units, review HT-04 burn alert.',
      ].join('\n'),
      actions: [
        { id: 'f', label: 'Fuel Management', kind: 'nav', nav: 'fuel' },
        { id: 'an', label: 'Analytics', kind: 'nav', nav: 'analytics' },
      ],
      suggestions: ['Show idle trucks', 'Summarize production vs target', 'Open active alerts'],
    };
  }

  // ---- Production ----
  if (/production|target vs|bottleneck|tonnes|trips today|best-performing|loss/.test(q)) {
    const hours = INITIAL_PRODUCTION.map((b) => ({
      hour: b.hour,
      total: b.primary + b.secondary,
    }));
    const best = [...hours].sort((a, b) => b.total - a.total)[0];
    const worst = [...hours].sort((a, b) => a.total - b.total)[0];
    const ach = ((PRODUCTION_TOTAL / PRODUCTION_TARGET) * 100).toFixed(1);
    const topTruck = [...FLEET].filter((f) => f.type === 'Haul Truck').sort((a, b) => b.tripsToday - a.tripsToday)[0];
    return {
      markdown: [
        '### Production assistant',
        '',
        `- Shift total: **${PRODUCTION_TOTAL.toLocaleString()} t** vs target **${PRODUCTION_TARGET.toLocaleString()} t** (**${ach}%**)`,
        `- Best hour: **${best.hour}** · ${best.total.toLocaleString()} t`,
        `- Soft hour: **${worst.hour}** · ${worst.total.toLocaleString()} t`,
        `- Top haul trips: **${topTruck.unit}** · ${topTruck.tripsToday} trips`,
        '',
        '**Bottlenecks**',
        `- ${EQUIPMENT_COUNTS.breakdown} breakdown + ${EQUIPMENT_COUNTS.maintenance} in workshop reduce available trucks.`,
        '- Waiting queue at Face C increases cycle time.',
        '- Soft afternoon hours often track congestion + fuel stops.',
        '',
        '**Recommendation:** reassign waiting trucks, clear Face C queue, recover HT-14 circuit capacity.',
      ].join('\n'),
      actions: [
        { id: 'p', label: 'Production desk', kind: 'nav', nav: 'production' },
        { id: 'd', label: 'Dispatch', kind: 'nav', nav: 'dispatch' },
        { id: 'r', label: 'Shift report', kind: 'modal', modal: 'shift-report' },
      ],
    };
  }

  // ---- Operators ----
  if (/operator|certification|attendance|crew|driver performance/.test(q)) {
    const top = [...OPERATORS].sort((a, b) => b.performance - a.performance).slice(0, 5);
    return {
      markdown: [
        '### Operators assistant',
        '',
        `On site: **${OPERATORS.filter((o) => o.attendance === 'On Site').length}**`,
        '',
        '**Top performance**',
        ...top.map(
          (o) =>
            `- **${o.name}** · ${o.role} · ${o.assignedUnit} · perf ${o.performance} · safety ${o.safetyScore} · certs: ${o.certifications.join(', ')}`,
        ),
      ].join('\n'),
      actions: [{ id: 'o', label: 'Open Operators', kind: 'nav', nav: 'operators' }],
    };
  }

  // ---- KPI / dashboard explain ----
  if (/explain|what is|kpi|downtime|utilization|availability|efficiency|payload|cycle time|dashboard|chart/.test(q)) {
    const hit =
      DASHBOARD_KPIS.find((k) => q.includes(k.label.toLowerCase().split(' ')[0])) ||
      DASHBOARD_KPIS.find((k) => k.id === 'down' && q.includes('down')) ||
      DASHBOARD_KPIS.find((k) => k.id === 'fuel' && q.includes('fuel')) ||
      DASHBOARD_KPIS.find((k) => k.id === 'util' && q.includes('util')) ||
      DASHBOARD_KPIS.find((k) => k.id === 'eff' && q.includes('effic'));

    if (hit) {
      return {
        markdown: [
          `### ${hit.label}`,
          '',
          `**Current:** ${hit.value}${hit.unit ? ` ${hit.unit}` : ''} · ${hit.statusLabel}`,
          `**Trend:** ${hit.trend >= 0 ? '+' : ''}${hit.trend}% vs previous shift (${hit.prevShift})`,
          `**Updated:** ${hit.lastUpdated}`,
          '',
          hit.tooltip,
          '',
          hit.status === 'critical'
            ? '**Ops note:** This KPI is in alert state — review linked units and open alerts.'
            : hit.status === 'watch'
              ? '**Ops note:** Watchlist — investigate before it becomes critical.'
              : '**Ops note:** Within acceptable operating band.',
        ].join('\n'),
        actions: [
          { id: 'dash', label: 'Dashboard', kind: 'nav', nav: 'dashboard' },
          { id: 'an', label: 'Analytics', kind: 'nav', nav: 'analytics' },
        ],
        suggestions: ['Open active alerts', 'Summarize production vs target', 'Overdue maintenance'],
      };
    }

    return {
      markdown: [
        '### Dashboard overview',
        '',
        `Site **${ctx.mineName}** · **${ctx.shiftCode}** · Ops Lead ${ctx.opsLead}`,
        '',
        `- Active units: **${EQUIPMENT_COUNTS.active}** · Idle/wait **${EQUIPMENT_COUNTS.idle}** · Maint **${EQUIPMENT_COUNTS.maintenance}** · Breakdown **${EQUIPMENT_COUNTS.breakdown}**`,
        `- Production today: **${PRODUCTION_TOTAL.toLocaleString()} t** / ${PRODUCTION_TARGET.toLocaleString()} t target`,
        `- Open alerts: **${ctx.alertCount}**`,
        '',
        'Ask me to explain any KPI card (e.g. “Explain downtime KPI”) or a chart (“Explain production trend”).',
      ].join('\n'),
      actions: [{ id: 'dash', label: 'Open Dashboard', kind: 'nav', nav: 'dashboard' }],
      suggestions: ['Explain downtime KPI', 'Explain utilization', 'Show active alerts'],
    };
  }

  // ---- Reports / export ----
  if (/report|export pdf|export excel|end.of.shift|shift report|executive summary/.test(q)) {
    return {
      markdown: [
        '### Reports assistant',
        '',
        'I can prepare shift packages from live ops data:',
        '- Production (target vs actual)',
        '- Fuel & cost',
        '- Maintenance / downtime',
        '- Equipment availability',
        '- Operator hours & safety',
        '',
        'Use **Generate shift report** for a quick handoff CSV, or open **Reports** for multi-select PDF/Excel/CSV packages.',
      ].join('\n'),
      actions: [
        { id: 'r', label: 'Generate shift report', kind: 'modal', modal: 'shift-report' },
        { id: 'rep', label: 'Open Reports', kind: 'nav', nav: 'reports' },
      ],
    };
  }

  // ---- Dispatch / live map helpers ----
  if (/dispatch|assign truck|reassign|queue/.test(q)) {
    const queued = DISPATCH_QUEUE.filter((j) => j.status === 'Queued');
    const active = DISPATCH_QUEUE.filter((j) => j.status === 'Active');
    return {
      markdown: [
        '### Dispatch assistant',
        '',
        `Queued jobs: **${queued.length}** · Active: **${active.length}**`,
        '',
        ...DISPATCH_QUEUE.slice(0, 6).map(
          (j) => `- **${j.id}** · ${j.truck} ↔ ${j.excavator} · ${j.loadPoint} → ${j.dumpPoint} · ${j.status} · P${j.priority}`,
        ),
      ].join('\n'),
      actions: [
        { id: 'd', label: 'Open Dispatch', kind: 'nav', nav: 'dispatch' },
        { id: 'a', label: 'New assignment', kind: 'modal', modal: 'assign' },
      ],
    };
  }

  if (/zoom|center map|follow|map assist|selected vehicle|selected unit/.test(q) || ctx.selectedAssetId) {
    if (/zoom|center|follow|selected|map/.test(q) || (ctx.selectedAssetId && /summary|condition|assignment|operator|fuel|maintenance/.test(q))) {
      const asset =
        FLEET.find((f) => f.id === ctx.selectedAssetId) ||
        (unitToken ? findAsset(unitToken[0]) : undefined) ||
        FLEET[0];
      const related = ALERTS.filter((a) => a.unit === asset.unit);
      return {
        markdown: [
          '### Live map / unit assistant',
          '',
          assetBrief(asset),
          '',
          '**Map controls (UI ready)** — zoom, center, and follow will attach to realtime GPS later. For now use Fleet **Track** / unit detail map refs.',
          '',
          related.length
            ? `**Related alerts**\n${related.map((a) => `- ${a.code}: ${a.title} (${a.acknowledged ? 'ack' : 'open'})`).join('\n')}`
            : '_No related alerts._',
        ].join('\n'),
        actions: [
          { id: 'det', label: `Open ${asset.unit}`, kind: 'detail', assetId: asset.id },
          { id: 'live', label: 'Live Operations', kind: 'nav', nav: 'live-ops' },
        ],
      };
    }
  }

  // ---- Analytics / executive ----
  if (/anomaly|executive|trend|mtbf|mttr|compare shift/.test(q)) {
    return {
      markdown: [
        '### Analytics brief',
        '',
        '- Production is **above target** this shift; afternoon hours soften — queue & recovery impact.',
        '- Fuel burn is **elevated** vs previous shift — watch idle waiting and heavy payloads.',
        '- Availability healthy overall; **breakdown + maintenance** still cap peak haul capacity.',
        '- MTBF/MTTR and cost drivers are on **Analytics**.',
        '',
        `You are on **${ctx.activeNav}**. I can open Analytics or draft an executive summary for leadership.`,
      ].join('\n'),
      actions: [
        { id: 'an', label: 'Open Analytics', kind: 'nav', nav: 'analytics' },
        { id: 'r', label: 'Shift report', kind: 'modal', modal: 'shift-report' },
      ],
    };
  }

  // ---- Help / where is ----
  if (/where is|how do i|help|what can you|feature/.test(q)) {
    return {
      markdown: [
        '### Operations Copilot help',
        '',
        'I stay docked so you never leave the board. Try:',
        '',
        '- **Navigate:** “Open Fleet”, “Go to Dispatch”',
        '- **Filter:** “Show idle trucks”, “Find low fuel vehicles”',
        '- **Explain:** “Explain downtime KPI”',
        '- **Unit:** “Open Equipment EX-03”',
        '- **Ops:** “Overdue maintenance”, “Summarize production vs target”',
        '- **Reports:** “Generate end-of-shift report”',
        '',
        'Shortcut: **Ctrl + Space** toggles this panel.',
      ].join('\n'),
      suggestions: SUGGESTED_PROMPTS,
      actions: [{ id: 'dash', label: 'Dashboard', kind: 'nav', nav: 'dashboard' }],
    };
  }

  // ---- Fallback smart summary ----
  return {
    markdown: [
      `I understood: “**${raw}**”.`,
      '',
      'Here is a quick ops snapshot while you refine the question:',
      '',
      `- Open alerts: **${ALERTS.filter((a) => !a.acknowledged).length}**`,
      `- Breakdown units: **${FLEET.filter((f) => f.status === 'Breakdown').map((f) => f.unit).join(', ') || 'none'}**`,
      `- Production: **${PRODUCTION_TOTAL.toLocaleString()} t** (${((PRODUCTION_TOTAL / PRODUCTION_TARGET) * 100).toFixed(1)}% of target)`,
      '',
      'Try a more specific command — or pick a suggestion below.',
    ].join('\n'),
    suggestions: SUGGESTED_PROMPTS,
    actions: [
      { id: 'a', label: 'Active alerts', kind: 'nav', nav: 'alerts' },
      { id: 'f', label: 'Fleet', kind: 'nav', nav: 'fleet' },
      { id: 'p', label: 'Production', kind: 'nav', nav: 'production' },
    ],
  };
}
