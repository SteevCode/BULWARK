# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('predict-risk/', views.predict_risk),
    path('analyze-policy/', views.analyze_policy),
]
