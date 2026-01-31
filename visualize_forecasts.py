# visualize_forecasts.py

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from preprocess import load_and_prepare_data
from predict import forecast_next_hours
import os

def create_forecast_graphs():
    """Create graphs for 6-hour and 12-hour AQI forecasts"""
    
    # Data and model paths
    DATA_PATH = "data/aqi_data.csv"
    cities = ["CBD Belapur", "Vashi", "Sanpada"]
    
    # Create figure with subplots
    fig, axes = plt.subplots(3, 2, figsize=(15, 12))
    fig.suptitle('AQI Forecasts - Mumbai Locations', fontsize=16, fontweight='bold')
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']  # Red, Teal, Blue
    
    for idx, city in enumerate(cities):
        try:
            # Load and prepare data
            df = load_and_prepare_data(DATA_PATH, city)
            model_path = f"models/{city.replace(' ', '_')}_model.h5"
            
            # Generate forecasts
            forecast_6hr = forecast_next_hours(df, model_path, hours=6, window_size=48, epochs=30)
            forecast_12hr = forecast_next_hours(df, model_path, hours=12, window_size=48, epochs=30)
            
            # Get historical data (last 12 hours)
            historical_data = df['aqi'].tail(12).values
            historical_times = pd.date_range(end=datetime.now(), periods=12, freq='h')
            
            # Create future time arrays
            future_times_6hr = pd.date_range(start=datetime.now() + timedelta(hours=1), periods=6, freq='h')
            future_times_12hr = pd.date_range(start=datetime.now() + timedelta(hours=1), periods=12, freq='h')
            
            # Plot 6-hour forecast
            ax1 = axes[idx, 0]
            ax1.plot(historical_times, historical_data, 'o-', color=colors[idx], linewidth=2, markersize=6, label='Historical')
            ax1.plot(future_times_6hr, forecast_6hr, 's--', color=colors[idx], linewidth=2, markersize=6, label='6-Hour Forecast')
            ax1.axvline(x=datetime.now(), color='red', linestyle=':', alpha=0.7, label='Current Time')
            ax1.set_title(f'{city} - 6 Hour Forecast', fontweight='bold', color=colors[idx])
            ax1.set_ylabel('AQI', fontsize=10)
            ax1.grid(True, alpha=0.3)
            ax1.legend(fontsize=8)
            
            # Rotate x-axis labels
            ax1.tick_params(axis='x', rotation=45)
            
            # Add AQI categories background
            ax1.axhspan(0, 50, alpha=0.1, color='green', label='Good')
            ax1.axhspan(50, 100, alpha=0.1, color='yellow', label='Moderate')
            ax1.axhspan(100, 150, alpha=0.1, color='orange', label='Unhealthy for Sensitive')
            ax1.axhspan(150, 200, alpha=0.1, color='red', label='Unhealthy')
            
            # Plot 12-hour forecast
            ax2 = axes[idx, 1]
            ax2.plot(historical_times, historical_data, 'o-', color=colors[idx], linewidth=2, markersize=6, label='Historical')
            ax2.plot(future_times_12hr, forecast_12hr, 's--', color=colors[idx], linewidth=2, markersize=6, label='12-Hour Forecast')
            ax2.axvline(x=datetime.now(), color='red', linestyle=':', alpha=0.7, label='Current Time')
            ax2.set_title(f'{city} - 12 Hour Forecast', fontweight='bold', color=colors[idx])
            ax2.set_ylabel('AQI', fontsize=10)
            ax2.grid(True, alpha=0.3)
            ax2.legend(fontsize=8)
            
            # Rotate x-axis labels
            ax2.tick_params(axis='x', rotation=45)
            
            # Add AQI categories background
            ax2.axhspan(0, 50, alpha=0.1, color='green')
            ax2.axhspan(50, 100, alpha=0.1, color='yellow')
            ax2.axhspan(100, 150, alpha=0.1, color='orange')
            ax2.axhspan(150, 200, alpha=0.1, color='red')
            
            # Add current AQI value
            current_aqi = df['aqi'].iloc[-1]
            ax1.text(0.02, 0.98, f'Current: {current_aqi:.1f}', transform=ax1.transAxes, 
                    fontsize=9, verticalalignment='top', bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
            ax2.text(0.02, 0.98, f'Current: {current_aqi:.1f}', transform=ax2.transAxes, 
                    fontsize=9, verticalalignment='top', bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
            
            # Print forecast summary
            print(f"\n{city} Forecast Summary:")
            print(f"  Current AQI: {current_aqi:.1f}")
            print(f"  6-Hour Range: {min(forecast_6hr):.1f} - {max(forecast_6hr):.1f}")
            print(f"  12-Hour Range: {min(forecast_12hr):.1f} - {max(forecast_12hr):.1f}")
            print(f"  6-Hour Avg: {np.mean(forecast_6hr):.1f}")
            print(f"  12-Hour Avg: {np.mean(forecast_12hr):.1f}")
            
        except Exception as e:
            print(f"Error processing {city}: {e}")
            continue
    
    # Adjust layout
    plt.tight_layout()
    
    # Save the plot
    plt.savefig('aqi_forecasts.png', dpi=300, bbox_inches='tight')
    print(f"\n📊 Graph saved as 'aqi_forecasts.png'")
    
    # Show the plot
    plt.show()

if __name__ == "__main__":
    create_forecast_graphs()
