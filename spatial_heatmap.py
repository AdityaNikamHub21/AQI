"""
AeroGuard: Hyper-Local AQI & Health Risk Forecaster
Spatial Heatmap Visualization Module

This module generates interactive spatial heatmaps using Folium
to visualize forecasted AQI values across different locations.
"""

import folium
from folium.plugins import HeatMap
import json
import os
from datetime import datetime

class SpatialHeatmapGenerator:
    """
    Generates spatial heatmaps for AQI forecasting visualization
    """
    
    def __init__(self):
        # Real coordinates for Navi Mumbai locations
        self.locations = {
            'cbd_belapur': {
                'lat': 19.0158,
                'lon': 73.1188,
                'name': 'CBD Belapur'
            },
            'vashi': {
                'lat': 19.0760,
                'lon': 72.8777,
                'name': 'Vashi'
            },
            'sanpada': {
                'lat': 19.0477,
                'lon': 73.0766,
                'name': 'Sanpada'
            },
            'nerul': {
                'lat': 19.0300,
                'lon': 73.0200,
                'name': 'Nerul'
            },
            'kharghar': {
                'lat': 19.0728,
                'lon': 73.0926,
                'name': 'Kharghar'
            },
            'panvel': {
                'lat': 18.9867,
                'lon': 73.0996,
                'name': 'Panvel'
            }
        }
        
        # Center of Navi Mumbai for map centering
        self.center_lat = 19.0760
        self.center_lon = 73.0200
        
    def prepare_heatmap_data(self, forecast_data):
        """
        Convert forecast data to HeatMap format [lat, lon, intensity]
        
        Args:
            forecast_data (dict): Dictionary with forecasted_aqi values for locations
            
        Returns:
            list: Formatted data for HeatMap plugin
        """
        heatmap_data = []
        
        for location_key, forecast_values in forecast_data.items():
            if location_key in self.locations:
                location = self.locations[location_key]
                
                # Get current forecasted AQI (use first available value)
                if 'forecasted_aqi' in forecast_values:
                    aqi_value = forecast_values['forecasted_aqi']
                    if isinstance(aqi_value, list) and len(aqi_value) > 0:
                        aqi_value = aqi_value[0]  # Use first forecast point
                else:
                    aqi_value = forecast_values.get('aqi', 100)  # Fallback
                
                # Normalize AQI for heatmap intensity (0-1 scale)
                # AQI range: 0-500, normalize to 0-1
                intensity = min(aqi_value / 300.0, 1.0)  # Cap at 300 for better visualization
                
                # Add main location point
                heatmap_data.append([location['lat'], location['lon'], intensity])
                
                # Add surrounding points for smoother heatmap
                # Generate points in a small radius around each location
                radius = 0.02  # ~2km radius
                for i in range(5):  # Add 5 surrounding points
                    offset_lat = location['lat'] + (radius * (i - 2) * 0.2)
                    offset_lon = location['lon'] + (radius * (i - 2) * 0.2)
                    # Slightly reduce intensity for surrounding points
                    surrounding_intensity = intensity * 0.8
                    heatmap_data.append([offset_lat, offset_lon, surrounding_intensity])
        
        return heatmap_data
    
    def generate_heatmap(self, forecast_data, output_path="templates/heatmap.html"):
        """
        Generate and save an interactive heatmap
        
        Args:
            forecast_data (dict): Dictionary with forecasted AQI values
            output_path (str): Path to save the HTML file
        """
        # Prepare data for heatmap
        heatmap_data = self.prepare_heatmap_data(forecast_data)
        
        if not heatmap_data:
            print("⚠️ No data available for heatmap generation")
            return False
        
        # Create base map centered on Navi Mumbai
        m = folium.Map(
            location=[self.center_lat, self.center_lon],
            zoom_start=11,
            tiles='OpenStreetMap'
        )
        
        # Add HeatMap layer
        HeatMap(
            heatmap_data,
            name='AQI Heatmap',
            radius=25,
            blur=15,
            max_zoom=17,
            gradient={
                0.0: '#00e400',    # Good - Green
                0.3: '#ffff00',    # Moderate - Yellow
                0.5: '#ff7e00',    # Unhealthy for Sensitive - Orange
                0.7: '#ff0000',    # Unhealthy - Red
                0.9: '#8f3f97',    # Very Unhealthy - Purple
                1.0: '#7e0023'     # Hazardous - Maroon
            }
        ).add_to(m)
        
        # Add markers for each location with AQI values
        for location_key, forecast_values in forecast_data.items():
            if location_key in self.locations:
                location = self.locations[location_key]
                
                # Get AQI value for display
                if 'forecasted_aqi' in forecast_values:
                    aqi_value = forecast_values['forecasted_aqi']
                    if isinstance(aqi_value, list) and len(aqi_value) > 0:
                        aqi_value = aqi_value[0]
                else:
                    aqi_value = forecast_values.get('aqi', 100)
                
                # Get wind speed if available
                wind_speed = forecast_values.get('wind_speed', 'N/A')
                
                # Determine AQI level and color
                aqi_level = self.get_aqi_level(aqi_value)
                aqi_color = self.get_aqi_color(aqi_value)
                
                # Create popup content
                popup_content = f"""
                <div style="font-family: Arial, sans-serif;">
                    <h4 style="margin: 0; color: {aqi_color};">{location['name']}</h4>
                    <p style="margin: 5px 0;"><strong>AQI:</strong> {aqi_value}</p>
                    <p style="margin: 5px 0;"><strong>Level:</strong> {aqi_level}</p>
                    <p style="margin: 5px 0;"><strong>Wind Speed:</strong> {wind_speed} m/s</p>
                    <p style="margin: 5px 0; font-size: 11px; color: #666;">
                        Updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}
                    </p>
                </div>
                """
                
                # Add marker
                folium.Marker(
                    location=[location['lat'], location['lon']],
                    popup=folium.Popup(popup_content, max_width=250),
                    tooltip=f"{location['name']} - AQI: {aqi_value}",
                    icon=folium.Icon(
                        color='red' if aqi_value > 150 else 'orange' if aqi_value > 100 else 'green',
                        icon='info-sign'
                    )
                ).add_to(m)
        
        # Add layer control
        folium.LayerControl().add_to(m)
        
        # Add custom title and legend
        title_html = '''
        <div style="position: fixed; 
                    top: 10px; left: 50%; transform: translateX(-50%); 
                    z-index: 1000; background-color: white; padding: 10px; 
                    border-radius: 5px; border: 2px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h3 style="margin: 0; text-align: center;">🌍 AeroGuard AQI Heatmap</h3>
            <p style="margin: 5px 0; text-align: center; font-size: 12px;">Navi Mumbai - Real-time AQI Forecast</p>
        </div>
        '''
        m.get_root().html.add_child(folium.Element(title_html))
        
        # Add AQI legend
        legend_html = '''
        <div style="position: fixed; 
                    bottom: 50px; left: 10px; 
                    z-index: 1000; background-color: white; padding: 10px; 
                    border-radius: 5px; border: 2px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h4 style="margin: 0 0 10px 0;">AQI Legend</h4>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 20px; height: 20px; background: #00e400; margin-right: 8px;"></div>
                <span>Good (0-50)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 20px; height: 20px; background: #ffff00; margin-right: 8px;"></div>
                <span>Moderate (51-100)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 20px; height: 20px; background: #ff7e00; margin-right: 8px;"></div>
                <span>Unhealthy for Sensitive (101-150)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 20px; height: 20px; background: #ff0000; margin-right: 8px;"></div>
                <span>Unhealthy (151-200)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 20px; height: 20px; background: #8f3f97; margin-right: 8px;"></div>
                <span>Very Unhealthy (201-300)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 20px; height: 20px; background: #7e0023; margin-right: 8px;"></div>
                <span>Hazardous (301+)</span>
            </div>
        </div>
        '''
        m.get_root().html.add_child(folium.Element(legend_html))
        
        # Ensure templates directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save the map
        m.save(output_path)
        print(f"✅ Heatmap saved to {output_path}")
        return True
    
    def get_aqi_level(self, aqi_value):
        """Get AQI level description"""
        if aqi_value <= 50:
            return "Good"
        elif aqi_value <= 100:
            return "Moderate"
        elif aqi_value <= 150:
            return "Unhealthy for Sensitive"
        elif aqi_value <= 200:
            return "Unhealthy"
        elif aqi_value <= 300:
            return "Very Unhealthy"
        else:
            return "Hazardous"
    
    def get_aqi_color(self, aqi_value):
        """Get AQI color for display"""
        if aqi_value <= 50:
            return "#00e400"
        elif aqi_value <= 100:
            return "#ffff00"
        elif aqi_value <= 150:
            return "#ff7e00"
        elif aqi_value <= 200:
            return "#ff0000"
        elif aqi_value <= 300:
            return "#8f3f97"
        else:
            return "#7e0023"

# Example usage function
def generate_sample_heatmap():
    """
    Generate a sample heatmap with example forecast data
    """
    generator = SpatialHeatmapGenerator()
    
    # Sample forecast data (simulating your model output)
    sample_forecast = {
        'cbd_belapur': {
            'forecasted_aqi': [104],
            'wind_speed': 12.3
        },
        'vashi': {
            'forecasted_aqi': [142],
            'wind_speed': 10.5
        },
        'sanpada': {
            'forecasted_aqi': [78],
            'wind_speed': 8.7
        },
        'nerul': {
            'forecasted_aqi': [95],
            'wind_speed': 11.2
        },
        'kharghar': {
            'forecasted_aqi': [118],
            'wind_speed': 9.8
        },
        'panvel': {
            'forecasted_aqi': [132],
            'wind_speed': 7.5
        }
    }
    
    # Generate heatmap
    success = generator.generate_heatmap(sample_forecast)
    
    if success:
        print("🌍 Sample heatmap generated successfully!")
        print("📁 Open templates/heatmap.html to view the map")
    else:
        print("❌ Failed to generate heatmap")

if __name__ == "__main__":
    generate_sample_heatmap()
