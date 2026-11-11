# LAPORAN AKHIR PROYEK
## Data Analitik & Data Science

**Judul:** Dashboard Analitik Diare Balita Kabupaten Toba  
**Subjudul:** Dashboard visualisasi advance dan modul klasifikasi untuk mendukung pemantauan kesehatan balita  
**Dosen Pengampu:** Oppir Hutapea, M.Kom  
**Kelompok:** [DIISI TIM]  
**Program Studi:** [DIISI TIM]  
**Semester/Tahun Ajaran:** Ganjil 2026/2027

### Identitas dan tautan

| Informasi | Isi |
|---|---|
| Anggota | [Nama dan NIM diisi tim] |
| Aplikasi publik | [DIISI URL DEPLOYMENT] |
| Repositori | https://github.com/Paulus0612/Dasi-Dalis-Project |
| Video demo | [DIISI URL VIDEO] |
| Dosen pengampu | Oppir Hutapea, M.Kom |

## Ringkasan Eksekutif

Proyek ini membangun dashboard analitik dan modul klasifikasi untuk membaca pola diare pada balita di Kabupaten Toba. Dataset tabular berisi 5.000 baris dan 20 kolom, mencakup 16 kecamatan, dengan periode pengukuran 2 Januari 2020 sampai 31 Oktober 2026. Sebanyak 675 baris berlabel diare Ya dan 4.325 baris berlabel Tidak, sehingga proporsi positif keseluruhan adalah 13,5%. Sistem menggabungkan CSV raw, ETL Python, SQLite star schema, Go API, dashboard React-Plotly, dan layanan prediksi FastAPI.

Dashboard menyediakan KPI, tren waktu, ranking kecamatan, heatmap, treemap, box plot, scatter plot, parallel coordinates, storytelling, dan halaman prediksi. Pada agregasi saat ini, Pintu Pohan Meranti memiliki prevalensi tertinggi sebesar 18,37%. Random Forest dipilih sebagai model aktif berdasarkan CV AUC tertinggi 0,6596. Pada data uji, model tersebut memiliki AUC 0,6758, accuracy 0,721, precision 0,241, recall 0,4963, dan F1 0,3245. Hasil ini cukup untuk prototipe penyaringan, tetapi belum untuk diagnosis atau keputusan klinis otomatis. Rekomendasi utama adalah memusatkan pemantauan pada wilayah dengan prevalensi tinggi, memakai storytelling untuk mengarahkan keputusan, dan meninjau setiap keluaran model oleh petugas berwenang. URL deployment, identitas tim, izin data, video demo, dan hasil uji pengguna harus diisi tim.

# BAB I Pendahuluan

## 1.1 Latar Belakang

Diare pada balita perlu dipantau karena dapat berhubungan dengan kondisi gizi, air minum, sanitasi, perilaku kebersihan, dan kerentanan usia. Pengambil keputusan membutuhkan ringkasan yang dapat menunjukkan wilayah prioritas, pola waktu, dan profil yang perlu ditinjau tanpa membaca ribuan baris satu per satu. Proyek ini menggunakan data pengukuran balita di Kabupaten Toba untuk membangun alur analitik end-to-end dari data mentah hingga dashboard dan klasifikasi.

Sistem ini bukan alat diagnosis medis. Dashboard digunakan untuk pemantauan pola, penentuan prioritas analisis, dan diskusi pencegahan. Prediksi model harus dibaca bersama konteks lapangan dan prosedur petugas kesehatan.

## 1.2 Pengguna dan Kebutuhan Keputusan

| Pengguna/pengambil keputusan | Keputusan | Informasi yang dibutuhkan |
|---|---|---|
| Dinas/pengelola program kesehatan | Menentukan wilayah dan periode prioritas pemantauan | Prevalensi per kecamatan, tren waktu, kontribusi kasus |
| Petugas/kader kesehatan | Menentukan profil yang perlu ditinjau lebih lanjut | Input profil, probabilitas model, catatan keterbatasan |
| Tim proyek dan dosen | Menilai kualitas pipeline dan hasil proyek | Data dictionary, ETL, visual advance, metrik model |

## 1.3 Pertanyaan Analitik dan Tugas Pemodelan

1. Seberapa besar proporsi diare dan bagaimana trennya?
2. Kecamatan mana yang memiliki prevalensi tertinggi dan mana yang perlu dipantau?
3. Kapan pola bulanan cenderung tinggi atau rendah?
4. Bagaimana pola usia, praktik sanitasi, dan fitur profil berhubungan dengan label?
5. Bagaimana model klasifikasi membantu penyaringan profil baru?

**Tugas pemodelan:** klasifikasi biner dengan target `diare` (Ya/Tidak), yang diturunkan dari `gejala_diare_14_hari_terakhir`.

## 1.4 Indikator Kinerja dan Metrik Sukses

| KPI/metrik | Definisi | Nilai/target |
|---|---|---|
| Jumlah observasi | COUNT seluruh baris | 5.000 |
| Prevalensi diare | AVG(diare) x 100% | 13,5% keseluruhan |
| Wilayah prioritas | Prevalensi per kecamatan | Pintu Pohan Meranti 18,37% |
| Metrik model | ROC-AUC, precision, recall, F1, accuracy | Dicatat pada data uji; bukan keputusan klinis |

## 1.5 Ruang Lingkup dan Batasan

Ruang lingkup mencakup validasi dan ETL CSV, SQLite star schema, API Go, dashboard React-Plotly, storytelling, training tiga model klasifikasi, layanan prediksi FastAPI, dan kelola data. Di luar cakupan adalah diagnosis medis, klaim sebab-akibat, intervensi klinis otomatis, peta koordinat, dan explainable AI formal. Drill-down hierarki formal dan URL publik belum tersedia pada versi audit ini.

# BAB II Data

## 2.1 Sumber dan Pengumpulan Data

Sumber utama adalah `data/raw/diare_balita_toba_raw.csv`, dengan ukuran 5.000 baris x 20 kolom. Data mencakup 16 kecamatan di Kabupaten Toba dan periode 2020-01-02 sampai 2026-10-31. Status sumber asli, izin, dan lisensi wajib diisi tim: **[DIISI TIM]**. Data menggunakan ID, bukan nama langsung, tetapi status anonimisasi dan dasar legal tetap perlu dikonfirmasi.

## 2.2 Data Dictionary

| Kolom | Tipe | Deskripsi | Peran |
|---|---|---|---|
| id_balita | kategorikal | ID balita | Identitas |
| kabupaten | kategorikal | Kabupaten | Wilayah |
| kecamatan | kategorikal | Kecamatan | Dimensi wilayah |
| tanggal_pengukuran | tanggal | Tanggal pengukuran | Dimensi waktu |
| usia_balita_bulan | numerik | Usia balita dalam bulan | Fitur |
| jenis_kelamin | kategorikal | L/P | Fitur |
| berat_badan_kg | numerik | Berat badan | Fitur |
| panjang_tinggi_badan_cm | numerik | Panjang/tinggi badan | Fitur |
| id_ibu | kategorikal | ID ibu | Identitas |
| hb_ibu_g_dL | numerik | Hemoglobin ibu | Fitur |
| status_kehamilan_saat_pemeriksaan_hb | kategorikal | Status kehamilan | Fitur |
| trimester_saat_pemeriksaan_hb | numerik/kategorikal | Trimester pemeriksaan | Fitur |
| masih_mendapat_asi | kategorikal | ASI masih diberikan | Fitur |
| jumlah_kelompok_pangan_24_jam | numerik | Jumlah kelompok pangan | Fitur |
| frekuensi_makan_24_jam | numerik | Frekuensi makan | Fitur |
| air_minum_dimasak | kategorikal | Air minum dimasak | Fitur |
| cuci_tangan_pakai_sabun | kategorikal | Cuci tangan dengan sabun | Fitur |
| frekuensi_bab_cair_24_jam | numerik | Frekuensi BAB cair | Dikeluarkan karena leakage |
| lama_gejala_diare_hari | numerik | Lama gejala diare | Dikeluarkan karena leakage |
| gejala_diare_14_hari_terakhir | kategorikal | Label Ya/Tidak | Target sumber |

## 2.3 Kualitas Data dan Pembersihan

| Dimensi | Sebelum | Sesudah | Tindakan |
|---|---:|---:|---|
| Completeness | 100% | 100% | Validasi nilai kosong |
| Uniqueness | 100% | 100% | Pemeriksaan duplikasi |
| Validity | 100% | 100% | Validasi tipe, tanggal, target, rentang |
| Consistency | 100% | 100% | Normalisasi format dan kategori |

Laporan ETL pada `docs/laporan_kualitas_data.json` mencatat 5.000 baris sebelum dan sesudah proses. Pipeline memvalidasi kolom wajib, tipe, tanggal, target, rentang nilai, duplikasi, dan kategori.

## 2.4 Exploratory Data Analysis

**Gambar 2.1.** [SISIPKAN screenshot EDA dari dashboard atau notebook: distribusi target, prevalensi per kecamatan, tren bulanan, dan distribusi fitur numerik.]

Temuan awal:

1. 675 dari 5.000 baris berlabel diare Ya, sehingga proporsi target positif adalah 13,5%.
2. Pintu Pohan Meranti memiliki prevalensi tertinggi, 18,37%, pada agregasi kecamatan saat ini.
3. Januari memiliki prevalensi 16,33%; November dan Desember juga relatif tinggi, masing-masing 17,75% dan 17,62%.
4. Rata-rata usia kelompok Ya adalah 22,62 bulan, sedangkan kelompok Tidak 30,90 bulan.
5. Rata-rata jumlah kelompok pangan kelompok Ya adalah 3,81, sedangkan kelompok Tidak 4,32.

Temuan tersebut bersifat deskriptif atau asosiasi. Data ini tidak cukup untuk menyatakan hubungan sebab-akibat.

# BAB III Data Warehouse dan ETL

## 3.1 Model Dimensional

Warehouse menggunakan star schema karena dashboard sering melakukan agregasi berdasarkan waktu, wilayah, profil, dan praktik rumah tangga. Grain `fact_pengukuran` adalah satu baris per pengukuran balita.

**Gambar 3.1.** [SISIPKAN diagram skema bintang dari `fitur.md`: `fact_pengukuran` terhubung ke `dim_waktu`, `dim_wilayah`, `dim_profil`, dan `dim_praktik`.]

| Tabel | Jenis | Kolom utama | Grain/keterangan |
|---|---|---|---|
| fact_pengukuran | Fakta | id_fakta, foreign key, fitur, diare | Satu baris per pengukuran |
| dim_waktu | Dimensi | tanggal, tahun, bulan, kuartal | Satu baris per tanggal unik |
| dim_wilayah | Dimensi | kecamatan, kabupaten | Satu baris per wilayah |
| dim_profil | Dimensi | jenis_kelamin, kelompok_usia | Satu baris per profil |
| dim_praktik | Dimensi | ASI, air, cuci tangan, kehamilan | Satu kombinasi praktik |

## 3.2 Proses ETL

| Tahap | Proses | Alat/skrip |
|---|---|---|
| Extract | Membaca CSV dan memeriksa kolom | `etl/etl_pipeline.py` |
| Transform | Membersihkan tipe, memvalidasi nilai, membuat dimensi dan target biner | `etl/etl_pipeline.py` |
| Load | Menulis SQLite, fact, dimensi, dan view `v_diare` | `etl/etl_pipeline.py` |

ETL dijalankan ulang dari root dengan `python etl/etl_pipeline.py`. Penjadwalan otomatis belum diklaim.

# BAB IV Dashboard dan Visualisasi Advance

## 4.1 Struktur Dashboard

| Halaman | Tujuan | Pengguna |
|---|---|---|
| Ringkasan KPI | Menjawab kondisi umum melalui KPI, tren, dan ranking | Pengambil keputusan |
| Analisis mendalam | Membaca pola wilayah, usia, sanitasi, dan profil | Analis/pengelola program |
| Storytelling | Menyusun pertanyaan, jawaban, bukti, dan rekomendasi | Dosen/pengambil keputusan |
| Modul prediksi | Menguji profil baru dan melihat hasil klasifikasi | Petugas sebagai alat bantu |
| Kelola data | Upload, validasi, preview, dan reprocess CSV | Operator data |

## 4.2 Daftar Visualisasi

| No | Judul berupa temuan | Jenis visual | Pertanyaan | Interaktivitas |
|---:|---|---|---|---|
| 1 | Tren prevalensi per bulan | Line/annotated time series | Kapan pola naik/turun? | Filter tahun |
| 2 | Kecamatan dengan prevalensi tertinggi | Bar ranking | Wilayah mana prioritas? | Klik kecamatan |
| 3 | Kontribusi wilayah terhadap observasi | Treemap | Bagaimana komposisi wilayah? | Tooltip |
| 4 | Perubahan prevalensi kecamatan antar tahun | Heatmap | Wilayah mana konsisten tinggi? | Klik tahun |
| 5 | Sebaran prevalensi menurut kelompok usia | Box plot | Bagaimana distribusi antar kelompok? | Tooltip |
| 6 | Usia dan berat badan terhadap label | Scatter plot | Bagaimana hubungan fitur numerik dan label? | Tooltip/warna |
| 7 | Distribusi kasus menurut praktik sanitasi | Grouped bar | Bagaimana kasus terdistribusi? | Filter global |
| 8 | Profil multi-dimensi observasi | Parallel coordinates | Bagaimana profil kasus berbeda? | Tooltip |
| 9 | Perbandingan performa tiga model | Bar chart | Model mana terbaik menurut AUC? | Tooltip |
| 10 | Kesalahan model aktif | Confusion matrix heatmap | Di mana salah klasifikasi terjadi? | Tooltip |

Filter tahun dan kecamatan tersedia. Cross-filter tersedia sebagian melalui state filter bersama. Drill-down hierarki formal tahun ke bulan belum tersedia dan perlu ditambahkan jika diwajibkan penilaian.

## 4.3 Tangkapan Layar Dashboard

**Gambar 4.1–4.5.** [SISIPKAN screenshot halaman Ringkasan, Analisis mendalam, Cerita keputusan, Prediksi risiko, dan Kelola data setelah deployment atau demo lokal.]

## 4.4 Storytelling, Insight, dan Rekomendasi

| Insight | Bukti | Rekomendasi keputusan |
|---|---|---|
| Prevalensi keseluruhan 13,5% dengan 675 kasus positif | KPI dan tren | Gunakan prevalensi dan jumlah observasi bersama-sama saat menentukan prioritas |
| Pintu Pohan Meranti memiliki prevalensi 18,37% | Ranking kecamatan | Tinjau konteks lapangan, cakupan pemantauan, dan komunikasi pencegahan |
| Random Forest memiliki CV AUC 0,6596 dan F1 uji 0,3245 | Tabel model/confusion matrix | Gunakan sebagai penyaring awal dengan tinjauan petugas, bukan diagnosis |

# BAB V Pemodelan

## 5.1 Problem Framing

Jenis tugas adalah klasifikasi biner. Target `diare` bernilai 1 untuk Ya dan 0 untuk Tidak. Baseline adalah Logistic Regression. Metrik utama adalah ROC-AUC untuk kemampuan pemeringkatan probabilitas, serta precision, recall, F1, dan accuracy untuk membaca trade-off kesalahan.

## 5.2 Preprocessing dan Feature Engineering

Pipeline model memproses fitur numerik dan kategorikal bersama estimator. Transformasi dilatih pada data train dan diterapkan ke data test. Kolom `frekuensi_bab_cair_24_jam` dan `lama_gejala_diare_hari` dikeluarkan karena berpotensi membocorkan target.

## 5.3 Skema Validasi

Data dibagi secara stratified menjadi 4.000 baris train dan 1.000 baris test dengan `random_state=42`. Data train dipakai untuk StratifiedKFold dan RandomizedSearchCV. Preprocessing dan model berada pada pipeline yang sama sehingga data test tidak ikut fitting.

## 5.4 Eksperimen dan Perbandingan Model

| Model | CV AUC | Test AUC | Accuracy | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Logistic Regression (baseline) | 0,6582 | 0,6873 | 0,607 | 0,2095 | 0,6889 | 0,3212 |
| Random Forest | 0,6596 | 0,6758 | 0,721 | 0,2410 | 0,4963 | 0,3245 |
| HistGradientBoosting | 0,6486 | 0,6804 | 0,638 | 0,2112 | 0,6148 | 0,3144 |

## 5.5 Hyperparameter Tuning

Tuning menggunakan RandomizedSearchCV dengan maksimal delapan konfigurasi. Random Forest dituning pada jumlah estimator, kedalaman, dan minimum sample leaf. HistGradientBoosting dituning pada jumlah iterasi, kedalaman, dan learning rate. Logistic Regression dituning pada C. Parameter terbaik dicatat pada `models/metrics.json`.

## 5.6 Evaluasi Model Terbaik

Random Forest adalah model aktif. Confusion matrix data uji adalah `[[654, 211], [68, 67]]`. ROC curve tersedia pada halaman Prediksi dan metadata `models/metrics.json`.

**Gambar 5.1.** [SISIPKAN ROC curve].  
**Gambar 5.2.** [SISIPKAN confusion matrix].

## 5.7 Analisis Kesalahan

Terdapat 68 false negative dan 211 false positive pada Random Forest. Dugaan penyebabnya adalah ketidakseimbangan kelas, overlap karakteristik antarprofil, dan belum terwakilinya seluruh faktor lingkungan atau klinis pada fitur. Kesalahan ini menjadi alasan model tidak boleh digunakan sebagai diagnosis atau keputusan otomatis.

## 5.8 Pemilihan Model Terbaik

Random Forest dipilih berdasarkan CV AUC tertinggi dan F1/accuracy operasional yang sedikit lebih baik. Namun, Logistic Regression memiliki test AUC 0,6873, lebih tinggi daripada Random Forest 0,6758 pada split tersimpan. Karena itu pemilihan model adalah kompromi dan perlu validasi tambahan sebelum digunakan di luar dataset.

# BAB VI Implementasi dan Deployment

## 6.1 Arsitektur Sistem

**Gambar 6.1.** [SISIPKAN diagram: CSV raw → ETL Python → SQLite warehouse → Go API → React dashboard; warehouse juga → training Python → joblib → FastAPI → Go proxy → frontend.]

## 6.2 Teknologi yang Digunakan

| Komponen | Teknologi | Alasan |
|---|---|---|
| Warehouse | SQLite star schema | Ringan, reproducible, sesuai agregasi lokal |
| ETL | Python, pandas | Validasi dan transformasi mudah dijalankan ulang |
| Dashboard | React, Vite, Plotly | Interaktif dan komponen reusable |
| Model/API | scikit-learn, joblib, FastAPI, Go | Pipeline tersimpan dan satu proxy API |
| Aplikasi | React web | Dapat dipakai di browser dan responsif |
| Deployment | [DIISI TIM] | URL publik belum tersedia saat audit |

## 6.3 Tampilan Modul Prediksi

**Gambar 6.2.** [SISIPKAN screenshot form input dan hasil prediksi/klasifikasi]. Form menerima fitur numerik dan kategorikal, memvalidasi rentang melalui Pydantic, lalu memanggil model tersimpan melalui FastAPI dan Go proxy.

## 6.4 Pengujian

| Skenario | Hasil yang diharapkan | Hasil aktual | Status |
|---|---|---|---|
| Input valid | Kelas dan probabilitas | API model merespons | Lulus |
| Input kosong/tidak valid | Pesan validasi | Validasi Pydantic | Lulus |
| Filter dashboard | Chart mengikuti filter | Filter tahun/kecamatan berjalan | Lulus sebagian |
| Drill-down hierarki | Tahun ke bulan/wilayah ke detail | Belum formal | Sebagian |
| Frontend build | Bundle production | `npm run build` berhasil | Lulus |
| Backend test | Test Go | `go test ./...` berhasil | Lulus |
| Python syntax | Tidak ada syntax error | `py_compile` berhasil | Lulus |

## 6.5 Uji Kegunaan dengan Pengguna

Data uji pengguna belum tersedia pada repository. Tim wajib mengisi tabel berikut setelah uji 3–5 calon pengguna:

| Responden | Tugas | Masukan | Perbaikan |
|---|---|---|---|
| [DIISI] | Menemukan wilayah prioritas | [DIISI] | [DIISI] |
| [DIISI] | Mengisi form prediksi | [DIISI] | [DIISI] |
| [DIISI] | Membaca storytelling | [DIISI] | [DIISI] |

# BAB VII Kesimpulan dan Saran

## 7.1 Kesimpulan

Sistem telah mencapai prototype end-to-end dari data raw, ETL, warehouse, API, dashboard analitik, storytelling, hingga model klasifikasi. Dashboard menjawab pertanyaan tentang skala, wilayah, waktu, praktik, dan model. Temuan utama adalah prevalensi keseluruhan 13,5%, wilayah agregat tertinggi Pintu Pohan Meranti sebesar 18,37%, dan Random Forest sebagai model aktif dengan F1 0,3245. Metrik build, API, Go, dan Python tercapai. URL publik, uji pengguna, izin data, dan metadata tim belum dapat dinyatakan selesai sebelum diisi dan diverifikasi.

## 7.2 Keterbatasan

Keterbatasan meliputi distribusi kelas tidak seimbang, performa model terbatas, fitur lingkungan/klinis belum lengkap, tidak ada koordinat untuk peta, drill-down formal belum ada, dan tidak ada validasi eksternal. Data observasional tidak membuktikan sebab-akibat. Model dapat berubah performanya pada wilayah atau periode lain.

## 7.3 Saran Pengembangan

Tambahkan deployment publik, model card satu halaman sebagai komponen khusus, probabilitas eksplisit untuk kedua kelas, drill-down tahun ke bulan, tooltip bersatuan, uji pengguna, dokumentasi izin dan peran tim, monitoring model, dan optimasi bundle Plotly.

# Daftar Pustaka

[1] scikit-learn developers, “scikit-learn: Machine Learning in Python,” dokumentasi perangkat lunak, https://scikit-learn.org/.  
[2] Plotly Technologies Inc., “Plotly Python Graphing Library,” dokumentasi perangkat lunak, https://plotly.com/python/.  
[3] FastAPI, “FastAPI Documentation,” dokumentasi perangkat lunak, https://fastapi.tiangolo.com/.  
[4] SQLite Consortium, “SQLite Documentation,” dokumentasi perangkat lunak, https://www.sqlite.org/docs.html.  
[5] Institut Teknologi Del, “Deskripsi Proyek Data Analitik & Data Science,” Semester Ganjil 2026/2027.

# Lampiran

## Lampiran A. Pembagian Peran dan Kontribusi

| Nama | Peran | Data Analitik | Data Science | Persentase |
|---|---|---|---|---:|
| [Nama 1] | Project Manager | Koordinasi, timeline, presentasi | Review kebutuhan model | [DIISI] |
| [Nama 2] | Data Engineer | Akuisisi, ETL, warehouse | Validasi fitur | [DIISI] |
| [Nama 3] | Data Analyst/Viz Designer | EDA, dashboard, storytelling | Analisis target | [DIISI] |
| [Nama 4] | ML Engineer | Review insight | Training, evaluasi, model card | [DIISI] |
| [Nama 5] | App/Deployment Engineer | UI, API dashboard | Integrasi prediksi dan testing | [DIISI] |

## Lampiran B. Logbook Mingguan

Logbook berikut adalah rekonstruksi progres dari repository dan harus dicocokkan dengan catatan resmi tim.

| Minggu | Kegiatan dan hasil |
|---:|---|
| 1–2 | Eksplorasi topik, pengguna, pertanyaan analitik, KPI, dan target. |
| 3 | Inspeksi dataset 5.000 x 20 dan data dictionary. Status izin: [DIISI]. |
| 4 | Cleaning, validasi, EDA, dan lima temuan awal. |
| 5 | Star schema, ETL, warehouse, dan view analitik. |
| 6–7 | Dashboard KPI, tren, ranking, baseline, dan model pembanding. |
| 8–10 | Visual advance, storytelling, tuning, ROC, confusion matrix, dan error analysis. |
| 11–12 | Integrasi FastAPI, Go proxy, prediksi, build, smoke test, dan dokumentasi. |
| 13 | Finalisasi laporan, screenshot, deployment, uji pengguna, dan presentasi. |

## Lampiran C. Model Card

| Bagian | Isi |
|---|---|
| Nama/versi | Random Forest, `models/best_model.joblib` |
| Tujuan | Klasifikasi awal diare Ya/Tidak pada profil balita |
| Data latih | Warehouse/CSV, 4.000 train, periode 2020-01-02–2026-10-31 |
| Performa | Test AUC 0,6758; accuracy 0,721; precision 0,241; recall 0,4963; F1 0,3245 |
| Keterbatasan | Kelas tidak seimbang, fitur terbatas, belum validasi eksternal, bukan kausal |
| Tidak disarankan | Diagnosis, triase otomatis, keputusan klinis tanpa petugas |

## Lampiran D. Pernyataan Penggunaan AI

| Alat AI | Digunakan untuk | Bagian | Verifikasi |
|---|---|---|---|
| GitHub Copilot | Bantuan coding, audit, dokumentasi | Frontend, API, ETL, ML, laporan | Build, `go test`, `py_compile`, smoke test API, dan review manusia |
| [Alat lain] | [DIISI TIM] | [DIISI TIM] | [DIISI TIM] |

## Lampiran E. Tautan dan Cara Menjalankan

- Aplikasi: **[DIISI URL PUBLIK]**
- Repositori: https://github.com/Paulus0612/Dasi-Dalis-Project
- Akun demo: Tidak diperlukan pada konfigurasi saat ini / [DIISI BILA ADA]
- Lokal:

```powershell
pip install -r requirements.txt
python etl/etl_pipeline.py
python ml/train.py
uvicorn ml_service.main:app --port 8001
cd backend; go run .
cd frontend; npm install; npm run dev
```
