from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import DefiLectureViewSet, SujetPriereViewSet

router = DefaultRouter()
router.register("sujets-priere", SujetPriereViewSet, basename="sujet-priere")
router.register("defis-lecture", DefiLectureViewSet, basename="defi-lecture")
urlpatterns = [path("", include(router.urls))]