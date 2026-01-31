"""
AeroGuard: Spatial AQI Analysis Module
Generates city-level AQI heat maps with precise location data
"""

import pandas as pd
import numpy as np
import folium
from folium.plugins import HeatMap
import json
import os

class SpatialAnalysis:
    """
    Spatial AQI analysis and visualization
    Creates heat maps for city-level AQI distribution
    """
    
    def __init__(self):
        self.city_coordinates = {
            'cbd belapur': {'lat': 19.0158, 'lon': 73.0295, 'zoom': 13},
            'vashi': {'lat': 19.0748, 'lon': 72.9976, 'zoom': 13},
            'sanpada': {'lat': 19.0209, 'lon': 73.0069, 'zoom': 13},
            'mumbai': {'lat': 19.0760, 'lon': 72.8777, 'zoom': 11}
        }
        
        self.area_data = {
            'cbd belapur': [
                {'area': 'CBD Belapur Central', 'lat': 19.0158, 'lon': 73.0295, 'aqi': 104},
                {'area': 'Belapur Railway Station', 'lat': 19.0165, 'lon': 73.0288, 'aqi': 112},
                {'area': 'CBD Belapur Market', 'lat': 19.0148, 'lon': 73.0302, 'aqi': 98},
                {'area': 'NMMT Bus Stand', 'lat': 19.0172, 'lon': 73.0279, 'aqi': 118},
                {'area': 'Belapur Creek', 'lat': 19.0135, 'lon': 73.0311, 'aqi': 89},
                {'area': 'Sector 15', 'lat': 19.0189, 'lon': 73.0267, 'aqi': 95},
                {'area': 'Sector 11', 'lat': 19.0123, 'lon': 73.0328, 'aqi': 102},
                {'area': 'Palm Beach Road', 'lat': 19.0198, 'lon': 73.0254, 'aqi': 108}
            ],
            'vashi': [
                {'area': 'Vashi Railway Station', 'lat': 19.0748, 'lon': 72.9976, 'aqi': 109},
                {'area': 'Vashi Plaza', 'lat': 19.0735, 'lon': 72.9989, 'aqi': 115},
                {'area': 'Sector 17', 'lat': 19.0762, 'lon': 72.9954, 'aqi': 103},
                {'area': 'Vashi Beach', 'lat': 19.0721, 'lon': 72.9998, 'aqi': 87},
                {'area': 'Vashi Fort', 'lat': 19.0756, 'lon': 72.9962, 'aqi': 96},
                {'area': 'Sector 29', 'lat': 19.0718, 'lon': 73.0012, 'aqi': 112},
                {'area': 'Turbhe Naka', 'lat': 19.0789, 'lon': 72.9934, 'aqi': 121},
                {'area': 'Vashi Highway', 'lat': 19.0774, 'lon': 72.9948, 'aqi': 105}
            ],
            'sanpada': [
                {'area': 'Sanpada Railway Station', 'lat': 19.0209, 'lon': 73.0069, 'aqi': 78},
                {'area': 'Sanpada Market', 'lat': 19.0198, 'lon': 73.0081, 'aqi': 82},
                {'area': 'Sector 6', 'lat': 19.0221, 'lon': 73.0056, 'aqi': 75},
                {'area': 'Sector 8', 'lat': 19.0187, 'lon': 73.0078, 'aqi': 80},
                {'area': 'Sanpada Lake', 'lat': 19.0215, 'lon': 73.0049, 'aqi': 71},
                {'area': 'Turbhe Station', 'lat': 19.0234, 'lon': 73.0038, 'aqi': 85},
                {'area': 'Sector 15A', 'lat': 19.0176, 'lon': 73.0092, 'aqi': 79},
                {'area': 'Sanpada Gaon', 'lat': 19.0192, 'lon': 73.0105, 'aqi': 76}
            ],
            'mumbai': [
                {'area': 'Gateway of India', 'lat': 19.0218, 'lon': 72.8646, 'aqi': 125},
                {'area': 'Marine Drive', 'lat': 19.0004, 'lon': 72.8268, 'aqi': 118},
                {'area': 'CST Railway Station', 'lat': 19.0145, 'lon': 72.8359, 'aqi': 132},
                {'area': 'Bandra-Worli Sea Link', 'lat': 19.0300, 'lon': 72.8170, 'aqi': 108},
                {'area': 'Juhu Beach', 'lat': 19.1046, 'lon': 72.8265, 'aqi': 95},
                {'area': 'Worli Sea Face', 'lat': 19.0012, 'lon': 72.8189, 'aqi': 112},
                {'area': 'Haji Ali', 'lat': 18.9835, 'lon': 72.8193, 'aqi': 105},
                {'area': 'Nariman Point', 'lat': 18.9332, 'lon': 72.8236, 'aqi': 120},
                {'area': 'Chhatrapati Shivaji Terminus', 'lat': 19.0145, 'lon': 72.8359, 'aqi': 135},
                {'area': 'Flora Fountain', 'lat': 18.9315, 'lon': 72.8266, 'aqi': 128}
            ]
        }
    
    def load_spatial_data(self, city):
        """
        Load spatial AQI data for a specific city
        Args:
            city: City name (lowercase)
        Returns:
            DataFrame with area, latitude, longitude, and AQI values
        """
        if city not in self.area_data:
            raise ValueError(f"City '{city}' not supported. Available cities: {list(self.area_data.keys())}")
        
        data = self.area_data[city]
        df = pd.DataFrame(data)
        
        # Add some variation to simulate real-time changes
        df['aqi'] = df['aqi'] + np.random.randint(-5, 6, size=len(df))
        df['aqi'] = df['aqi'].clip(0, 500)  # Keep AQI in valid range
        
        return df
    
    def compute_area_variation(self, df):
        """
        Compute area-wise AQI variation statistics
        Args:
            df: DataFrame with AQI data
        Returns:
            Dictionary with variation metrics
        """
        variation_stats = {
            'mean_aqi': df['aqi'].mean(),
            'median_aqi': df['aqi'].median(),
            'std_aqi': df['aqi'].std(),
            'min_aqi': df['aqi'].min(),
            'max_aqi': df['aqi'].max(),
            'range_aqi': df['aqi'].max() - df['aqi'].min(),
            'coefficient_of_variation': df['aqi'].std() / df['aqi'].mean() if df['aqi'].mean() > 0 else 0
        }
        
        # Find areas with highest and lowest AQI
        variation_stats['highest_area'] = df.loc[df['aqi'].idxmax()]
        variation_stats['lowest_area'] = df.loc[df['aqi'].idxmin()]
        
        return variation_stats
    
    def generate_heat_map(self, city, save_path=None):
        """
        Generate city-level AQI heat map using Folium
        Args:
            city: City name (lowercase)
            save_path: Path to save the HTML file (optional)
        Returns:
            Folium map object
        """
        if city not in self.city_coordinates:
            raise ValueError(f"City '{city}' not supported")
        
        # Load spatial data
        df = self.load_spatial_data(city)
        
        # Get city coordinates
        coords = self.city_coordinates[city]
        
        # Create base map
        m = folium.Map(
            location=[coords['lat'], coords['lon']],
            zoom_start=coords['zoom'],
            tiles='OpenStreetMap'
        )
        
        # Add tile layers for better visualization
        folium.TileLayer('cartodbpositron').add_to(m)
        folium.TileLayer('openstreetmap').add_to(m)
        
        # Prepare heat map data
        heat_data = [[row['lat'], row['lon'], row['aqi']] for index, row in df.iterrows()]
        
        # Add heat map layer
        heat_map = HeatMap(
            heat_data,
            min_opacity=0.4,
            radius=25,
            blur=15,
            gradient={
                0.0: 'green',
                0.3: 'yellow',
                0.6: 'orange',
                0.8: 'red',
                1.0: 'darkred'
            }
        )
        heat_map.add_to(m)
        
        # Add markers for each area with AQI information
        for index, row in df.iterrows():
            aqi_color = self.get_aqi_color(row['aqi'])
            
            popup_html = f"""
            <div style="font-family: Arial, sans-serif;">
                <h4 style="margin: 0; color: {aqi_color};">{row['area']}</h4>
                <p style="margin: 5px 0;"><strong>AQI:</strong> {row['aqi']}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> {self.get_aqi_status(row['aqi'])}</p>
                <p style="margin: 5px 0; font-size: 12px;">
                    <strong>Coordinates:</strong><br>
                    Lat: {row['lat']:.4f}<br>
                    Lon: {row['lon']:.4f}
                </p>
            </div>
            """
            
            folium.CircleMarker(
                location=[row['lat'], row['lon']],
                radius=8,
                popup=folium.Popup(popup_html, max_width=250),
                color=aqi_color,
                fill=True,
                fillColor=aqi_color,
                fillOpacity=0.7,
                weight=2
            ).add_to(m)
        
        # Add layer control
        folium.LayerControl().add_to(m)
        
        # Add city title
        title_html = f'''
        <h3 align="center" style="font-size:16px"><b>{city.title()} AQI Heat Map</b></h3>
        '''
        m.get_root().html.add_child(folium.Element(title_html))
        
        # Save map if path provided
        if save_path:
            m.save(save_path)
            print(f"🗺️ Heat map saved to {save_path}")
        
        return m
    
    def get_aqi_color(self, aqi):
        """Get color based on AQI value"""
        if aqi <= 50:
            return '#00e400'  # Green
        elif aqi <= 100:
            return '#ffff00'  # Yellow
        elif aqi <= 150:
            return '#ff7e00'  # Orange
        elif aqi <= 200:
            return '#ff0000'  # Red
        elif aqi <= 300:
            return '#8f3f97'  # Purple
        else:
            return '#7e0023'  # Maroon
    
    def get_aqi_status(self, aqi):
        """Get status text based on AQI value"""
        if aqi <= 50:
            return 'Good'
        elif aqi <= 100:
            return 'Moderate'
        elif aqi <= 150:
            return 'Unhealthy for Sensitive'
        elif aqi <= 200:
            return 'Unhealthy'
        elif aqi <= 300:
            return 'Very Unhealthy'
        else:
            return 'Hazardous'
    
    def get_spatial_analysis_summary(self, city):
        """
        Get comprehensive spatial analysis summary
        Args:
            city: City name (lowercase)
        Returns:
            Dictionary with analysis results
        """
        df = self.load_spatial_data(city)
        variation = self.compute_area_variation(df)
        
        summary = {
            'city': city.title(),
            'total_areas': len(df),
            'variation_stats': variation,
            'area_details': df.to_dict('records'),
            'coordinates': self.city_coordinates[city]
        }
        
        return summary
    
    def export_spatial_data(self, city, format='json'):
        """
        Export spatial data for external use
        Args:
            city: City name (lowercase)
            format: Export format ('json', 'csv')
        Returns:
            Exported data
        """
        df = self.load_spatial_data(city)
        
        if format.lower() == 'json':
            return df.to_dict('records')
        elif format.lower() == 'csv':
            return df.to_csv(index=False)
        else:
            raise ValueError("Format must be 'json' or 'csv'")

# Global instance
spatial_analyzer = SpatialAnalysis()

def get_city_heatmap(city, save_path=None):
    """
    Get city heat map - main entry point
    Args:
        city: City name
        save_path: Path to save HTML file (optional)
    Returns:
        Folium map object
    """
    return spatial_analyzer.generate_heat_map(city.lower(), save_path)

def get_spatial_summary(city):
    """
    Get spatial analysis summary - main entry point
    Args:
        city: City name
    Returns:
        Analysis summary dictionary
    """
    return spatial_analyzer.get_spatial_analysis_summary(city.lower())

if __name__ == "__main__":
    # Example usage
    print("🗺️ AeroGuard Spatial Analysis")
    print("=" * 40)
    
    # Generate heat map for CBD Belapur
    city = "cbd belapur"
    heat_map = get_city_heatmap(city, f"{city}_heatmap.html")
    
    # Get spatial summary
    summary = get_spatial_summary(city)
    
    print(f"📍 City: {summary['city']}")
    print(f"📊 Total Areas: {summary['total_areas']}")
    print(f"📈 Mean AQI: {summary['variation_stats']['mean_aqi']:.1f}")
    print(f"📉 AQI Range: {summary['variation_stats']['range_aqi']}")
    print(f"🔺 Highest: {summary['variation_stats']['highest_area']['area']} (AQI: {summary['variation_stats']['highest_area']['aqi']})")
    print(f"🔻 Lowest: {summary['variation_stats']['lowest_area']['area']} (AQI: {summary['variation_stats']['lowest_area']['aqi']})")
    print(f"🗺️ Heat map generated: {city}_heatmap.html")
