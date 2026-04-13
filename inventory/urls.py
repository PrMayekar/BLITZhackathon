from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FoodItemViewSet, FoodCategoryViewSet

router = DefaultRouter()
router.register('items', FoodItemViewSet, basename='fooditem')
router.register('categories', FoodCategoryViewSet, basename='foodcategory')

urlpatterns = [path('', include(router.urls))]
