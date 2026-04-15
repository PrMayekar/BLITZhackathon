from django.urls import path
from .views import ChatView, ReceiptScanView, NutritionView, QuickSuggestionsView

urlpatterns = [
    path('chat/',        ChatView.as_view(),             name='chat'),
    path('scan/',        ReceiptScanView.as_view(),       name='receipt-scan'),
    path('nutrition/',   NutritionView.as_view(),         name='nutrition'),
    path('suggestions/', QuickSuggestionsView.as_view(),  name='suggestions'),
]
