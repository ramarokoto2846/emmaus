from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Abonnement, Eglise, EgliseMembre, Profil, Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(BaseUserAdmin):
    list_display = ("email", "pseudo", "role", "statut", "cree_le")
    search_fields = ("email", "pseudo")
    ordering = ("-cree_le",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profil", {"fields": ("pseudo", "role", "statut", "langue", "theme_interface")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )


admin.site.register(Profil)
admin.site.register(Eglise)
admin.site.register(EgliseMembre)
admin.site.register(Abonnement)
