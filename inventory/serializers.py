from rest_framework import serializers
from .models import FoodItem, FoodCategory, DailyLog


class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = '__all__'


class FoodItemSerializer(serializers.ModelSerializer):
    days_until_expiry = serializers.ReadOnlyField()
    freshness_status = serializers.ReadOnlyField()
    freshness_score = serializers.ReadOnlyField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)

    class Meta:
        model = FoodItem
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class DailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = '__all__'
        read_only_fields = ['user']
