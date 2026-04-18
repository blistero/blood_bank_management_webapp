from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# Show SQL queries in the console during development
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "INFO",  # change to DEBUG locally to see SQL queries
        },
    },
}

# Allow all origins in dev (overrides base.py CORS setting)
CORS_ALLOW_ALL_ORIGINS = True
