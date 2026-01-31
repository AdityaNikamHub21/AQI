"""
AeroGuard Health Risk Analysis with Forecast Data
Uses user-provided forecast data for personalized health risk assessment
"""

from health_risk_classifier import HealthRiskClassifier
import pandas as pd
import numpy as np

class ForecastHealthRiskAnalyzer:
    """
    Analyzes health risks using forecast data with multiple parameters
    """
    
    def __init__(self):
        self.classifier = HealthRiskClassifier()
        self.classifier.load_model('aeroguard_health_risk_model.pkl')
        
        # Persona mapping
        self.persona_mapping = {
            0: 'general_public',
            1: 'children_elderly',  # Child - use children_elderly for simplicity
            2: 'children_elderly',  # Elderly
            3: 'outdoor_workers'    # Outdoor Worker / Athlete
        }
        
        self.persona_names = {
            'general_public': 'General Public',
            'children_elderly': 'Children / Elderly',
            'outdoor_workers': 'Outdoor Workers / Athletes'
        }
    
    def parse_forecast_data(self, forecast_text):
        """
        Parse forecast data from text format
        """
        lines = forecast_text.strip().split('\n')
        data = []
        
        for line in lines:
            if line.strip():
                values = line.split(',')
                if len(values) >= 9:  # Changed from 10 to 9
                    try:
                        row = {
                            'pm25_forecast': float(values[0]),
                            'aqi_forecast': float(values[1]),
                            'aqi_trend': int(values[2]),
                            'wind_speed': float(values[3]),
                            'humidity': float(values[4]),
                            'exposure_hours': int(values[5]),
                            'who_exceedance_ratio': float(values[6]),
                            'persona_code': int(values[7]),
                            'risk_level': values[8].strip()
                        }
                        data.append(row)
                    except ValueError:
                        continue
        
        df = pd.DataFrame(data)
        # Rename columns to match expected names
        df = df.rename(columns={'pm25_forecast': 'pm25', 'aqi_forecast': 'aqi'})
        return df
    
    def analyze_forecast_health_risks(self, forecast_data):
        """
        Analyze health risks for forecast data
        """
        results = []
        
        for _, row in forecast_data.iterrows():
            # Map persona code to persona type
            persona_type = self.persona_mapping.get(row['persona_code'], 'general_public')
            
            # Prepare forecast data for prediction
            forecast_params = {
                'aqi': row['aqi'],
                'pm25': row['pm25'],
                'pm10': row['pm25'] * 1.5,  # Estimate PM10
                'temperature': 25,  # Default
                'humidity': row['humidity'],
                'wind_speed': row['wind_speed'],
                'pressure': 1013,  # Default
                'visibility': 8  # Default
            }
            
            # Make health risk prediction
            risk_result = self.classifier.predict_risk(
                forecast_params,
                persona_type,
                row['exposure_hours']
            )
            
            # Generate health advice
            advice = self.classifier.generate_health_advice(
                risk_result['risk_category'],
                persona_type
            )
            
            # Calculate WHO exceedance analysis
            who_guideline = 15  # PM2.5 24-hour guideline in µg/m³
            exceedance_ratio = row['pm25'] / who_guideline
            
            result = {
                'forecast_hour': len(results) + 1,
                'forecast_data': {
                    'pm25_forecast': row['pm25'],
                    'aqi_forecast': row['aqi'],
                    'aqi_trend': row['aqi_trend'],
                    'wind_speed': row['wind_speed'],
                    'humidity': row['humidity'],
                    'exposure_hours': row['exposure_hours'],
                    'who_exceedance_ratio': row['who_exceedance_ratio'],
                    'persona_code': row['persona_code'],
                    'risk_level': row['risk_level']
                },
                'persona_type': persona_type,
                'persona_name': self.persona_names[persona_type],
                'exposure_hours': row['exposure_hours'],
                'predicted_risk': risk_result['risk_category'],
                'confidence': max(risk_result['risk_probabilities'].values()),
                'health_advice': advice,
                'who_exceedance_ratio': exceedance_ratio,
                'who_status': 'Exceeds WHO guideline' if exceedance_ratio > 1 else 'Within WHO guideline',
                'risk_factors': self.analyze_risk_factors(row, exceedance_ratio)
            }
            
            results.append(result)
        
        return results
    
    def analyze_risk_factors(self, row, exceedance_ratio):
        """
        Analyze key risk factors for this forecast
        """
        factors = []
        
        # PM2.5 analysis
        if row['pm25'] > 150:
            factors.append({
                'factor': 'PM2.5',
                'level': 'Hazardous',
                'value': row['pm25'],
                'impact': 'Severe health impact'
            })
        elif row['pm25'] > 75:
            factors.append({
                'factor': 'PM2.5',
                'level': 'High',
                'value': row['pm25'],
                'impact': 'Significant health impact'
            })
        elif row['pm25'] > 35:
            factors.append({
                'factor': 'PM2.5',
                'level': 'Moderate',
                'value': row['pm25'],
                'impact': 'Moderate health impact'
            })
        
        # AQI trend analysis
        if row['aqi_trend'] > 2:
            factors.append({
                'factor': 'AQI Trend',
                'level': 'Worsening',
                'value': f'Trend {row["aqi_trend"]}',
                'impact': 'Air quality deteriorating'
            })
        elif row['aqi_trend'] < -2:
            factors.append({
                'factor': 'AQI Trend',
                'level': 'Improving',
                'value': f'Trend {row["aqi_trend"]}',
                'impact': 'Air quality improving'
            })
        
        # Wind speed analysis
        if row['wind_speed'] < 3:
            factors.append({
                'factor': 'Wind Speed',
                'level': 'Poor',
                'value': f'{row["wind_speed"]} km/h',
                'impact': 'Poor pollutant dispersion'
            })
        
        # Humidity analysis
        if row['humidity'] > 80:
            factors.append({
                'factor': 'Humidity',
                'level': 'High',
                'value': f'{row["humidity"]}%',
                'impact': 'Increases pollutant impact'
            })
        
        # WHO exceedance
        if exceedance_ratio > 2:
            factors.append({
                'factor': 'WHO Guideline',
                'level': 'Critical',
                'value': f'{exceedance_ratio:.1f}x exceedance',
                'impact': 'Far above safe levels'
            })
        elif exceedance_ratio > 1:
            factors.append({
                'factor': 'WHO Guideline',
                'level': 'Warning',
                'value': f'{exceedance_ratio:.1f}x exceedance',
                'impact': 'Above safe levels'
            })
        
        return factors
    
    def generate_comprehensive_report(self, forecast_data):
        """
        Generate comprehensive health risk report
        """
        results = self.analyze_forecast_health_risks(forecast_data)
        
        print(f"📊 Available columns: {list(forecast_df.columns)}")
        print(f"📊 Sample data: {forecast_df.head().to_dict('records')}")
        
        report = f"""
🏥 Comprehensive Health Risk Analysis Report
{'='*60}

📊 Forecast Summary:
   Total forecast hours: {len(results)}
   PM2.5 range: {forecast_data['pm25'].min():.1f} - {forecast_data['pm25'].max():.1f} µg/m³
   AQI range: {forecast_data['aqi'].min()} - {forecast_data['aqi'].max()}
   Wind speed: {forecast_data['wind_speed'].min():.1f} - {forecast_data['wind_speed'].max():.1f} km/h
   Humidity: {forecast_data['humidity'].min():.1f}% - {forecast_data['humidity'].max():.1f}%

👥 Persona-Specific Analysis:
"""
        
        # Group by persona
        persona_groups = {}
        for result in results:
            persona = result['persona_name']
            if persona not in persona_groups:
                persona_groups[persona] = []
            persona_groups[persona].append(result)
        
        for persona, persona_results in persona_groups.items():
            report += f"\n{self.get_persona_icon(persona)} {persona}:\n"
            
            for result in persona_results:
                confidence_pct = result['confidence'] * 100
                report += f"   🕐 Hour {result['forecast_hour']}: {result['predicted_risk']} ({confidence_pct:.1f}% confidence)\n"
                report += f"      📊 PM2.5: {result['forecast_data']['pm25_forecast']} µg/m³ | AQI: {result['forecast_data']['aqi_forecast']}\n"
                report += f"      🌡️ Exposure: {result['exposure_hours']}h | WHO: {result['who_status']}\n"
                report += f"      💡 {result['health_advice']}\n"
                
                # Top risk factors
                if result['risk_factors']:
                    report += f"      🔍 Key factors: {', '.join([f['factor'] for f in result['risk_factors'][:2]])}\n"
        
        # Risk level distribution
        risk_distribution = {}
        for result in results:
            risk = result['predicted_risk']
            risk_distribution[risk] = risk_distribution.get(risk, 0) + 1
        
        report += f"\n📈 Risk Level Distribution:\n"
        for risk, count in sorted(risk_distribution.items()):
            percentage = (count / len(results)) * 100
            report += f"   {risk}: {count} hours ({percentage:.1f}%)\n"
        
        # WHO exceedance analysis
        high_exceedance = [r for r in results if r['who_exceedance_ratio'] > 2]
        if high_exceedance:
            report += f"\n⚠️ Critical WHO Exceedance ({len(high_exceedance)} hours):\n"
            for result in high_exceedance[:5]:  # Show top 5
                report += f"   Hour {result['forecast_hour']}: {result['who_exceedance_ratio']:.1f}x exceedance for {result['persona_name']}\n"
        
        return report
    
    def get_persona_icon(self, persona):
        icons = {
            'General Public': '👥',
            'Children / Elderly': '👶👴',
            'Outdoor Workers / Athletes': '👷🏃'
        }
        return icons.get(persona, '👥')

# Example usage
if __name__ == "__main__":
    analyzer = ForecastHealthRiskAnalyzer()
    
    # Your forecast data
    forecast_data_text = """
10,40,1,15,45,1,0.67,0,Low
12,50,2,12,50,2,0.8,1,Low
18,70,3,10,55,3,1.2,0,Moderate
20,85,4,8,60,4,1.33,2,Moderate
28,95,5,7,65,4,1.86,1,High
35,120,6,6,70,5,2.33,2,High
42,150,8,5,75,6,2.8,1,High
55,180,10,4,80,6,3.66,2,High
65,210,12,3,82,7,4.33,0,High
75,250,14,2,85,8,5.0,1,Hazardous
90,300,18,1,88,8,6.0,2,Hazardous
110,350,22,1,90,9,7.33,3,Hazardous
15,60,2,14,50,1,1.0,3,Low
22,80,3,10,60,3,1.46,3,Moderate
30,100,5,8,68,5,2.0,3,High
45,160,9,4,78,6,3.0,3,High
60,200,12,3,82,7,4.0,3,Hazardous
25,90,4,9,62,4,1.66,0,Moderate
38,130,7,6,72,6,2.53,2,High
48,170,9,4,80,7,3.2,1,High
70,240,15,2,86,8,4.66,0,Hazardous
85,290,17,1,89,9,5.66,1,Hazardous
"""
    
    print("🚀 Analyzing Forecast Health Risks...")
    
    # Parse and analyze
    forecast_df = analyzer.parse_forecast_data(forecast_data_text)
    report = analyzer.generate_comprehensive_report(forecast_df)
    
    print(report)
    print("\n✅ Health risk analysis complete!")
    
    # Save detailed results
    results = analyzer.analyze_forecast_health_risks(forecast_df)
    
    print(f"\n📊 Analysis Summary:")
    print(f"   Total forecast hours: {len(results)}")
    print(f"   Unique personas: {len(set(r['persona_name'] for r in results))}")
    print(f"   Risk levels: {set(r['predicted_risk'] for r in results)}")
    print(f"   WHO exceedance hours: {len([r for r in results if r['who_exceedance_ratio'] > 1])}")
