import soundfile as sf
import torch
from ai_models import models, load_all_models

load_all_models()  # nécessaire, sinon models reste vide

chemin_test = "/home/dchm/DialogIA_pipeline/data/fongbe_speech_dataset/Fongbe_Speech_Dataset/fongbe_speech_audio_files/wav/66_fongbe_3c3a6f2b4b7646078bd75ee8b69c0550_for_validation_2022-03-14-13-39-51.wav"

audio_array, sr = sf.read(chemin_test)
print(f"Sample rate : {sr}, durée : {len(audio_array)/sr:.2f}s, shape : {audio_array.shape}")

inputs = models["lid_processor"](audio_array, sampling_rate=sr, return_tensors="pt")
with torch.no_grad():
    logits = models["lid_model"](**inputs).logits

probs = torch.softmax(logits, dim=-1)
top5 = torch.topk(probs, 5)

for score, idx in zip(top5.values[0], top5.indices[0]):
    label = models["lid_model"].config.id2label[idx.item()]
    print(f"  {label} : {score.item():.4f}")
