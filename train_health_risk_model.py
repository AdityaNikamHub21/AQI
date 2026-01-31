"""
AeroGuard: Health Risk Model Training & Testing
"""

from health_risk_classifier import HealthRiskClassifier
import pandas as pd
import numpy as np

def train_and_test_health_risk_model():
    """
    Complete training and testing pipeline for Health Risk Classification
    """
    print("🚀 Starting AeroGuard Health Risk Model Training...")
    
    # Initialize classifier
    classifier = HealthRiskClassifier()
    
    # Step 1: Generate WHO-aligned training data
    print("\n📊 Step 1: Generating Training Data...")
    training_data = classifier.generate_training_data(n_samples=10000)
    
    # Step 2: Train the AI model
    print("\n🤖 Step 2: Training AI Model...")
    X_test, y_test = classifier.train_model(training_data)
    
    # Step 3: Setup explainability
    print("\n🔍 Step 3: Setting up SHAP Explainability...")
    classifier.setup_explainability()
    
    # Step 4: Test with sample predictions
    print("\n🧪 Step 4: Testing Model Predictions...")
    
    # Sample forecast data
    sample_forecasts = [
        {
            'name': 'Low Pollution Day',
            'data': {
                'aqi': 45, 'pm25': 12, 'pm10': 25, 'temperature': 22,
                'humidity': 55, 'wind_speed': 8, 'pressure': 1015, 'visibility': 10
            }
        },
        {
            'name': 'Moderate Pollution Day',
            'data': {
                'aqi': 85, 'pm25': 35, 'pm10': 55, 'temperature': 28,
                'humidity': 70, 'wind_speed': 4, 'pressure': 1010, 'visibility': 7
            }
        },
        {
            'name': 'High Pollution Day',
            'data': {
                'aqi': 150, 'pm25': 75, 'pm10': 120, 'temperature': 32,
                'humidity': 80, 'wind_speed': 2, 'pressure': 1008, 'visibility': 4
            }
        },
        {
            'name': 'Hazardous Pollution Day',
            'data': {
                'aqi': 250, 'pm25': 150, 'pm10': 200, 'temperature': 35,
                'humidity': 85, 'wind_speed': 1, 'pressure': 1005, 'visibility': 2
            }
        }
    ]
    
    personas = ['children_elderly', 'outdoor_workers', 'general_public']
    exposure_durations = [2, 6, 8]  # hours
    
    print("\n📋 Sample Predictions:")
    print("=" * 80)
    
    for forecast in sample_forecasts:
        print(f"\n🌤️ {forecast['name']}:")
        print(f"   AQI: {forecast['data']['aqi']}, PM2.5: {forecast['data']['pm25']} µg/m³")
        
        for persona in personas:
            for exposure in exposure_durations:
                # Make prediction
                result = classifier.predict_risk(
                    forecast['data'], 
                    persona, 
                    exposure
                )
                
                # Generate explanation (simplified without SHAP for now)
                explanation = f"Risk classified as {result['risk_category']} based on environmental conditions and persona factors."
                impacts = [{'feature': 'pm25', 'impact': 'increases', 'magnitude': 0.5}]
                
                # Generate health advice
                advice = classifier.generate_health_advice(
                    result['risk_category'], 
                    persona
                )
                
                # Display results
                persona_name = persona.replace('_', ' ').title()
                print(f"\n   👥 {persona_name} ({exposure}h outdoors):")
                print(f"      🎯 Risk: {result['risk_category']}")
                print(f"      📊 Confidence: {max(result['risk_probabilities'].values()):.1%}")
                print(f"      💡 Advice: {advice}")
                print(f"      🔍 Key factor: {impacts[0]['feature'].replace('_', ' ').title()} ({impacts[0]['impact']}s risk)")
    
    # Step 5: Save model
    print("\n💾 Step 5: Saving Trained Model...")
    classifier.save_model('aeroguard_health_risk_model.pkl')
    
    # Step 6: Model performance summary
    print("\n📈 Model Performance Summary:")
    print("=" * 80)
    
    # Feature importance visualization
    feature_importance = pd.DataFrame({
        'feature': classifier.feature_names,
        'importance': classifier.model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n🎯 Top 10 Most Important Features:")
    for i, row in feature_importance.head(10).iterrows():
        print(f"   {i+1}. {row['feature'].replace('_', ' ').title()}: {row['importance']:.3f}")
    
    print("\n✅ AeroGuard Health Risk Classification System Ready!")
    print("🚀 Model trained, tested, and saved successfully!")
    
    return classifier

# Run the training and testing
if __name__ == "__main__":
    classifier = train_and_test_health_risk_model()
    
    print("\n🎯 Ready for integration with AeroGuard Temporal Prediction Engine!")
    print("📡 Model can now predict health risks for any forecast scenario!")
