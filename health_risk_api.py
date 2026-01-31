"""
AeroGuard Health Risk API
Integrates with Temporal Prediction Engine for real-time health risk assessment
"""

from flask import Flask, request, jsonify
from health_risk_classifier import HealthRiskClassifier
import pandas as pd
import numpy as np

app = Flask(__name__)

# Load the trained model
classifier = HealthRiskClassifier()
classifier.load_model('aeroguard_health_risk_model.pkl')

@app.route('/health-risk', methods=['POST'])
def predict_health_risk():
    """
    Predict health risk based on forecast data and user profile
    """
    try:
        data = request.get_json()
        
        # Extract forecast data
        forecast_data = {
            'aqi': data.get('aqi', 100),
            'pm25': data.get('pm25', 50),
            'pm10': data.get('pm10', 75),
            'temperature': data.get('temperature', 25),
            'humidity': data.get('humidity', 60),
            'wind_speed': data.get('wind_speed', 5),
            'pressure': data.get('pressure', 1013),
            'visibility': data.get('visibility', 8)
        }
        
        # Extract user profile
        persona_type = data.get('persona', 'general_public')
        exposure_duration = data.get('exposure_duration', 2)
        
        # Validate inputs
        if persona_type not in ['children_elderly', 'outdoor_workers', 'general_public']:
            return jsonify({'error': 'Invalid persona type'}), 400
        
        if not 0 <= exposure_duration <= 24:
            return jsonify({'error': 'Exposure duration must be between 0 and 24 hours'}), 400
        
        # Make prediction
        result = classifier.predict_risk(forecast_data, persona_type, exposure_duration)
        
        # Generate health advice
        advice = classifier.generate_health_advice(result['risk_category'], persona_type)
        
        # Generate explanation
        explanation = f"Risk classified as {result['risk_category']} based on current environmental conditions and {persona_type.replace('_', ' ')} profile."
        
        # Prepare response
        response = {
            'success': True,
            'health_risk': {
                'category': result['risk_category'],
                'confidence': max(result['risk_probabilities'].values()),
                'probabilities': result['risk_probabilities'],
                'explanation': explanation,
                'health_advice': advice,
                'persona': persona_type,
                'exposure_duration': exposure_duration,
                'forecast_data': forecast_data
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch-health-risk', methods=['POST'])
def predict_batch_health_risk():
    """
    Predict health risk for multiple scenarios (e.g., 6-hour forecast)
    """
    try:
        data = request.get_json()
        
        # Extract forecast data for multiple time points
        forecasts = data.get('forecasts', [])
        persona_type = data.get('persona', 'general_public')
        
        if not forecasts:
            return jsonify({'error': 'No forecast data provided'}), 400
        
        results = []
        
        for i, forecast in enumerate(forecasts):
            # Extract forecast data for this time point
            forecast_data = {
                'aqi': forecast.get('aqi', 100),
                'pm25': forecast.get('pm25', 50),
                'pm10': forecast.get('pm10', 75),
                'temperature': forecast.get('temperature', 25),
                'humidity': forecast.get('humidity', 60),
                'wind_speed': forecast.get('wind_speed', 5),
                'pressure': forecast.get('pressure', 1013),
                'visibility': forecast.get('visibility', 8)
            }
            
            # Assume 2-hour exposure for each time point
            exposure_duration = forecast.get('exposure_duration', 2)
            
            # Make prediction
            result = classifier.predict_risk(forecast_data, persona_type, exposure_duration)
            
            # Generate health advice
            advice = classifier.generate_health_advice(result['risk_category'], persona_type)
            
            results.append({
                'hour': i + 1,
                'risk_category': result['risk_category'],
                'confidence': max(result['risk_probabilities'].values()),
                'health_advice': advice,
                'forecast_data': forecast_data
            })
        
        return jsonify({
            'success': True,
            'persona': persona_type,
            'risk_timeline': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/risk-insights', methods=['POST'])
def get_risk_insights():
    """
    Get detailed insights about health risk factors
    """
    try:
        data = request.get_json()
        
        # Extract forecast data
        forecast_data = {
            'aqi': data.get('aqi', 100),
            'pm25': data.get('pm25', 50),
            'pm10': data.get('pm10', 75),
            'temperature': data.get('temperature', 25),
            'humidity': data.get('humidity', 60),
            'wind_speed': data.get('wind_speed', 5),
            'pressure': data.get('pressure', 1013),
            'visibility': data.get('visibility', 8)
        }
        
        persona_type = data.get('persona', 'general_public')
        exposure_duration = data.get('exposure_duration', 2)
        
        # Make prediction
        result = classifier.predict_risk(forecast_data, persona_type, exposure_duration)
        
        # Feature importance analysis
        feature_importance = pd.DataFrame({
            'feature': classifier.feature_names,
            'importance': classifier.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        # Risk factor analysis
        risk_factors = []
        
        # PM2.5 analysis
        pm25 = forecast_data['pm25']
        if pm25 > 150:
            risk_factors.append({
                'factor': 'PM2.5',
                'level': 'Hazardous',
                'description': f'PM2.5 level ({pm25} µg/m³) is extremely hazardous',
                'impact': 'Severe'
            })
        elif pm25 > 75:
            risk_factors.append({
                'factor': 'PM2.5',
                'level': 'High',
                'description': f'PM2.5 level ({pm25} µg/m³) is very high',
                'impact': 'High'
            })
        elif pm25 > 35:
            risk_factors.append({
                'factor': 'PM2.5',
                'level': 'Moderate',
                'description': f'PM2.5 level ({pm25} µg/m³) is elevated',
                'impact': 'Moderate'
            })
        
        # Wind speed analysis
        wind_speed = forecast_data['wind_speed']
        if wind_speed < 2:
            risk_factors.append({
                'factor': 'Wind Speed',
                'level': 'Poor',
                'description': f'Low wind speed ({wind_speed} km/h) prevents pollution dispersion',
                'impact': 'High'
            })
        
        # Humidity analysis
        humidity = forecast_data['humidity']
        if humidity > 80:
            risk_factors.append({
                'factor': 'Humidity',
                'level': 'High',
                'description': f'High humidity ({humidity}%) can increase pollutant impact',
                'impact': 'Moderate'
            })
        
        return jsonify({
            'success': True,
            'risk_category': result['risk_category'],
            'confidence': max(result['risk_probabilities'].values()),
            'feature_importance': feature_importance.head(10).to_dict('records'),
            'risk_factors': risk_factors,
            'persona_analysis': {
                'type': persona_type,
                'sensitivity': classifier.personas[persona_type]['sensitivity'],
                'baseline_risk': classifier.personas[persona_type]['baseline_risk']
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health-check', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': 'AeroGuard Health Risk Classifier',
        'version': '1.0.0',
        'features': ['risk_classification', 'batch_prediction', 'risk_insights']
    })

if __name__ == '__main__':
    print("🚀 Starting AeroGuard Health Risk API...")
    print("📡 Ready to integrate with Temporal Prediction Engine!")
    app.run(host='0.0.0.0', port=5005, debug=True)
