# forecast_api.py

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from preprocess import load_and_prepare_data
from predict import forecast_next_hours

app = Flask(__name__)
CORS(app)

@app.route('/forecast/<city>/<hours>')
def get_forecast(city, hours):
    """Get AQI forecast for specified city and hours"""
    try:
        # Map city names to proper format
        city_mapping = {
            'cbd-belapur': 'CBD Belapur',
            'vashi': 'Vashi',
            'sanpada': 'Sanpada'
        }
        
        proper_city = city_mapping.get(city.lower(), city)
        hours = int(hours)
        
        # Get historical data from database
        conn = sqlite3.connect('aqi_data.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT timestamp, aqi
            FROM aqi_summary 
            WHERE location = ? 
            AND timestamp >= datetime('now', '-7 days')
            ORDER BY timestamp ASC
        ''', (location,))
        
        results = cursor.fetchall()
        conn.close()
        
        if not results:
            # Return synthetic data if no real data
            return generate_synthetic_forecast(location, int(hours))
        
        # Create historical data
        historical = {
            'labels': [row[0][-8:] for row in results[-24:]],  # Last 24 hours
            'values': [row[1] for row in results[-24:]]
        }
        
        # Generate simple forecast (average of recent values with some variation)
        recent_avg = sum(historical['values'][-6:]) / 6  # Average of last 6 hours
        forecast_values = []
        
        for i in range(int(hours)):
            # Add some variation to the average
            variation = 1.0 + (0.1 * (i % 3 - 1))  # -10%, 0%, +10% variation
            forecast_value = recent_avg * variation
            forecast_values.append(max(20, min(300, forecast_value)))
        
        forecast = {
            'labels': [f'Hour {i+1}' for i in range(int(hours))],
            'values': forecast_values
        }
        
        return jsonify({
            'success': True,
            'city': location,
            'historical': historical,
            'forecast': forecast
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

def generate_synthetic_forecast(location, hours):
    """Generate synthetic forecast data"""
    base_aqi = {
        'CBD Belapur': 125,
        'Vashi': 138,
        'Sanpada': 97
    }
    
    base_value = base_aqi.get(location, 100)
    
    # Generate historical data (last 24 hours)
    historical_labels = [f'{i:02d}:00' for i in range(24)]
    historical_values = []
    
    for i in range(24):
        hour = datetime.now().hour - (23 - i)
        variation = 1.0
        
        # Add time-based patterns
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            variation *= 1.2  # Rush hours
        elif 22 <= hour or hour <= 5:
            variation *= 0.8  # Night time
        
        value = base_value * variation * (0.9 + 0.2 * (i % 5) / 4)
        historical_values.append(max(20, min(300, value)))
    
    # Generate forecast data
    forecast_labels = [f'Hour {i+1}' for i in range(hours)]
    forecast_values = []
    
    for i in range(hours):
        variation = 1.0 + (0.1 * (i % 3 - 1))
        value = base_value * variation
        forecast_values.append(max(20, min(300, value)))
    
    return jsonify({
        'success': True,
        'city': location,
        'historical': {
            'labels': historical_labels,
            'values': historical_values
        },
        'forecast': {
            'labels': forecast_labels,
            'values': forecast_values
        }
    })

@app.route('/')
def serve_index():
    return send_from_directory('.', 'aqi-predictor.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
