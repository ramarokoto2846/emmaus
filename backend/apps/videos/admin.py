from django.contrib import admin
from .models import Serie, Theme, Verset, VersetDuJour, Video, VideoTheme, VideoVerset, VueVideo

admin.site.register([Serie, Theme, Verset, VersetDuJour, Video, VideoTheme, VideoVerset, VueVideo])