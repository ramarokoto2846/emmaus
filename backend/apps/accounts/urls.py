from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

from .views import (
    AbonnementsDeView,
    AbonnesDeView,
    EgliseViewSet,
    InscriptionView,
    MesAbonnesView,
    MesAbonnementsView,
    MoiView,
    MonProfilView,
    ProfilViewSet,
    UploadAvatarView,
    UploadCouvertureView,
    DemanderReinitialisationView,
    VerifierCodeView,
    ReinitialiserMotDePasseView,
    VerifierEmailView,
    RenvoyerCodeVerificationView,
)

router = DefaultRouter()
router.register("profils", ProfilViewSet, basename="profil")
router.register("eglises", EgliseViewSet, basename="eglise")

urlpatterns = [
    # ----- Auth -----
    path("auth/inscription/", InscriptionView.as_view()),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("auth/logout/", TokenBlacklistView.as_view()),
    path("auth/moi/", MoiView.as_view()),
    path("auth/mon-profil/", MonProfilView.as_view()),
    path("auth/mon-profil/avatar/", UploadAvatarView.as_view()),
    path("auth/mon-profil/couverture/", UploadCouvertureView.as_view()),
    path("auth/mes-abonnements/", MesAbonnementsView.as_view()),
    path("auth/mes-abonnes/", MesAbonnesView.as_view()),

    # ✅ Mot de passe oublié — préfixées par "auth/"
    path("auth/mot-de-passe-oublie/", DemanderReinitialisationView.as_view()),
    path("auth/verifier-code/", VerifierCodeView.as_view()),
    path("auth/reinitialiser-mot-de-passe/", ReinitialiserMotDePasseView.as_view()),

    # ----- Abonnements -----
    path("profils/<uuid:user_id>/abonnes/", AbonnesDeView.as_view()),
    path("profils/<uuid:user_id>/abonnements/", AbonnementsDeView.as_view()),

    path("auth/verifier-email/", VerifierEmailView.as_view()),
    path("auth/renvoyer-code-verification/", RenvoyerCodeVerificationView.as_view()),

    # ----- Router -----
    path("", include(router.urls)),
]