# --- build React ---
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json . 
RUN npm install
COPY frontend/ .
RUN npm run build
# --- build Go ---
FROM golang:1.22 AS gobuild
WORKDIR /src
COPY backend/ .
RUN go mod tidy && CGO_ENABLED=0 go build -o /out/server .
# --- runtime: Go + Python model service dalam satu container (mudah di-deploy ke Render/Railway) ---
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt . 
RUN pip install --no-cache-dir -r requirements.txt
COPY ml ml
COPY ml_service ml_service
COPY models models
COPY data/warehouse.db data/warehouse.db
COPY --from=gobuild /out/server /app/server
COPY --from=web /web/dist /app/static
ENV DB_PATH=/app/data/warehouse.db STATIC_DIR=/app/static ML_URL=http://localhost:8001
CMD sh -c "uvicorn ml_service.main:app --port 8001 & /app/server"
