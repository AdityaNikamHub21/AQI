"""
AeroGuard: Health Risk Classification Model
AI-based health risk prediction using RandomForest classifier
Aligns with WHO 2021 PM2.5 guidelines (15 µg/m³ 24-hour)
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import warnings
warnings.filterwarnings('ignore')

class HealthRiskModel:
    """
    AI-based Health Risk Classification Model
    Uses RandomForest to predict health risk categories based on environmental data
    """
    
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.scaler = None
        self.feature_columns = [
            'forecasted_pm25',
            'forecasted_aqi', 
            'aqi_trend',
            'wind_speed',
            'humidity',
            'exposure_hours',
            'persona_code',
            'who_exceedance_ratio'
        ]
        
    def calculate_who_exceedance_ratio(self, pm25_forecast):
        """
        Calculate WHO exceedance ratio based on 2021 PM2.5 guideline (15 µg/m³)
        This is used as a FEATURE, not as a hardcoded rule
        """
        return pm25_forecast / 15.0
    
    def generate_synthetic_training_data(self, n_samples=5000):
        """
        Generate synthetic training data for demonstration
        In production, this would be replaced with real historical health data
        """
        np.random.seed(42)
        
        # Generate realistic environmental data
        data = {
            'forecasted_pm25': np.random.lognormal(2.5, 0.8, n_samples),  # PM2.5 values
            'forecasted_aqi': np.random.lognormal(4.0, 0.6, n_samples),   # AQI values
            'aqi_trend': np.random.choice([-1, 0, 1], n_samples, p=[0.3, 0.4, 0.3]),  # -1: decreasing, 0: stable, 1: increasing
            'wind_speed': np.random.exponential(2.0, n_samples),         # Wind speed in m/s
            'humidity': np.random.beta(2, 2, n_samples) * 100,          # Humidity percentage
            'exposure_hours': np.random.choice([1, 2, 4, 8, 12], n_samples, p=[0.1, 0.2, 0.3, 0.3, 0.1]),
            'persona_code': np.random.choice([0, 1, 2, 3], n_samples, p=[0.4, 0.2, 0.2, 0.2])  # 0: General, 1: Children, 2: Elderly, 3: Workers
        }
        
        df = pd.DataFrame(data)
        
        # Calculate WHO exceedance ratio
        df['who_exceedance_ratio'] = self.calculate_who_exceedance_ratio(df['forecasted_pm25'])
        
        # Generate risk labels based on complex interaction of features (AI learns these patterns)
        # This simulates how real health risk data would be labeled
        risk_scores = (
            df['forecasted_pm25'] * 0.3 +
            df['forecasted_aqi'] * 0.2 +
            df['who_exceedance_ratio'] * 0.25 +
            (df['aqi_trend'] == 1) * 0.1 +  # Increasing trend adds risk
            (df['persona_code'] == 1) * 0.05 +  # Children higher risk
            (df['persona_code'] == 2) * 0.05 +  # Elderly higher risk  
            (df['persona_code'] == 3) * 0.08 +  # Workers highest risk
            df['exposure_hours'] * 0.02 -
            df['wind_speed'] * 0.05
        )
        
        # Convert risk scores to categories (AI learns these boundaries)
        risk_labels = []
        for score in risk_scores:
            if score < 20:
                risk_labels.append('Low')
            elif score < 40:
                risk_labels.append('Moderate')
            elif score < 70:
                risk_labels.append('High')
            else:
                risk_labels.append('Hazardous')
        
        df['risk_category'] = risk_labels
        return df
    
    def train_health_model(self, training_data_path=None):
        """
        Train the health risk classification model
        Args:
            training_data_path: Path to training CSV file (optional, will generate synthetic data if not provided)
        """
        print("🏥 Training Health Risk Classification Model...")
        
        # Load or generate training data
        if training_data_path and os.path.exists(training_data_path):
            print(f"📊 Loading training data from {training_data_path}")
            df = pd.read_csv(training_data_path)
        else:
            print("🔄 Generating synthetic training data (replace with real data in production)")
            df = self.generate_synthetic_training_data()
        
        # Prepare features and target
        X = df[self.feature_columns]
        y = df['risk_category']
        
        # Encode target labels
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Train RandomForest model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"✅ Model trained successfully!")
        print(f"📈 Training Accuracy: {accuracy:.3f}")
        print(f"🎯 Risk Categories: {list(self.label_encoder.classes_)}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': self.feature_columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n🔍 Feature Importance:")
        for _, row in feature_importance.iterrows():
            print(f"   {row['feature']}: {row['importance']:.3f}")
        
        # Save model and artifacts
        self.save_model()
        
        return accuracy
    
    def predict_health_risk(self, forecast_data):
        """
        Predict health risk category for given forecast data
        Args:
            forecast_data: Dictionary with required features
        Returns:
            Dictionary with risk prediction and confidence
        """
        if self.model is None:
            self.load_model()
        
        # Prepare input data
        input_df = pd.DataFrame([forecast_data])
        
        # Calculate WHO exceedance ratio if not provided
        if 'who_exceedance_ratio' not in forecast_data:
            input_df['who_exceedance_ratio'] = self.calculate_who_exceedance_ratio(
                forecast_data['forecasted_pm25']
            )
        
        # Ensure all required features are present
        for feature in self.feature_columns:
            if feature not in input_df.columns:
                raise ValueError(f"Missing required feature: {feature}")
        
        # Scale features
        X_scaled = self.scaler.transform(input_df[self.feature_columns])
        
        # Make prediction
        prediction_proba = self.model.predict_proba(X_scaled)[0]
        prediction_index = self.model.predict(X_scaled)[0]
        
        # Get prediction and confidence
        risk_category = self.label_encoder.inverse_transform([prediction_index])[0]
        confidence = np.max(prediction_proba)
        
        # Get color mapping for visualization
        color_mapping = {
            'Low': '#00e400',      # Green
            'Moderate': '#ffff00', # Yellow  
            'High': '#ff0000',     # Red
            'Hazardous': '#7e0023' # Purple
        }
        
        return {
            'risk_category': risk_category,
            'confidence': confidence,
            'color': color_mapping.get(risk_category, '#808080'),
            'risk_score': float(prediction_proba[prediction_index]),
            'all_probabilities': {
                self.label_encoder.inverse_transform([i])[0]: float(prob) 
                for i, prob in enumerate(prediction_proba)
            }
        }
    
    def save_model(self):
        """Save trained model and preprocessing artifacts"""
        os.makedirs('models', exist_ok=True)
        
        # Save model
        with open('models/health_risk_model.pkl', 'wb') as f:
            pickle.dump(self.model, f)
        
        # Save label encoder
        with open('models/risk_label_encoder.pkl', 'wb') as f:
            pickle.dump(self.label_encoder, f)
        
        # Save scaler
        with open('models/feature_scaler.pkl', 'wb') as f:
            pickle.dump(self.scaler, f)
        
        print("💾 Model and artifacts saved to models/ directory")
    
    def load_model(self):
        """Load trained model and preprocessing artifacts"""
        try:
            # Load model
            with open('models/health_risk_model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            
            # Load label encoder
            with open('models/risk_label_encoder.pkl', 'rb') as f:
                self.label_encoder = pickle.load(f)
            
            # Load scaler
            with open('models/feature_scaler.pkl', 'rb') as f:
                self.scaler = pickle.load(f)
            
            print("✅ Model and artifacts loaded successfully")
            
        except FileNotFoundError:
            print("❌ Model files not found. Please train the model first.")
            raise

# Global model instance
health_model = HealthRiskModel()

def train_health_model(training_data_path='data/health_risk_training.csv'):
    """
    Train health risk model - main entry point
    Args:
        training_data_path: Path to training data file
    """
    return health_model.train_health_model(training_data_path)

def predict_health_risk(forecast_data):
    """
    Predict health risk - main entry point
    Args:
        forecast_data: Dictionary with forecast features
    Returns:
        Risk prediction with confidence and color
    """
    return health_model.predict_health_risk(forecast_data)

if __name__ == "__main__":
    # Example usage
    print("🚀 AeroGuard Health Risk Model")
    print("=" * 50)
    
    # Train model
    accuracy = train_health_model()
    
    # Example prediction
    example_forecast = {
        'forecasted_pm25': 35.5,
        'forecasted_aqi': 125,
        'aqi_trend': 1,  # Increasing
        'wind_speed': 2.1,
        'humidity': 65,
        'exposure_hours': 4,
        'persona_code': 1  # Children
    }
    
    result = predict_health_risk(example_forecast)
    print(f"\n🔮 Example Prediction:")
    print(f"   Risk: {result['risk_category']}")
    print(f"   Confidence: {result['confidence']:.2f}")
    print(f"   Color: {result['color']}")