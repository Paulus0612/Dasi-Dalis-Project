// Backend Go: API analitik dari data warehouse (SQLite) + proxy ke layanan model Python + serve React build.
package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	_ "modernc.org/sqlite"
)

var dsn string // DB dibuka per request: file warehouse bisa diganti oleh ETL kapan saja

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

// whereClause membangun filter global (?tahun=2024&kecamatan=Balige&kelompok_usia=...) dengan whitelist kolom.
func whereClause(r *http.Request) (string, []any) {
	var conds []string
	var args []any
	for _, col := range []string{"tahun", "kecamatan", "kelompok_usia", "jenis_kelamin", "masih_mendapat_asi", "air_minum_dimasak", "cuci_tangan_pakai_sabun"} {
		if v := r.URL.Query().Get(col); v != "" {
			conds = append(conds, col+" = ?")
			args = append(args, v)
		}
	}
	if len(conds) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

// query menjalankan SQL dan mengembalikan []map (kolom dinamis).
func query(q string, args ...any) ([]map[string]any, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	defer db.Close()
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	cols, _ := rows.Columns()
	out := []map[string]any{}
	for rows.Next() {
		vals := make([]any, len(cols))
		ptr := make([]any, len(cols))
		for i := range vals {
			ptr[i] = &vals[i]
		}
		if err := rows.Scan(ptr...); err != nil {
			return nil, err
		}
		m := map[string]any{}
		for i, c := range cols {
			m[c] = vals[i]
		}
		out = append(out, m)
	}
	return out, nil
}

// endpoint membuat handler dari template SQL; %WHERE% diganti filter global.
func endpoint(sqlTpl string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wc, args := whereClause(r)
		data, err := query(strings.ReplaceAll(sqlTpl, "%WHERE%", wc), args...)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(data)
	}
}

func main() {
	dsn = "file:" + env("DB_PATH", "../data/warehouse.db") + "?mode=ro"

	mux := http.NewServeMux()
	mux.HandleFunc("/api/kpi", endpoint(`SELECT COUNT(*) AS n, ROUND(AVG(diare)*100,2) AS prevalensi_pct,
		ROUND(AVG(CASE WHEN diare=1 THEN lama_gejala_diare_hari END),2) AS rata_lama_hari,
		ROUND(AVG(CASE WHEN air_minum_dimasak='Ya' THEN 1.0 ELSE 0 END)*100,2) AS air_dimasak_pct,
		ROUND(AVG(CASE WHEN cuci_tangan_pakai_sabun='Ya' THEN 1.0 ELSE 0 END)*100,2) AS cuci_tangan_pct
		FROM v_diare%WHERE%`))
	mux.HandleFunc("/api/trend", endpoint(`SELECT tahun, bulan, COUNT(*) n, ROUND(AVG(diare)*100,2) prevalensi_pct FROM v_diare%WHERE% GROUP BY tahun, bulan ORDER BY tahun, bulan`))
	mux.HandleFunc("/api/by-kecamatan", endpoint(`SELECT kecamatan, COUNT(*) n, ROUND(AVG(diare)*100,2) prevalensi_pct FROM v_diare%WHERE% GROUP BY kecamatan ORDER BY prevalensi_pct DESC`))
	mux.HandleFunc("/api/heatmap", endpoint(`SELECT kecamatan, tahun, ROUND(AVG(diare)*100,2) prevalensi_pct FROM v_diare%WHERE% GROUP BY kecamatan, tahun`))
	mux.HandleFunc("/api/by-usia", endpoint(`SELECT kelompok_usia, jenis_kelamin, COUNT(*) n, ROUND(AVG(diare)*100,2) prevalensi_pct FROM v_diare%WHERE% GROUP BY kelompok_usia, jenis_kelamin`))
	mux.HandleFunc("/api/sanitasi", endpoint(`SELECT air_minum_dimasak, cuci_tangan_pakai_sabun, masih_mendapat_asi, COUNT(*) n, SUM(diare) kasus FROM v_diare%WHERE% GROUP BY 1,2,3`))
	mux.HandleFunc("/api/scatter", endpoint(`SELECT usia_balita_bulan, berat_badan_kg, panjang_tinggi_badan_cm, hb_ibu_g_dL, jumlah_kelompok_pangan_24_jam, diare, kecamatan FROM v_diare%WHERE% ORDER BY RANDOM() LIMIT 1500`))

	// Proxy ke layanan model Python
	target, _ := url.Parse(env("ML_URL", "http://localhost:8001"))
	proxy := httputil.NewSingleHostReverseProxy(target)
	mux.HandleFunc("/api/predict", func(w http.ResponseWriter, r *http.Request) { r.URL.Path = "/predict"; proxy.ServeHTTP(w, r) })
	mux.HandleFunc("/api/data/", func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
		proxy.ServeHTTP(w, r)
	})
	mux.HandleFunc("/api/model-metrics", func(w http.ResponseWriter, r *http.Request) { r.URL.Path = "/metrics"; proxy.ServeHTTP(w, r) })

	// React build (SPA)
	static := env("STATIC_DIR", "../frontend/dist")
	fs := http.FileServer(http.Dir(static))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if _, err := os.Stat(static + r.URL.Path); err != nil {
			r.URL.Path = "/"
		}
		fs.ServeHTTP(w, r)
	})

	addr := ":" + env("PORT", "8080")
	log.Println("listening", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
