from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.search import RechercheGlobaleView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.videos.urls")),
    path("api/", include("apps.feed.urls")),
    path("api/", include("apps.lives.urls")),
    path("api/", include("apps.devotion.urls")),
    path("api/", include("apps.messaging.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.moderation.urls")),
    path("api/recherche/", RechercheGlobaleView.as_view(), name="recherche"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)