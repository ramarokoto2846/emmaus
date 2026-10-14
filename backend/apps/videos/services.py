"""
Compression vidéo avec FFmpeg + génération de miniature.
Toutes les fonctions reçoivent un CHEMIN de fichier sur disque.
"""
import os
import subprocess
import tempfile


def compresser_video(chemin_entree, crf=28, preset="medium"):
    """
    Compresse une vidéo avec FFmpeg (H.264 + AAC).

    Args:
        chemin_entree: chemin absolu vers le fichier vidéo source
        crf: qualité (0-51, plus haut = plus compressé). 28 = bon compromis
        preset: vitesse d'encodage (ultrafast/fast/medium/slow)

    Returns:
        (chemin_sortie, taille_originale, taille_compressee)
    """
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_out:
        chemin_sortie = tmp_out.name

    taille_originale = os.path.getsize(chemin_entree)

    try:
        cmd = [
            "ffmpeg",
            "-i", chemin_entree,
            "-c:v", "libx264",
            "-crf", str(crf),
            "-preset", preset,
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            "-y",
            chemin_sortie,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600,
            stdin=subprocess.DEVNULL,
        )

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {result.stderr[-500:]}")

        taille_compressee = os.path.getsize(chemin_sortie)
        return chemin_sortie, taille_originale, taille_compressee

    except Exception as e:
        if os.path.exists(chemin_sortie):
            os.remove(chemin_sortie)
        raise e


def generer_miniature(chemin_video, seconde=2):
    """Génère une miniature à la seconde indiquée."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        chemin_sortie = tmp.name

    cmd = [
        "ffmpeg",
        "-ss", str(seconde),
        "-i", chemin_video,
        "-vframes", "1",
        "-vf", "scale=640:-2",
        "-y",
        chemin_sortie,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

    if result.returncode != 0 or not os.path.exists(chemin_sortie):
        return None

    return chemin_sortie


def obtenir_duree(chemin_video):
    """Retourne la durée en secondes."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        chemin_video,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return int(float(result.stdout.strip()))
    except Exception:
        return None
