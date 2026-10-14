from rest_framework.permissions import SAFE_METHODS, BasePermission


class EstAuteurOuLectureSeule(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        auteur = getattr(obj, "auteur", None) or getattr(obj, "utilisateur", None)
        return auteur == request.user


class EstModerateur(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            "moderateur", "admin"
        )