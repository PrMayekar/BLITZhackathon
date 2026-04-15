from django.utils import timezone
from datetime import timedelta
from django.conf import settings

def get_today():
    offset = getattr(settings, "TIME_OFFSET_DAYS", 0)
    return (timezone.now() + timedelta(days=offset)).date()