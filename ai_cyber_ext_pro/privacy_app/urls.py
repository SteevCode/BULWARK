from django.urls import path
from . import views

urlpatterns = [
    path('analyze-privacy/', views.analyze_privacy, name='analyze_privacy'),
]
