from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import FoodItem, FoodCategory, DailyLog
from .serializers import FoodItemSerializer, FoodCategorySerializer, DailyLogSerializer


class FoodCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FoodCategory.objects.all()
    serializer_class = FoodCategorySerializer


class FoodItemViewSet(viewsets.ModelViewSet):
    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = FoodItem.objects.filter(user=self.request.user, is_consumed=False, is_wasted=False)
        status_filter = self.request.query_params.get('status')
        if status_filter == 'near_expiry':
            from datetime import timedelta
            cutoff = timezone.now().date() + timedelta(days=3)
            qs = qs.filter(expiry_date__lte=cutoff, expiry_date__isnull=False)
        elif status_filter == 'expired':
            qs = qs.filter(expiry_date__lt=timezone.now().date())
        return qs

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        from datetime import timedelta
        user = request.user
        today = timezone.now().date()
        all_items = FoodItem.objects.filter(user=user, is_consumed=False, is_wasted=False)
        expiring_soon = all_items.filter(
            expiry_date__lte=today + timedelta(days=3),
            expiry_date__isnull=False,
            expiry_date__gte=today
        )
        expired = all_items.filter(expiry_date__lt=today)
        profile = getattr(user, 'profile', None)

        return Response({
            'total_items': all_items.count(),
            'expiring_soon': expiring_soon.count(),
            'expired': expired.count(),
            'fresh': all_items.filter(expiry_date__gt=today + timedelta(days=3)).count() + all_items.filter(expiry_date__isnull=True).count(),
            'waste_reduction_rate': profile.waste_reduction_rate if profile else 100,
            'items_saved': profile.total_items_saved if profile else 0,
            'streak_days': profile.streak_days if profile else 0,
        })

    @action(detail=False, methods=['post'])
    def advance_time(self, request):
        days = int(request.data.get('days', 1))
        from datetime import timedelta
        from django.db.models import F
        
        # Shift dates backwards so next time we check timezone.now(), the item seems older
        qs = FoodItem.objects.all()
        qs.update(
            purchase_date=F('purchase_date') - timedelta(days=days),
            # Note: created_at is auto_now_add, so we need to be careful, but we can update it directly
            created_at=F('created_at') - timedelta(days=days),
            updated_at=F('updated_at') - timedelta(days=days)
        )
        # Only update items with a set expiry date
        qs.filter(expiry_date__isnull=False).update(
            expiry_date=F('expiry_date') - timedelta(days=days)
        )
        return Response({'status': f'Advanced time by {days} days'})

    @action(detail=True, methods=['post'])
    def mark_consumed(self, request, pk=None):
        item = self.get_object()
        item.is_consumed = True
        item.consumed_date = timezone.now().date()
        item.save()
        profile = getattr(request.user, 'profile', None)
        if profile:
            profile.total_items_saved += 1
            profile.save()
        return Response({'status': 'consumed'})

    @action(detail=True, methods=['post'])
    def mark_wasted(self, request, pk=None):
        item = self.get_object()
        item.is_wasted = True
        item.save()
        profile = getattr(request.user, 'profile', None)
        if profile:
            profile.total_items_wasted += 1
            profile.save()
        return Response({'status': 'wasted'})

    @action(detail=False, methods=['get'])
    def history(self, request):
        items = FoodItem.objects.filter(user=request.user).order_by('-created_at')[:50]
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)
