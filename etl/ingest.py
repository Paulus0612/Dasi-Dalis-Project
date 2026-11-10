"""Baca, validasi, dan simpan CSV unggahan. Dipakai layanan /data/upload."""
import io, shutil
from datetime import datetime
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/diare_balita_toba_raw.csv"
BACKUP = ROOT / "data/raw/backup"
MAX_BYTES = 20 * 1024 * 1024

REQUIRED = ["id_balita", "kabupaten", "kecamatan", "tanggal_pengukuran", "usia_balita_bulan", "jenis_kelamin",
    "berat_badan_kg", "panjang_tinggi_badan_cm", "id_ibu", "hb_ibu_g_dL", "status_kehamilan_saat_pemeriksaan_hb",
    "trimester_saat_pemeriksaan_hb", "masih_mendapat_asi", "jumlah_kelompok_pangan_24_jam", "frekuensi_makan_24_jam",
    "air_minum_dimasak", "cuci_tangan_pakai_sabun", "frekuensi_bab_cair_24_jam", "lama_gejala_diare_hari",
    "gejala_diare_14_hari_terakhir"]
NUMERIC = ["usia_balita_bulan", "berat_badan_kg", "panjang_tinggi_badan_cm", "hb_ibu_g_dL", "jumlah_kelompok_pangan_24_jam",
    "frekuensi_makan_24_jam", "frekuensi_bab_cair_24_jam", "lama_gejala_diare_hari"]

def parse_csv(content: bytes) -> pd.DataFrame:
    """Terima koma atau titik koma (Excel Indonesia), UTF-8 atau Latin-1."""
    if len(content) > MAX_BYTES:
        raise ValueError("Ukuran file melebihi 20 MB.")
    for enc in ("utf-8-sig", "latin-1"):
        try:
            return pd.read_csv(io.StringIO(content.decode(enc)), sep=None, engine="python")
        except UnicodeDecodeError:
            continue
        except Exception as e:  # CSV rusak
            raise ValueError(f"File tidak bisa dibaca sebagai CSV: {e}")
    raise ValueError("Encoding file tidak dikenali.")

def validate(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    df.columns = [str(c).strip() for c in df.columns]
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        errors.append("Kolom wajib tidak ditemukan: " + ", ".join(missing))
        return errors, warnings
    if len(df) == 0:
        errors.append("File tidak berisi baris data.")
        return errors, warnings
    for c in NUMERIC:
        bad = pd.to_numeric(df[c], errors="coerce").isna() & df[c].notna()
        if bad.any():
            errors.append(f"Kolom {c} berisi {int(bad.sum())} nilai non-angka (contoh baris {int(bad.idxmax()) + 2}).")
    if not set(df["gejala_diare_14_hari_terakhir"].dropna().astype(str).str.strip()) <= {"Ya", "Tidak"}:
        errors.append("Kolom gejala_diare_14_hari_terakhir hanya boleh berisi Ya atau Tidak.")
    if pd.to_datetime(df["tanggal_pengukuran"], errors="coerce").isna().any():
        errors.append("Ada tanggal_pengukuran yang tidak valid (gunakan format YYYY-MM-DD).")
    dup = int(df["id_balita"].duplicated().sum())
    if dup:
        warnings.append(f"{dup} baris memiliki id_balita ganda; duplikat akan dibuang saat ETL.")
    if len(df) < 5000:
        warnings.append(f"Hanya {len(df)} baris; syarat dokumen proyek untuk data publik minimal 5.000 baris (data primer 500).")
    extra = [c for c in df.columns if c not in REQUIRED]
    if extra:
        warnings.append("Kolom tambahan diabaikan oleh ETL: " + ", ".join(extra))
    return errors, warnings

def save_raw(df: pd.DataFrame) -> None:
    """Cadangkan CSV lama (bila ada), lalu simpan yang baru dengan pemisah koma."""
    RAW.parent.mkdir(parents=True, exist_ok=True)
    if RAW.exists():
        BACKUP.mkdir(exist_ok=True)
        shutil.copy2(RAW, BACKUP / f"raw_{datetime.now():%Y%m%d_%H%M%S}.csv")
    df[REQUIRED].to_csv(RAW, index=False)
