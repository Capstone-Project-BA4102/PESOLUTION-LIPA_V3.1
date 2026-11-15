FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/cache SENTIMENT_DEVICE=cpu SENTIMENT_HOST=0.0.0.0

# libgomp1 is torch's OpenMP runtime. torch is installed on its own line, from the CPU wheel
# index, and is deliberately absent from requirements.txt: the PyPI default build pulls roughly
# 3 GB of CUDA libraries that this Space never uses, and the image would not fit a CPU Space.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir "torch>=2.6.0" --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sentiment_inference.py .

# The 1.1 GB checkpoint is pulled from the private Hub repo on boot, so the cache directory must
# exist and be writable by the unprivileged user that Spaces run containers as.
RUN useradd --create-home --uid 1000 user \
 && mkdir -p /cache \
 && chown -R user:user /app /cache
USER user

EXPOSE 8001
CMD ["uvicorn", "sentiment_inference:app", "--host", "0.0.0.0", "--port", "8001"]
