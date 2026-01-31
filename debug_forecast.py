"""
Debug forecast data parsing
"""

# Test parsing your forecast data
forecast_data_text = """
10,40,1,15,45,1,0.67,0,Low
12,50,2,12,50,2,0.8,1,Low
18,70,3,10,55,3,1.2,0,Moderate
20,85,4,8,60,4,1.33,2,Moderate
"""

lines = forecast_data_text.strip().split('\n')
data = []

for line in lines:
    if line.strip():
        values = line.split(',')
        print(f"Line: {line}")
        print(f"Values: {values}")
        print(f"Length: {len(values)}")
        
        if len(values) >= 10:
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
                print(f"✅ Parsed: {row}")
            except ValueError as e:
                print(f"❌ Error parsing line: {e}")
        else:
            print(f"⚠️ Not enough values: {len(values)}")
        print()

print(f"Total rows parsed: {len(data)}")
if data:
    import pandas as pd
    df = pd.DataFrame(data)
    print(f"DataFrame columns: {list(df.columns)}")
    print(f"First row: {df.iloc[0].to_dict()}")
