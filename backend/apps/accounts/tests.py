import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Utilisateur


@pytest.mark.django_db
def test_inscription_cree_profil():
    client = APIClient()
    r = client.post(reverse("inscription"), {
        "email": "test@emmaus.mg",
        "pseudo": "testeur",
        "mot_de_passe": "MotDePasse!2026",
    })
    assert r.status_code == 201
    user = Utilisateur.objects.get(email="test@emmaus.mg")
    assert user.profil.nom_affiche == "testeur"