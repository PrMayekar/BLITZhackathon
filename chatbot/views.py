import os, json, requests
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from inventory.models import FoodItem
from django.utils import timezone
from datetime import timedelta
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ── Free Nutrition API (Open Food Facts - No API Key Needed) ─────────────────
OPENFOODFACTS_URL = "https://world.openfoodfacts.org/cgi/search.pl"

SYSTEM_PROMPT = """You are FreshBot 🌿, a friendly food assistant built into the FreshTrack kitchen app.

Your expertise:
- 🥦 Nutrition & health benefits (vitamins, minerals, macros, calories)
- 📅 Shelf life and proper storage for all food types
- 🍳 Cooking tips, techniques, ingredient substitutions
- ♻️ Food waste reduction strategies
- 🛒 Grocery shopping and meal planning advice
- 🌡️ Food safety — spoilage signs, temperature zones, safe handling

Personality: Warm, practical, concise. Sprinkle relevant emojis. Give actionable answers.
When the user's pantry is shown, reference it naturally in your answers when relevant.
Rules:
- Stay focused on food, cooking, nutrition, and kitchen topics
- For off-topic questions gently redirect: "I'm your kitchen assistant — ask me anything food-related!"
- Use **bold** for key terms, keep answers under 200 words unless a full recipe is requested
- For medical/dietary conditions, recommend consulting a professional
- Format ingredient quantities clearly: e.g. `2 tbsp`, `180°C / 350°F`"""


def get_pantry_context(user):
    today = timezone.now().date()
    items = list(FoodItem.objects.filter(user=user, is_consumed=False, is_wasted=False).order_by('expiry_date'))
    if not items:
        return "Pantry is empty."
    lines = [f"Pantry ({len(items)} items):"]
    near = [i for i in items if i.days_until_expiry is not None and 0 <= i.days_until_expiry <= 3]
    fresh = [i for i in items if i.freshness_status == 'fresh']
    expired = [i for i in items if i.freshness_status == 'expired']
    if near:
        lines.append("⚠️ Expiring soon: " + ", ".join(f"{i.name}({i.days_until_expiry}d)" for i in near))
    if fresh:
        lines.append("✅ Fresh: " + ", ".join(i.name for i in fresh[:10]))
    if expired:
        lines.append("❌ Expired: " + ", ".join(i.name for i in expired[:5]))
    return "\n".join(lines)


def call_groq(system, messages, max_tokens=700):
    """Call Groq API for chat responses"""
    api_key = os.environ.get('GROQ_API_KEY', '')
    if not api_key:
        return None, "no_key"
    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system},
                *messages
            ],
            model="llama-3.3-70b-versatile",  # Fast, free, and capable
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return response.choices[0].message.content, "ok"
    except Exception as e:
        return None, str(e)


# ── Chat View ─────────────────────────────────────────────────────────────────
class ChatView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        messages = request.data.get('messages', [])
        include_pantry = request.data.get('include_pantry', True)
        if not messages:
            return Response({'error': 'No messages provided'}, status=400)
        
        clean = [
            {'role': m['role'], 'content': str(m['content'])[:2000]}
            for m in messages[-20:]
            if m.get('role') in ('user', 'assistant') and m.get('content')
        ]
        if not clean:
            return Response({'error': 'Invalid messages'}, status=400)

        system = SYSTEM_PROMPT
        if include_pantry:
            system += f"\n\n--- USER PANTRY ---\n{get_pantry_context(request.user)}\n---"

        reply, status_str = call_groq(system, clean)
        if reply:
            return Response({'reply': reply, 'source': 'ai'})
        
        if status_str == "no_key":
            return Response({
                'error': 'GROQ_API_KEY not configured',
                'message': 'Please add GROQ_API_KEY to your .env file'
            }, status=503)
        
        return Response({'error': f'AI service error: {status_str}'}, status=503)


# ── Receipt Scanner View (Free OCR Alternative) ──────────────────────────────
class ReceiptScanView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image uploaded'}, status=400)

        # Validate size (max 5MB)
        if image_file.size > 5 * 1024 * 1024:
            return Response({'error': 'Image too large. Max 5MB.'}, status=400)

        # For now, return demo items (you can integrate free OCR.space API later)
        # OCR.space offers 500 free requests/day: https://ocr.space/OCRAPI
        return Response({
            'items': [
                {'name': 'Fresh Tomatoes', 'quantity': '500', 'unit': 'grams', 'category_hint': 'Vegetables', 'is_packaged': False},
                {'name': 'Organic Milk', 'quantity': '1', 'unit': 'litres', 'category_hint': 'Dairy', 'is_packaged': True},
                {'name': 'Whole Wheat Bread', 'quantity': '1', 'unit': 'packet', 'category_hint': 'Packaged Food', 'is_packaged': True},
                {'name': 'Free Range Eggs', 'quantity': '12', 'unit': 'pieces', 'category_hint': 'Dairy', 'is_packaged': True},
                {'name': 'Red Onions', 'quantity': '1', 'unit': 'kg', 'category_hint': 'Vegetables', 'is_packaged': False},
                {'name': 'Chicken Breast', 'quantity': '500', 'unit': 'grams', 'category_hint': 'Meat & Poultry', 'is_packaged': True},
                {'name': 'Basmati Rice', 'quantity': '2', 'unit': 'kg', 'category_hint': 'Grains & Cereals', 'is_packaged': True},
                {'name': 'Spinach', 'quantity': '1', 'unit': 'bunch', 'category_hint': 'Vegetables', 'is_packaged': False},
            ],
            'count': 8,
            'source': 'demo',
            'message': 'Upload a receipt image for automatic scanning! (Demo items shown)'
        }, status=200)


# ── Nutrition Tracking View (Free Open Food Facts API) ───────────────────────
class NutritionView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return nutrition stats for current pantry + consumed items."""
        user = request.user
        # Current pantry (active items)
        active = list(FoodItem.objects.filter(user=user, is_consumed=False, is_wasted=False))
        # Consumed in last 7 days
        week_ago = timezone.now().date() - timedelta(days=7)
        consumed = list(FoodItem.objects.filter(user=user, is_consumed=True, consumed_date__gte=week_ago))

        pantry_nutrition = _calc_nutrition_openfoodfacts(active)
        consumed_nutrition = _calc_nutrition_openfoodfacts(consumed)

        # Daily average from consumed
        days = 7
        daily_avg = {k: round(consumed_nutrition[k] / days, 1) for k in consumed_nutrition}

        return Response({
            'pantry_nutrition': pantry_nutrition,
            'consumed_nutrition': consumed_nutrition,
            'daily_average': daily_avg,
            'pantry_breakdown': _nutrition_breakdown_openfoodfacts(active),
            'consumed_breakdown': _nutrition_breakdown_openfoodfacts(consumed),
            'top_nutrients': _top_nutrient_items_openfoodfacts(active),
        })


def _fetch_nutrition_openfoodfacts(food_name):
    """Fetch nutrition data from Open Food Facts (completely free, no API key)"""
    try:
        params = {
            'search_terms': food_name,
            'search_simple': 1,
            'action': 'process',
            'json': 1,
            'page_size': 1,
            'fields': 'product_name,nutriments'
        }
        response = requests.get(OPENFOODFACTS_URL, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('products') and len(data['products']) > 0:
                product = data['products'][0]
                nutriments = product.get('nutriments', {})
                
                return {
                    'calories': nutriments.get('energy-kcal_100g', 0) or nutriments.get('energy-kcal', 0) or 0,
                    'protein': nutriments.get('proteins_100g', 0) or nutriments.get('proteins', 0) or 0,
                    'carbs': nutriments.get('carbohydrates_100g', 0) or nutriments.get('carbohydrates', 0) or 0,
                    'fat': nutriments.get('fat_100g', 0) or nutriments.get('fat', 0) or 0,
                    'fiber': nutriments.get('fiber_100g', 0) or nutriments.get('fiber', 0) or 0,
                }
    except Exception as e:
        print(f"OpenFoodFacts API error for {food_name}: {e}")
    
    # Return default values if API fails
    return {
        'calories': 100,
        'protein': 5,
        'carbs': 15,
        'fat': 3,
        'fiber': 2,
    }


def _calc_nutrition_openfoodfacts(items):
    """Calculate nutrition totals using Open Food Facts API"""
    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0}
    
    # Simple in-memory cache for this request
    cache = {}
    
    for item in items:
        # Check cache first
        if item.name in cache:
            n = cache[item.name]
        else:
            n = _fetch_nutrition_openfoodfacts(item.name)
            cache[item.name] = n
        
        grams = _to_grams(item.quantity_value, item.quantity_unit, item.name)
        factor = grams / 100.0
        
        for k in totals:
            totals[k] += n.get(k, 0) * factor
    
    return {k: round(v, 1) for k, v in totals.items()}


def _nutrition_breakdown_openfoodfacts(items):
    """Get detailed nutrition breakdown for items"""
    rows = []
    cache = {}
    
    for item in items:
        if item.name in cache:
            n = cache[item.name]
        else:
            n = _fetch_nutrition_openfoodfacts(item.name)
            cache[item.name] = n
        
        grams = _to_grams(item.quantity_value, item.quantity_unit, item.name)
        factor = grams / 100.0
        
        rows.append({
            'name': item.name,
            'grams': round(grams),
            'calories': round(n['calories'] * factor, 1),
            'protein': round(n['protein'] * factor, 1),
            'carbs': round(n['carbs'] * factor, 1),
            'fat': round(n['fat'] * factor, 1),
        })
    
    rows.sort(key=lambda x: -x['calories'])
    return rows[:12]


def _top_nutrient_items_openfoodfacts(items):
    """Find items high in specific nutrients"""
    protein_items, carb_items, cal_items = [], [], []
    cache = {}
    
    for item in items:
        if item.name in cache:
            n = cache[item.name]
        else:
            n = _fetch_nutrition_openfoodfacts(item.name)
            cache[item.name] = n
        
        protein_items.append((item.name, n['protein']))
        carb_items.append((item.name, n['carbs']))
        cal_items.append((item.name, n['calories']))
    
    return {
        'high_protein': sorted(protein_items, key=lambda x: -x[1])[:3],
        'high_carb': sorted(carb_items, key=lambda x: -x[1])[:3],
        'high_calorie': sorted(cal_items, key=lambda x: -x[1])[:3],
    }


def _to_grams(value, unit, name=''):
    """Convert various units to grams for consistent nutrition calculation"""
    unit = (unit or '').lower()
    try:
        value = float(value or 1)
    except (ValueError, TypeError):
        value = 1
    
    conversions = {
        'kg': 1000, 'kilo': 1000,
        'grams': 1, 'gram': 1, 'g': 1,
        'ml': 1, 'milliliter': 1, 'millilitre': 1,
        'litres': 1000, 'liters': 1000, 'l': 1000,
        'cups': 240, 'cup': 240,
        'pieces': 100, 'piece': 100, 'pc': 100,
        'packets': 200, 'packet': 200, 'pack': 200,
        'bunch': 150, 'bunches': 150,
        'tbsp': 15, 'tablespoon': 15,
        'tsp': 5, 'teaspoon': 5,
        'dozen': 1200, 'dozens': 1200,
    }
    
    # Special handling for eggs
    if 'egg' in name.lower() and unit in ['pieces', 'piece', 'pc', '']:
        return value * 50
    
    # Special handling for bananas
    if 'banana' in name.lower() and unit in ['pieces', 'piece', 'pc', '']:
        return value * 118
    
    return value * conversions.get(unit, 100)


# ── Quick Suggestions View ────────────────────────────────────────────────────
class QuickSuggestionsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        items = FoodItem.objects.filter(user=request.user, is_consumed=False, is_wasted=False)
        near = items.filter(expiry_date__lte=today + timedelta(days=3), expiry_date__isnull=False, expiry_date__gte=today)
        
        suggestions = [
            "What are the health benefits of spinach?",
            "How long does chicken last in the fridge?",
            "Tips to reduce food waste at home?",
            "How do I store vegetables properly?",
            "What foods are high in protein?",
        ]
        
        if near.exists():
            first = near.first()
            suggestions[0] = f"How can I use {first.name} before it expires?"
            suggestions[1] = f"What's the shelf life of {first.name}?"
        
        if items.exists():
            names = list(items.values_list('name', flat=True)[:2])
            if len(names) >= 2:
                suggestions[2] = f"What can I cook with {names[0]} and {names[1]}?"
        
        return Response({'suggestions': suggestions})