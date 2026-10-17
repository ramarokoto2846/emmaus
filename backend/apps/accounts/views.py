from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import CodeVerificationEmail
from .services import envoyer_code_verification_email

from apps.common.pagination import ParIdPagination, StandardPagination
from apps.notifications.services import creer_notification
from .models import Abonnement, Eglise, Profil
from .serializers import (AbonnementSerializer, EgliseSerializer,
                          InscriptionSerializer, ProfilSerializer,
                          UtilisateurSerializer)

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError

from .models import CodeReinitialisation
from .services import envoyer_code_reinitialisation

User = get_user_model()


# ============================================================
# AUTHENTIFICATION
# ============================================================
class InscriptionView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = InscriptionSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()

        # ✅ Désactiver le compte jusqu'à vérification
        user.email_verifie = False
        user.is_active = False
        user.save(update_fields=["email_verifie", "is_active"])

        # ✅ Générer et envoyer le code
        code_obj = CodeVerificationEmail.generer_pour(user)
        try:
            envoyer_code_verification_email(
                user.email, user.pseudo, code_obj.code
            )
        except Exception as e:
            # Si l'email ne peut pas être envoyé, on supprime le compte
            user.delete()
            return Response(
                {
                    "detail": (
                        "Impossible d'envoyer l'email de vérification. "
                        "Vérifiez que votre adresse email est valide."
                    )
                },
                status=400,
            )

        return Response(
            {
                "detail": (
                    "Un code de vérification a été envoyé à votre adresse email. "
                    "Saisissez-le pour activer votre compte."
                ),
                "email": user.email,
                "pseudo": user.pseudo,
            },
            status=status.HTTP_201_CREATED,
        )


class MoiView(generics.RetrieveUpdateAPIView):
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class MonProfilView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfilSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.profil


# ============================================================
# PROFILS
# ============================================================
class ProfilViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProfilSerializer
    pagination_class = None
    filterset_fields = ["ville", "pays", "utilisateur__role"]
    search_fields = ["nom_affiche", "sous_titre", "bio", "ville"]
    ordering_fields = ["nb_abonnes", "nb_videos", "nom_affiche"]

    def get_queryset(self):
        """
        - Liste (Découvrir) : profils publics, SANS le mien
        - Détail (retrieve) : profils publics + le mien (même privé)
        """
        user = self.request.user
        qs = Profil.objects.select_related("utilisateur", "eglise")

        if user.is_authenticated:
            qs = qs.filter(
                models.Q(visibilite="public") | models.Q(utilisateur=user)
            )
        else:
            qs = qs.filter(visibilite="public")

        if self.action == "list" and user.is_authenticated:
            qs = qs.exclude(utilisateur=user)

        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def suivre(self, request, pk=None):
        """Toggle : si l'utilisateur suit déjà, on supprime ; sinon on ajoute."""
        profil = get_object_or_404(Profil, utilisateur_id=pk)
        if profil.utilisateur == request.user:
            return Response(
                {"detail": "Impossible de se suivre soi-même."}, status=400
            )

        obj, created = Abonnement.objects.get_or_create(
            suiveur=request.user, suivi=profil.utilisateur
        )

        if not created:
            obj.delete()
            nb_abonnes = Abonnement.objects.filter(suivi=profil.utilisateur).count()
            nb_abonnements = Abonnement.objects.filter(suiveur=request.user).count()
            Profil.objects.filter(utilisateur=profil.utilisateur).update(
                nb_abonnes=nb_abonnes
            )
            Profil.objects.filter(utilisateur=request.user).update(
                nb_abonnements=nb_abonnements
            )
            return Response({
                "est_suivi": False,
                "nb_abonnes": nb_abonnes,
                "action": "retire",
            })

        nb_abonnes = Abonnement.objects.filter(suivi=profil.utilisateur).count()
        nb_abonnements = Abonnement.objects.filter(suiveur=request.user).count()
        Profil.objects.filter(utilisateur=profil.utilisateur).update(
            nb_abonnes=nb_abonnes
        )
        Profil.objects.filter(utilisateur=request.user).update(
            nb_abonnements=nb_abonnements
        )

        creer_notification(
            destinataire=profil.utilisateur,
            acteur=request.user,
            type="abonne",
            cible_type="profil",
            cible_id=request.user.id,
        )

        return Response({
            "est_suivi": True,
            "nb_abonnes": nb_abonnes,
            "action": "ajoute",
        })

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def promouvoir_moderateur(self, request, pk=None):
        if request.user.role != "admin" and not request.user.is_superuser:
            return Response(
                {"detail": "Seul un administrateur peut promouvoir un modérateur."},
                status=403,
            )

        profil = get_object_or_404(Profil, utilisateur_id=pk)
        utilisateur = profil.utilisateur

        if utilisateur == request.user:
            return Response(
                {"detail": "Vous ne pouvez pas vous promouvoir vous-même."},
                status=400,
            )
        if utilisateur.role == "moderateur":
            return Response(
                {"detail": "Cet utilisateur est déjà modérateur."},
                status=400,
            )
        if utilisateur.role == "admin" or utilisateur.is_superuser:
            return Response(
                {"detail": "Cet utilisateur est administrateur."},
                status=400,
            )

        utilisateur.role = "moderateur"
        utilisateur.save(update_fields=["role"])

        creer_notification(
            destinataire=utilisateur,
            acteur=request.user,
            type="promotion_moderateur",
            cible_type="profil",
            cible_id=utilisateur.id,
        )

        return Response({
            "role": utilisateur.role,
            "detail": f"{utilisateur.pseudo} est maintenant modérateur.",
        })

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def retrograder_moderateur(self, request, pk=None):
        if request.user.role != "admin" and not request.user.is_superuser:
            return Response(
                {"detail": "Seul un administrateur peut rétrograder."},
                status=403,
            )

        profil = get_object_or_404(Profil, utilisateur_id=pk)
        utilisateur = profil.utilisateur

        if utilisateur == request.user:
            return Response(
                {"detail": "Vous ne pouvez pas vous rétrograder."},
                status=400,
            )
        if utilisateur.role != "moderateur":
            return Response(
                {"detail": "Cet utilisateur n'est pas modérateur."},
                status=400,
            )

        utilisateur.role = "membre"
        utilisateur.save(update_fields=["role"])

        creer_notification(
            destinataire=utilisateur,
            acteur=request.user,
            type="retrogradation",
            cible_type="profil",
            cible_id=utilisateur.id,
        )

        return Response({
            "role": utilisateur.role,
            "detail": f"{utilisateur.pseudo} n'est plus modérateur.",
        })

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def moderateurs(self, request):
        if request.user.role != "admin" and not request.user.is_superuser:
            return Response({"detail": "Non autorisé."}, status=403)

        moderateurs = User.objects.filter(
            role="moderateur"
        ).select_related("profil").order_by("profil__nom_affiche")

        data = [
            {
                "id": str(u.id),
                "pseudo": u.pseudo,
                "email": u.email,
                "nom_affiche": u.profil.nom_affiche,
                "initiales": u.profil.initiales,
                "niveau_moderateur": u.niveau_moderateur,
                "nb_signalements_traites": u.nb_signalements_traites,  # ✅ Renommé
                "avatar": (
                    request.build_absolute_uri(u.profil.avatar.url)
                    if u.profil.avatar
                    else None
                ),
                "cree_le": u.cree_le,
            }
            for u in moderateurs
        ]
        return Response(data)


# ============================================================
# ÉGLISES
# ============================================================
class EgliseViewSet(viewsets.ModelViewSet):
    queryset = Eglise.objects.select_related("proprietaire")
    serializer_class = EgliseSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filterset_fields = ["ville", "pays", "verifiee"]
    search_fields = ["nom", "denomination", "ville"]

    def perform_create(self, serializer):
        serializer.save(proprietaire=self.request.user)


# ============================================================
# ABONNEMENTS
# ============================================================
class MesAbonnementsView(generics.ListAPIView):
    serializer_class = ProfilSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        ids = Abonnement.objects.filter(
            suiveur=self.request.user
        ).values_list("suivi_id", flat=True)
        return Profil.objects.filter(utilisateur_id__in=ids)


class MesAbonnesView(generics.ListAPIView):
    """Liste des gens qui me suivent."""
    serializer_class = ProfilSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        ids = Abonnement.objects.filter(
            suivi=self.request.user
        ).values_list("suiveur_id", flat=True)
        return Profil.objects.filter(utilisateur_id__in=ids)


class AbonnesDeView(generics.ListAPIView):
    """Liste des abonnés d'un utilisateur donné."""
    serializer_class = ProfilSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        user_id = self.kwargs["user_id"]
        ids = Abonnement.objects.filter(
            suivi_id=user_id
        ).values_list("suiveur_id", flat=True)
        return Profil.objects.filter(utilisateur_id__in=ids)


class AbonnementsDeView(generics.ListAPIView):
    """Liste des abonnements d'un utilisateur donné."""
    serializer_class = ProfilSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        user_id = self.kwargs["user_id"]
        ids = Abonnement.objects.filter(
            suiveur_id=user_id
        ).values_list("suivi_id", flat=True)
        return Profil.objects.filter(utilisateur_id__in=ids)


# ============================================================
# UPLOADS
# ============================================================
class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        fichier = request.FILES.get("avatar")
        if not fichier:
            return Response({"detail": "Aucun fichier fourni."}, status=400)
        if fichier.size > 5 * 1024 * 1024:
            return Response({"detail": "Fichier trop gros (max 5 Mo)."}, status=400)
        if not fichier.content_type.startswith("image/"):
            return Response({"detail": "Format non supporté."}, status=400)

        profil = request.user.profil
        profil.avatar = fichier
        profil.save(update_fields=["avatar"])
        return Response(ProfilSerializer(profil, context={"request": request}).data)


class UploadCouvertureView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        fichier = request.FILES.get("couverture")
        if not fichier:
            return Response({"detail": "Aucun fichier fourni."}, status=400)
        if fichier.size > 10 * 1024 * 1024:
            return Response({"detail": "Fichier trop gros (max 10 Mo)."}, status=400)
        if not fichier.content_type.startswith("image/"):
            return Response({"detail": "Format non supporté."}, status=400)

        profil = request.user.profil
        profil.couverture = fichier
        profil.save(update_fields=["couverture"])
        return Response(ProfilSerializer(profil, context={"request": request}).data)


class DemanderReinitialisationView(APIView):
    """POST /api/auth/mot-de-passe-oublie/
    Envoie un code à 6 chiffres par email."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "Email requis."}, status=400)

        # ✅ Anti-énumération : toujours renvoyer 200
        try:
            utilisateur = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Si cet email existe, un code a été envoyé."})

        code_obj = CodeReinitialisation.generer_pour(utilisateur)
        try:
            envoyer_code_reinitialisation(
                utilisateur.email, utilisateur.pseudo, code_obj.code
            )
        except Exception as e:
            return Response(
                {"detail": f"Erreur d'envoi d'email : {str(e)}"},
                status=500,
            )

        return Response({"detail": "Si cet email existe, un code a été envoyé."})


class VerifierCodeView(APIView):
    """POST /api/auth/verifier-code/
    Vérifie le code (optionnel : le frontend peut le faire avant l'étape finale)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "").strip()

        if not email or not code:
            return Response({"detail": "Email et code requis."}, status=400)

        try:
            utilisateur = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Code invalide."}, status=400)

        code_obj = CodeReinitialisation.objects.filter(
            utilisateur=utilisateur, code=code, utilise=False
        ).first()

        if not code_obj or not code_obj.est_valide():
            return Response({"detail": "Code invalide ou expiré."}, status=400)

        return Response({"valide": True})


class ReinitialiserMotDePasseView(APIView):
    """POST /api/auth/reinitialiser-mot-de-passe/
    Change le mot de passe avec le code reçu."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "").strip()
        nouveau_mdp = request.data.get("nouveau_mot_de_passe", "")

        if not email or not code or not nouveau_mdp:
            return Response(
                {"detail": "Email, code et nouveau mot de passe requis."},
                status=400,
            )

        try:
            utilisateur = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Code invalide."}, status=400)

        code_obj = CodeReinitialisation.objects.filter(
            utilisateur=utilisateur, code=code, utilise=False
        ).first()

        if not code_obj or not code_obj.est_valide():
            return Response({"detail": "Code invalide ou expiré."}, status=400)

        # Valider le mot de passe
        try:
            password_validation.validate_password(nouveau_mdp, utilisateur)
        except ValidationError as e:
            return Response({"detail": list(e.messages)}, status=400)

        utilisateur.set_password(nouveau_mdp)
        utilisateur.save(update_fields=["password"])

        code_obj.utilise = True
        code_obj.save(update_fields=["utilise"])

        return Response({"detail": "Mot de passe réinitialisé avec succès."})


class VerifierEmailView(APIView):
    """POST /api/auth/verifier-email/"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        code = request.data.get("code", "").strip()

        if not email or not code:
            return Response({"detail": "Email et code requis."}, status=400)

        try:
            utilisateur = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Code invalide."}, status=400)

        if utilisateur.email_verifie:
            return Response({"detail": "Cet email est déjà vérifié."}, status=400)

        code_obj = CodeVerificationEmail.objects.filter(
            utilisateur=utilisateur, code=code, utilise=False
        ).first()

        if not code_obj or not code_obj.est_valide():
            return Response({"detail": "Code invalide ou expiré."}, status=400)

        # ✅ Activer le compte
        utilisateur.email_verifie = True
        utilisateur.is_active = True
        utilisateur.save(update_fields=["email_verifie", "is_active"])

        code_obj.utilise = True
        code_obj.save(update_fields=["utilise"])

        return Response(
            {"detail": "Email vérifié avec succès. Vous pouvez vous connecter."}
        )


class RenvoyerCodeVerificationView(APIView):
    """POST /api/auth/renvoyer-code-verification/"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "Email requis."}, status=400)

        try:
            utilisateur = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Anti-énumération : toujours 200
            return Response(
                {"detail": "Si cet email existe, un nouveau code a été envoyé."}
            )

        if utilisateur.email_verifie:
            return Response(
                {"detail": "Cet email est déjà vérifié. Connectez-vous."},
                status=400,
            )

        code_obj = CodeVerificationEmail.generer_pour(utilisateur)
        try:
            envoyer_code_verification_email(
                utilisateur.email, utilisateur.pseudo, code_obj.code
            )
        except Exception as e:
            return Response(
                {"detail": f"Erreur d'envoi d'email : {str(e)}"}, status=500
            )

        return Response(
            {"detail": "Si cet email existe, un nouveau code a été envoyé."}
        )