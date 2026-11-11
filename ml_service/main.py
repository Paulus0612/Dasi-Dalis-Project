"""Layanan model (FastAPI). Jalankan: uvicorn ml_service.main:app --port 8001"""
import json, sys, threading, time
from datetime import datetime
from pathlib import Path
import joblib, pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ml.train import FEATURES, add_features, main as train_main  # noqa
from etl.etl_pipeline import run_etl, REPORT  # noqa
from etl import ingest  # noqa

model = joblib.load(ROOT / "models/best_model.joblib")
metrics = json.loads((ROOT / "models/metrics.json").read_text())
app = FastAPI(title="Model Diare Balita Toba")

class Input(BaseModel):
    usia_balita_bulan: int = Field(ge=0, le=59)
    jenis_kelamin: str; kecamatan: str
    berat_badan_kg: float = Field(ge=2, le=30)
    panjang_tinggi_badan_cm: float = Field(ge=40, le=125)
    hb_ibu_g_dL: float = Field(ge=5, le=18)
    status_kehamilan_saat_pemeriksaan_hb: str
    masih_mendapat_asi: str
    jumlah_kelompok_pangan_24_jam: int = Field(ge=0, le=10)
    frekuensi_makan_24_jam: int = Field(ge=0, le=10)
    air_minum_dimasak: str; cuci_tangan_pakai_sabun: str
    bulan: int = Field(default=1, ge=1, le=12)

@app.post("/predict")
def predict(x: Input):
    df = add_features(pd.DataFrame([x.model_dump()]))[FEATURES]
    p = float(model.predict_proba(df)[0, 1])
    return {"probabilitas_diare": round(p, 4), "kelas": "Ya" if p >= 0.5 else "Tidak",
            "risiko": "Tinggi" if p >= 0.5 else "Sedang" if p >= 0.25 else "Rendah"}

@app.get("/metrics")
def get_metrics(): return metrics
@app.get("/health")
def health(): return {"ok": True}


# ---------------- Kelola data CSV ----------------
JOB = {"state": "idle", "step": "", "message": "", "result": None}
_lock = threading.Lock()

def _run_job(retrain: bool):
    global model, metrics
    try:
        JOB.update(state="running", step="ETL: membersihkan data dan memuat warehouse", message="", result=None)
        etl = run_etl()
        if retrain:
            JOB.update(step="Melatih ulang 3 model (bisa beberapa menit)")
            train_main()
            model = joblib.load(ROOT / "models/best_model.joblib")
            metrics = json.loads((ROOT / "models/metrics.json").read_text())
        JOB.update(state="done", step="Selesai", result={"etl": etl, "retrain": retrain})
    except Exception as e:  # tampilkan ke UI
        JOB.update(state="error", step="Gagal", message=str(e))
    finally:
        _lock.release()

def _start(retrain: bool):
    if not _lock.acquire(blocking=False):
        raise HTTPException(409, detail={"errors": ["Proses lain masih berjalan. Tunggu sampai selesai."]})
    JOB.update(state="running", step="Memulai", message="", result=None)
    threading.Thread(target=_run_job, args=(retrain,), daemon=True).start()

@app.get("/data/info")
def data_info():
    raw = ingest.RAW
    if not raw.exists():
        return {"ada": False, "required": ingest.REQUIRED}
    df = pd.read_csv(raw)
    return {"ada": True, "rows": len(df), "cols": len(df.columns), "columns": list(df.columns),
            "size_kb": round(raw.stat().st_size / 1024, 1),
            "modified": datetime.fromtimestamp(raw.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
            "kualitas": json.loads(REPORT.read_text()) if REPORT.exists() else None,
            "model": {"best": metrics["best"], "test_auc": next(r["test_auc"] for r in metrics["results"] if r["model"] == metrics["best"])},
            "required": ingest.REQUIRED}

@app.get("/data/preview")
def data_preview(offset: int = Query(0, ge=0), limit: int = Query(25, ge=1, le=200)):
    if not ingest.RAW.exists():
        raise HTTPException(404, detail={"errors": ["Belum ada data."]})
    df = pd.read_csv(ingest.RAW)
    page = df.iloc[offset: offset + limit]
    return {"total": len(df), "offset": offset, "columns": list(df.columns),
            "rows": json.loads(page.to_json(orient="records"))}

@app.get("/data/download")
def data_download():
    if not ingest.RAW.exists():
        raise HTTPException(404, detail={"errors": ["Belum ada data."]})
    return FileResponse(ingest.RAW, media_type="text/csv", filename="data_diare_balita_toba.csv")

@app.get("/data/template")
def data_template():
    return Response(",".join(ingest.REQUIRED) + "\n", media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=template_data_diare.csv"})

@app.get("/data/job")
def data_job():
    return JOB

@app.post("/data/upload")
async def data_upload(file: UploadFile = File(...), retrain: bool = Form(True)):
    try:
        df = ingest.parse_csv(await file.read())
    except ValueError as e:
        raise HTTPException(422, detail={"errors": [str(e)], "warnings": []})
    errors, warnings = ingest.validate(df)
    if errors:
        raise HTTPException(422, detail={"errors": errors, "warnings": warnings})
    if not _lock.acquire(blocking=False):
        raise HTTPException(409, detail={"errors": ["Proses lain masih berjalan. Tunggu sampai selesai."]})
    _lock.release()  # _start mengambil lock lagi; simpan file dulu agar gagal-simpan tidak mengunci
    ingest.save_raw(df)
    _start(retrain)
    return {"ok": True, "rows": len(df), "warnings": warnings}

@app.post("/data/reprocess")
def data_reprocess(retrain: bool = Form(True)):
    if not ingest.RAW.exists():
        raise HTTPException(404, detail={"errors": ["Belum ada data."]})
    _start(retrain)
    return {"ok": True}
