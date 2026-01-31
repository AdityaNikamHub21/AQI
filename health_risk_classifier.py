"""
AeroGuard: Health Risk Classification Layer
AI-based health risk assessment for air quality forecasts
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import shap
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class HealthRiskClassifier:
    """
    AI-based Health Risk Classification System for AeroGuard
    Uses RandomForest/XGBoost for multi-class risk prediction
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_names = []
        self.risk_categories = ['Low', 'Moderate', 'High', 'Hazardous']
        self.personas = {
            'children_elderly': {'sensitivity': 1.5, 'baseline_risk': 0.3},
            'outdoor_workers': {'sensitivity': 1.2, 'baseline_risk': 0.2},
            'general_public': {'sensitivity': 1.0, 'baseline_risk': 0.1}
        }
        
    def generate_training_data(self, n_samples=5000):
        """
        Generate synthetic training data aligned with WHO PM2.5 guidelines
        WHO 24-hour PM2.5 guideline: 15 µg/m³
        """
        print("🔧 Generating WHO-aligned training data...")
        
        np.random.seed(42)
        data = []
        
        for i in range(n_samples):
            # Environmental features (realistic ranges)
            aqi = np.random.normal(100, 50)  # AQI values
            pm25 = np.random.lognormal(3.5, 0.8)  # PM2.5 in µg/m³
            pm10 = pm25 * np.random.uniform(1.5, 2.5)  # PM10 typically higher
            temperature = np.random.normal(25, 8)  # Celsius
            humidity = np.random.normal(60, 20)  # Percentage
            wind_speed = np.random.exponential(5)  # km/h
            pressure = np.random.normal(1013, 10)  # hPa
            visibility = np.random.normal(8, 3)  # km
            
            # Exposure duration (0-12 hours outdoors)
            exposure_duration = np.random.uniform(0, 12)
            
            # Persona encoding (one-hot)
            persona_type = np.random.choice(list(self.personas.keys()))
            persona_encoding = [
                1 if persona_type == 'children_elderly' else 0,
                1 if persona_type == 'outdoor_workers' else 0,
                1 if persona_type == 'general_public' else 0
            ]
            
            # WHO-aligned label generation (but allow model to learn nonlinear patterns)
            # Base risk on PM2.5 relative to WHO guideline (15 µg/m³)
            pm25_ratio = pm25 / 15.0
            
            # Apply persona sensitivity
            persona_sensitivity = self.personas[persona_type]['sensitivity']
            exposure_factor = 1 + (exposure_duration / 12.0) * 0.5  # Longer exposure = higher risk
            
            # Calculate risk score (nonlinear combination)
            risk_score = pm25_ratio * persona_sensitivity * exposure_factor
            
            # Add environmental modifiers (nonlinear effects)
            if humidity > 80:  # High humidity increases risk
                risk_score *= 1.2
            if wind_speed < 2:  # Low wind increases risk
                risk_score *= 1.3
            if temperature > 35:  # High temp increases risk
                risk_score *= 1.1
                
            # Convert to risk categories (with some noise to allow learning)
            noise = np.random.normal(0, 0.1)
            risk_score += noise
            
            if risk_score < 1.0:
                risk_label = 'Low'
            elif risk_score < 2.0:
                risk_label = 'Moderate'
            elif risk_score < 3.5:
                risk_label = 'High'
            else:
                risk_label = 'Hazardous'
            
            # Combine all features
            features = [
                aqi, pm25, pm10, temperature, humidity, wind_speed,
                pressure, visibility, exposure_duration
            ] + persona_encoding
            
            data.append(features + [risk_label, persona_type])
        
        # Create DataFrame
        feature_cols = [
            'aqi', 'pm25', 'pm10', 'temperature', 'humidity', 'wind_speed',
            'pressure', 'visibility', 'exposure_duration',
            'persona_children', 'persona_workers', 'persona_general'
        ]
        
        df = pd.DataFrame(data, columns=feature_cols + ['risk_label', 'persona_type'])
        
        print(f"✅ Generated {len(df)} training samples")
        print(f"📊 Risk distribution: {df['risk_label'].value_counts().to_dict()}")
        
        return df
    
    def train_model(self, df):
        """
        Train RandomForest classifier on the prepared data
        """
        print("🤖 Training Health Risk Classification Model...")
        
        # Prepare features and target
        feature_cols = [col for col in df.columns if col not in ['risk_label', 'persona_type']]
        X = df[feature_cols]
        y = df['risk_label']
        
        self.feature_names = feature_cols
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train RandomForest with optimized parameters
        self.model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'
        )
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        print(f"📈 Training accuracy: {train_score:.3f}")
        print(f"📈 Test accuracy: {test_score:.3f}")
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)
        print(f"📊 Cross-validation accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
        
        # Detailed classification report
        y_pred = self.model.predict(X_test_scaled)
        print("\n📋 Classification Report:")
        print(classification_report(y_test, y_pred))
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': feature_cols,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n🎯 Top 10 Important Features:")
        print(feature_importance.head(10))
        
        return X_test_scaled, y_test
    
    def setup_explainability(self):
        """
        Setup SHAP for model explainability
        """
        print("🔍 Setting up SHAP explainability...")
        self.explainer = shap.TreeExplainer(self.model)
        
    def predict_risk(self, forecast_data, persona_type, exposure_duration):
        """
        Predict health risk for given forecast and persona
        """
        # Prepare input features
        features = [
            forecast_data.get('aqi', 100),
            forecast_data.get('pm25', 50),
            forecast_data.get('pm10', 75),
            forecast_data.get('temperature', 25),
            forecast_data.get('humidity', 60),
            forecast_data.get('wind_speed', 5),
            forecast_data.get('pressure', 1013),
            forecast_data.get('visibility', 8),
            exposure_duration,
            1 if persona_type == 'children_elderly' else 0,
            1 if persona_type == 'outdoor_workers' else 0,
            1 if persona_type == 'general_public' else 0
        ]
        
        # Scale features
        features_scaled = self.scaler.transform([features])
        
        # Predict
        risk_prediction = self.model.predict_proba(features_scaled)[0]
        risk_category = self.model.predict(features_scaled)[0]
        
        # Get SHAP values for explanation
        shap_values = self.explainer.shap_values(features_scaled)
        
        return {
            'risk_category': risk_category,
            'risk_probabilities': dict(zip(self.risk_categories, risk_prediction)),
            'shap_values': shap_values,
            'features': features,
            'feature_names': self.feature_names
        }
    
    def generate_health_advice(self, risk_category, persona_type):
        """
        Generate persona-specific health advice
        """
        advice_templates = {
            'Low': {
                'children_elderly': "Air quality is safe for outdoor activities. Children and elderly can enjoy normal outdoor play and exercise.",
                'outdoor_workers': "Working conditions are safe. No special precautions needed for outdoor work.",
                'general_public': "Air quality is good. Enjoy your normal outdoor activities!"
            },
            'Moderate': {
                'children_elderly': "Children and elderly may consider reducing prolonged outdoor exertion. Take breaks during outdoor activities.",
                'outdoor_workers': "Monitor your health during long outdoor shifts. Consider more frequent breaks in shaded areas.",
                'general_public': "Unusually sensitive people should consider reducing prolonged outdoor exertion."
            },
            'High': {
                'children_elderly': "Children and elderly should avoid prolonged outdoor exertion. Keep outdoor activities short and take frequent breaks.",
                'outdoor_workers': "Reduce prolonged outdoor work. Use protective masks if available and monitor for health symptoms.",
                'general_public': "Avoid prolonged outdoor exertion. Sensitive groups should stay indoors as much as possible."
            },
            'Hazardous': {
                'children_elderly': "Children and elderly should remain indoors. Keep all outdoor activities to an absolute minimum.",
                'outdoor_workers': "Avoid outdoor work if possible. If unavoidable, use proper respiratory protection and limit exposure time.",
                'general_public': "Avoid all outdoor activities. Stay indoors and keep windows closed. Use air purifiers if available."
            }
        }
        
        return advice_templates[risk_category][persona_type]
    
    def explain_prediction(self, prediction_result):
        """
        Generate human-readable explanation using SHAP values
        """
        shap_values = prediction_result['shap_values']
        features = prediction_result['features']
        feature_names = prediction_result['feature_names']
        
        # Handle SHAP values format (can be different for multi-class)
        if isinstance(shap_values, list):
            # Multi-class case
            predicted_class_idx = list(self.risk_categories).index(prediction_result['risk_category'])
            if predicted_class_idx < len(shap_values):
                class_shap_values = shap_values[predicted_class_idx][0]
            else:
                # Fallback: use first class
                class_shap_values = shap_values[0][0]
        else:
            # Single class case
            class_shap_values = shap_values[0]
        
        # Create feature importance explanation
        feature_impacts = []
        for i, (name, value, shap_val) in enumerate(zip(feature_names, features, class_shap_values)):
            # Handle numpy array comparison
            shap_numeric = float(shap_val) if hasattr(shap_val, '__len__') else shap_val
            impact = "increases" if shap_numeric > 0 else "decreases"
            feature_impacts.append({
                'feature': name,
                'value': value,
                'impact': impact,
                'magnitude': abs(shap_numeric)
            })
        
        # Sort by impact magnitude
        feature_impacts.sort(key=lambda x: x['magnitude'], reverse=True)
        
        # Generate explanation
        explanation = f"Risk classified as {prediction_result['risk_category']}.\n\n"
        explanation += "Key factors influencing this prediction:\n"
        
        for i, impact in enumerate(feature_impacts[:5]):  # Top 5 factors
            feature_name = impact['feature'].replace('_', ' ').title()
            explanation += f"{i+1}. {feature_name} ({impact['value']:.1f}) {impact['impact']} risk\n"
        
        return explanation, feature_impacts[:5]
    
    def save_model(self, filepath='health_risk_model.pkl'):
        """
        Save trained model for deployment
        """
        import pickle
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'risk_categories': self.risk_categories,
            'personas': self.personas
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"💾 Model saved to {filepath}")
    
    def load_model(self, filepath='health_risk_model.pkl'):
        """
        Load pre-trained model
        """
        import pickle
        
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.risk_categories = model_data['risk_categories']
        self.personas = model_data['personas']
        
        # Setup explainability
        self.setup_explainability()
        
        print(f"📂 Model loaded from {filepath}")

# Initialize the classifier
health_classifier = HealthRiskClassifier()

print("🚀 AeroGuard Health Risk Classification System Ready!")
print("🎯 Next: Generate training data and train the AI model")
