import http.server
import socketserver
import sqlite3
import json
from urllib.parse import unquote

class AQIHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/current-aqi/'):
            # Extract location from URL
            location = unquote(self.path.split('/')[-1])
            
            try:
                conn = sqlite3.connect('aqi_data.db')
                cursor = conn.cursor()
                
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
                    response = {
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
                    }
                else:
                    response = {
                        'success': False,
                        'message': f'No data found for {location}'
                    }
                    
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                error_response = {
                    'success': False,
                    'message': str(e)
                }
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode())
        else:
            # Serve static files
            super().do_GET()

if __name__ == '__main__':
    PORT = 5004
    with socketserver.TCPServer(("", PORT), AQIHandler) as httpd:
        print(f"🚀 AQI API Server running on http://localhost:{PORT}")
        print("✅ Database connected and ready")
        print("📊 Serving real AQI data from SQLite")
        httpd.serve_forever()
