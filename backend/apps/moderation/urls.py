from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BlocageViewSet,
    ModerationViewSet,
    RechercheRecenteViewSet,
    SignalementViewSet,
)

router = DefaultRouter()
router.register("signalements", SignalementViewSet, basename="signalement")
router.register("blocages", BlocageViewSet, basename="blocage")
router.register("recherches", RechercheRecenteViewSet, basename="recherche")
router.register("moderation", ModerationViewSet, basename="moderation")

urlpatterns = [path("", include(router.urls))]
