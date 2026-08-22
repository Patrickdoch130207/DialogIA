import torch
from transformers import (
    AutoModelForSeq2SeqLM, AutoTokenizer,
    Wav2Vec2ForCTC, Wav2Vec2Processor,
    VitsModel,Wav2Vec2ForSequenceClassification,AutoFeatureExtractor
)
from peft import PeftModel

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

models = {}


def load_all_models():
    """Charge les 3 modèles IA une seule fois, au démarrage de l'application."""

    # --- NLLB (traduction fon <-> français) ---
    nllb_path = "./models/nllb_fon_fr_lora_final"
    tokenizer_nllb = AutoTokenizer.from_pretrained(nllb_path)

    base_nllb = AutoModelForSeq2SeqLM.from_pretrained(
        "facebook/nllb-200-distilled-600M", torch_dtype=DTYPE
    )
    base_nllb.resize_token_embeddings(len(tokenizer_nllb))
    model_nllb = PeftModel.from_pretrained(base_nllb, nllb_path)
    model_nllb = model_nllb.to(DEVICE)
    model_nllb.eval()

    models["nllb_tokenizer"] = tokenizer_nllb
    models["nllb_model"] = model_nllb

    # --- MMS-ASR (transcription fon) ---
    asr_path = "./models/mms_asr_fon_final"
    models["asr_processor"] = Wav2Vec2Processor.from_pretrained(asr_path)
    model_asr = Wav2Vec2ForCTC.from_pretrained(asr_path, torch_dtype=DTYPE)
    model_asr = model_asr.to(DEVICE)
    model_asr.eval()
    models["asr_model"] = model_asr

    # --- MMS-TTS (synthèse vocale fon, sans fine-tuning) ---
    models["tts_tokenizer"] = AutoTokenizer.from_pretrained("facebook/mms-tts-fon")
    model_tts = VitsModel.from_pretrained("facebook/mms-tts-fon", torch_dtype=DTYPE)
    model_tts = model_tts.to(DEVICE)
    model_tts.eval()
    models["tts_model"] = model_tts

    print(f"Modèles IA chargés sur {DEVICE} en {DTYPE} : NLLB, MMS-ASR, MMS-TTS")
    


def unload_all_models():
    models.clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    print("Modèles IA déchargés.")