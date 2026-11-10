"""Training klasifikasi: target = diare (14 hari terakhir). Jalankan: python ml/train.py
PENTING: frekuensi_bab_cair_24_jam & lama_gejala_diare_hari DIBUANG (kebocoran target)."""
import json, sqlite3
from pathlib import Path
import joblib, numpy as np, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score, precision_score,
                             recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
NUM = ["usia_balita_bulan", "berat_badan_kg", "panjang_tinggi_badan_cm", "hb_ibu_g_dL",
       "jumlah_kelompok_pangan_24_jam", "frekuensi_makan_24_jam", "bb_per_tb", "bulan"]
CAT = ["jenis_kelamin", "kecamatan", "masih_mendapat_asi", "air_minum_dimasak",
       "cuci_tangan_pakai_sabun", "status_kehamilan_saat_pemeriksaan_hb"]
FEATURES = NUM + CAT

def add_features(d: pd.DataFrame) -> pd.DataFrame:
    d = d.copy()
    d["bb_per_tb"] = d["berat_badan_kg"] / d["panjang_tinggi_badan_cm"]
    return d

def load() -> pd.DataFrame:
    with sqlite3.connect(ROOT / "data/warehouse.db") as con:
        return add_features(pd.read_sql("SELECT * FROM v_diare", con))

def pre(scale: bool):
    return ColumnTransformer([("num", StandardScaler() if scale else "passthrough", NUM),
                              ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)])

def main():
    df = load(); X, y = df[FEATURES], df["diare"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    cv = StratifiedKFold(5, shuffle=True, random_state=42)
    spaces = {
      "Logistic Regression (baseline)": (Pipeline([("p", pre(True)), ("m", LogisticRegression(max_iter=2000, class_weight="balanced"))]),
                                         {"m__C": [0.01, 0.1, 1, 10]}),
      "Random Forest": (Pipeline([("p", pre(False)), ("m", RandomForestClassifier(class_weight="balanced_subsample", random_state=42, n_jobs=-1))]),
                        {"m__n_estimators": [200, 400], "m__max_depth": [4, 6, 10, None], "m__min_samples_leaf": [3, 5, 10]}),
      "HistGradientBoosting": (Pipeline([("p", pre(False)), ("m", HistGradientBoostingClassifier(class_weight="balanced", random_state=42))]),
                               {"m__learning_rate": [0.03, 0.05, 0.1], "m__max_depth": [3, 4, None], "m__max_iter": [100, 200, 300]}),
    }
    results, best_name, best_auc, best_est, curves = [], None, -1, None, {}
    for name, (pipe, grid) in spaces.items():
        s = RandomizedSearchCV(pipe, grid, n_iter=min(8, int(np.prod([len(v) for v in grid.values()]))),
                               scoring="roc_auc", cv=cv, random_state=42, n_jobs=-1).fit(Xtr, ytr)
        p = s.predict_proba(Xte)[:, 1]; pred = (p >= 0.5).astype(int)
        fpr, tpr, _ = roc_curve(yte, p)
        results.append(dict(model=name, best_params=s.best_params_, cv_auc=round(s.best_score_, 4),
            test_auc=round(roc_auc_score(yte, p), 4), accuracy=round(accuracy_score(yte, pred), 4),
            precision=round(precision_score(yte, pred), 4), recall=round(recall_score(yte, pred), 4),
            f1=round(f1_score(yte, pred), 4), confusion_matrix=confusion_matrix(yte, pred).tolist()))
        curves[name] = dict(fpr=fpr[::max(1, len(fpr)//60)].round(4).tolist(), tpr=tpr[::max(1, len(tpr)//60)].round(4).tolist())
        if s.best_score_ > best_auc: best_auc, best_name, best_est = s.best_score_, name, s.best_estimator_
        print(name, results[-1]["cv_auc"], results[-1]["test_auc"])
    # analisis kesalahan: 10 false negative dengan probabilitas terendah
    p = best_est.predict_proba(Xte)[:, 1]
    fn = Xte[(yte == 1) & (p < 0.5)].assign(prob=p[(yte == 1) & (p < 0.5)]).sort_values("prob").head(10)
    out = ROOT / "models"; out.mkdir(exist_ok=True)
    joblib.dump(best_est, out / "best_model.joblib")
    (out / "metrics.json").write_text(json.dumps(dict(best=best_name, target="diare (Ya/Tidak)", n_train=len(Xtr), n_test=len(Xte),
        prevalensi=round(float(y.mean()), 4), results=results, roc=curves, features=FEATURES,
        error_analysis_fn=fn.round(3).to_dict("records")), indent=2, default=str))
    print("Model terbaik:", best_name)

if __name__ == "__main__":
    main()
