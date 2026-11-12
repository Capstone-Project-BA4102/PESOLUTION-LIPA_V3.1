FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/cache SENTIMENT_DEVICE=cpu

# torch is installed on its own line, from the CPU wheel index, and is deliberately absent from
# requirements.txt: the PyPI default build pulls roughly 3 GB of CUDA libraries that this Space
# never uses, and the image would not fit a free CPU Space.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir "torch>=2.6.0" --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sentiment_inference.py .

EXPOSE 8001
CMD ["uvicorn", "sentiment_inference:app", "--host", "0.0.0.0", "--port", "8001"]
