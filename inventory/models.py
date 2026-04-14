from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class FoodCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='🥗')
    color = models.CharField(max_length=20, default='#4CAF50')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Food Categories'


class FoodItem(models.Model):
    QUANTITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    FRESHNESS_CHOICES = [
        ('fresh', 'Fresh'),
        ('near_expiry', 'Near Expiry'),
        ('expired', 'Expired'),
    ]
    STORAGE_CHOICES = [
        ('fridge', 'Refrigerator'),
        ('freezer', 'Freezer'),
        ('pantry', 'Pantry'),
        ('counter', 'Counter'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='food_items')
    name = models.CharField(max_length=200)
    category = models.ForeignKey(FoodCategory, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.CharField(max_length=10, choices=QUANTITY_CHOICES, default='medium')
    quantity_value = models.FloatField(default=1.0)
    quantity_unit = models.CharField(max_length=50, default='pieces')
    purchase_date = models.DateField(default=timezone.now)
    expiry_date = models.DateField(null=True, blank=True)
    is_packaged = models.BooleanField(default=False)
    storage_location = models.CharField(max_length=20, choices=STORAGE_CHOICES, default='fridge')
    notes = models.TextField(blank=True)
    is_consumed = models.BooleanField(default=False)
    consumed_date = models.DateField(null=True, blank=True)
    is_wasted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"

    @property
    def days_until_expiry(self):
        if self.expiry_date:
            return (self.expiry_date - timezone.now().date()).days
        return None

    @property
    def freshness_status(self):
        days = self.days_until_expiry
        if days is None:
            return 'fresh'
        if days < 0:
            return 'expired'
        if days <= 3:
            return 'near_expiry'
        return 'fresh'

    @property
    def freshness_score(self):
        """Score 0-1: 1=very fresh, 0=expired"""
        days = self.days_until_expiry
        if days is None:
            return 0.8
        if days < 0:
            return 0.0
        if days <= 3:
            return 0.3 + (days / 3) * 0.2
        if days <= 7:
            return 0.5 + (days / 7) * 0.3
        return min(1.0, 0.8 + (days / 30) * 0.2)

    class Meta:
        ordering = ['expiry_date', 'name']


class DailyLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    items_checked = models.ManyToManyField(FoodItem, blank=True)
    notes = models.TextField(blank=True)
    waste_prevented = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']
