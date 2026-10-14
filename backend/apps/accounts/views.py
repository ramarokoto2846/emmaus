from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from apps.common.pagination import ParIdPagination, StandardPagination
from apps.notifications.services import creer_notification
from .models import Abonnement, Eglise, Profil
from .serializers import (AbonnementSerializer, EgliseSerializer,
                          InscriptionSerializer, ProfilSerializer,
                          UtilisateurSerializer)

User = get_user_model()


class InscriptionView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = InscriptionSerializer
    permission_classes = [AllowAny]

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
        # Exclure mon propre profil de la liste "Découvrir"
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
            # Déjà suivi → on annule
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

        # Nouvelle création
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
            cible_id=profil.utilisateur_id,
        )

        return Response({
            "est_suivi": True,
            "nb_abonnes": nb_abonnes,
            "action": "ajoute",
        })


class EgliseViewSet(viewsets.ModelViewSet):
    queryset = Eglise.objects.select_related("proprietaire")
    serializer_class = EgliseSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filterset_fields = ["ville", "pays", "verifiee"]
    search_fields = ["nom", "denomination", "ville"]

    def perform_create(self, serializer):
        serializer.save(proprietaire=self.request.user)


class MesAbonnementsView(generics.ListAPIView):
    serializer_class = ProfilSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        ids = Abonnement.objects.filter(
            suiveur=self.request.user
        ).values_list("suivi_id", flat=True)
        return Profil.objects.filter(utilisateur_id__in=ids)


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

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework import status


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
