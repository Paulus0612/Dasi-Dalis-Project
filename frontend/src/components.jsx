import React from "react";

export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div><h3>{title}</h3>{subtitle && <p className="muted">{subtitle}</p>}</div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// Kartu KPI dengan pembanding (syarat dokumen proyek: KPI wajib punya pembanding).
export function Kpi({ label, value, unit, delta, deltaLabel, solid, good = "down" }) {
  const has = delta !== undefined && delta !== null && !Number.isNaN(delta);
  const up = delta > 0;
  const isGood = has && (good === "down" ? delta <= 0 : delta >= 0);
  return (
    <div className={`kpi ${solid ? "kpi-solid" : ""}`}>
      <span className="kpi-label">{label}</span>
      <div className="kpi-value">{value}{unit && <small>{unit}</small>}</div>
      {has && (
        <span className={`pill ${solid ? "pill-solid" : isGood ? "pill-good" : "pill-bad"}`}>
          {up ? "+" : ""}{delta.toFixed(1)} {deltaLabel}
        </span>
      )}
    </div>
  );
}

// Peringkat kecamatan: batang bisa diklik untuk memfilter seluruh dashboard (cross-filter).
export function RankList({ rows, active, onPick }) {
  const max = Math.max(...rows.map((r) => r.prevalensi_pct), 1);
  return (
    <ol className="rank">
      {rows.map((r) => (
        <li key={r.kecamatan}>
          <button className={active === r.kecamatan ? "on" : ""} onClick={() => onPick(r.kecamatan)}
            aria-pressed={active === r.kecamatan}>
            <span className="rank-top"><span>{r.kecamatan}</span><b>{r.prevalensi_pct}%</b></span>
            <span className="bar"><span style={{ width: `${(r.prevalensi_pct / max) * 100}%` }} /></span>
          </button>
        </li>
      ))}
    </ol>
  );
}
