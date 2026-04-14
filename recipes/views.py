from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, status
from .engine import generate_recommendations, score_external_recipes
from .models import Recipe, RecipeIngredient
from .serializers import RecipeSerializer


class RecommendationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        results = generate_recommendations(request.user)
        return Response(results)


class ExternalRecipeScoringView(APIView):
    """
    Accepts MealDB recipes fetched on the frontend, scores them
    against the user's pantry, and returns ranked results.
    POST body: { "meals": [ ...mealdb_meal_objects... ] }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        meals = request.data.get('meals', [])
        if not meals:
            return Response({'error': 'No meals provided'}, status=status.HTTP_400_BAD_REQUEST)
        results = score_external_recipes(request.user, meals)
        return Response(results)


class RecipeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Recipe.objects.prefetch_related('ingredients').all()
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]
