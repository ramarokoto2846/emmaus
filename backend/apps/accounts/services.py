from django.core.mail import send_mail
from django.conf import settings


def envoyer_code_reinitialisation(email, pseudo, code):
    """Envoie le code de réinitialisation par email (vouvoiement + bénédiction)."""
    sujet = "Réinitialisation de votre mot de passe Emmaüs"
    message = f"""Bonjour {pseudo},

Vous avez demandé à réinitialiser votre mot de passe sur Emmaüs.

Voici votre code de vérification :

    {code}

Ce code est valable pendant 15 minutes.

Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité : votre mot de passe restera inchangé.

Que Dieu vous bénisse abondamment,

« L'Éternel te bénisse, et qu'il te garde ! »
— Nombres 6:24

L'équipe Emmaüs
Réseau social vidéo de la foi
"""
    send_mail(
        sujet,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )


def envoyer_code_verification_email(email, pseudo, code):
    """Envoie le code de vérification après inscription."""
    sujet = "Vérifiez votre adresse email — Emmaüs"
    message = f"""Bonjour {pseudo},

Bienvenue sur Emmaüs, le réseau social vidéo de la foi !

Pour activer votre compte, veuillez saisir le code de vérification ci-dessous :

    {code}

Ce code est valable pendant 15 minutes.

Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email.

Que Dieu vous bénisse abondamment,

« L'Éternel te bénisse, et qu'il te garde ! »
— Nombres 6:24

L'équipe Emmaüs
Réseau social vidéo de la foi
"""
    send_mail(
        sujet,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )