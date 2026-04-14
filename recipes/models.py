from django.db import models
from django.contrib.auth.models import User


class Recipe(models.Model):
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
        ('dessert', 'Dessert'),
        ('any', 'Any Time'),
    ]
    HEALTH_TAG_CHOICES = [
        ('high_protein', 'High Protein'),
        ('low_carb', 'Low Carb'),
        ('vegan', 'Vegan'),
        ('vegetarian', 'Vegetarian'),
        ('heart_healthy', 'Heart Healthy'),
        ('immunity_boost', 'Immunity Boost'),
        ('weight_loss', 'Weight Loss'),
        ('energy_boost', 'Energy Boost'),
    ]

    title = models.CharField(max_length=300)
    description = models.TextField()
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES, default='any')
    prep_time = models.IntegerField(help_text='Minutes', default=15)
    cook_time = models.IntegerField(help_text='Minutes', default=20)
    servings = models.IntegerField(default=2)
    difficulty = models.CharField(max_length=20, default='easy',
                                   choices=[('easy','Easy'),('medium','Medium'),('hard','Hard')])
    health_tags = models.JSONField(default=list)
    is_weekend_special = models.BooleanField(default=False)
    calories_per_serving = models.IntegerField(null=True, blank=True)
    image_emoji = models.CharField(max_length=5, default='🍽️')
    instructions = models.TextField(default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients')
    name = models.CharField(max_length=200)
    quantity = models.CharField(max_length=100)
    is_optional = models.BooleanField(default=False)
    substitutes = models.JSONField(default=list)

    def __str__(self):
        return f"{self.name} for {self.recipe.title}"


class RecipeRecommendation(models.Model):
    CATEGORY_CHOICES = [
        ('optimal', 'Optimal'),
        ('partial', 'Partial'),
        ('low', 'Low'),
    ]
    CONTEXT_CHOICES = [
        ('expiry', 'Use Before Expiry'),
        ('health', 'Health Benefit'),
        ('time_of_day', 'Time of Day'),
        ('weekend', 'Weekend Special'),
        ('general', 'General'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    score = models.FloatField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    context = models.CharField(max_length=20, choices=CONTEXT_CHOICES, default='general')
    matched_ingredients = models.JSONField(default=list)
    missing_ingredients = models.JSONField(default=list)
    expiry_items_used = models.JSONField(default=list)
    waste_reduction_score = models.FloatField(default=0)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score']
