import os
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

router = APIRouter(prefix="/audio", tags=["audio"])


@router.get("/{chemin:path}")
async def get_audio_file(chemin: str):
    """Serve a stored audio file (incoming or outgoing)."""
    chemin_complet = os.path.join("storage/audio", chemin)

    # Empêche de sortir du dossier storage/audio via des chemins type "../../"
    chemin_normalise = os.path.normpath(chemin_complet)
    if not chemin_normalise.startswith(os.path.normpath("storage/audio")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chemin invalide")

    if not os.path.exists(chemin_normalise):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable")

    return FileResponse(chemin_normalise, media_type="audio/wav")