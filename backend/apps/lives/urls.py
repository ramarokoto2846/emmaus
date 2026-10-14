from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import DirectViewSet

router = DefaultRouter()
router.register("directs", DirectViewSet, basename="direct")
urlpatterns = [path("", include(router.urls))]