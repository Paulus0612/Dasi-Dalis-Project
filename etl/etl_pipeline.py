"""ETL: CSV mentah -> bersih -> data warehouse skema bintang (SQLite) + laporan kualitas.
Jalankan ulang kapan saja:  python etl/etl_pipeline.py
"""
import json, os, sqlite3, sys, time
from contextlib import closing
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/diare_balita_toba_raw.csv"
DB = ROOT / "data/warehouse.db"
TMP = ROOT / "data/warehouse.tmp.db"
REPORT = ROOT / "docs/laporan_kualitas_data.json"

YN = {"Ya": 1, "Tidak": 0}
RULES = {  # aturan validitas (batas wajar)
    "usia_balita_bulan": (0, 59), "berat_badan_kg": (2, 30),
    "panjang_tinggi_badan_cm": (40, 125), "hb_ibu_g_dL": (5, 18),
    "jumlah_kelompok_pangan_24_jam": (0, 10), "frekuensi_makan_24_jam": (0, 10),
    "frekuensi_bab_cair_24_jam": (0, 20), "lama_gejala_diare_hari": (0, 14),
}

def quality(df: pd.DataFrame) -> dict:
    """4 dimensi kualitas: completeness, validity, consistency, uniqueness."""
    req = [c for c in df.columns if c != "trimester_saat_pemeriksaan_hb"]  # NaN trimester = struktural
    completeness = 1 - df[req].isna().mean().mean()
    bad = sum(((df[c] < lo) | (df[c] > hi)).sum() for c, (lo, hi) in RULES.items() if c in df)
    validity = 1 - bad / (len(df) * len(RULES))
    inc = ((df.gejala_diare_14_hari_terakhir.astype(str).str.strip() == "Tidak")
           & (df.frekuensi_bab_cair_24_jam > 0)).sum()
    inc += ((df.status_kehamilan_saat_pemeriksaan_hb == "Tidak hamil") & (df.trimester_saat_pemeriksaan_hb.fillna(0) > 0)).sum()
    consistency = 1 - inc / len(df)
    uniqueness = 1 - df.duplicated(subset="id_balita").mean()
    out = {k: round(float(v), 4) for k, v in dict(completeness=completeness, validity=validity,
            consistency=consistency, uniqueness=uniqueness).items()}
    out["n_rows"] = int(len(df))
    return out

def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for c in df.columns:
        if df[c].dtype == object or str(df[c].dtype).startswith("str"):
            df[c] = df[c].astype(str).str.strip()
    df["kecamatan"] = df["kecamatan"].str.title()
    df["tanggal_pengukuran"] = pd.to_datetime(df["tanggal_pengukuran"], errors="coerce")
    df = df.drop_duplicates(subset="id_balita").dropna(subset=["tanggal_pengukuran", "kecamatan"])
    for c, (lo, hi) in RULES.items():  # di luar batas -> NaN -> imputasi median per kecamatan
        df.loc[(df[c] < lo) | (df[c] > hi), c] = np.nan
        df[c] = df[c].fillna(df.groupby("kecamatan")[c].transform("median"))
    df["trimester_saat_pemeriksaan_hb"] = df["trimester_saat_pemeriksaan_hb"].fillna(0).astype(int)  # 0 = tidak hamil
    return df.reset_index(drop=True)

def build_warehouse(df: pd.DataFrame) -> None:
    d = pd.DataFrame({"tanggal": sorted(df.tanggal_pengukuran.dt.normalize().unique())})
    d["id_waktu"] = d.tanggal.dt.strftime("%Y%m%d").astype(int)
    d["tahun"], d["bulan"], d["kuartal"] = d.tanggal.dt.year, d.tanggal.dt.month, d.tanggal.dt.quarter
    d["nama_bulan"] = d.tanggal.dt.strftime("%b"); d["tanggal"] = d.tanggal.dt.strftime("%Y-%m-%d")
    dim_waktu = d

    dim_wilayah = pd.DataFrame({"kecamatan": sorted(df.kecamatan.unique())})
    dim_wilayah.insert(0, "id_wilayah", range(1, len(dim_wilayah) + 1))
    dim_wilayah["kabupaten"] = "Toba"

    bins, labels = [-1, 5, 11, 23, 35, 59], ["0-5 bln", "6-11 bln", "12-23 bln", "24-35 bln", "36-59 bln"]
    df["kelompok_usia"] = pd.cut(df.usia_balita_bulan, bins, labels=labels).astype(str)
    prof = df[["jenis_kelamin", "kelompok_usia"]].drop_duplicates().reset_index(drop=True)
    prof.insert(0, "id_profil", range(1, len(prof) + 1)); dim_profil = prof

    pk = ["masih_mendapat_asi", "air_minum_dimasak", "cuci_tangan_pakai_sabun", "status_kehamilan_saat_pemeriksaan_hb"]
    prak = df[pk].drop_duplicates().reset_index(drop=True)
    prak.insert(0, "id_praktik", range(1, len(prak) + 1)); dim_praktik = prak

    f = df.assign(id_waktu=df.tanggal_pengukuran.dt.strftime("%Y%m%d").astype(int))
    f = f.merge(dim_wilayah[["id_wilayah", "kecamatan"]], on="kecamatan") \
         .merge(dim_profil, on=["jenis_kelamin", "kelompok_usia"]).merge(dim_praktik, on=pk)
    f["diare"] = f.gejala_diare_14_hari_terakhir.map(YN)
    fact = f[["id_balita", "id_waktu", "id_wilayah", "id_profil", "id_praktik", "usia_balita_bulan",
              "berat_badan_kg", "panjang_tinggi_badan_cm", "hb_ibu_g_dL", "trimester_saat_pemeriksaan_hb",
              "jumlah_kelompok_pangan_24_jam", "frekuensi_makan_24_jam", "frekuensi_bab_cair_24_jam",
              "lama_gejala_diare_hari", "diare"]].rename(columns={"id_balita": "id_fakta"})

    TMP.unlink(missing_ok=True)
    with closing(sqlite3.connect(TMP)) as con:
        for name, t in dict(dim_waktu=dim_waktu, dim_wilayah=dim_wilayah, dim_profil=dim_profil,
                            dim_praktik=dim_praktik, fact_pengukuran=fact).items():
            t.to_sql(name, con, index=False)
        con.executescript("""
          CREATE INDEX ix_f_waktu ON fact_pengukuran(id_waktu);
          CREATE INDEX ix_f_wil ON fact_pengukuran(id_wilayah);
          CREATE VIEW v_diare AS
            SELECT f.*, w.tahun, w.bulan, w.kuartal, w.tanggal, k.kecamatan, p.jenis_kelamin, p.kelompok_usia,
                   r.masih_mendapat_asi, r.air_minum_dimasak, r.cuci_tangan_pakai_sabun,
                   r.status_kehamilan_saat_pemeriksaan_hb
            FROM fact_pengukuran f JOIN dim_waktu w USING(id_waktu) JOIN dim_wilayah k USING(id_wilayah)
            JOIN dim_profil p USING(id_profil) JOIN dim_praktik r USING(id_praktik);""")
        con.commit()
    for i in range(10):  # Windows: file bisa sedang dibaca API; coba lagi sebentar
        try:
            os.replace(TMP, DB); return
        except PermissionError:
            time.sleep(0.5)
    raise RuntimeError("warehouse.db sedang dipakai proses lain; coba lagi.")

def run_etl(src: Path = RAW) -> dict:
    raw = pd.read_csv(src)
    before = quality(raw)
    df = clean(raw)
    after = quality(df.assign(trimester_saat_pemeriksaan_hb=df.trimester_saat_pemeriksaan_hb.replace(0, np.nan)))
    build_warehouse(df)
    REPORT.parent.mkdir(exist_ok=True)
    result = {"sebelum": before, "sesudah": after}
    REPORT.write_text(json.dumps(result, indent=2))
    return result

def main():
    print(run_etl())

if __name__ == "__main__":
    sys.exit(main())
