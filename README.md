# Diare Balita Kabupaten Toba: Dashboard Analitik + Modul Prediksi
Python (ETL, warehouse, ML) · Go (API) · React (dashboard)

## Arsitektur
CSV mentah → `etl/etl_pipeline.py` → `data/warehouse.db` (SQLite, skema bintang)
→ Go API (`backend/`, query agregasi dashboard) → React (`frontend/`)
→ `ml/train.py` → `models/best_model.joblib` → FastAPI (`ml_service/`) ← di-proxy oleh Go (`/api/predict`)

## Struktur proyek

- `data/raw/`: CSV sumber yang dipakai ETL.
- `etl/`: pembersihan data dan pembentukan warehouse SQLite.
- `data/warehouse.db`: satu sumber data untuk API analitik dan training model.
- `ml/`: pipeline training dan evaluasi tiga model klasifikasi.
- `models/`: model terbaik tersimpan dan metadata metrik.
- `ml_service/`: FastAPI untuk prediksi, metrik, dan proses data.
- `backend/`: Go API untuk query dashboard dan proxy layanan model.
- `frontend/`: React + Plotly dashboard.
- `docs/`: laporan kualitas data hasil ETL.

## Menjalankan lokal
```bash
pip install -r requirements.txt
python etl/etl_pipeline.py        # warehouse + laporan kualitas (docs/)
python ml/train.py                # latih 3 model, simpan model terbaik + metrics.json
uvicorn ml_service.main:app --port 8001 &
cd backend && go mod tidy && go run .      # API :8080
cd frontend && npm install && npm run dev  # dev :5173 (proxy ke :8080)
```
Perintah training membaca `data/warehouse.db`, sehingga dashboard dan model memakai warehouse yang sama.

## Deploy

Build image lalu deploy ke Render atau Railway sebagai web service yang mengekspos port `8080`:

```bash
docker build -t diare-toba .
docker run --rm -p 8080:8080 diare-toba
```

URL deployment: `[ISI URL PUBLIK SETELAH DEPLOY]`

Sebelum publikasi, tim perlu mengisi status izin data, nama anggota dan peran, pernyataan penggunaan AI, serta URL deployment pada halaman Tentang dan dokumentasi proyek.

## Skema bintang
fact_pengukuran ← dim_waktu, dim_wilayah, dim_profil (JK, kelompok usia), dim_praktik (ASI, air, cuci tangan, kehamilan ibu)

## Model
Target: `diare` (klasifikasi biner). Fitur `frekuensi_bab_cair_24_jam` dan `lama_gejala_diare_hari`
DIKELUARKAN karena bocor dari target (selalu 0 bila tidak diare).
