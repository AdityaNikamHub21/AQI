import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sqlite3
from preprocess import load_and_prepare_data
from model import train_model, load_existing_model
from predict import forecast_next_hours
from real_time_aqi import RealTimeAQI

def main():
    print("🌍 AQI Forecasting System with Real-Time Data")
    print("=" * 50)
    
    # Initialize real-time AQI fetcher
    aqi_fetcher = RealTimeAQI()
    
    # Update real-time data first
    print("\n📡 Fetching real-time AQI data...")
    real_time_results = aqi_fetcher.update_all_locations()
    
    # Supported locations
    locations = ['CBD Belapur', 'Vashi', 'Sanpada']
    
    for location in locations:
        print(f"\n🏙️ Processing {location}...")
        
        # Try to get real-time data first
        location_key = location.lower().replace(' ', ' ')
        real_time_data = real_time_results.get(location_key)
        
        if real_time_data:
            print(f"✅ Using real-time data: AQI = {real_time_data['aqi']}")
            
            # Get historical data from database
            df = aqi_fetcher.get_historical_data(location, days=30)
            
            if df is not None and len(df) > 0:
                print(f"📊 Using {len(df)} historical records")
                
                # Prepare data for ML
                df_prepared = load_and_prepare_data(df)
                
                # Train model with real data
                model_path = f"models/{location.lower().replace(' ', '_')}_model.h5"
                
                print(f"🤖 Training ML model for {location}...")
                model, scaler, history = train_model(
                    df_prepared, 
                    model_path, 
                    window_size=72, 
                    epochs=100
                )
                
                # Make forecasts
                print(f"🔮 Generating forecasts...")
                forecast_6h = forecast_next_hours(df_prepared, model_path, hours=6, window_size=72, epochs=100)
                forecast_12h = forecast_next_hours(df_prepared, model_path, hours=12, window_size=72, epochs=100)
                
                print(f"📈 6-hour forecast: {forecast_6h}")
                print(f"📈 12-hour forecast: {forecast_12h}")
                
                # Calculate accuracy metrics
                if len(forecast_6h) > 0:
                    avg_forecast_6h = np.mean(forecast_6h)
                    current_aqi = real_time_data['aqi']
                    error_6h = abs(avg_forecast_6h - current_aqi)
                    print(f"🎯 6h Forecast Accuracy: {error_6h:.1f} AQI points from current")
                
            else:
                print(f"⚠️ No historical data found for {location}, using synthetic data")
                generate_synthetic_data(location)
                
        else:
            print(f"⚠️ No real-time data available for {location}, using synthetic data")
            generate_synthetic_data(location)

def generate_synthetic_data(location):
    """Generate synthetic data when real-time data is not available"""
    print(f"🔧 Generating synthetic data for {location}...")
    
    # Create realistic synthetic data
    days = 60
    hours_per_day = 24
    total_hours = days * hours_per_day
    
    # Base AQI values for different locations
    base_aqi = {
        'CBD Belapur': 125,
        'Vashi': 138,
        'Sanpada': 97
    }
    
    base_value = base_aqi.get(location, 100)
    
    # Generate timestamps
    timestamps = [datetime.now() - timedelta(hours=i) for i in range(total_hours, 0, -1)]
    
    # Generate AQI values with realistic patterns
    aqi_values = []
    for i, timestamp in enumerate(timestamps):
        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        
        # Base value with time-based patterns
        value = base_value
        
        # Rush hour hours
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            value *= 1.2  # 20% increase during rush hours
        elif 22 <= hour or hour <= 5:
            value *= 0.8  # 20% decrease at night
        
        # Weekend effects
        if day_of_week >= 5:  # Saturday, Sunday
            value *= 0.9  # 10% less pollution on weekends
        
        # Random variation
        value *= np.random.uniform(0.8, 1.2)
        
        aqi_values.append(max(20, min(300, value)))  # Clamp between 20-300
    
    # Create DataFrame
    df = pd.DataFrame({
        'timestamp': timestamps,
        'aqi': aqi_values
    })
    
    # Save to database
    aqi_fetcher = RealTimeAQI()
    conn = sqlite3.connect(aqi_fetcher.db_path)
    
    for _, row in df.iterrows():
        conn.execute('''
            INSERT INTO aqi_summary 
            (location, aqi, pm25, pm10, o3, no2, so2, co, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            location, 
            row['aqi'],
            row['aqi'] * 0.56,  # PM2.5
            row['aqi'] * 0.79,  # PM10
            row['aqi'] * 0.30,  # O3
            row['aqi'] * 0.25,  # NO2
            row['aqi'] * 0.08,  # SO2
            row['aqi'] * 0.005, # CO
            row['timestamp']
        ))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Generated {len(df)} synthetic records for {location}")
    
    # Train model with synthetic data
    df_prepared = load_and_prepare_data(df)
    model_path = f"models/{location.lower().replace(' ', '_')}_model.h5"
    
    print(f"🤖 Training ML model for {location}...")
    model, scaler, history = train_model(df_prepared, model_path, window_size=72, epochs=100)
    
    # Make forecasts
    print(f"🔮 Generating forecasts...")
    forecast_6h = forecast_next_hours(df_prepared, model_path, hours=6, window_size=72, epochs=100)
    forecast_12h = forecast_next_hours(df_prepared, model_path, hours=12, window_size=72, epochs=100)
    
    print(f"📈 6-hour forecast: {forecast_6h}")
    print(f"📈 12-hour forecast: {forecast_12h}")

if __name__ == "__main__":
    main()
