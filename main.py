from preprocess import load_and_prepare_data
from predict import forecast_next_hours
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
                    'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    'city': city,
                    'aqi': round(aqi, 1)
                })
    
    df = pd.DataFrame(data)
    df.to_csv('data/aqi_data.csv', index=False)
    print("Created highly realistic sample data file")

DATA_PATH = "data/aqi_data.csv"

cities = ["CBD Belapur", "Vashi", "Sanpada"]

for city in cities:
    try:
        df = load_and_prepare_data(DATA_PATH, city)
        model_path = f"models/{city.replace(' ', '_')}_model.h5"
        
        # Create models directory if it doesn't exist
        if not os.path.exists('models'):
            os.makedirs('models')
        
        # Use larger window size and more epochs for better accuracy
        forecast = forecast_next_hours(df, model_path, hours=12, window_size=72, epochs=100)
        
        print(f"\n{'='*50}")
        print(f"City: {city}")
        print(f"Training data points: {len(df)}")
        print(f"Data range: {df['aqi'].min():.1f} - {df['aqi'].max():.1f} AQI")
        print(f"Average AQI: {df['aqi'].mean():.1f}")
        
        print("\nNext 12 hours AQI prediction:")
        for i, pred in enumerate(forecast):
            hour = datetime.datetime.now() + datetime.timedelta(hours=i+1)
            print(f"  {hour.strftime('%H:%M')} - AQI: {pred:.1f}")
        
        # Calculate prediction confidence and accuracy metrics
        std_dev = np.std(forecast)
        mean_pred = np.mean(forecast)
        current_aqi = df['aqi'].iloc[-1]
        
        print(f"\nAccuracy Metrics:")
        print(f"  Current AQI: {current_aqi:.1f}")
        print(f"  Forecast Average: {mean_pred:.1f}")
        print(f"  Prediction Stability (std dev): {std_dev:.2f}")
        print(f"  Forecast Range: {min(forecast):.1f} - {max(forecast):.1f}")
        
        # Calculate trend
        if forecast[-1] > forecast[0]:
            trend = "📈 Rising"
        elif forecast[-1] < forecast[0]:
            trend = "📉 Falling"
        else:
            trend = "➡️ Stable"
        print(f"  Overall Trend: {trend}")
        
        # Validate forecast reasonableness
        if std_dev < 15:  # Good stability
            print(f"  ✅ Forecast quality: Excellent (stable predictions)")
        elif std_dev < 25:
            print(f"  ✅ Forecast quality: Good (reasonable variation)")
        else:
            print(f"  ⚠️  Forecast quality: Fair (high variation)")
        
    except Exception as e:
        print(f"Error processing {city}: {e}")
        import traceback
        traceback.print_exc()
