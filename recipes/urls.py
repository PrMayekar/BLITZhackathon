from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecommendationsView, RecipeViewSet

router = DefaultRouter()
router.register('all', RecipeViewSet, basename='recipe')

urlpatterns = [
    path('recommendations/', RecommendationsView.as_view(), name='recommendations'),
    path('', include(router.urls)),
]
