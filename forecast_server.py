"""
AeroGuard: Forecast API Server
Provides 6-hour AQI forecast data with real-time updates
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json

app = Flask(__name__)
CORS(app)

class ForecastAPI:
    """
    API server for AQI forecast data
    """
    
    def __init__(self):
        self.load_historical_data()
        self.current_forecasts = {}
        
    def load_historical_data(self):
        """
        Load historical AQI data from CSV files
        """
        self.historical_data = {}
        
        try:
            # Load CBD Belapur data
            cbd_data = pd.read_csv('sample-aqi-data.csv')
            cbd_rows = cbd_data[cbd_data['location'].str.lower() == 'cbd belapur']
            if not cbd_rows.empty:
                self.historical_data['cbd_belapur'] = cbd_rows.iloc[0].to_dict()
            
            # Load Vashi data
            vashi_data = pd.read_csv('vashi.csv')
            if not vashi_data.empty:
                self.historical_data['vashi'] = vashi_data.iloc[0].to_dict()
            
            # Load Sanpada data
            sanpada_data = pd.read_csv('sanpada-aqi-data.csv')
            if not sanpada_data.empty:
                self.historical_data['sanpada'] = sanpada_data.iloc[0].to_dict()
            
            print("✅ Historical data loaded successfully")
            
        except Exception as e:
            print(f"❌ Error loading historical data: {e}")
            # Fallback data
            self.historical_data = {
                'cbd_belapur': {'aqi': 104, 'pm25': 87.1, 'pm10': 52.0, 'wind_speed': 12.3},
                'vashi': {'aqi': 138, 'pm25': 72.0, 'pm10': 98.0, 'wind_speed': 14.0},
                'sanpada': {'aqi': 78, 'pm25': 78.9, 'pm10': 45.6, 'wind_speed': 8.7}
            }
    
    def generate_forecast(self, city, hours=6):
        """
        Generate 6-hour AQI forecast for a city
        """
        if city not in self.historical_data:
            return None
        
        current_data = self.historical_data[city]
        current_aqi = current_data.get('aqi', 100)
        
        # Generate forecast with realistic variations
        forecast = []
        base_aqi = current_aqi
        
        for hour in range(1, hours + 1):
            # Add realistic variations based on time of day and patterns
            hour_variation = self.get_hourly_variation(hour, current_data.get('wind_speed', 10))
            random_factor = random.uniform(-5, 5)  # Random variation
            
            forecast_aqi = base_aqi + hour_variation + random_factor
            forecast_aqi = max(50, min(300, forecast_aqi))  # Keep in realistic range
            
            forecast.append({
                'hour': hour,
                'aqi': round(forecast_aqi, 1),
                'timestamp': (datetime.now() + timedelta(hours=hour)).strftime('%Y-%m-%d %H:%M:%S'),
                'pm25': round(forecast_aqi * 0.7, 1),  # Approximate PM2.5 based on AQI
                'pm10': round(forecast_aqi * 0.9, 1),   # Approximate PM10 based on AQI
                'confidence': round(95 - (hour * 5), 1)  # Decreasing confidence over time
            })
            
            base_aqi = forecast_aqi  # Use previous forecast as base for next hour
        
        return forecast
    
    def get_hourly_variation(self, hour, wind_speed):
        """
        Get realistic hourly AQI variation based on environmental factors
        """
        # Base pattern: AQI tends to increase during day, decrease at night
        current_hour = datetime.now().hour
        target_hour = (current_hour + hour) % 24
        
        # Morning rush (7-9 AM): +10 to +20
        if 7 <= target_hour <= 9:
            return random.uniform(10, 20)
        
        # Midday (11 AM - 2 PM): +5 to +15
        elif 11 <= target_hour <= 14:
            return random.uniform(5, 15)
        
        # Evening rush (5-7 PM): +15 to +25
        elif 17 <= target_hour <= 19:
            return random.uniform(15, 25)
        
        # Night (10 PM - 5 AM): -10 to -5
        elif 22 <= target_hour or target_hour <= 5:
            return random.uniform(-10, -5)
        
        # Other times: -5 to +5
        else:
            return random.uniform(-5, 5)
    
    def get_current_aqi(self, city):
        """
        Get current AQI for a city
        """
        if city in self.historical_data:
            data = self.historical_data[city]
            # Add small random variation to simulate real-time changes
            variation = random.uniform(-3, 3)
            current_aqi = data.get('aqi', 100) + variation
            current_aqi = max(50, min(300, current_aqi))
            
            return {
                'success': True,
                'data': {
                    'aqi': round(current_aqi, 1),
                    'pm25': data.get('pm25', 70),
                    'pm10': data.get('pm10', 50),
                    'o3': data.get('o3', 25),
                    'no2': data.get('no2', 30),
                    'so2': data.get('so2', 10),
                    'co': data.get('co', 4),
                    'wind_speed': data.get('wind_speed', 10),
                    'humidity': data.get('humidity', 60),
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'location': city.title()
                }
            }
        else:
            return {'success': False, 'error': 'City not found'}

# Initialize forecast API
forecast_api = ForecastAPI()

@app.route('/current-aqi/<city>', methods=['GET'])
def get_current_aqi(city):
    """
    Get current AQI for a city
    """
    return jsonify(forecast_api.get_current_aqi(city))

@app.route('/forecast-aqi/<city>', methods=['GET'])
def get_forecast_aqi(city):
    """
    Get 6-hour AQI forecast for a city
    """
    hours = request.args.get('hours', 6, type=int)
    hours = min(24, max(1, hours))  # Limit between 1-24 hours
    
    forecast = forecast_api.generate_forecast(city, hours)
    
    if forecast:
        return jsonify({
            'success': True,
            'data': {
                'city': city.title(),
                'forecast_hours': hours,
                'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'forecast': forecast
            }
        })
    else:
        return jsonify({
            'success': False,
            'error': f'Forecast not available for {city}'
        })

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'cities_available': list(forecast_api.historical_data.keys())
    })

@app.route('/', methods=['GET'])
def index():
    """
    API documentation
    """
    return jsonify({
        'name': 'AeroGuard Forecast API',
        'version': '1.0.0',
        'endpoints': {
            '/current-aqi/<city>': 'Get current AQI data',
            '/forecast-aqi/<city>?hours=6': 'Get hourly AQI forecast',
            '/health': 'API health check'
        },
        'cities': list(forecast_api.historical_data.keys()),
        'example': '/forecast-aqi/vashi?hours=6'
    })

if __name__ == '__main__':
    print("🌍 AeroGuard Forecast API Server")
    print("=" * 50)
    print("🚀 Starting server on http://localhost:5005")
    print("📊 Available endpoints:")
    print("   GET /current-aqi/<city>")
    print("   GET /forecast-aqi/<city>?hours=6")
    print("   GET /health")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5005, debug=True)
