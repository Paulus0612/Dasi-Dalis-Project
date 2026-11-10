# Diare Balita Kabupaten Toba — Dashboard Analitik + Modul Prediksi
Python (ETL, warehouse, ML) · Go (API) · React (dashboard)

## Arsitektur
CSV mentah → `etl/etl_pipeline.py` → `data/warehouse.db` (SQLite, skema bintang)
→ Go API (`backend/`, query agregasi dashboard) → React (`frontend/`)
→ `ml/train.py` → `models/best_model.joblib` → FastAPI (`ml_service/`) ← di-proxy oleh Go (`/api/predict`)

## Menjalankan
```bash
pip install -r requirements.txt
python etl/etl_pipeline.py        # warehouse + laporan kualitas (docs/)
python ml/train.py                # latih 3 model, simpan model terbaik + metrics.json
uvicorn ml_service.main:app --port 8001 &
cd backend && go mod tidy && go run .      # API :8080
cd frontend && npm install && npm run dev  # dev :5173 (proxy ke :8080)
```
Deploy: `docker build -t diare-toba .` lalu push ke Render/Railway (satu container, port 8080).

## Skema bintang
fact_pengukuran ← dim_waktu, dim_wilayah, dim_profil (JK, kelompok usia), dim_praktik (ASI, air, cuci tangan, kehamilan ibu)

## Model
Target: `diare` (klasifikasi biner). Fitur `frekuensi_bab_cair_24_jam` dan `lama_gejala_diare_hari`
DIKELUARKAN karena bocor dari target (selalu 0 bila tidak diare).
