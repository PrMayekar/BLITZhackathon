from django.core.management.base import BaseCommand
from recipes.models import Recipe, RecipeIngredient

RECIPES = [
    {
        "title": "Avocado Toast with Egg",
        "description": "A quick, healthy breakfast packed with protein and good fats.",
        "meal_type": "breakfast",
        "prep_time": 5,
        "cook_time": 5,
        "servings": 1,
        "difficulty": "easy",
        "health_tags": ["high_protein", "vegetarian", "heart_healthy"],
        "calories_per_serving": 350,
        "image_emoji": "🥑",
        "instructions": "1. Toast the bread.\n2. Mash the avocado with salt and pepper.\n3. Fry or poach the egg.\n4. Spread avocado on toast and top with egg.",
        "ingredients": [
            {"name": "Bread", "quantity": "2 slices", "is_optional": False, "substitutes": ["Sourdough", "Whole Wheat Bread"]},
            {"name": "Avocado", "quantity": "1/2", "is_optional": False, "substitutes": []},
            {"name": "Egg", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Lemon", "quantity": "1 wedge", "is_optional": True, "substitutes": []}
        ]
    },
    {
        "title": "Classic Tomato Pasta",
        "description": "Simple and delicious pasta using pantry staples and fresh tomatoes.",
        "meal_type": "dinner",
        "prep_time": 10,
        "cook_time": 15,
        "servings": 2,
        "difficulty": "easy",
        "health_tags": ["vegetarian", "vegan", "heart_healthy"],
        "calories_per_serving": 400,
        "image_emoji": "🍝",
        "instructions": "1. Boil pasta in salted water.\n2. Sauté garlic and diced tomatoes in olive oil.\n3. Toss cooked pasta with the tomato sauce and garnish with basil.",
        "ingredients": [
            {"name": "Pasta", "quantity": "200g", "is_optional": False, "substitutes": []},
            {"name": "Tomatoes", "quantity": "4", "is_optional": False, "substitutes": ["Canned Tomatoes"]},
            {"name": "Garlic", "quantity": "2 cloves", "is_optional": False, "substitutes": []},
            {"name": "Onion", "quantity": "1/2", "is_optional": True, "substitutes": []},
            {"name": "Basil", "quantity": "a handful", "is_optional": True, "substitutes": []}
        ]
    },
    {
        "title": "Chicken Stir-fry",
        "description": "A quick way to use up veggies with a hearty protein.",
        "meal_type": "dinner",
        "prep_time": 15,
        "cook_time": 10,
        "servings": 2,
        "difficulty": "medium",
        "health_tags": ["high_protein", "low_carb", "energy_boost"],
        "calories_per_serving": 450,
        "image_emoji": "🥘",
        "instructions": "1. Slice chicken and veggies thinly.\n2. Stir-fry chicken until browned.\n3. Add veggies and cook for 3 minutes.\n4. Add soy sauce and serve.",
        "ingredients": [
            {"name": "Chicken Breast", "quantity": "300g", "is_optional": False, "substitutes": ["Tofu", "Beef"]},
            {"name": "Onion", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Soy Sauce", "quantity": "2 tbsp", "is_optional": False, "substitutes": []},
            {"name": "Carrot", "quantity": "1", "is_optional": True, "substitutes": []}
        ]
    },
    {
        "title": "Omelette with Cheese",
        "description": "A fluffy omelette ready in minutes.",
        "meal_type": "breakfast",
        "prep_time": 5,
        "cook_time": 5,
        "servings": 1,
        "difficulty": "easy",
        "health_tags": ["high_protein", "vegetarian", "low_carb"],
        "calories_per_serving": 300,
        "image_emoji": "🍳",
        "instructions": "1. Whisk eggs with salt and pepper.\n2. Heat butter in a pan and pour in eggs.\n3. Add cheese to one side and fold when edges are set.",
        "ingredients": [
            {"name": "Egg", "quantity": "3", "is_optional": False, "substitutes": []},
            {"name": "Cheese", "quantity": "30g", "is_optional": False, "substitutes": []},
            {"name": "Milk", "quantity": "1 tbsp", "is_optional": True, "substitutes": []}
        ]
    },
    {
        "title": "Milkshake",
        "description": "A simple and sweet banana and milk blend.",
        "meal_type": "snack",
        "prep_time": 5,
        "cook_time": 0,
        "servings": 1,
        "difficulty": "easy",
        "health_tags": ["energy_boost", "vegetarian"],
        "calories_per_serving": 250,
        "image_emoji": "🥤",
        "instructions": "1. Add banana and milk to blender.\n2. Blend until smooth.\n3. Serve cold.",
        "ingredients": [
            {"name": "Milk", "quantity": "250ml", "is_optional": False, "substitutes": ["Almond Milk", "Oat Milk"]},
            {"name": "Banana", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Sugar", "quantity": "1 tsp", "is_optional": True, "substitutes": []}
        ]
    },
    {
        "title": "Potato Salad",
        "description": "Creamy potato salad with eggs and onions.",
        "meal_type": "lunch",
        "prep_time": 10,
        "cook_time": 15,
        "servings": 4,
        "difficulty": "easy",
        "health_tags": ["vegetarian"],
        "calories_per_serving": 320,
        "image_emoji": "🥔",
        "instructions": "1. Boil potatoes until tender, then cube.\n2. Hard boil the eggs, peel and chop.\n3. Mix potatoes, eggs, and chopped onions with mayonnaise.",
        "ingredients": [
            {"name": "Potatoes", "quantity": "500g", "is_optional": False, "substitutes": []},
            {"name": "Egg", "quantity": "3", "is_optional": False, "substitutes": []},
            {"name": "Onion", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Mayonnaise", "quantity": "4 tbsp", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Beef Stew",
        "description": "A comforting, slow-cooked beef stew with root vegetables.",
        "meal_type": "dinner",
        "prep_time": 20,
        "cook_time": 120,
        "servings": 4,
        "difficulty": "medium",
        "health_tags": ["high_protein"],
        "calories_per_serving": 450,
        "image_emoji": "🍲",
        "instructions": "1. Sear the beef chunks in a pot.\n2. Add chopped onions, carrots, and potatoes.\n3. Pour in beef broth and simmer for 2 hours.",
        "ingredients": [
            {"name": "Beef", "quantity": "500g", "is_optional": False, "substitutes": []},
            {"name": "Potatoes", "quantity": "3", "is_optional": False, "substitutes": []},
            {"name": "Carrot", "quantity": "2", "is_optional": False, "substitutes": []},
            {"name": "Onion", "quantity": "1", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Vegetable Fried Rice",
        "description": "Quick and easy fried rice to use up leftover rice and veggies.",
        "meal_type": "lunch",
        "prep_time": 10,
        "cook_time": 10,
        "servings": 2,
        "difficulty": "easy",
        "health_tags": ["vegetarian"],
        "calories_per_serving": 380,
        "image_emoji": "🍚",
        "instructions": "1. Scramble the egg in a wok and remove.\n2. Stir-fry chopped vegetables until tender.\n3. Add cooked rice, egg, and soy sauce, toss well.",
        "ingredients": [
            {"name": "Rice", "quantity": "2 cups cooked", "is_optional": False, "substitutes": []},
            {"name": "Egg", "quantity": "2", "is_optional": False, "substitutes": []},
            {"name": "Carrot", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Peas", "quantity": "1/2 cup", "is_optional": True, "substitutes": []},
            {"name": "Soy Sauce", "quantity": "3 tbsp", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Garlic Butter Shrimp",
        "description": "Succulent shrimp cooked in a rich garlic butter sauce.",
        "meal_type": "dinner",
        "prep_time": 10,
        "cook_time": 10,
        "servings": 2,
        "difficulty": "easy",
        "health_tags": ["high_protein", "low_carb"],
        "calories_per_serving": 320,
        "image_emoji": "🍤",
        "instructions": "1. Melt butter in a skillet.\n2. Add minced garlic and shrimp, cook until shrimp are pink.\n3. Squeeze lemon juice over the top and serve.",
        "ingredients": [
            {"name": "Shrimp", "quantity": "300g", "is_optional": False, "substitutes": []},
            {"name": "Butter", "quantity": "3 tbsp", "is_optional": False, "substitutes": []},
            {"name": "Garlic", "quantity": "4 cloves", "is_optional": False, "substitutes": []},
            {"name": "Lemon", "quantity": "1/2", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Caprese Salad",
        "description": "A fresh Italian salad with tomatoes, mozzarella, and basil.",
        "meal_type": "snack",
        "prep_time": 10,
        "cook_time": 0,
        "servings": 2,
        "difficulty": "easy",
        "health_tags": ["vegetarian", "low_carb"],
        "calories_per_serving": 250,
        "image_emoji": "🥗",
        "instructions": "1. Slice tomatoes and mozzarella.\n2. Arrange on a plate with fresh basil leaves.\n3. Drizzle with olive oil and season with salt and pepper.",
        "ingredients": [
            {"name": "Tomatoes", "quantity": "2 large", "is_optional": False, "substitutes": []},
            {"name": "Mozzarella Cheese", "quantity": "1 ball", "is_optional": False, "substitutes": []},
            {"name": "Basil", "quantity": "1 bunch", "is_optional": False, "substitutes": []},
            {"name": "Olive Oil", "quantity": "2 tbsp", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Lentil Soup",
        "description": "Hearty and nutritious soup packed with fiber.",
        "meal_type": "lunch",
        "prep_time": 10,
        "cook_time": 40,
        "servings": 4,
        "difficulty": "easy",
        "health_tags": ["vegan", "heart_healthy", "immunity_boost"],
        "calories_per_serving": 280,
        "image_emoji": "🥣",
        "instructions": "1. Sauté onions, celery, and carrots in a pot.\n2. Add rinsed lentils and vegetable broth.\n3. Simmer for 30-40 minutes until lentils are tender.",
        "ingredients": [
            {"name": "Lentils", "quantity": "1 cup", "is_optional": False, "substitutes": []},
            {"name": "Carrot", "quantity": "2", "is_optional": False, "substitutes": []},
            {"name": "Celery", "quantity": "2 stalks", "is_optional": True, "substitutes": []},
            {"name": "Onion", "quantity": "1", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Mushroom Risotto",
        "description": "Creamy Italian rice dish flavored with earthy mushrooms.",
        "meal_type": "dinner",
        "prep_time": 15,
        "cook_time": 30,
        "servings": 3,
        "difficulty": "medium",
        "health_tags": ["vegetarian"],
        "calories_per_serving": 450,
        "image_emoji": "🍛",
        "instructions": "1. Sauté onions and mushrooms until soft.\n2. Add arborio rice and toast for a minute.\n3. Gradually add warm broth, stirring constantly until absorbed.\n4. Stir in parmesan cheese before serving.",
        "ingredients": [
            {"name": "Rice", "quantity": "1 cup Arborio", "is_optional": False, "substitutes": []},
            {"name": "Mushrooms", "quantity": "200g", "is_optional": False, "substitutes": []},
            {"name": "Onion", "quantity": "1/2", "is_optional": False, "substitutes": []},
            {"name": "Cheese", "quantity": "50g Parmesan", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "BLT Sandwich",
        "description": "Classic Bacon, Lettuce, and Tomato sandwich.",
        "meal_type": "lunch",
        "prep_time": 5,
        "cook_time": 10,
        "servings": 1,
        "difficulty": "easy",
        "health_tags": ["energy_boost"],
        "calories_per_serving": 500,
        "image_emoji": "🥪",
        "instructions": "1. Fry bacon until crispy.\n2. Toast the bread and spread mayonnaise.\n3. Layer lettuce, sliced tomato, and bacon between the bread.",
        "ingredients": [
            {"name": "Bacon", "quantity": "3 slices", "is_optional": False, "substitutes": []},
            {"name": "Lettuce", "quantity": "2 leaves", "is_optional": False, "substitutes": []},
            {"name": "Tomatoes", "quantity": "2 slices", "is_optional": False, "substitutes": []},
            {"name": "Bread", "quantity": "2 slices", "is_optional": False, "substitutes": []},
            {"name": "Mayonnaise", "quantity": "1 tbsp", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Greek Salad",
        "description": "Crisp and refreshing salad with cucumber, tomatoes, olives, and feta.",
        "meal_type": "lunch",
        "prep_time": 15,
        "cook_time": 0,
        "servings": 2,
        "difficulty": "easy",
        "health_tags": ["vegetarian", "low_carb", "heart_healthy"],
        "calories_per_serving": 220,
        "image_emoji": "🥗",
        "instructions": "1. Chop cucumbers, tomatoes, and red onion.\n2. Toss all veggies in a bowl with olives and feta cheese.\n3. Dress with olive oil, oregano, and a splash of lemon juice.",
        "ingredients": [
            {"name": "Cucumber", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Tomatoes", "quantity": "2", "is_optional": False, "substitutes": []},
            {"name": "Onion", "quantity": "1/2 Red", "is_optional": False, "substitutes": []},
            {"name": "Olives", "quantity": "1/4 cup", "is_optional": True, "substitutes": []},
            {"name": "Cheese", "quantity": "50g Feta", "is_optional": False, "substitutes": []}
        ]
    },
    {
        "title": "Classic Pancakes",
        "description": "Fluffy homemade pancakes, perfect for a weekend breakfast.",
        "meal_type": "breakfast",
        "prep_time": 10,
        "cook_time": 15,
        "servings": 3,
        "difficulty": "medium",
        "health_tags": ["energy_boost"],
        "calories_per_serving": 350,
        "image_emoji": "🥞",
        "instructions": "1. Whisk flour, milk, and egg to make a batter.\n2. Heat a pan and pour small ladles of batter.\n3. Flip when bubbles form on the surface.\n4. Serve warm with maple syrup.",
        "ingredients": [
            {"name": "Flour", "quantity": "1 cup", "is_optional": False, "substitutes": []},
            {"name": "Milk", "quantity": "1 cup", "is_optional": False, "substitutes": []},
            {"name": "Egg", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Butter", "quantity": "2 tbsp", "is_optional": True, "substitutes": []}
        ]
    },
    {
        "title": "Baked Salmon with Asparagus",
        "description": "A healthy, elegant dinner of roasted salmon and delicate asparagus.",
        "meal_type": "dinner",
        "prep_time": 5,
        "cook_time": 15,
        "servings": 2,
        "difficulty": "easy",
        "health_tags": ["high_protein", "low_carb", "heart_healthy"],
        "calories_per_serving": 400,
        "image_emoji": "🐟",
        "instructions": "1. Place salmon filets and asparagus on a baking sheet.\n2. Drizzle with olive oil, minced garlic, and lemon juice.\n3. Bake at 200°C (400°F) for 12-15 minutes.",
        "ingredients": [
            {"name": "Salmon", "quantity": "2 filets", "is_optional": False, "substitutes": []},
            {"name": "Asparagus", "quantity": "1 bunch", "is_optional": False, "substitutes": []},
            {"name": "Lemon", "quantity": "1", "is_optional": False, "substitutes": []},
            {"name": "Garlic", "quantity": "2 cloves", "is_optional": True, "substitutes": []}
        ]
    }
]

class Command(BaseCommand):
    help = 'Loads a starting set of recipes with ingredients into the database.'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing recipes...')
        Recipe.objects.all().delete()
        
        self.stdout.write('Loading sample recipes...')
        for data in RECIPES:
            ingredients = data.pop('ingredients')
            recipe = Recipe.objects.create(**data)
            for ing in ingredients:
                RecipeIngredient.objects.create(recipe=recipe, **ing)
                
        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {len(RECIPES)} recipes!'))
