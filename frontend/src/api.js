export const qs = (f) => {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  const s = p.toString();
  return s ? "?" + s : "";
};

export const get = (path, f = {}) =>
  fetch(`/api/${path}${qs(f)}`).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data?.detail?.errors?.join(", ") || "Permintaan gagal.");
    return data;
  });

export const predict = (body) =>
  fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data?.detail?.errors?.join(", ") || "Prediksi gagal.");
    return data;
  });