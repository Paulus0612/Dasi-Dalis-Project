import React, { useEffect, useMemo, useState } from "react";
import { get, predict } from "./api.js";
import { Chart, COLORS } from "./plot.jsx";
import { Card, Kpi, RankList } from "./components.jsx";
import KelolaData from "./KelolaData.jsx";

const TAHUN = ["", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const NAV = [["ringkasan", "Ringkasan"], ["analisis", "Analisis mendalam"], ["prediksi", "Prediksi risiko"], ["data", "Kelola data"]];
const pct = (k, n) => (n ? (100 * k) / n : 0);

// Prevalensi per nilai satu faktor, dihitung dari /api/sanitasi.
function byFactor(rows, key) {
  const agg = {};
  rows.forEach((r) => { const a = (agg[r[key]] ??= { n: 0, k: 0 }); a.n += r.n; a.k += r.kasus; });
  return Object.entries(agg).map(([v, a]) => ({ v, p: +pct(a.k, a.n).toFixed(1), n: a.n }));
}

function Ringkasan({ f, setF, kpi, base, kec, trend, baseTrend, san }) {
  const air = byFactor(san, "air_minum_dimasak"), asi = byFactor(san, "masih_mendapat_asi");
  const tidakAir = air.find((x) => x.v === "Tidak"), yaAir = air.find((x) => x.v === "Ya");
  const top = kec[0];
  const ym = (t) => `${t.tahun}-${String(t.bulan).padStart(2, "0")}-01`;
  return (
    <>
      {kpi && base && (
        <div className="kpis">
          <Kpi solid label="Balita terdata" value={kpi.n.toLocaleString("id-ID")} unit="anak"
            delta={pct(kpi.n, base.n)} deltaLabel="% dari seluruh data" good="up" />
          <Kpi label="Prevalensi diare" value={kpi.prevalensi_pct} unit="%" delta={kpi.prevalensi_pct - base.prevalensi_pct} deltaLabel="poin vs rata-rata Toba" />
          <Kpi label="Rata-rata lama gejala" value={kpi.rata_lama_hari ?? "-"} unit="hari" delta={kpi.rata_lama_hari - base.rata_lama_hari} deltaLabel="hari vs rata-rata Toba" />
          <Kpi label="Air minum dimasak" value={kpi.air_dimasak_pct} unit="%" delta={kpi.air_dimasak_pct - base.air_dimasak_pct} deltaLabel="poin vs rata-rata Toba" good="up" />
        </div>
      )}
      <div className="grid-2">
        <Card title="Prevalensi diare naik-turun mengikuti musim" subtitle="Persentase balita bergejala diare 14 hari terakhir, per bulan">
          <Chart height={330} data={[
            { type: "scatter", mode: "lines", name: "Seluruh Toba", x: baseTrend.map(ym), y: baseTrend.map((t) => t.prevalensi_pct), line: { color: COLORS.grey, width: 1.5, dash: "dot" } },
            { type: "scatter", mode: "lines", name: f.kecamatan || "Pilihan saat ini", x: trend.map(ym), y: trend.map((t) => t.prevalensi_pct), fill: "tozeroy", fillcolor: "rgba(228,87,46,.12)", line: { color: COLORS.coral, width: 2.2 } },
          ]} layout={{ legend: { orientation: "h", y: 1.12 }, yaxis: { ticksuffix: "%", gridcolor: COLORS.line } }} />
        </Card>
        <Card title="Peringkat kecamatan" subtitle={f.kecamatan ? "Klik lagi untuk melepas filter" : "Klik kecamatan untuk memfilter semua grafik"}>
          <RankList rows={kec} active={f.kecamatan} onPick={(k) => setF({ ...f, kecamatan: f.kecamatan === k ? "" : k })} />
        </Card>
      </div>
      {top && tidakAir && yaAir && (
        <Card className="story" title={`${top.kecamatan} perlu perhatian lebih: prevalensi ${top.prevalensi_pct}%`}>
          <p>Balita di keluarga yang tidak memasak air minum terkena diare {tidakAir.p}%, dibanding {yaAir.p}% pada keluarga yang memasaknya.
            {asi.length === 2 && " Kelompok yang masih mendapat ASI justru tercatat lebih tinggi karena kebanyakan masih bayi, usia yang paling rentan; baca bersama grafik usia di halaman analisis."}
            {" "}Prioritaskan penyuluhan air matang dan cuci tangan di kecamatan teratas.</p>
        </Card>
      )}
    </>
  );
}

function Analisis({ f, heat, usia, san, scatter }) {
  const years = [...new Set(heat.map((h) => h.tahun))].sort(), kecs = [...new Set(heat.map((h) => h.kecamatan))].sort();
  const groups = ["0-5 bln", "6-11 bln", "12-23 bln", "24-35 bln", "36-59 bln"];
  const factors = [["air_minum_dimasak", "Air dimasak"], ["cuci_tangan_pakai_sabun", "Cuci tangan pakai sabun"], ["masih_mendapat_asi", "Masih ASI"]];
  return (
    <>
      <Card title="Beberapa kecamatan konsisten lebih tinggi dari tahun ke tahun" subtitle="Heatmap prevalensi diare (%) per kecamatan dan tahun">
        <Chart height={460} data={[{ type: "heatmap", x: years.map(String), y: kecs, colorscale: "YlOrRd", colorbar: { ticksuffix: "%" },
          z: kecs.map((k) => years.map((y) => heat.find((h) => h.kecamatan === k && h.tahun === y)?.prevalensi_pct ?? null)) }]}
          layout={{ margin: { l: 130, r: 10, t: 8, b: 36 } }} />
      </Card>
      <div className="grid-3" style={{ marginTop: 14 }}>
        <Card title="Bayi 6 sampai 23 bulan paling rentan" subtitle="Prevalensi menurut kelompok usia dan jenis kelamin">
          <Chart data={["L", "P"].map((jk, i) => ({ type: "bar", name: jk === "L" ? "Laki-laki" : "Perempuan", x: groups,
            y: groups.map((g) => usia.find((u) => u.kelompok_usia === g && u.jenis_kelamin === jk)?.prevalensi_pct ?? 0), marker: { color: i ? COLORS.teal : COLORS.blue } }))}
            layout={{ barmode: "group", legend: { orientation: "h", y: 1.15 }, yaxis: { ticksuffix: "%", gridcolor: COLORS.line } }} />
        </Card>
        <Card title="Air tidak dimasak dan tanpa cuci tangan berisiko lebih tinggi" subtitle="Prevalensi menurut praktik rumah tangga">
          <Chart data={["Ya", "Tidak"].map((v, i) => ({ type: "bar", name: v, x: factors.map((x) => x[1]),
            y: factors.map(([k]) => byFactor(san, k).find((a) => a.v === v)?.p ?? 0), marker: { color: i ? COLORS.coral : COLORS.navy } }))}
            layout={{ barmode: "group", legend: { orientation: "h", y: 1.15 }, yaxis: { ticksuffix: "%", gridcolor: COLORS.line } }} />
        </Card>
      </div>
      <Card title="Tidak ada pola tunggal pada ukuran tubuh" subtitle="Sampel 1.500 balita: usia dan berat badan, dibedakan menurut status diare">
        <Chart height={360} data={[0, 1].map((d) => ({ type: "scatter", mode: "markers", name: d ? "Diare" : "Tidak diare",
          x: scatter.filter((s) => s.diare === d).map((s) => s.usia_balita_bulan), y: scatter.filter((s) => s.diare === d).map((s) => s.berat_badan_kg),
          marker: { size: 5, opacity: d ? 0.8 : 0.3, color: d ? COLORS.coral : COLORS.grey } }))}
          layout={{ xaxis: { title: "Usia (bulan)", gridcolor: COLORS.line }, yaxis: { title: "Berat (kg)", gridcolor: COLORS.line }, legend: { orientation: "h", y: 1.1 } }} />
      </Card>
    </>
  );
}

const INIT = { usia_balita_bulan: 18, jenis_kelamin: "L", kecamatan: "Balige", berat_badan_kg: 10, panjang_tinggi_badan_cm: 80, hb_ibu_g_dL: 12,
  status_kehamilan_saat_pemeriksaan_hb: "Tidak hamil", masih_mendapat_asi: "Ya", jumlah_kelompok_pangan_24_jam: 4, frekuensi_makan_24_jam: 3,
  air_minum_dimasak: "Ya", cuci_tangan_pakai_sabun: "Ya", bulan: 6 };
const LABEL = { usia_balita_bulan: "Usia (bulan)", jenis_kelamin: "Jenis kelamin", kecamatan: "Kecamatan", berat_badan_kg: "Berat badan (kg)",
  panjang_tinggi_badan_cm: "Panjang/tinggi badan (cm)", hb_ibu_g_dL: "Hb ibu (g/dL)", status_kehamilan_saat_pemeriksaan_hb: "Status kehamilan ibu",
  masih_mendapat_asi: "Masih mendapat ASI", jumlah_kelompok_pangan_24_jam: "Kelompok pangan (24 jam)", frekuensi_makan_24_jam: "Frekuensi makan (24 jam)",
  air_minum_dimasak: "Air minum dimasak", cuci_tangan_pakai_sabun: "Cuci tangan pakai sabun", bulan: "Bulan pengukuran" };

function Prediksi({ kecList }) {
  const [x, setX] = useState(INIT), [res, setRes] = useState(null), [m, setM] = useState(null), [err, setErr] = useState("");
  useEffect(() => { get("model-metrics").then(setM).catch(() => setErr("Layanan model belum berjalan.")); }, []);
  const opts = { jenis_kelamin: [["L", "Laki-laki"], ["P", "Perempuan"]], kecamatan: kecList.map((k) => [k, k]),
    status_kehamilan_saat_pemeriksaan_hb: [["Tidak hamil", "Tidak hamil"], ["Hamil", "Hamil"]],
    masih_mendapat_asi: [["Ya", "Ya"], ["Tidak", "Tidak"]], air_minum_dimasak: [["Ya", "Ya"], ["Tidak", "Tidak"]], cuci_tangan_pakai_sabun: [["Ya", "Ya"], ["Tidak", "Tidak"]] };
  const run = () => { setErr(""); predict(x).then(setRes).catch(() => setErr("Prediksi gagal. Periksa isian dan layanan model.")); };
  const best = m?.results.find((r) => r.model === m.best);
  return (
    <>
      <Card title="Hitung risiko diare satu balita" subtitle="Isi data, lalu lihat probabilitas dari model terbaik">
        <div className="form">
          {Object.keys(INIT).map((k) => (
            <label className="field" key={k}>{LABEL[k]}
              {opts[k] ? <select value={x[k]} onChange={(e) => setX({ ...x, [k]: e.target.value })}>{opts[k].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                : <input type="number" step="any" value={x[k]} onChange={(e) => setX({ ...x, [k]: Number(e.target.value) })} />}
            </label>
          ))}
        </div>
        <button className="btn" onClick={run}>Hitung risiko</button>
        {err && <p className="muted" role="alert" style={{ marginTop: 10, color: "#b53c18" }}>{err}</p>}
        {res && (
          <div className="result">
            <div><div className="muted">Probabilitas diare</div><div className="kpi-value">{(res.probabilitas_diare * 100).toFixed(1)}%</div></div>
            <div className="gauge" aria-hidden><span style={{ width: `${res.probabilitas_diare * 100}%` }} /></div>
            <div><div className="muted">Kelas / risiko</div><b>{res.kelas} / {res.risiko}</b></div>
          </div>
        )}
      </Card>
      {m && (
        <div className="grid-3" style={{ marginTop: 14 }}>
          <Card title="Perbandingan model" subtitle={`Model terpilih: ${m.best}. Data uji: ${m.n_test} balita`}>
            <table><thead><tr><th>Model</th><th>CV AUC</th><th>Test AUC</th><th>F1</th><th>Recall</th></tr></thead>
              <tbody>{m.results.map((r) => <tr key={r.model}><td>{r.model}{r.model === m.best ? " (terpilih)" : ""}</td><td>{r.cv_auc}</td><td>{r.test_auc}</td><td>{r.f1}</td><td>{r.recall}</td></tr>)}</tbody></table>
            <p className="muted" style={{ marginTop: 10 }}>Fitur lama gejala dan frekuensi BAB cair tidak dipakai karena mengandung jawaban target.</p>
          </Card>
          <Card title="Kurva ROC">
            <Chart height={300} data={[...Object.entries(m.roc).map(([n, c]) => ({ type: "scatter", mode: "lines", name: n, x: c.fpr, y: c.tpr })),
              { type: "scatter", mode: "lines", name: "Acak", x: [0, 1], y: [0, 1], line: { dash: "dot", color: COLORS.grey } }]}
              layout={{ xaxis: { title: "False positive rate" }, yaxis: { title: "True positive rate" }, legend: { orientation: "h", y: -0.3 } }} />
          </Card>
          {best && (
            <Card title="Matriks kebingungan" subtitle="Model terpilih pada data uji">
              <Chart height={280} data={[{ type: "heatmap", x: ["Prediksi tidak", "Prediksi ya"], y: ["Aktual ya", "Aktual tidak"], colorscale: "Blues", showscale: false,
                z: [best.confusion_matrix[1], best.confusion_matrix[0]], text: [best.confusion_matrix[1], best.confusion_matrix[0]], texttemplate: "%{text}" }]} />
            </Card>
          )}
        </div>
      )}
    </>
  );
}

export default function App() {
  const [page, setPage] = useState("ringkasan");
  const [f, setF] = useState({ tahun: "", kecamatan: "" });
  const [tick, setTick] = useState(0);
  const [d, setD] = useState({ kpi: null, base: null, kec: [], trend: [], baseTrend: [], heat: [], usia: [], san: [], scatter: [], kecAll: [] });

  useEffect(() => {
    const t = { tahun: f.tahun };
    Promise.all([get("kpi", f), get("kpi", {}), get("by-kecamatan", t), get("trend", f), get("trend", {}), get("heatmap", {}),
      get("by-usia", f), get("sanitasi", f), get("scatter", f), get("by-kecamatan", {})])
      .then(([kpi, base, kec, trend, baseTrend, heat, usia, san, scatter, kecAll]) =>
        setD({ kpi: kpi[0], base: base[0], kec, trend, baseTrend, heat, usia, san, scatter, kecAll }))
      .catch(() => {});
  }, [f, tick]);

  const kecList = useMemo(() => d.kecAll.map((k) => k.kecamatan).sort(), [d.kecAll]);
  const title = NAV.find(([k]) => k === page)[1];
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><h1>Diare Balita Toba</h1><p>Pemantauan kesehatan anak</p></div>
        <div className="scope"><b>Kabupaten Toba</b>16 kecamatan, data 2020 sampai 2026</div>
        <nav className="nav" aria-label="Menu utama">
          {NAV.map(([k, l]) => <button key={k} className={page === k ? "on" : ""} onClick={() => setPage(k)} aria-current={page === k ? "page" : undefined}>{l}</button>)}
        </nav>
        <p className="side-foot">Data simulasi untuk proyek Data Analitik dan Data Science IT Del.</p>
      </aside>
      <main className="main">
        <div className="top">
          <h2>{title}</h2>
          {(page === "ringkasan" || page === "analisis") && (
            <div className="tools">
              <select aria-label="Tahun" value={f.tahun} onChange={(e) => setF({ ...f, tahun: e.target.value })}>{TAHUN.map((t) => <option key={t} value={t}>{t || "Semua tahun"}</option>)}</select>
              {f.kecamatan && <button className="chip" onClick={() => setF({ ...f, kecamatan: "" })}>{f.kecamatan} (hapus filter)</button>}
              <button onClick={() => setTick(tick + 1)}>Muat ulang data</button>
            </div>
          )}
        </div>
        {page === "ringkasan" && <Ringkasan f={f} setF={setF} {...d} />}
        {page === "analisis" && <Analisis f={f} {...d} />}
        {page === "prediksi" && <Prediksi kecList={kecList} />}
        {page === "data" && <KelolaData onChanged={() => setTick((t) => t + 1)} />}
      </main>
    </div>
  );
}
