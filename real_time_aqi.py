import sqlite3
import requests
import json
import pandas as pd
from datetime import datetime, timedelta
import time

class RealTimeAQI:
    def __init__(self, db_path="aqi_data.db"):
        self.db_path = db_path
        self.base_url = "https://api.openaq.org/v1/measurements"
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database for storing AQI data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create AQI readings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS aqi_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                city TEXT,
                country TEXT,
                parameter TEXT,
                value REAL,
                unit TEXT,
                timestamp DATETIME,
                coordinates TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create aggregated AQI table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS aqi_summary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                aqi REAL,
                pm25 REAL,
                pm10 REAL,
                o3 REAL,
                no2 REAL,
                so2 REAL,
                co REAL,
                timestamp DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized successfully")

    def get_location_coordinates(self, location):
        """Get coordinates for Mumbai locations"""
        location_coords = {
            'cbd belapur': {'lat': 19.0158, 'lon': 73.1187},
            'vashi': {'lat': 19.1735, 'lon': 73.0086},
            'sanpada': {'lat': 19.0477, 'lon': 73.0996},
            'navi mumbai': {'lat': 19.0330, 'lon': 73.0297},
            'mumbai': {'lat': 19.0760, 'lon': 72.8777}
        }
        return location_coords.get(location.lower())

    def fetch_aqi_data(self, location, parameters=None):
        """Fetch real-time AQI data from OpenAQ API"""
        if parameters is None:
            parameters = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']
        
        coords = self.get_location_coordinates(location)
        if not coords:
            print(f"Coordinates not found for location: {location}")
            return None
        
        all_data = []
        
        for parameter in parameters:
            try:
                # Get measurements from last 24 hours
                url = f"{self.base_url}"
                params = {
                    'coordinates': f"{coords['lat']},{coords['lon']}",
                    'parameter': parameter,
                    'date_from': (datetime.now() - timedelta(days=1)).isoformat(),
                    'date_to': datetime.now().isoformat(),
                    'limit': 100,
                    'order_by': 'timestamp'
                }
                
                response = requests.get(url, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('results'):
                        all_data.extend(data['results'])
                        print(f"Fetched {len(data['results'])} {parameter} readings for {location}")
                    else:
                        print(f"No {parameter} data found for {location}")
                else:
                    print(f"API error for {parameter}: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"Request failed for {parameter}: {e}")
                continue
            
            # Rate limiting - avoid hitting API too hard
            time.sleep(0.5)
        
        return all_data

    def store_aqi_data(self, location, measurements):
        """Store AQI measurements in database"""
        if not measurements:
            return False
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        stored_count = 0
        for measurement in measurements:
            try:
                cursor.execute('''
                    INSERT INTO aqi_readings 
                    (location, city, country, parameter, value, unit, timestamp, coordinates)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    location,
                    measurement.get('city', ''),
                    measurement.get('country', ''),
                    measurement.get('parameter', ''),
                    measurement.get('value', 0),
                    measurement.get('unit', ''),
                    measurement.get('date', ''),
                    json.dumps(measurement.get('coordinates', {}))
                ))
                stored_count += 1
            except sqlite3.Error as e:
                print(f"Database error: {e}")
                continue
        
        conn.commit()
        conn.close()
        print(f"Stored {stored_count} measurements for {location}")
        return True

    def calculate_aqi_summary(self, location):
        """Calculate AQI summary from individual measurements"""
        conn = sqlite3.connect(self.db_path)
        
        # Get latest measurements for each parameter
        query = '''
            SELECT parameter, value, timestamp 
            FROM aqi_readings 
            WHERE location = ? 
            AND timestamp >= datetime('now', '-24 hours')
            GROUP BY parameter 
            ORDER BY timestamp DESC
        '''
        
        df = pd.read_sql_query(query, conn, params=(location,))
        conn.close()
        
        if df.empty:
            return None
        
        # Get latest value for each parameter
        latest_values = {}
        for _, row in df.iterrows():
            if row['parameter'] not in latest_values:
                latest_values[row['parameter']] = row['value']
        
        # Calculate AQI using simplified method
        pm25 = latest_values.get('pm25', 0)
        pm10 = latest_values.get('pm10', 0)
        o3 = latest_values.get('o3', 0)
        no2 = latest_values.get('no2', 0)
        so2 = latest_values.get('so2', 0)
        co = latest_values.get('co', 0)
        
        # Simplified AQI calculation (using PM2.5 as primary)
        if pm25 > 0:
            aqi = self.pm25_to_aqi(pm25)
        elif pm10 > 0:
            aqi = self.pm10_to_aqi(pm10)
        else:
            aqi = 50  # Default to moderate
        
        # Store summary
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO aqi_summary 
            (location, aqi, pm25, pm10, o3, no2, so2, co, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            location, aqi, pm25, pm10, o3, no2, so2, co, datetime.now()
        ))
        conn.commit()
        conn.close()
        
        return {
            'location': location,
            'aqi': round(aqi, 1),
            'pm25': pm25,
            'pm10': pm10,
            'o3': o3,
            'no2': no2,
            'so2': so2,
            'co': co,
            'timestamp': datetime.now().isoformat()
        }

    def pm25_to_aqi(self, pm25):
        """Convert PM2.5 to AQI using EPA breakpoints"""
        if pm25 <= 12.0:
            return (50 / 12.0) * pm25
        elif pm25 <= 35.4:
            return 50 + ((100 - 50) / (35.4 - 12.0)) * (pm25 - 12.0)
        elif pm25 <= 55.4:
            return 100 + ((150 - 100) / (55.4 - 35.4)) * (pm25 - 35.4)
        elif pm25 <= 150.4:
            return 150 + ((200 - 150) / (150.4 - 55.4)) * (pm25 - 55.4)
        elif pm25 <= 250.4:
            return 200 + ((300 - 200) / (250.4 - 150.4)) * (pm25 - 150.4)
        else:
            return 300 + ((500 - 300) / (500.4 - 250.4)) * (pm25 - 250.4)

    def pm10_to_aqi(self, pm10):
        """Convert PM10 to AQI using EPA breakpoints"""
        if pm10 <= 54:
            return (50 / 54) * pm10
        elif pm10 <= 154:
            return 50 + ((100 - 50) / (154 - 54)) * (pm10 - 54)
        elif pm10 <= 254:
            return 100 + ((150 - 100) / (254 - 154)) * (pm10 - 154)
        elif pm10 <= 354:
            return 150 + ((200 - 150) / (354 - 254)) * (pm10 - 254)
        elif pm10 <= 424:
            return 200 + ((300 - 200) / (424 - 354)) * (pm10 - 354)
        else:
            return 300 + ((500 - 300) / (604 - 424)) * (pm10 - 424)

    def get_historical_data(self, location, days=7):
        """Get historical data for ML training"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT timestamp, aqi, pm25, pm10, o3, no2, so2, co
            FROM aqi_summary 
            WHERE location = ? 
            AND timestamp >= datetime('now', '-{} days')
            ORDER BY timestamp ASC
        '''.format(days)
        
        df = pd.read_sql_query(query, conn, params=(location,))
        conn.close()
        
        if df.empty:
            print(f"No historical data found for {location}")
            return None
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df

    def update_location_data(self, location):
        """Update data for a specific location"""
        print(f"Updating real-time AQI data for {location}...")
        
        # Fetch from OpenAQ API
        measurements = self.fetch_aqi_data(location)
        
        if measurements:
            # Store in database
            if self.store_aqi_data(location, measurements):
                # Calculate AQI summary
                summary = self.calculate_aqi_summary(location)
                print(f"Updated {location}: AQI = {summary['aqi'] if summary else 'N/A'}")
                return summary
        else:
            print(f"No data available for {location}")
            return None

    def update_all_locations(self):
        """Update data for all supported locations"""
        locations = ['cbd belapur', 'vashi', 'sanpada']
        results = {}
        
        for location in locations:
            try:
                results[location] = self.update_location_data(location)
                time.sleep(1)  # Rate limiting between locations
            except Exception as e:
                print(f"Error updating {location}: {e}")
                results[location] = None
        
        return results

if __name__ == "__main__":
    # Test the real-time AQI data fetcher
    aqi_fetcher = RealTimeAQI()
    
    # Update all locations
    results = aqi_fetcher.update_all_locations()
    
    print("\n=== Update Results ===")
    for location, data in results.items():
        if data:
            print(f"{location.title()}: AQI = {data['aqi']}")
        else:
            print(f"{location.title()}: No data")
