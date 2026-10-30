FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY frontend ./frontend
RUN mkdir -p ./data
ENV DATABASE_URL=sqlite:////app/data/trustchain.db
ENV FRONTEND_DIR=/app/frontend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
