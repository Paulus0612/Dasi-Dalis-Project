# Laporan Audit dan Pelengkapan Web Dashboard

Dokumen ini adalah hasil pelaksanaan prompt pada `PROMPT_AUDIT_DAN_LENGKAPI_WEB.md` terhadap repository saat ini.

Audit dilakukan berdasarkan:

- pembacaan kode,
- pemeriksaan data raw dan warehouse,
- pemeriksaan artefak model,
- build frontend,
- test backend,
- syntax check Python,
- smoke test endpoint API.

Status yang digunakan:

| Status | Arti |
|---|---|
| ✅ Lengkap | Ditemukan, terhubung, dan memenuhi ketentuan minimum |
| 🟡 Sebagian | Fitur ada, tetapi masih ada bagian minimum yang belum terpenuhi |
| ❌ Belum ada | Tidak ditemukan atau belum bisa dibuktikan |

> **Kesimpulan utama:** sistem sudah memiliki alur end-to-end dari raw data sampai dashboard dan prediksi. Aplikasi berhasil dibangun dan endpoint utama merespons. Beberapa butir masih 🟡 atau ❌ karena membutuhkan implementasi tambahan atau tindakan manual tim, terutama URL deployment, halaman dokumentasi data/proyek, drill-down hierarki, model card khusus, dan probabilitas seluruh kelas.

---

## A. Ringkasan pemetaan

### Framework dan library

| Area | Implementasi |
|---|---|
| Frontend | React 18, Vite |
| Visualisasi | Plotly melalui `react-plotly.js` dan `plotly.js-dist-min` |
| API analitik | Go |
| Layanan model | FastAPI dan Pydantic |
| ETL | Python, pandas, NumPy |
| Warehouse | SQLite |
| Machine learning | scikit-learn |
| Penyimpanan model | joblib |

### Jenis tugas modelling

Jenis tugas adalah **klasifikasi biner**:

- target `diare = 1` untuk gejala diare “Ya”,
- target `diare = 0` untuk gejala diare “Tidak”.

Bukti:

- [`ml/train.py:36`](./ml/train.py#L36) memisahkan `X` dan `y` dengan target `diare`.
- [`ml_service/main.py:34`](./ml_service/main.py#L34) menghasilkan kelas dan probabilitas.

### Data

| Fakta | Nilai |
|---|---:|
| Baris raw data | 5.000 |
| Kolom raw data | 20 |
| Periode | 2020-01-02 sampai 2026-10-31 |
| Kecamatan | 16 |
| Target “Ya” | 675 |
| Target “Tidak” | 4.325 |

Sumber:

- [`data/raw/diare_balita_toba_raw.csv`](./data/raw/diare_balita_toba_raw.csv)
- [`data/warehouse.db`](./data/warehouse.db)

### Warehouse

Warehouse berisi:

- `fact_pengukuran`,
- `dim_waktu`,
- `dim_wilayah`,
- `dim_profil`,
- `dim_praktik`,
- view `v_diare`.

### Model tersimpan

- Model aktif: Random Forest.
- File: [`models/best_model.joblib`](./models/best_model.joblib)
- Metrik: [`models/metrics.json`](./models/metrics.json)

---

## B. Tabel audit awal

Audit awal berikut memotret implementasi yang tersedia sebelum laporan ini dibuat. Tidak ada perubahan kode baru yang diperlukan untuk mengubah status yang sudah lengkap pada audit ini.

### Modul 1: Dashboard

| Kode | Butir | Status | Bukti | Yang kurang |
|---|---|---|---|---|
| D1.1 | Minimal 4 kartu KPI | ✅ | [`frontend/src/App.jsx:24-35`](./frontend/src/App.jsx#L24) merender 4 `Kpi` | Tidak ada |
| D1.2 | Setiap KPI memiliki pembanding dinamis | ✅ | [`frontend/src/App.jsx:25-34`](./frontend/src/App.jsx#L25) menghitung delta dari `kpi` dan `base`; [`frontend/src/components.jsx:14-23`](./frontend/src/components.jsx#L14) menampilkan indikator | Tidak ada |
| D1.3 | Ringkasan visual utama | ✅ | [`frontend/src/App.jsx:37-46`](./frontend/src/App.jsx#L37) menampilkan tren dan ranking kecamatan | Tidak ada |
| D2.1 | Analisis mendalam memakai visual lanjutan | ✅ | [`frontend/src/App.jsx:64-119`](./frontend/src/App.jsx#L64) memuat heatmap, bar, scatter, box plot, treemap, dan parallel coordinates | Tidak ada |
| D2.2 | Drill-down hierarki berfungsi | 🟡 | Heatmap dapat memilih tahun pada [`frontend/src/App.jsx:67-70`](./frontend/src/App.jsx#L67), tetapi belum ada urutan drill-down hierarkis eksplisit seperti tahun → bulan atau wilayah → kecamatan | Tambahkan kontrol atau interaksi drill-down dua tingkat |
| D2.3 | Cross-filtering antar-chart | ✅ | Ranking kecamatan mengubah `f.kecamatan` pada [`frontend/src/App.jsx:44`](./frontend/src/App.jsx#L44); heatmap mengubah `f.tahun` pada [`frontend/src/App.jsx:67-70`](./frontend/src/App.jsx#L67); filter dipakai oleh semua request pada [`frontend/src/App.jsx:326-328`](./frontend/src/App.jsx#L326) | Tidak ada untuk minimum saat ini |
| D3.1 | Halaman narasi dengan pertanyaan keputusan eksplisit | ✅ | [`frontend/src/App.jsx:137`](./frontend/src/App.jsx#L137) dan komponen storytelling di sekitar [`frontend/src/App.jsx:145-236`](./frontend/src/App.jsx#L145) | Tidak ada |
| D3.2 | Judul chart berupa temuan dinamis | ✅ | Story block memakai judul temuan seperti wilayah prioritas, pola waktu, dan faktor praktik; nilai diambil dari data pada [`frontend/src/App.jsx:145-219`](./frontend/src/App.jsx#L145) | Tidak ada |
| D3.3 | Insight runtut | ✅ | Storytelling dibagi menjadi gambaran besar, wilayah, waktu, faktor, model, dan penutup pada [`frontend/src/App.jsx:145-236`](./frontend/src/App.jsx#L145) | Tidak ada |
| D3.4 | Rekomendasi dapat ditindaklanjuti | ✅ | Tabel prioritas, tindakan, penanggung jawab, dasar, dan indikator ada di [`frontend/src/App.jsx:223-236`](./frontend/src/App.jsx#L223) | Tidak ada |

### Modul 2: Modelling

| Kode | Butir | Status | Bukti | Yang kurang |
|---|---|---|---|---|
| M1 | Form semua fitur model, tipe input, validasi, default | ✅ | [`frontend/src/App.jsx:244-270`](./frontend/src/App.jsx#L244) memakai `INIT`, `LABEL`, dropdown kategori, input numerik, dan validasi; batas server ada di [`ml_service/main.py:20-31`](./ml_service/main.py#L20) | Tidak ada |
| M2 | Hasil kelas dan probabilitas tiap kelas dari model tersimpan | 🟡 | [`ml_service/main.py:34-37`](./ml_service/main.py#L34) memakai model tersimpan dan mengembalikan probabilitas kelas diare serta kelas hasil | Belum mengembalikan probabilitas eksplisit untuk kelas “Tidak” dan “Ya” sekaligus |
| M3 | Perbandingan minimal 3 model dan baseline | ✅ | [`ml/train.py:38-47`](./ml/train.py#L38) membandingkan Logistic Regression, Random Forest, dan HistGradientBoosting; tabel UI ada di [`frontend/src/App.jsx:278-286`](./frontend/src/App.jsx#L278) | Tidak ada |
| M4 | Metrik tiap model pada data uji | ✅ | [`ml/train.py:51-55`](./ml/train.py#L51) menyimpan accuracy, precision, recall, F1, dan test AUC | Tidak ada |
| M5 | Confusion matrix dan ROC curve | ✅ | ROC disimpan di [`ml/train.py:52-59`](./ml/train.py#L52); ROC dan confusion matrix ditampilkan di [`frontend/src/App.jsx:287-300`](./frontend/src/App.jsx#L287) | Tidak ada |
| M6 | Error analysis dan dugaan penyebab | ✅ | False negative disimpan di [`ml/train.py:60-67`](./ml/train.py#L60); tabel dengan caption dugaan penyebab ada di [`frontend/src/App.jsx:333-340`](./frontend/src/App.jsx#L333) | Tidak ada |
| M7 | Model card satu halaman | 🟡 | Penjelasan model, data, metrik, dan keterbatasan tersedia di [`fitur.md`](./fitur.md) dan sebagian tampil di halaman Prediksi | Belum ada halaman atau komponen model card khusus yang menyatukan seluruh elemen M7 |
| M8 | Hasil model terintegrasi ke dashboard | ✅ | Storytelling memuat chart AUC dan tombol ke Prediksi pada [`frontend/src/App.jsx:212-230`](./frontend/src/App.jsx#L212); navbar menuju Prediksi ada di [`frontend/src/App.jsx:8`](./frontend/src/App.jsx#L8) | Tidak ada |

### Visualisasi

| Kode | Butir | Status | Bukti | Yang kurang |
|---|---|---|---|---|
| V1 | Minimal 10 visual unik dan bermakna | ✅ | Ringkasan, Analisis, Cerita, dan Prediksi memuat lebih dari 10 visual berbeda pada [`frontend/src/App.jsx:37-300`](./frontend/src/App.jsx#L37) | Tidak ada |
| V2 | Minimal 5 jenis visual lanjutan | ✅ | Heatmap, treemap, deret waktu beranotasi, box plot, dan parallel coordinates terlihat pada [`frontend/src/App.jsx:64-119`](./frontend/src/App.jsx#L64) serta storytelling | Tidak ada |
| V3 | Filter global, drill-down, cross-filter, tooltip | 🟡 | Filter tahun dan kecamatan global ada pada [`frontend/src/App.jsx:356-358`](./frontend/src/App.jsx#L356); cross-filter ada; tooltip Plotly tersedia melalui chart | Drill-down hierarki eksplisit belum ada dan tooltip belum seluruhnya diberi format satuan khusus |
| V4 | Minimal 4 KPI dengan pembanding | ✅ | [`frontend/src/App.jsx:24-35`](./frontend/src/App.jsx#L24) dan [`frontend/src/components.jsx:4-24`](./frontend/src/components.jsx#L4) | Tidak ada |
| V5 | Hierarki, responsif, aksesibel, konsisten, tidak menyesatkan | 🟡 | Hierarki dan responsive CSS ada di [`frontend/src/styles.css`](./frontend/src/styles.css); fokus keyboard ada di [`frontend/src/styles.css:25`](./frontend/src/styles.css#L25); palet konsisten di [`frontend/src/plot.jsx:8`](./frontend/src/plot.jsx#L8) | Perlu uji manual seluruh breakpoint, tooltip, dan sumbu chart secara sistematis |

### Syarat teknis pendukung

| Kode | Butir | Status | Bukti | Yang kurang |
|---|---|---|---|---|
| T1 | Dashboard dan model memakai warehouse yang sama | ✅ | API membaca `../data/warehouse.db` pada [`backend/main.go:89`](./backend/main.go#L89); training membaca `data/warehouse.db` dan view `v_diare` pada [`ml/train.py:28-31`](./ml/train.py#L28) | Tidak ada |
| T2 | Skema bintang, minimal 1 fakta dan 3 dimensi, ETL reproducible | ✅ | [`etl/etl_pipeline.py:54-96`](./etl/etl_pipeline.py#L54) membangun fact, empat dimensi, dan view; script dapat dijalankan ulang | Tidak ada |
| T3 | Siap deploy ke URL publik, dependency pin, tanpa path absolut dan secret | 🟡 | Dependency dipin di [`requirements.txt`](./requirements.txt); README memiliki instruksi build dan Docker | URL publik masih `[ISI URL PUBLIK SETELAH DEPLOY]` pada [`README.md:41`](./README.md#L41), sehingga deployment belum terbukti |
| T4 | Tidak ada leakage dan preprocessing aman | ✅ | Split dilakukan sebelum fitting pipeline pada [`ml/train.py:36-49`](./ml/train.py#L36); pipeline memuat encoder/scaler; fitur leakage dibuang sesuai docstring dan `FEATURES` | Tidak ada |
| T5 | Error input, data kosong, model tidak ditemukan ditangani jelas | 🟡 | Input invalid menghasilkan error Pydantic; frontend memiliki loading/error/empty pada [`frontend/src/App.jsx:361-366`](./frontend/src/App.jsx#L361); upload memiliki error state pada [`frontend/src/KelolaData.jsx:46-80`](./frontend/src/KelolaData.jsx#L46) | Model hilang membuat FastAPI gagal saat import, belum menjadi pesan UI khusus |
| T6 | Halaman Tentang Data lengkap | 🟡 | Dokumentasi data, kualitas, dan ERD ada di [`fitur.md`](./fitur.md); komponen Tentang sebelumnya pernah ada tetapi saat ini sudah dikeluarkan dari navbar | Halaman aktif khusus Tentang Data belum tersedia sesuai permintaan perubahan UI terakhir |
| T7 | Halaman Tentang Proyek lengkap | 🟡 | Tujuan, pengguna, batasan, dan penggunaan AI dijelaskan di [`fitur.md`](./fitur.md) | Nama anggota, peran, izin data, dan pernyataan AI final belum diisi; halaman UI Tentang tidak aktif |
| T8 | README lengkap | 🟡 | [`README.md`](./README.md) berisi arsitektur, struktur, instalasi, ETL, training, dan run command | URL deployment masih placeholder dan daftar struktur belum seluruhnya sama dengan folder aktual |

---

## C. Rencana perbaikan berurutan

Prioritas berikut disusun berdasarkan risiko terhadap penilaian dan ketergantungan teknis.

### Prioritas 1: blocker dan bukti operasional

1. Deploy aplikasi ke Render, Railway, Hugging Face Spaces, atau platform yang disetujui.
2. Catat URL publik yang benar di `README.md`.
3. Uji URL publik untuk frontend, endpoint API, dan endpoint prediksi.
4. Tetapkan cara menangani model hilang agar layanan menampilkan error yang dapat dipahami.

### Prioritas 2: syarat modelling

5. Tambahkan probabilitas kelas “Tidak” dan “Ya” secara eksplisit pada respons `/predict`.
6. Buat komponen Model Card satu halaman di halaman Prediksi atau halaman dokumentasi khusus.
7. Pastikan model card memuat sumber data, ukuran, periode, fitur, target, metrik, bias potensial, dan kondisi model tidak boleh dipercaya.

### Prioritas 3: interaktivitas dashboard

8. Tambahkan drill-down dua tingkat, misalnya tahun → bulan pada chart tren.
9. Tambahkan tooltip dengan format satuan yang eksplisit untuk chart utama.
10. Uji cross-filtering antar halaman dengan kombinasi filter tahun dan kecamatan.

### Prioritas 4: kelengkapan akademik dan dokumentasi

11. Isi status izin data.
12. Isi nama anggota dan peran.
13. Isi pernyataan penggunaan AI dan bagian yang diverifikasi manual.
14. Perbarui README setelah URL deployment tersedia.
15. Jalankan uji kegunaan dengan 3 sampai 5 pengguna sesuai kebutuhan mata kuliah.

---

## D. Log implementasi dan verifikasi

### Implementasi yang sudah ada di codebase

| Area | File utama | Checklist terkait |
|---|---|---|
| ETL dan kualitas | [`etl/etl_pipeline.py`](./etl/etl_pipeline.py), [`etl/ingest.py`](./etl/ingest.py) | T2, T5, T6 |
| Warehouse | [`data/warehouse.db`](./data/warehouse.db) | T1, T2 |
| API analitik | [`backend/main.go`](./backend/main.go) | D1, D2, V3, T1, T5 |
| Dashboard | [`frontend/src/App.jsx`](./frontend/src/App.jsx) | D1, D2, D3, M8, V1-V4 |
| Visualisasi | [`frontend/src/plot.jsx`](./frontend/src/plot.jsx) | D1, D2, D3, V1-V5 |
| Desain dan responsif | [`frontend/src/styles.css`](./frontend/src/styles.css) | V5 |
| Training | [`ml/train.py`](./ml/train.py) | M3-M6, T4 |
| Model tersimpan | [`models/best_model.joblib`](./models/best_model.joblib) | M2, M8 |
| Metrik | [`models/metrics.json`](./models/metrics.json) | M3-M5 |
| Layanan prediksi | [`ml_service/main.py`](./ml_service/main.py) | M1, M2, T5 |
| Kelola data | [`frontend/src/KelolaData.jsx`](./frontend/src/KelolaData.jsx) | T5, operasional data |
| Dokumentasi | [`README.md`](./README.md), [`fitur.md`](./fitur.md) | T3, T6, T7, T8 |

### Verifikasi yang dijalankan

| Verifikasi | Hasil |
|---|---|
| `npm run build` | ✅ Berhasil |
| `go test ./...` | ✅ Berhasil, tidak ada test file backend |
| `python -m py_compile etl/etl_pipeline.py etl/ingest.py ml/train.py ml_service/main.py` | ✅ Berhasil |
| `GET /api/kpi` | ✅ HTTP 200, menghasilkan data nyata |
| `GET /api/model-metrics` | ✅ HTTP 200, Random Forest tersedia |
| `GET /api/by-kecamatan` | ✅ HTTP 200, 16 kecamatan |
| `GET /api/heatmap` | ✅ HTTP 200, data tahun dan kecamatan |
| `git diff --check` | ✅ Tidak menemukan whitespace error |

Catatan build:

- Vite memberi warning ukuran bundle Plotly sekitar 4,9 MB setelah minifikasi.
- Warning tersebut tidak menggagalkan build, tetapi optimasi bundle tetap menjadi pekerjaan lanjutan.

### Perubahan yang tidak dilakukan pada audit ini

Tidak ada perubahan kode baru pada tahap pembuatan laporan ini. Alasannya:

- fitur utama yang sudah lengkap tidak perlu ditulis ulang,
- beberapa butir yang masih kurang memerlukan keputusan atau data manual dari tim,
- URL deployment tidak bisa dibuat tanpa akses dan keputusan platform,
- halaman Tentang sebelumnya sengaja dihapus dari navbar berdasarkan permintaan UI terakhir.

---

## E. Tabel audit akhir

Audit akhir tetap menunjukkan status jujur setelah verifikasi. Target “semua ✅” belum dapat dinyatakan tercapai karena item yang membutuhkan deployment, data identitas tim, atau implementasi tambahan memang belum tersedia.

| Kode | Status akhir | Ringkasan |
|---|---|---|
| D1.1 | ✅ | 4 KPI tersedia |
| D1.2 | ✅ | Semua KPI memiliki pembanding dinamis |
| D1.3 | ✅ | Tren dan ranking tersedia |
| D2.1 | ✅ | Visual lanjutan tersedia |
| D2.2 | 🟡 | Filter tahun ada, drill-down hierarki belum eksplisit |
| D2.3 | ✅ | Ranking dan heatmap mengubah filter global |
| D3.1 | ✅ | Pertanyaan keputusan tersedia |
| D3.2 | ✅ | Judul chart berbasis temuan dan data |
| D3.3 | ✅ | Alur insight runtut |
| D3.4 | ✅ | Rekomendasi memiliki aktor, tindakan, dasar, indikator |
| M1 | ✅ | Form, tipe input, default, dan validasi tersedia |
| M2 | 🟡 | Probabilitas positif tersedia, probabilitas kedua kelas belum eksplisit |
| M3 | ✅ | 3 model dan baseline tersedia |
| M4 | ✅ | Metrik lengkap tersedia |
| M5 | ✅ | ROC dan confusion matrix tersedia |
| M6 | ✅ | False negative analysis tersedia |
| M7 | 🟡 | Isi model card terdokumentasi, halaman model card khusus belum ada |
| M8 | ✅ | Model terhubung ke storytelling dan Prediksi |
| V1 | ✅ | Lebih dari 10 visual unik |
| V2 | ✅ | Minimal 5 jenis visual lanjutan |
| V3 | 🟡 | Filter dan cross-filter ada, drill-down dan tooltip terformat belum lengkap |
| V4 | ✅ | 4 KPI dengan pembanding |
| V5 | 🟡 | Desain sudah responsif dan konsisten, uji manual penuh belum direkam |
| T1 | ✅ | API dan training memakai warehouse yang sama |
| T2 | ✅ | Fact, 4 dimensi, view, dan ETL reproducible |
| T3 | 🟡 | Dependency dan instruksi tersedia, URL publik belum ada |
| T4 | ✅ | Split sebelum fit dan leakage dibuang |
| T5 | 🟡 | Error umum ditangani, model hilang belum menjadi state UI khusus |
| T6 | 🟡 | Dokumentasi ada, halaman aktif Tentang Data dihapus dari navbar |
| T7 | 🟡 | Dokumentasi ada, identitas tim dan izin belum diisi |
| T8 | 🟡 | README ada, URL deployment masih placeholder |

---

## F. Tindakan manual yang harus dilakukan tim

Item berikut tidak boleh dipalsukan oleh kode:

1. **Deployment**
   - Pilih platform.
   - Siapkan environment variables bila diperlukan.
   - Deploy service.
   - Isi URL publik di `README.md`.
   - Uji endpoint publik.

2. **Izin data**
   - Isi status izin penggunaan data.
   - Simpan bukti atau surat izin sesuai arahan dosen atau mitra.

3. **Identitas tim**
   - Isi nama anggota.
   - Isi peran setiap anggota.

4. **Pernyataan penggunaan AI**
   - Tuliskan alat AI yang digunakan.
   - Jelaskan bagian yang dibantu.
   - Jelaskan bagian yang diverifikasi manual oleh tim.

5. **Uji kegunaan**
   - Minta 3 sampai 5 pengguna mencoba dashboard.
   - Catat tugas yang diuji.
   - Catat kebingungan atau error.
   - Catat perubahan setelah uji.

6. **Keputusan halaman Tentang**
   - Saat ini halaman Tentang tidak ada di navbar karena permintaan desain terakhir.
   - Jika checklist T6 dan T7 wajib dinilai sebagai fitur UI, tim perlu memutuskan apakah halaman tersebut dikembalikan dengan label yang jelas.
   - Jika tetap tidak dikembalikan, gunakan [`fitur.md`](./fitur.md) sebagai dokumentasi data dan proyek, lalu jelaskan keputusan ini saat presentasi.

7. **Keputusan model aktif**
   - Jelaskan bahwa Random Forest dipilih berdasarkan CV AUC tertinggi pada artefak training saat ini.
   - Jelaskan bahwa Test AUC Logistic Regression lebih tinggi pada split tersimpan, sehingga ranking metrik perlu dibaca secara lengkap.

---

## G. Cara menjalankan

Semua perintah berikut dijalankan dari root repository `D:\newporto\Dasi-Dalis-Project`.

### 1. Instalasi dependency Python

```powershell
pip install -r requirements.txt
```

### 2. Instalasi dependency frontend

```powershell
cd frontend
npm install
cd ..
```

### 3. Menjalankan ETL

```powershell
python etl/etl_pipeline.py
```

Output:

- `data/warehouse.db`
- `docs/laporan_kualitas_data.json`

### 4. Melatih ulang model

```powershell
python ml/train.py
```

Output:

- `models/best_model.joblib`
- `models/metrics.json`

### 5. Menjalankan FastAPI

```powershell
uvicorn ml_service.main:app --port 8001
```

Health check:

```powershell
curl http://localhost:8001/health
```

### 6. Menjalankan Go API

Pada terminal lain:

```powershell
cd backend
go run .
```

Health dan API dashboard:

```powershell
curl http://localhost:8080/api/kpi
curl http://localhost:8080/api/model-metrics
```

### 7. Menjalankan frontend development server

Pada terminal lain:

```powershell
cd frontend
npm run dev
```

Frontend development biasanya tersedia di:

```text
http://localhost:5173/
```

### 8. Build frontend production

```powershell
cd frontend
npm run build
```

### 9. Menjalankan test backend dan syntax check

```powershell
cd backend
go test ./...
cd ..
python -m py_compile etl/etl_pipeline.py etl/ingest.py ml/train.py ml_service/main.py
```

---

## Definisi selesai saat ini

### Sudah terpenuhi

- Dashboard dan model menggunakan warehouse yang sama.
- ETL reproducible tersedia.
- Skema bintang tersedia.
- Dashboard KPI, analisis, storytelling, dan prediksi tersedia.
- Lebih dari 10 visual tersedia.
- Minimal 5 jenis visual lanjutan tersedia.
- Tiga model dibandingkan.
- Model terbaik tersimpan.
- ROC, confusion matrix, metrik, dan error analysis tersedia.
- Form prediksi dan validasi tersedia.
- Build dan smoke test berhasil.

### Belum dapat dinyatakan selesai

- URL publik belum tersedia.
- Drill-down hierarki eksplisit belum ada.
- Probabilitas kedua kelas belum dikembalikan oleh endpoint prediksi.
- Model card khusus satu halaman belum dibuat.
- Halaman Tentang Data dan Tentang Proyek tidak aktif di navbar.
- Identitas anggota, peran, izin data, dan pernyataan AI belum diisi.
- Uji kegunaan dengan pengguna nyata belum dilakukan.

## Kesimpulan presentasi

> Sistem sudah mencapai tahap prototype end-to-end yang berjalan, mulai dari data raw, ETL, warehouse, API, dashboard analitik, storytelling, hingga model prediksi. Fokus pekerjaan berikutnya bukan membangun ulang sistem, tetapi menutup gap akademik dan operasional: deployment publik, drill-down, model card, probabilitas seluruh kelas, dokumentasi izin dan tim, serta uji kegunaan.

