import torch
import numpy as np
import soundfile as sf
import io

from ai_models import models, DEVICE


def detecter_langue(audio_bytes: bytes) -> str:
    """Retourne 'fon' ou 'fr' selon la langue détectée dans l'audio."""
    audio_array, sr = sf.read(io.BytesIO(audio_bytes))

    inputs = models["lid_processor"](audio_array, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        logits = models["lid_model"](**inputs).logits

    predicted_id = torch.argmax(logits, dim=-1).item()
    label = models["lid_model"].config.id2label[predicted_id]

    # mms-lid renvoie des codes ISO 639-3 ("fon", "fra") ; on les mappe vers
    # les valeurs attendues par notre enum PostgreSQL ("fon", "fr")
    return "fon" if label == "fon" else "fr"


def transcrire_fon(audio_bytes: bytes) -> tuple[str, float]:
    """Transcrit un audio fon avec MMS-ASR, retourne (texte, score_de_confiance)."""
    audio_array, sr = sf.read(io.BytesIO(audio_bytes))

    inputs = models["asr_processor"](audio_array, sampling_rate=16000, return_tensors="pt")
    input_values = inputs.input_values.to(DEVICE, dtype=models["asr_model"].dtype)

    with torch.no_grad():
        logits = models["asr_model"](input_values).logits

    # Score de confiance : moyenne des probabilités maximales par pas de temps
    probs = torch.softmax(logits, dim=-1)
    max_probs = torch.max(probs, dim=-1).values
    confidence = max_probs.mean().item()

    predicted_ids = torch.argmax(logits, dim=-1)
    transcription = models["asr_processor"].batch_decode(predicted_ids)[0]

    return transcription, confidence


def traduire(texte: str, src_lang: str, tgt_lang: str) -> str:
    """Traduit un texte via NLLB (fon_Latn <-> fra_Latn)."""
    tokenizer = models["nllb_tokenizer"]
    model = models["nllb_model"]

    tokenizer.src_lang = src_lang
    inputs = tokenizer(texte, return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        generated = model.generate(
            **inputs,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids(tgt_lang),
            max_length=128,
            num_beams=3,
        )

    return tokenizer.decode(generated[0], skip_special_tokens=True)


def synthetiser_fon(texte: str) -> bytes:
    """Génère un audio fon à partir de texte via MMS-TTS, retourne des bytes WAV."""
    tokenizer = models["tts_tokenizer"]
    model = models["tts_model"]

    inputs = tokenizer(texte, return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        output = model(**inputs).waveform

    buffer = io.BytesIO()
    sf.write(buffer, output.float().cpu().numpy().squeeze(), model.config.sampling_rate, format="WAV")
    return buffer.getvalue()