"""
FreshTrack Recipe Recommendation Engine
Scores and classifies recipes based on ingredient availability, freshness, and context.
"""
from datetime import datetime
from django.utils import timezone


def normalize(name: str) -> str:
    return name.lower().strip()


def ingredient_match(user_ingredient_name: str, recipe_ingredient_name: str) -> bool:
    u = normalize(user_ingredient_name)
    r = normalize(recipe_ingredient_name)
    if u == r:
        return True
    if u in r or r in u:
        return True
    # Basic synonym map
    synonyms = {
        'tomato': ['tomatoes', 'cherry tomato'],
        'onion': ['onions', 'red onion', 'white onion'],
        'garlic': ['garlic cloves', 'garlic paste'],
        'potato': ['potatoes', 'aloo'],
        'chicken': ['chicken breast', 'chicken pieces', 'chicken thigh'],
        'egg': ['eggs', 'egg whites'],
        'milk': ['whole milk', 'dairy milk'],
        'cheese': ['cheddar', 'paneer', 'mozzarella'],
        'spinach': ['palak', 'baby spinach'],
        'rice': ['basmati rice', 'white rice', 'cooked rice'],
        'flour': ['all-purpose flour', 'maida', 'wheat flour'],
        'oil': ['vegetable oil', 'cooking oil', 'olive oil', 'sunflower oil'],
        'butter': ['unsalted butter', 'salted butter'],
        'lemon': ['lemon juice', 'lime'],
        'ginger': ['ginger paste', 'adrak'],
        'coriander': ['cilantro', 'dhania'],
    }
    for key, alts in synonyms.items():
        all_names = [key] + alts
        if u in all_names and r in all_names:
            return True
    return False


def compute_recipe_score(user_items, recipe) -> dict:
    """
    Score a recipe against user's pantry.
    Returns score, classification, matched/missing ingredients, waste metrics.
    """
    recipe_ingredients = list(recipe.ingredients.all())
    if not recipe_ingredients:
        return None

    required = [ri for ri in recipe_ingredients if not ri.is_optional]
    optional = [ri for ri in recipe_ingredients if ri.is_optional]

    matched_required = []
    missing_required = []
    matched_optional = []
    expiry_items_used = []
    freshness_bonus = 0.0
    near_expiry_count = 0

    user_items_list = list(user_items)

    for ri in required:
        match = None
        for ui in user_items_list:
            if ingredient_match(ui.name, ri.name):
                match = ui
                break
        if match:
            matched_required.append({
                'name': ri.name,
                'user_item': match.name,
                'freshness': match.freshness_status,
                'days_left': match.days_until_expiry,
            })
            if match.freshness_status == 'near_expiry':
                near_expiry_count += 1
                expiry_items_used.append(match.name)
                freshness_bonus += 0.15
            elif match.freshness_status == 'expired':
                freshness_bonus -= 0.1
        else:
            # Check substitutes
            sub_found = False
            for sub in ri.substitutes:
                for ui in user_items_list:
                    if ingredient_match(ui.name, sub):
                        matched_required.append({
                            'name': ri.name,
                            'user_item': f"{ui.name} (substitute)",
                            'freshness': ui.freshness_status,
                            'days_left': ui.days_until_expiry,
                        })
                        sub_found = True
                        break
                if sub_found:
                    break
            if not sub_found:
                missing_required.append(ri.name)

    for ri in optional:
        for ui in user_items_list:
            if ingredient_match(ui.name, ri.name):
                matched_optional.append(ri.name)
                if ui.freshness_status == 'near_expiry':
                    freshness_bonus += 0.05
                break

    if not required:
        base_score = 0.5
    else:
        base_score = len(matched_required) / len(required)

    optional_bonus = (len(matched_optional) / max(len(optional), 1)) * 0.1 if optional else 0
    waste_reduction_score = min(1.0, near_expiry_count * 0.3)
    final_score = min(1.0, base_score + freshness_bonus + optional_bonus)

    # Classification
    if final_score >= 0.8 and len(missing_required) == 0:
        category = 'optimal'
    elif final_score >= 0.5 or len(missing_required) <= 2:
        category = 'partial'
    else:
        category = 'low'

    return {
        'score': round(final_score, 3),
        'category': category,
        'matched_ingredients': matched_required + [{'name': n, 'optional': True} for n in matched_optional],
        'missing_ingredients': missing_required,
        'expiry_items_used': expiry_items_used,
        'waste_reduction_score': round(waste_reduction_score, 3),
        'near_expiry_count': near_expiry_count,
    }


def get_context_for_time():
    """Determine meal context based on time of day."""
    hour = timezone.now().hour
    if 5 <= hour < 11:
        return 'breakfast', 'breakfast'
    elif 11 <= hour < 15:
        return 'lunch', 'lunch'
    elif 15 <= hour < 18:
        return 'snack', 'snack'
    else:
        return 'dinner', 'dinner'


def is_weekend():
    return timezone.now().weekday() >= 5


def generate_recommendations(user):
    """
    Generate categorized recipe recommendations for a user.
    Returns dict with categories: expiry, health, time_of_day, weekend, general
    """
    from inventory.models import FoodItem
    from recipes.models import Recipe, RecipeRecommendation
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()
    user_items = FoodItem.objects.filter(
        user=user, is_consumed=False, is_wasted=False
    ).select_related('category')

    if not user_items.exists():
        return {'error': 'No ingredients in pantry'}

    near_expiry_items = user_items.filter(
        expiry_date__lte=today + timedelta(days=3),
        expiry_date__isnull=False,
        expiry_date__gte=today
    )

    all_recipes = Recipe.objects.prefetch_related('ingredients').all()
    meal_type_now, meal_context = get_context_for_time()
    weekend = is_weekend()

    results = {
        'expiry_alert': [],
        'time_of_day': [],
        'health': [],
        'weekend_special': [],
        'general': [],
        'stats': {
            'total_items': user_items.count(),
            'near_expiry_items': near_expiry_items.count(),
            'meal_context': meal_context,
            'is_weekend': weekend,
        }
    }

    for recipe in all_recipes:
        score_data = compute_recipe_score(user_items, recipe)
        if score_data is None or score_data['score'] < 0.1:
            continue

        rec = {
            'recipe_id': recipe.id,
            'title': recipe.title,
            'description': recipe.description,
            'meal_type': recipe.meal_type,
            'prep_time': recipe.prep_time,
            'cook_time': recipe.cook_time,
            'servings': recipe.servings,
            'difficulty': recipe.difficulty,
            'health_tags': recipe.health_tags,
            'image_emoji': recipe.image_emoji,
            'is_weekend_special': recipe.is_weekend_special,
            'calories_per_serving': recipe.calories_per_serving,
            'instructions': recipe.instructions,
            **score_data,
        }

        # Expiry alert recipes: must use near-expiry items
        if score_data['near_expiry_count'] > 0 and score_data['score'] >= 0.4:
            results['expiry_alert'].append({**rec, 'context': 'expiry'})

        # Time of day
        if recipe.meal_type in [meal_type_now, 'any'] and score_data['score'] >= 0.3:
            results['time_of_day'].append({**rec, 'context': 'time_of_day'})

        # Health recipes
        if recipe.health_tags and score_data['score'] >= 0.3:
            results['health'].append({**rec, 'context': 'health'})

        # Weekend specials
        if weekend and recipe.is_weekend_special and score_data['score'] >= 0.3:
            results['weekend_special'].append({**rec, 'context': 'weekend'})

        # General (all with decent score)
        if score_data['score'] >= 0.3:
            results['general'].append({**rec, 'context': 'general'})

    # Sort each category
    for key in ['expiry_alert', 'time_of_day', 'health', 'weekend_special', 'general']:
        results[key] = sorted(results[key], key=lambda x: (
            -x['waste_reduction_score'] if key == 'expiry_alert' else -x['score']
        ))[:10]

    return results


# ── MealDB External Recipe Scoring ──────────────────────────────────────────

def parse_mealdb_ingredients(meal: dict) -> list:
    """Extract ingredient names from a MealDB meal object."""
    ingredients = []
    for i in range(1, 21):
        name = meal.get(f'strIngredient{i}', '') or ''
        measure = meal.get(f'strMeasure{i}', '') or ''
        name = name.strip()
        if name:
            ingredients.append({'name': name, 'measure': measure.strip()})
    return ingredients


def score_external_recipes(user, meals: list) -> dict:
    """
    Score a list of MealDB meal objects against the user's pantry.
    Returns categorised results in the same format as generate_recommendations.
    """
    from inventory.models import FoodItem
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()
    user_items = list(FoodItem.objects.filter(
        user=user, is_consumed=False, is_wasted=False
    ).select_related('category'))

    if not user_items:
        return {'error': 'No ingredients in pantry', 'results': []}

    near_expiry_set = {
        i.name.lower() for i in user_items
        if i.expiry_date and i.expiry_date <= today + timedelta(days=3) and i.expiry_date >= today
    }

    meal_type_now, _ = get_context_for_time()
    weekend = is_weekend()

    scored = []
    for meal in meals:
        meal_ingredients = parse_mealdb_ingredients(meal)
        if not meal_ingredients:
            continue

        matched = []
        missing = []
        expiry_items_used = []
        near_expiry_count = 0
        freshness_bonus = 0.0

        for ingr in meal_ingredients:
            match_item = None
            for ui in user_items:
                if ingredient_match(ui.name, ingr['name']):
                    match_item = ui
                    break
            if match_item:
                status_str = match_item.freshness_status
                matched.append({
                    'name': ingr['name'],
                    'measure': ingr['measure'],
                    'user_item': match_item.name,
                    'freshness': status_str,
                    'days_left': match_item.days_until_expiry,
                })
                if status_str == 'near_expiry':
                    near_expiry_count += 1
                    expiry_items_used.append(match_item.name)
                    freshness_bonus += 0.15
                elif status_str == 'expired':
                    freshness_bonus -= 0.1
            else:
                missing.append({'name': ingr['name'], 'measure': ingr['measure']})

        total = len(meal_ingredients)
        base_score = len(matched) / total if total else 0
        final_score = min(1.0, base_score + freshness_bonus)
        waste_score = min(1.0, near_expiry_count * 0.3)

        if final_score >= 0.8 and not missing:
            category = 'optimal'
        elif final_score >= 0.5 or len(missing) <= max(2, total // 3):
            category = 'partial'
        else:
            category = 'low'

        # Map MealDB category to meal type
        mdb_cat = (meal.get('strCategory') or '').lower()
        meal_type = 'any'
        if any(k in mdb_cat for k in ['breakfast', 'starter']):
            meal_type = 'breakfast'
        elif any(k in mdb_cat for k in ['dessert', 'side']):
            meal_type = 'snack'
        elif mdb_cat in ['beef', 'chicken', 'seafood', 'lamb', 'pork', 'pasta', 'vegetarian', 'vegan']:
            meal_type = 'dinner'

        scored.append({
            # Identity
            'source': 'mealdb',
            'recipe_id': meal.get('idMeal'),
            'title': meal.get('strMeal', 'Unknown Recipe'),
            'description': f"A {meal.get('strCategory', '')} dish from {meal.get('strArea', 'World')} cuisine",
            'meal_type': meal_type,
            'image_url': meal.get('strMealThumb', ''),
            'mealdb_url': f"https://www.themealdb.com/meal/{meal.get('idMeal')}",
            'category_name': meal.get('strCategory', ''),
            'area': meal.get('strArea', ''),
            'tags': [t.strip() for t in (meal.get('strTags') or '').split(',') if t.strip()],
            'youtube': meal.get('strYoutube', ''),
            'instructions': (meal.get('strInstructions') or '')[:800] + ('…' if len(meal.get('strInstructions') or '') > 800 else ''),
            'full_instructions': meal.get('strInstructions', ''),
            # Score data
            'score': round(final_score, 3),
            'category': category,
            'matched_ingredients': matched,
            'missing_ingredients': missing,
            'expiry_items_used': expiry_items_used,
            'waste_reduction_score': round(waste_score, 3),
            'near_expiry_count': near_expiry_count,
            'total_ingredients': total,
        })

    # Sort by score descending
    scored.sort(key=lambda x: (-x['waste_reduction_score'], -x['score']))

    # Categorise
    expiry_alert = [r for r in scored if r['near_expiry_count'] > 0 and r['score'] >= 0.3]
    time_of_day = [r for r in scored if r['meal_type'] in [meal_type_now, 'any'] and r['score'] >= 0.25]
    optimal_list = [r for r in scored if r['category'] == 'optimal']
    partial_list = [r for r in scored if r['category'] == 'partial']

    return {
        'source': 'mealdb',
        'total_fetched': len(meals),
        'total_scored': len(scored),
        'expiry_alert': expiry_alert[:10],
        'time_of_day': time_of_day[:10],
        'optimal': optimal_list[:10],
        'partial': partial_list[:15],
        'all_results': scored[:30],
        'stats': {
            'total_items': len(user_items),
            'near_expiry_items': len(near_expiry_set),
            'meal_context': meal_type_now,
            'is_weekend': weekend,
        }
    }
