import React, { useEffect, useMemo, useState } from "react";
import { get, predict } from "./api.js";
import { Chart, COLORS } from "./plot.jsx";
import { Card, Kpi, RankList } from "./components.jsx";
import KelolaData from "./KelolaData.jsx";

const TAHUN = ["", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const NAV = [["ringkasan", "Ringkasan"], ["analisis", "Analisis mendalam"], ["cerita", "Cerita keputusan"], ["prediksi", "Prediksi risiko"], ["data", "Kelola data"]];
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
  const peak = trend.reduce((best, row) => !best || row.prevalensi_pct > best.prevalensi_pct ? row : best, null);
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
          ]} layout={{ legend: { orientation: "h", y: 1.12 }, yaxis: { ticksuffix: "%", gridcolor: COLORS.line },
            annotations: peak ? [{ x: ym(peak), y: peak.prevalensi_pct, text: `Puncak ${peak.prevalensi_pct}%`, showarrow: true, arrowcolor: COLORS.coral }] : [] }} />
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

function Analisis({ f, setF, heat, usia, san, scatter, kec }) {
  const years = [...new Set(heat.map((h) => h.tahun))].sort(), kecs = [...new Set(heat.map((h) => h.kecamatan))].sort();
  const groups = ["0-5 bln", "6-11 bln", "12-23 bln", "24-35 bln", "36-59 bln"];
  const factors = [["air_minum_dimasak", "Air dimasak"], ["cuci_tangan_pakai_sabun", "Cuci tangan pakai sabun"], ["masih_mendapat_asi", "Masih ASI"]];
  return (
    <>
      <Card title="Beberapa kecamatan konsisten lebih tinggi dari tahun ke tahun" subtitle="Klik satu tahun untuk memfilter seluruh analisis">
        <Chart height={460} data={[{ type: "heatmap", x: years.map(String), y: kecs, colorscale: "YlOrRd", colorbar: { ticksuffix: "%" },
          z: kecs.map((k) => years.map((y) => heat.find((h) => h.kecamatan === k && h.tahun === y)?.prevalensi_pct ?? null)) }]}
          onClick={(event) => {
            const year = event?.points?.[0]?.x;
            if (year) setF({ ...f, tahun: f.tahun === String(year) ? "" : String(year) });
          }}
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
      <div className="grid-2" style={{ marginTop: 14 }}>
        <Card title="Sebaran berat badan memperlihatkan rentang yang tumpang tindih" subtitle="Box plot membantu membaca median dan pencilan menurut status diare">
          <Chart height={320} data={[0, 1].map((d) => ({
            type: "box", name: d ? "Diare" : "Tidak diare",
            y: scatter.filter((s) => s.diare === d).map((s) => s.berat_badan_kg),
            marker: { color: d ? COLORS.coral : COLORS.navy }, boxmean: true
          }))} layout={{ yaxis: { title: "Berat badan (kg)", gridcolor: COLORS.line }, boxmode: "group" }} />
        </Card>
        <Card title="Kecamatan dengan data terbanyak menjadi titik awal pembacaan" subtitle="Treemap menunjukkan jumlah balita per wilayah, bukan tingkat risiko">
          <Chart height={320} data={[{
            type: "treemap", labels: ["Kabupaten Toba", ...kec.map((r) => r.kecamatan)],
            parents: ["", ...kec.map(() => "Kabupaten Toba")],
            values: [kec.reduce((sum, r) => sum + r.n, 0), ...kec.map((r) => r.n)],
            branchvalues: "total", textinfo: "label+value", marker: { colors: [COLORS.navy, ...kec.map(() => COLORS.blue)] }
          }]} layout={{ margin: { l: 0, r: 0, t: 0, b: 0 } }} />
        </Card>
      </div>
      <Card title="Profil balita dapat dibandingkan tanpa menghapus konteks" subtitle="Parallel coordinates memakai variabel numerik yang tersedia pada sampel terfilter">
        <Chart height={330} data={[{
          type: "parcoords", line: { color: scatter.map((s) => s.diare), colorscale: [[0, COLORS.grey], [1, COLORS.coral]], showscale: false },
          dimensions: [
            { label: "Usia (bulan)", values: scatter.map((s) => s.usia_balita_bulan), range: [0, 59] },
            { label: "Berat (kg)", values: scatter.map((s) => s.berat_badan_kg) },
            { label: "Tinggi (cm)", values: scatter.map((s) => s.panjang_tinggi_badan_cm) },
            { label: "Hb ibu", values: scatter.map((s) => s.hb_ibu_g_dL) },
            { label: "Kelompok pangan", values: scatter.map((s) => s.jumlah_kelompok_pangan_24_jam) }
          ]
        }]} layout={{ margin: { l: 30, r: 30, t: 16, b: 20 } }} />
      </Card>
    </>
  );
}

function StoryBlock({ number, question, answer, children, explanation, recommendation }) {
  return (
    <article className="story-block">
      <div className="story-question">
        <span className="story-number">0{number}</span>
        <div><h3>{question}</h3><p className="story-answer">{answer}</p></div>
      </div>
      <div className="story-charts">{children}</div>
      <div className="story-copy"><p>{explanation}</p><p className="story-recommendation"><b>Rekomendasi:</b> {recommendation}</p></div>
    </article>
  );
}

function Cerita({ f, kpi, kec, san, trend, heat, scatter, modelMetrics, setPage }) {
  const air = byFactor(san, "air_minum_dimasak");
  const cooked = air.find((x) => x.v === "Ya");
  const uncooked = air.find((x) => x.v === "Tidak");
  const top = kec[0];
  const bottom = kec[kec.length - 1];
  const peak = trend.reduce((best, row) => !best || row.prevalensi_pct > best.prevalensi_pct ? row : best, null);
  const trough = trend.reduce((best, row) => !best || row.prevalensi_pct < best.prevalensi_pct ? row : best, null);
  const period = (row) => row ? `${row.tahun}-${String(row.bulan).padStart(2, "0")}` : "periode tidak tersedia";
  const n = Number(kpi?.n || 0);
  const enough = kpi && n > 0 && top && peak && trend.length > 0;
  const smallSample = n < 30;
  const airGap = cooked && uncooked ? +(uncooked.p - cooked.p).toFixed(1) : null;
  const years = [...new Set(heat.map((row) => row.tahun))].sort();
  const areas = [...new Set(heat.map((row) => row.kecamatan))].sort();
  const topAreas = kec.slice(0, 5);
  const trendDates = trend.map((row) => `${row.tahun}-${String(row.bulan).padStart(2, "0")}-01`);
  const peakIndex = peak ? trend.findIndex((row) => row.tahun === peak.tahun && row.bulan === peak.bulan) : -1;
  if (!enough) return <Card title="Cerita keputusan"><p className="muted">Belum ada cukup data untuk menyusun cerita. Periksa filter tahun atau muat ulang data.</p></Card>;
  return (
    <div className="story-report">
      <header className="story-hero">
        <span className="eyebrow">Laporan eksekutif</span>
        <h1>Kapan dan di mana pencegahan diare balita perlu dipusatkan?</h1>
        <p className="story-summary">Pada {n.toLocaleString("id-ID")} balita yang dianalisis, prevalensi diare berada di {kpi.prevalensi_pct}%. {top.kecamatan} menjadi prioritas pemantauan dengan prevalensi {top.prevalensi_pct}%, sementara puncak periode tercatat pada {period(peak)} sebesar {peak.prevalensi_pct}%.</p>
        <div className="story-meta"><span>Sumber: warehouse SQLite proyek</span><span>Periode: {f.tahun || "2020 sampai 2026"}</span><span>Baris dianalisis: {n.toLocaleString("id-ID")}</span></div>
        {smallSample && <p className="story-caution">Catatan: jumlah data pada filter ini kecil, jadi temuan perlu dikonfirmasi dengan konteks lapangan.</p>}
      </header>

      <StoryBlock number={1} question="Seberapa besar kondisi diare pada data yang dipilih?" answer={`${kpi.prevalensi_pct}% dari ${n.toLocaleString("id-ID")} balita tercatat diare.`}
        explanation={`Tren bulanan bergerak dari ${trough?.prevalensi_pct ?? 0}% pada ${period(trough)} ke puncak ${peak.prevalensi_pct}% pada ${period(peak)}. Angka ini menggambarkan data yang masuk ke warehouse, bukan estimasi seluruh balita di luar data.`}
        recommendation="Tim analitik menyajikan prevalensi dan jumlah baris ini sebagai konteks awal sebelum menetapkan sasaran program.">
        <Card title={`Puncak prevalensi terjadi pada ${period(peak)}`} subtitle="Garis coral menunjukkan data terpilih, titik diberi label agar temuan terbaca langsung">
          <Chart height={300} data={[{ type: "scatter", mode: "lines+markers", name: "Prevalensi", x: trendDates, y: trend.map((row) => row.prevalensi_pct), line: { color: COLORS.coral, width: 3 }, marker: { color: COLORS.coral, size: 7 } }]}
            layout={{ yaxis: { ticksuffix: "%", title: "Prevalensi diare", gridcolor: COLORS.line }, xaxis: { title: "Bulan pengukuran" }, annotations: peakIndex >= 0 ? [{ x: trendDates[peakIndex], y: peak.prevalensi_pct, text: `Puncak ${peak.prevalensi_pct}%`, showarrow: true, arrowcolor: COLORS.coral, bgcolor: "#fff" }] : [] }} />
        </Card>
        <Card title="Komposisi kasus tetap dibaca bersama ukuran sampel" subtitle="KPI utama untuk mencegah persentase dibaca tanpa konteks">
          <div className="story-mini-kpis"><div><b>{kpi.prevalensi_pct}%</b><span>prevalensi</span></div><div><b>{n.toLocaleString("id-ID")}</b><span>balita</span></div><div><b>{kpi.rata_lama_hari ?? 0}</b><span>hari gejala rata-rata</span></div></div>
        </Card>
      </StoryBlock>

      <StoryBlock number={2} question="Wilayah mana yang paling perlu didahulukan?" answer={`${top.kecamatan} memiliki prevalensi tertinggi, ${top.prevalensi_pct}%, sedangkan ${bottom?.kecamatan || "wilayah terbawah"} berada di ${bottom?.prevalensi_pct ?? 0}%.`}
        explanation={`Peringkat ini membandingkan wilayah berdasarkan prevalensi, tetapi volume data tetap penting. ${top.kecamatan} memiliki ${top.n.toLocaleString("id-ID")} baris, sehingga prioritas perlu dipadukan dengan jumlah observasi dan verifikasi lapangan.`}
        recommendation={`Dinas kesehatan dan kader memulai pemantauan di ${top.kecamatan}, lalu mencatat perubahan prevalensi pada periode berikutnya.`}>
        <Card title={`${top.kecamatan} menonjol di antara lima wilayah teratas`} subtitle="Perbandingan prevalensi, dengan coral sebagai aksen prioritas">
          <Chart height={300} data={[{ type: "bar", x: topAreas.map((row) => row.kecamatan), y: topAreas.map((row) => row.prevalensi_pct), marker: { color: topAreas.map((_, i) => i === 0 ? COLORS.coral : COLORS.grey) }, text: topAreas.map((row) => `${row.prevalensi_pct}%`), textposition: "outside" }]}
            layout={{ yaxis: { ticksuffix: "%", title: "Prevalensi diare", gridcolor: COLORS.line }, margin: { b: 90 } }} />
        </Card>
        <Card title="Lima wilayah teratas menyumbang volume data yang berbeda" subtitle="Treemap menunjukkan jumlah baris, bukan tingkat risiko">
          <Chart height={300} data={[{ type: "treemap", labels: ["Lima wilayah", ...topAreas.map((row) => row.kecamatan)], parents: ["", ...topAreas.map(() => "Lima wilayah")], values: [topAreas.reduce((sum, row) => sum + row.n, 0), ...topAreas.map((row) => row.n)], textinfo: "label+value", marker: { colors: [COLORS.navy, ...topAreas.map((_, i) => i === 0 ? COLORS.coral : COLORS.grey)] } }]} layout={{ margin: { l: 0, r: 0, t: 0, b: 0 } }} />
        </Card>
      </StoryBlock>

      <StoryBlock number={3} question="Kapan pola waktu perlu diwaspadai?" answer={`Puncak tercatat pada ${period(peak)} sebesar ${peak.prevalensi_pct}%, sedangkan titik terendah berada pada ${period(trough)} sebesar ${trough?.prevalensi_pct ?? 0}%.`}
        explanation="Heatmap membantu melihat apakah puncak hanya terjadi pada satu wilayah atau muncul di beberapa wilayah pada tahun yang sama. Pola waktu adalah sinyal untuk menjadwalkan pemantauan, bukan bukti bahwa musim menjadi penyebab tunggal."
        recommendation={`Pengelola program menyiapkan pemeriksaan tambahan sebelum dan selama ${period(peak)}, lalu membandingkan hasilnya dengan ${period(trough)}.`}>
        <Card title={`Puncak ${peak.prevalensi_pct}% terlihat pada ${period(peak)}`} subtitle="Heatmap dipakai untuk membaca konsentrasi wilayah dan tahun">
          <Chart height={360} data={[{ type: "heatmap", x: years.map(String), y: areas, z: areas.map((area) => years.map((year) => heat.find((row) => row.kecamatan === area && row.tahun === year)?.prevalensi_pct ?? null)), colorscale: [[0, "#f1f1f4"], [.65, "#f7b28f"], [1, COLORS.coral]], colorbar: { ticksuffix: "%" } }]} layout={{ margin: { l: 120, r: 20, t: 8, b: 35 } }} />
        </Card>
        <Card title="Perbedaan puncak dan lembah memberi jarak pembanding" subtitle="Deret waktu ringkas untuk membaca arah perubahan">
          <div className="story-range"><div><span>Terendah</span><b>{trough?.prevalensi_pct ?? 0}%</b><small>{period(trough)}</small></div><div className="story-range-line" /><div><span>Tertinggi</span><b>{peak.prevalensi_pct}%</b><small>{period(peak)}</small></div></div>
        </Card>
      </StoryBlock>

      <StoryBlock number={4} question="Faktor rumah tangga mana yang paling berhubungan dengan prevalensi?" answer={airGap === null ? "Data praktik air minum belum cukup untuk membandingkan dua kelompok." : `Kelompok yang tidak memasak air tercatat ${airGap} poin persentase lebih tinggi daripada kelompok yang memasak air.`}
        explanation="Perbandingan ini menunjukkan hubungan pada data observasi, bukan sebab-akibat. Perbedaan dapat berkaitan dengan usia, wilayah, atau kondisi lain yang tidak seluruhnya diukur pada tampilan ini."
        recommendation="Kader memprioritaskan edukasi air matang dan cuci tangan di wilayah teratas, kemudian mengukur ulang prevalensi dengan definisi dan periode yang sama.">
        <Card title={airGap === null ? "Praktik air minum belum dapat dibandingkan" : `Selisih prevalensi air minum adalah ${airGap} poin`} subtitle="Perbandingan kelompok praktik rumah tangga">
          <Chart height={300} data={[{ type: "bar", x: ["Air dimasak", "Air tidak dimasak"], y: [cooked?.p ?? 0, uncooked?.p ?? 0], marker: { color: [COLORS.grey, COLORS.coral] }, text: [`${cooked?.p ?? 0}%`, `${uncooked?.p ?? 0}%`], textposition: "outside" }]} layout={{ yaxis: { ticksuffix: "%", title: "Prevalensi diare", gridcolor: COLORS.line } }} />
        </Card>
        <Card title="Sebaran berat badan kedua kelompok masih beririsan" subtitle="Box plot membantu menghindari kesimpulan dari satu nilai rata-rata">
          <Chart height={300} data={[0, 1].map((d) => ({ type: "box", name: d ? "Diare" : "Tidak diare", y: scatter.filter((row) => row.diare === d).map((row) => row.berat_badan_kg), marker: { color: d ? COLORS.coral : COLORS.grey }, boxmean: true }))} layout={{ yaxis: { title: "Berat badan (kg)", gridcolor: COLORS.line }, boxmode: "group" }} />
        </Card>
      </StoryBlock>

      <StoryBlock number={5} question="Apa yang dapat dibantu oleh model prediksi?" answer={modelMetrics?.best ? `${modelMetrics.best} dipakai sebagai model terbaik pada evaluasi proyek, tetapi hasilnya tetap perlu ditinjau petugas.` : "Model membantu menyaring profil baru untuk ditinjau, bukan menggantikan pemeriksaan atau keputusan klinis."}
        explanation="Halaman Prediksi memakai model terbaik yang tersimpan dan menampilkan probabilitas kelas. Hasil perlu dibaca bersama keterbatasan data, karena performa uji tidak menjamin hasil yang sama pada wilayah atau periode baru."
        recommendation="Petugas menggunakan prediksi sebagai daftar tinjauan awal, lalu mengonfirmasi setiap profil dengan pemeriksaan dan konteks lapangan.">
        <Card title="Prediksi dijadikan langkah tindak lanjut, bukan klaim kepastian" subtitle="Hubungkan cerita ke modul prediksi untuk menguji satu profil">
          <div className="story-model-callout"><span className="story-model-mark">ML</span><div><b>{modelMetrics?.best || "Model tersimpan"}</b><p>Model terbaik tersimpan pada proyek. Probabilitas dan kelas prediksi tersedia setelah profil diisi.</p></div><button className="btn" onClick={() => setPage("prediksi")}>Buka Prediksi</button></div>
        </Card>
        <Card title="Performa uji membandingkan tiga pendekatan" subtitle="AUC test dari metrics.json, bukan angka dekoratif">
          <Chart height={300} data={[{ type: "bar", x: (modelMetrics?.results || []).map((row) => row.model), y: (modelMetrics?.results || []).map((row) => row.test_auc), marker: { color: (modelMetrics?.results || []).map((row) => row.model === modelMetrics?.best ? COLORS.coral : COLORS.grey) }, text: (modelMetrics?.results || []).map((row) => row.test_auc), textposition: "outside" }]} layout={{ yaxis: { title: "AUC data uji", range: [0, 1], gridcolor: COLORS.line }, margin: { b: 105 } }} />
        </Card>
      </StoryBlock>

      <section className="story-close">
        <div><span className="eyebrow">Keputusan berikutnya</span><h2>Apa yang harus dilakukan sekarang?</h2><p>Gunakan temuan di atas untuk memulai tindakan yang bisa diukur dan ditinjau ulang.</p></div>
        <table><thead><tr><th>Prioritas</th><th>Tindakan</th><th>Penanggung jawab</th><th>Dasar</th><th>Indikator</th></tr></thead><tbody>
          <tr><td>01</td><td>Mulai pemantauan wilayah {top.kecamatan}</td><td>Dinas dan kader</td><td>Q2</td><td>Prevalensi periode berikutnya tercatat</td></tr>
          <tr><td>02</td><td>Jadwalkan edukasi air matang sebelum {period(peak)}</td><td>Kader wilayah</td><td>Q3-Q4</td><td>Perbandingan praktik air tersedia</td></tr>
          <tr><td>03</td><td>Konfirmasi profil berisiko dengan pemeriksaan</td><td>Petugas kesehatan</td><td>Q5</td><td>Setiap prediksi memiliki tindak lanjut</td></tr>
        </tbody></table>
        <button className="btn" onClick={() => setPage("prediksi")}>Coba skenario di Prediksi</button>
      </section>
    </div>
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
  const run = () => {
    setErr("");
    const invalid = Object.entries(x).some(([key, value]) => value === "" || value === null || (typeof value === "number" && Number.isNaN(value)));
    if (invalid) { setErr("Lengkapi semua isian sebelum menghitung risiko."); return; }
    predict(x).then(setRes).catch((e) => setErr(e.message || "Prediksi gagal. Periksa isian dan layanan model."));
  };
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
      {m && (
        <Card className="model-card" title="Model card" subtitle="Ringkasan penggunaan model yang sedang dipakai">
          <div className="model-card-grid">
            <p><b>Tujuan.</b> Klasifikasi risiko diare balita dari profil pemeriksaan dan praktik rumah tangga.</p>
            <p><b>Data latih.</b> {m.n_train?.toLocaleString("id-ID")} baris dari warehouse SQLite proyek, dengan {m.features?.length} fitur dan target diare.</p>
            <p><b>Performa utama.</b> Model terpilih {m.best}, AUC uji {best?.test_auc}, F1 {best?.f1}, recall {best?.recall}.</p>
            <p><b>Keterbatasan.</b> Data proyek bukan pengganti pemeriksaan klinis. Hasil dapat bias terhadap wilayah, periode, dan pola data yang masuk ke warehouse.</p>
          </div>
          {m.error_analysis_fn?.length > 0 && <div className="scroll"><table><caption>Contoh false negative dengan probabilitas terendah, dugaan penyebab: fitur yang tersedia belum cukup membedakan kasus.</caption><thead><tr><th>Usia</th><th>Kecamatan</th><th>Probabilitas</th><th>Air dimasak</th><th>Cuci tangan</th></tr></thead><tbody>{m.error_analysis_fn.map((r, i) => <tr key={i}><td>{r.usia_balita_bulan}</td><td>{r.kecamatan}</td><td>{(r.prob * 100).toFixed(1)}%</td><td>{r.air_minum_dimasak}</td><td>{r.cuci_tangan_pakai_sabun}</td></tr>)}</tbody></table></div>}
        </Card>
      )}
    </>
  );
}

export default function App() {
  const [page, setPage] = useState("ringkasan");
  const [f, setF] = useState({ tahun: "", kecamatan: "" });
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [d, setD] = useState({ kpi: null, base: null, kec: [], trend: [], baseTrend: [], heat: [], usia: [], san: [], scatter: [], kecAll: [] });
  const [modelMetrics, setModelMetrics] = useState(null);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    const t = { tahun: f.tahun };
    Promise.all([get("kpi", f), get("kpi", {}), get("by-kecamatan", t), get("trend", f), get("trend", {}), get("heatmap", f),
      get("by-usia", f), get("sanitasi", f), get("scatter", f), get("by-kecamatan", {})])
      .then(([kpi, base, kec, trend, baseTrend, heat, usia, san, scatter, kecAll]) =>
        setD({ kpi: kpi[0], base: base[0], kec, trend, baseTrend, heat, usia, san, scatter, kecAll }))
      .catch(() => setLoadError("Data belum dapat dimuat. Periksa layanan API, lalu coba muat ulang."))
      .finally(() => setLoading(false));
  }, [f, tick]);

  const kecList = useMemo(() => d.kecAll.map((k) => k.kecamatan).sort(), [d.kecAll]);
  const title = NAV.find(([k]) => k === page)[1];
  useEffect(() => { if (page === "cerita") get("model-metrics").then(setModelMetrics).catch(() => setModelMetrics(null)); }, [page, tick]);
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">DT</div>
          <div><h1>Diare Balita Toba</h1><p>Pemantauan kesehatan anak</p></div>
        </div>
        <div className="scope"><span className="scope-label">Wilayah kerja</span><b>Kabupaten Toba</b><span>16 kecamatan, data 2020 sampai 2026</span></div>
        <p className="nav-label">Ruang kerja</p>
        <nav className="nav" aria-label="Menu utama">
          {NAV.map(([k, l]) => <button key={k} className={page === k ? "on" : ""} onClick={() => setPage(k)} aria-current={page === k ? "page" : undefined}>{l}</button>)}
        </nav>
        <div className="side-foot"><span className="status-dot" aria-hidden="true" />Data simulasi untuk proyek Data Analitik dan Data Science IT Del.</div>
      </aside>
      <main className="main">
        <div className="top">
          <div className="page-heading"><span className="eyebrow">Analitik kesehatan</span><h2>{title}</h2><p>{page === "ringkasan" ? "Pantau pola diare dan faktor rumah tangga pada data yang dipilih." : page === "analisis" ? "Telusuri pola menurut wilayah, usia, dan praktik rumah tangga." : page === "cerita" ? "Hubungkan temuan data dengan keputusan pencegahan yang dapat dilakukan." : page === "prediksi" ? "Uji satu profil balita dengan model yang tersedia." : "Perbarui sumber data dan periksa hasil proses ETL."}</p></div>
          {(page === "ringkasan" || page === "analisis" || page === "cerita") && (
            <div className="tools">
              <select aria-label="Tahun" value={f.tahun} onChange={(e) => setF({ ...f, tahun: e.target.value })}>{TAHUN.map((t) => <option key={t} value={t}>{t || "Semua tahun"}</option>)}</select>
              {f.kecamatan && <button className="chip" onClick={() => setF({ ...f, kecamatan: "" })}>{f.kecamatan} (hapus filter)</button>}
              <button onClick={() => setTick(tick + 1)}>Muat ulang data</button>
            </div>
          )}
        </div>
        {loading && page !== "prediksi" && page !== "data" && <div className="status-note" role="status"><span className="spinner" aria-hidden="true" />Memuat data analitik...</div>}
        {loadError && page !== "prediksi" && page !== "data" && <div className="status-note status-note-error" role="alert">{loadError}</div>}
        {page === "ringkasan" && <Ringkasan f={f} setF={setF} {...d} />}
        {page === "analisis" && <Analisis f={f} setF={setF} {...d} />}
        {page === "cerita" && <Cerita f={f} modelMetrics={modelMetrics} {...d} setPage={setPage} />}
        {page === "prediksi" && <Prediksi kecList={kecList} />}
        {page === "data" && <KelolaData onChanged={() => setTick((t) => t + 1)} />}
      </main>
    </div>
  );
}
