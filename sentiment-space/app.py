"""Hugging Face Space entry point (Gradio SDK).

The Express backend needs a plain REST contract (GET /health, POST /predict), which lives in
sentiment_inference.py and is served unchanged here. On top of it we mount a small Gradio UI at
the Space root so the model can be tried in a browser without curl.
"""

import os

import gradio as gr
import torch
import uvicorn

import sentiment_inference as core


def classify(text: str):
    text = (text or "").strip()
    if not text:
        return {"error": "Feedback text is required"}
    if core.model is None or core.tokenizer is None:
        return {"status": core.load_state, "error": core.load_error or "Model is still loading"}
    with core.inference_lock, torch.inference_mode():
        encoded = core.tokenizer(text, return_tensors="pt", truncation=True, max_length=core.MAX_LENGTH)
        encoded = {key: value.to(core.device) for key, value in encoded.items()}
        probabilities = torch.softmax(core.model(**encoded).logits, dim=-1)[0]
    labels = {index: str(name).lower() for index, name in core.model.config.id2label.items()}
    predicted = int(torch.argmax(probabilities).item())
    return {
        "label": labels[predicted],
        "confidence": round(float(probabilities[predicted].item()), 4),
        "probabilities": {labels[index]: round(float(score.item()), 4) for index, score in enumerate(probabilities)},
        "model": core.metadata.get("model", "xlm-roberta"),
        "device": str(core.device),
        "status": "ready",
    }


demo = gr.Interface(
    fn=classify,
    inputs=gr.Textbox(lines=4, label="Feedback comment", placeholder="Hal. Mabilis ang tulong ng PESO sa referral ko."),
    outputs=gr.JSON(label="Sentiment result"),
    title="PESOLUTION XLM-R Sentiment",
    description="Fine-tuned XLM-RoBERTa classifier for hired-applicant feedback. The PESOLUTION backend calls POST /predict on this same Space.",
    examples=[
        ["Mabilis ang tulong at natanggap agad ako sa trabaho."],
        ["Hindi naman nakakatulong, sobrang bagal ng proseso."],
        ["Okay lang naman, sakto lang ang serbisyo."],
    ],
)

application = gr.mount_gradio_app(core.app, demo, path="/")

if __name__ == "__main__":
    uvicorn.run(application, host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
