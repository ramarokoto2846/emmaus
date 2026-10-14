from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]

# En dev, on autorise explicitement toutes les origines locales
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Cookies adaptés au dev (HTTP, pas HTTPS)
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"

# Voir les erreurs CSRF/CORS dans le terminal
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "django.security.csrf": {"handlers": ["console"], "level": "DEBUG"},
        "corsheaders": {"handlers": ["console"], "level": "DEBUG"},
    },
}