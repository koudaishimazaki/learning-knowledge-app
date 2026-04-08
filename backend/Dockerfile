FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

EXPOSE 8000

CMD ["sh", "-lc", "python -c \"import os,time; import psycopg; url=os.environ.get('DATABASE_URL',''); url=url.replace('postgresql+psycopg://','postgresql://'); last=None\nfor i in range(60):\n  try:\n    psycopg.connect(url).close(); print('db:ready'); break\n  except Exception as e:\n    last=e; time.sleep(1)\nelse:\n  raise SystemExit(f'db:not-ready: {last}')\" && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

