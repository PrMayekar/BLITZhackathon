from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from .engine import generate_recommendations
from .models import Recipe, RecipeIngredient
from .serializers import RecipeSerializer


class RecommendationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        results = generate_recommendations(request.user)
        return Response(results)


class RecipeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Recipe.objects.prefetch_related('ingredients').all()
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticated]
