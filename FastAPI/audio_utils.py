import os
import subprocess


def convertir_audio_16khz_mono(fichier_bytes: bytes) -> bytes:
    """Convertit n'importe quel format audio (via ffmpeg) vers WAV 16kHz mono."""
    processus = subprocess.run(
        ["ffmpeg", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "wav", "pipe:1"],
        input=fichier_bytes,
        capture_output=True,
    )
    if processus.returncode != 0:
        raise ValueError(f"Erreur ffmpeg : {processus.stderr.decode()}")
    return processus.stdout


def sauvegarder_audio(contenu: bytes, conversation_id: str, message_id: str,
                       sous_dossier: str, suffixe: str, extension: str) -> str:
    dossier = f"storage/audio/{sous_dossier}/{conversation_id}"
    os.makedirs(dossier, exist_ok=True)
    chemin = f"{dossier}/{message_id}_{suffixe}.{extension}"
    with open(chemin, "wb") as f:
        f.write(contenu)
    return chemin