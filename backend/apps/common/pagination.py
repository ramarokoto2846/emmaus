from rest_framework.pagination import CursorPagination


class FilPagination(CursorPagination):
    page_size = 20
    ordering = "-cree_le"
    cursor_query_param = "curseur"


class StandardPagination(CursorPagination):
    page_size = 20
    ordering = "-cree_le"
    cursor_query_param = "curseur"


class ParIdPagination(CursorPagination):
    """Pour les modèles dont la PK n'est pas 'id' (ex: Profil → utilisateur_id)."""
    page_size = 20
    ordering = "-utilisateur_id"
    cursor_query_param = "curseur"
