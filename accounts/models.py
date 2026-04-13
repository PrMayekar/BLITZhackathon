from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar_emoji = models.CharField(max_length=5, default='👤')
    household_size = models.IntegerField(default=2)
    dietary_preferences = models.JSONField(default=list)
    weekly_waste_goal = models.IntegerField(default=0, help_text='Target: 0 items wasted per week')
    total_items_saved = models.IntegerField(default=0)
    total_items_wasted = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_active = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile: {self.user.username}"

    @property
    def waste_reduction_rate(self):
        total = self.total_items_saved + self.total_items_wasted
        if total == 0:
            return 100
        return round((self.total_items_saved / total) * 100, 1)
