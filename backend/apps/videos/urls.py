from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    UploadVideoView,
    SerieViewSet,
    ThemeViewSet,
    VersetDuJourView,
    VersetViewSet,
    VersetsSidebarView,
    VideoViewSet,
)

router = DefaultRouter()
router.register("themes", ThemeViewSet, basename="theme")
router.register("versets", VersetViewSet, basename="verset")
router.register("versets-sidebar", VersetsSidebarView, basename="versets-sidebar")
router.register("series", SerieViewSet, basename="serie")
router.register("videos", VideoViewSet, basename="video")
router.register("videos-upload", UploadVideoView, basename="video-upload")
router.register("verset-du-jour", VersetDuJourView, basename="verset-du-jour")

urlpatterns = [path("", include(router.urls))]
