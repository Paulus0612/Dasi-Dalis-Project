export const qs = (f) => {
  const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
  const s = p.toString();
  return s ? "?" + s : "";
};

export const get = (path, f = {}) =>
  fetch(`/api/${path}${qs(f)}`).then((r) => r.json());

export const predict = (body) =>
  fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());