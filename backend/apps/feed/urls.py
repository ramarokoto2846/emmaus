from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (CommentaireViewSet, EnregistrementViewSet, FilView,
                    PartageViewSet, PublicationViewSet)

router = DefaultRouter()
router.register("fil", FilView, basename="fil")
router.register("publications", PublicationViewSet, basename="publication")
router.register("commentaires", CommentaireViewSet, basename="commentaire")
router.register("enregistrements", EnregistrementViewSet, basename="enregistrement")
router.register("partages", PartageViewSet, basename="partage")

urlpatterns = [path("", include(router.urls))]