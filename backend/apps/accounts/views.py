from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from apps.common.pagination import ParIdPagination, StandardPagination
from apps.notifications.services import creer_notification
from .models import Abonnement, Eglise, Profil
from .serializers import (AbonnementSerializer, EgliseSerializer,
                          InscriptionSerializer, ProfilSerializer,
                          UtilisateurSerializer)

User = get_user_model()


# ============================================================
# AUTHENTIFICATION
# ============================================================
class InscriptionView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = InscriptionSerializer
    permission_classes = [AllowAny]
    authentication_classes = []          # ✅ AJOUT : pas de CSRF

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(
            UtilisateurSerializer(user).data,
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
        qs = (
            Profil.objects
            .select_related("utilisateur", "eglise")
            .filter(visibilite="public")
        )
        if self.request.user.is_authenticated:
            qs = qs.exclude(utilisateur=self.request.user)
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