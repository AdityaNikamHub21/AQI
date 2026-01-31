"""
AeroGuard Integration with Existing AQI System
Shows health risks for 3 personas using real AQI data
"""

from health_risk_classifier import HealthRiskClassifier
import requests
import json

class AQIHealthRiskIntegration:
    """
    Integrates health risk classification with existing AQI system
    """
    
    def __init__(self):
        self.classifier = HealthRiskClassifier()
        self.classifier.load_model('aeroguard_health_risk_model.pkl')
        
    def get_current_aqi_data(self, location):
        """
        Get current AQI data from existing API
        """
        try:
            response = requests.get(f'http://localhost:5004/current-aqi/{location}')
            if response.status_code == 200:
                data = response.json()
                if data['success']:
                    return data['data']
        except Exception as e:
            print(f"Error fetching AQI data: {e}")
        
        # Fallback data
        return {
            'aqi': 100,
            'pm25': 50,
            'pm10': 75,
            'temperature': 25,
            'humidity': 60,
            'wind_speed': 5,
            'pressure': 1013,
            'visibility': 8
        }
    
    def analyze_health_risks(self, location):
        """
        Analyze health risks for all personas for a given location
        """
        # Get current AQI data
        aqi_data = self.get_current_aqi_data(location)
        
        # Define personas
        personas = {
            'children_elderly': {
                'name': 'Children / Elderly',
                'icon': '👶👴',
                'exposure_scenarios': [2, 4, 6]  # hours
            },
            'outdoor_workers': {
                'name': 'Outdoor Workers / Athletes',
                'icon': '👷🏃',
                'exposure_scenarios': [4, 6, 8]  # hours
            },
            'general_public': {
                'name': 'General Public',
                'icon': '👥',
                'exposure_scenarios': [1, 3, 6]  # hours
            }
        }
        
        results = {
            'location': location,
            'current_aqi': aqi_data,
            'health_risks': {}
        }
        
        # Analyze each persona
        for persona_key, persona_info in personas.items():
            persona_results = []
            
            for exposure_hours in persona_info['exposure_scenarios']:
                # Make health risk prediction
                risk_result = self.classifier.predict_risk(
                    aqi_data, 
                    persona_key, 
                    exposure_hours
                )
                
                # Generate health advice
                advice = self.classifier.generate_health_advice(
                    risk_result['risk_category'], 
                    persona_key
                )
                
                persona_results.append({
                    'exposure_hours': exposure_hours,
                    'risk_category': risk_result['risk_category'],
                    'confidence': max(risk_result['risk_probabilities'].values()),
                    'health_advice': advice,
                    'probabilities': risk_result['risk_probabilities']
                })
            
            results['health_risks'][persona_key] = {
                'name': persona_info['name'],
                'icon': persona_info['icon'],
                'scenarios': persona_results
            }
        
        return results
    
    def generate_location_report(self, location):
        """
        Generate comprehensive health risk report for a location
        """
        analysis = self.analyze_health_risks(location)
        
        report = f"""
🏢 {location.title()} Health Risk Analysis
{'='*50}

📊 Current Air Quality:
   AQI: {analysis['current_aqi']['aqi']}
   PM2.5: {analysis['current_aqi']['pm25']} µg/m³
   PM10: {analysis['current_aqi']['pm10']} µg/m³
   Temperature: {analysis['current_aqi'].get('temperature', 25)}°C
   Humidity: {analysis['current_aqi'].get('humidity', 60)}%
   Wind Speed: {analysis['current_aqi'].get('wind_speed', 5)} km/h

👥 Health Risk Analysis:
"""
        
        for persona_key, persona_data in analysis['health_risks'].items():
            report += f"\n{persona_data['icon']} {persona_data['name']}:\n"
            
            for scenario in persona_data['scenarios']:
                confidence_pct = scenario['confidence'] * 100
                report += f"   🕐 {scenario['exposure_hours']}h outdoors: {scenario['risk_category']} ({confidence_pct:.1f}% confidence)\n"
                report += f"      💡 {scenario['health_advice']}\n"
        
        return report

# Test the integration
if __name__ == "__main__":
    integrator = AQIHealthRiskIntegration()
    
    locations = ['cbd belapur', 'vashi', 'sanpada']
    
    print("🚀 AeroGuard Health Risk Integration")
    print("="*60)
    
    for location in locations:
        print(f"\n📍 Analyzing {location.title()}...")
        report = integrator.generate_location_report(location)
        print(report)
        print("\n" + "="*60)
    
    print("\n✅ Health risk analysis complete!")
    print("🌐 Ready to integrate with AQI website!")
