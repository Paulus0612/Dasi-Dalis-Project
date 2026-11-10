import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "./components.jsx";

const parse = (r) => r.json().then((d) => (r.ok ? d : Promise.reject(d)));
const nf = (n) => Number(n).toLocaleString("id-ID");
const PAGE = 25;

export default function KelolaData({ onChanged }) {
  const [info, setInfo] = useState(null);
  const [prev, setPrev] = useState(null);
  const [offset, setOffset] = useState(0);
  const [file, setFile] = useState(null);
  const [retrain, setRetrain] = useState(true);
  const [msg, setMsg] = useState(null); // {errors, warnings}
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  const load = useCallback(() => {
    fetch("/api/data/info").then(parse).then(setInfo).catch(() => setInfo({ ada: false, offline: true, required: [] }));
    fetch(`/api/data/preview?offset=${offset}&limit=${PAGE}`).then(parse).then(setPrev).catch(() => setPrev(null));
  }, [offset]);
  useEffect(load, [load]);

  // Pantau proses ETL/pelatihan di server sampai selesai.
  useEffect(() => {
    if (!job || job.state !== "running") return;
    const t = setInterval(() => {
      fetch("/api/data/job").then(parse).then((j) => {
        setJob(j);
        if (j.state !== "running") { clearInterval(t); setBusy(false); load(); if (j.state === "done") onChanged?.(); }
      });
    }, 1500);
    return () => clearInterval(t);
  }, [job, load, onChanged]);

  const upload = () => {
    if (!file) return;
    setMsg(null); setBusy(true);
    const fd = new FormData(); fd.append("file", file); fd.append("retrain", retrain);
    fetch("/api/data/upload", { method: "POST", body: fd }).then(parse)
      .then((d) => { setMsg({ warnings: d.warnings, ok: `${nf(d.rows)} baris diterima.` }); setOffset(0); setJob({ state: "running", step: "Memulai" }); setFile(null); if (input.current) input.current.value = ""; })
      .catch((e) => { setBusy(false); setMsg(e.detail ?? { errors: ["Gagal menghubungi server."] }); });
  };
  const reprocess = () => {
    setMsg(null); setBusy(true);
    const fd = new FormData(); fd.append("retrain", retrain);
    fetch("/api/data/reprocess", { method: "POST", body: fd }).then(parse).then(() => setJob({ state: "running", step: "Memulai" }))
      .catch((e) => { setBusy(false); setMsg(e.detail ?? { errors: ["Gagal memulai proses."] }); });
  };

  const q = info?.kualitas?.sesudah;
  return (
    <>
      <div className="kpis">
        <div className="kpi kpi-solid"><span className="kpi-label">Baris data</span><div className="kpi-value">{info?.ada ? nf(info.rows) : "-"}</div></div>
        <div className="kpi"><span className="kpi-label">Kolom</span><div className="kpi-value">{info?.ada ? info.cols : "-"}</div></div>
        <div className="kpi"><span className="kpi-label">Terakhir diperbarui</span><div className="kpi-value" style={{ fontSize: 17 }}>{info?.modified ?? "-"}</div></div>
        <div className="kpi"><span className="kpi-label">Model aktif</span><div className="kpi-value" style={{ fontSize: 17 }}>{info?.model?.best ?? "-"}</div>
          {info?.model && <span className="muted">AUC uji {info.model.test_auc}</span>}</div>
      </div>

      <div className="grid-2">
        <Card title="Unggah CSV baru" subtitle="Menggantikan data saat ini. File lama dicadangkan otomatis.">
          <div className="drop">
            <input ref={input} type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files[0] ?? null)} aria-label="Pilih file CSV" />
            {file && <p className="muted">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
          </div>
          <label className="check"><input type="checkbox" checked={retrain} onChange={(e) => setRetrain(e.target.checked)} /> Latih ulang model setelah ETL</label>
          <div className="row">
            <button className="btn" disabled={!file || busy} onClick={upload}>Unggah dan proses</button>
            <button className="btn btn-ghost" disabled={busy || !info?.ada} onClick={reprocess}>Proses ulang data saat ini</button>
          </div>
          {msg?.errors?.length > 0 && <ul className="alert alert-bad" role="alert">{msg.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          {msg?.warnings?.length > 0 && <ul className="alert alert-warn">{msg.warnings.map((e) => <li key={e}>{e}</li>)}</ul>}
          {msg?.ok && <p className="muted" style={{ marginTop: 8 }}>{msg.ok}</p>}
          {job && (
            <p className={`alert ${job.state === "error" ? "alert-bad" : job.state === "done" ? "alert-good" : ""}`} role="status">
              {job.state === "running" && `Sedang berjalan: ${job.step}...`}
              {job.state === "done" && "Selesai. Dashboard dan model sudah memakai data baru."}
              {job.state === "error" && `Gagal: ${job.message}`}
            </p>
          )}
        </Card>
        <Card title="Kualitas data" subtitle="Hasil ETL terakhir (setelah pembersihan)">
          {q ? <table><tbody>
            {[["Kelengkapan", q.completeness], ["Validitas", q.validity], ["Konsistensi", q.consistency], ["Keunikan", q.uniqueness]].map(([k, v]) =>
              <tr key={k}><td>{k}</td><td><b>{(v * 100).toFixed(1)}%</b></td></tr>)}</tbody></table>
            : <p className="muted">Belum ada laporan. Jalankan proses data.</p>}
          <div className="row" style={{ marginTop: 14 }}>
            <a className="btn btn-ghost" href="/api/data/download">Unduh CSV saat ini</a>
            <a className="btn btn-ghost" href="/api/data/template">Unduh templat kosong</a>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>Data pribadi harus dianonimkan (UU No. 27 Tahun 2022). Gunakan kode seperti B0001, bukan nama.</p>
        </Card>
      </div>

      <Card title="Pratinjau data" subtitle={prev ? `Baris ${nf(prev.offset + 1)} sampai ${nf(Math.min(prev.offset + PAGE, prev.total))} dari ${nf(prev.total)}` : ""}
        action={<div className="row">
          <button className="btn btn-ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Sebelumnya</button>
          <button className="btn btn-ghost" disabled={!prev || offset + PAGE >= prev.total} onClick={() => setOffset(offset + PAGE)}>Berikutnya</button></div>}>
        {prev ? (
          <div className="scroll"><table><thead><tr>{prev.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{prev.rows.map((r, i) => <tr key={i}>{prev.columns.map((c) => <td key={c}>{r[c] ?? ""}</td>)}</tr>)}</tbody></table></div>
        ) : <p className="muted">{info?.offline ? "Layanan data belum berjalan. Pastikan uvicorn aktif di port 8001." : "Belum ada data. Unggah CSV terlebih dahulu."}</p>}
      </Card>

      <Card title="Kolom wajib" subtitle="CSV harus memuat seluruh kolom ini (pemisah koma atau titik koma)">
        <p style={{ lineHeight: 1.9 }}>{(info?.required ?? []).join(", ")}</p>
      </Card>
    </>
  );
}
