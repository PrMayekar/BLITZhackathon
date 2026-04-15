"""
Run with: python manage.py shell < seed_recipes.py
Seeds all 35 manually-curated recipes into the database.
"""
from recipes.models import Recipe, RecipeIngredient

recipes_data = [
  {"id":1,"title":"Tomato Egg Scramble","description":"Quick protein-packed breakfast using fresh tomatoes and eggs","meal_type":"breakfast","prep_time":5,"cook_time":10,"servings":2,"difficulty":"easy","health_tags":["high_protein","energy_boost"],"is_weekend_special":False,"calories_per_serving":180,"image_emoji":"🍳","instructions":"1. Dice tomatoes.\n2. Beat eggs with salt and pepper.\n3. Heat oil in pan.\n4. Sauté tomatoes 2 min.\n5. Pour eggs, scramble until cooked.\n6. Garnish with coriander.","ingredients":[("tomato","2 medium",False,["cherry tomatoes"]),("egg","3",False,[]),("oil","1 tsp",False,["butter"]),("coriander","handful",True,[])]},
  {"id":2,"title":"Spinach Dal","description":"Iron-rich lentil curry with fresh spinach","meal_type":"lunch","prep_time":10,"cook_time":25,"servings":4,"difficulty":"easy","health_tags":["high_protein","vegan","heart_healthy","immunity_boost"],"is_weekend_special":False,"calories_per_serving":220,"image_emoji":"🍲","instructions":"1. Boil lentils.\n2. Sauté onion, garlic, ginger.\n3. Add tomatoes and spices.\n4. Add lentils and spinach.\n5. Simmer 10 min.","ingredients":[("lentils","1 cup",False,["dal","moong dal"]),("spinach","2 cups",False,["palak"]),("onion","1 large",False,[]),("tomato","2",False,[]),("garlic","4 cloves",False,["garlic paste"]),("ginger","1 inch",True,["ginger paste"])]},
  {"id":21,"title":"Butter Chicken","description":"Rich, creamy tomato-based chicken curry","meal_type":"dinner","prep_time":20,"cook_time":35,"servings":4,"difficulty":"medium","health_tags":["high_protein"],"is_weekend_special":True,"calories_per_serving":420,"image_emoji":"🍗","instructions":"1. Marinate chicken in yogurt and spices.\n2. Grill until charred.\n3. Make butter-tomato gravy.\n4. Add cream and chicken.\n5. Simmer 10 min. Serve with naan.","ingredients":[("chicken","500g",False,[]),("tomato","4 large",False,[]),("butter","3 tbsp",False,["ghee"]),("cream","100ml",False,[]),("onion","2 medium",False,[]),("garlic","6 cloves",False,["garlic paste"]),("ginger","2 inch",False,["ginger paste"]),("yogurt","3 tbsp",True,["curd"]),("coriander","handful",True,[])]},
  {"id":22,"title":"Dal Tadka","description":"Golden lentils tempered with ghee and aromatic spices","meal_type":"dinner","prep_time":10,"cook_time":30,"servings":4,"difficulty":"easy","health_tags":["high_protein","vegan","heart_healthy"],"is_weekend_special":False,"calories_per_serving":240,"image_emoji":"🥣","instructions":"1. Pressure cook lentils with turmeric.\n2. Make onion-tomato masala.\n3. Combine and simmer.\n4. Top with ghee tempering.","ingredients":[("lentils","1 cup",False,["dal","moong dal","toor dal"]),("onion","1 large",False,[]),("tomato","2",False,[]),("garlic","4 cloves",False,["garlic paste"]),("ginger","1 inch",False,["ginger paste"]),("butter","2 tbsp",False,["ghee","oil"]),("coriander","handful",True,[])]},
]

for r in recipes_data:
    if Recipe.objects.filter(pk=r["id"]).exists():
        continue
    ingrs = r.pop("ingredients")
    recipe = Recipe.objects.create(**r)
    for name, qty, optional, subs in ingrs:
        RecipeIngredient.objects.create(recipe=recipe, name=name, quantity=qty, is_optional=optional, substitutes=subs)

print(f"Seeded. Total: {Recipe.objects.count()} recipes, {RecipeIngredient.objects.count()} ingredients")
