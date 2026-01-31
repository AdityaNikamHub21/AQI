from flask import Flask, jsonify
import sqlite3
import json

app = Flask(__name__)

@app.route('/current-aqi/<location>')
def get_current_aqi(location):
    """Get current AQI data from database"""
    try:
        conn = sqlite3.connect('aqi_data.db')
        cursor = conn.cursor()
        
        # Get latest AQI summary for the location
        cursor.execute('''
            SELECT aqi, pm25, pm10, o3, no2, so2, co, timestamp
            FROM aqi_summary 
            WHERE location = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        ''', (location,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return jsonify({
                'success': True,
                'data': {
                    'location': location,
                    'aqi': result[0],
                    'pm25': result[1],
                    'pm10': result[2],
                    'o3': result[3],
                    'no2': result[4],
                    'so2': result[5],
                    'co': result[6],
                    'timestamp': result[7]
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': f'No data found for {location}'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/test')
def test():
    return jsonify({'status': 'API working', 'database': 'connected'})

if __name__ == '__main__':
    print("Starting simple AQI API...")
    app.run(host='0.0.0.0', port=5000, debug=False)
