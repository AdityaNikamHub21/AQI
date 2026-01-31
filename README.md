# AQI Predictor - Air Quality Monitoring System

## 🌍 Features
- **3 Supported Locations:** CBD Belapur, Sanpada, Vashi
- **9 Environmental Parameters:** PM2.5, PM10, O₃, NO₂, NO, SO₂, CO, Wind Speed, Humidity
- **Accurate AQI Calculations** using EPA standard breakpoints
- **CSV/JSON Data Upload** functionality
- **6-Day Historical Graph** with trends
- **Responsive Design** for all devices

## 🚀 Quick Start

### Method 1: Local Server
```bash
# Start Python server
python3 -m http.server 8000

# Open in browser
http://localhost:8000/aqi-predictor.html
```

### Method 2: Direct File Opening
1. Download all files
2. Open `aqi-predictor.html` in any web browser

## 📊 Location Data
| Location | AQI | Status | Health Impact |
|----------|-----|---------|---------------|
| **Sanpada** | 97 | 🟡 Moderate | Acceptable for most |
| **Vashi** | 138 | 🟠 Unhealthy for Sensitive | Sensitive groups affected |
| **CBD Belapur** | 125 | 🟠 Unhealthy for Sensitive | Sensitive groups affected |

## 📁 Files Included
- `aqi-predictor.html` - Main AQI predictor interface
- `aqi-script.js` - JavaScript functionality with accurate calculations
- `aqi-style.css` - Styling for all components
- `data-input.html` - Data upload and management interface
- `vashi.csv` - Accurate Vashi AQI data
- `sanpada-aqi-data.csv` - Sanpada AQI data
- `sample-aqi-data.csv` - Sample data for testing
- `sample-aqi-data.json` - JSON sample data

## 🔧 Technical Details
- **Pure HTML/CSS/JavaScript** - No dependencies
- **EPA Standard AQI Calculations** with proper breakpoints
- **Responsive Design** works on mobile, tablet, desktop
- **Local Storage** for data persistence
- **Chart.js** for historical data visualization

## 📱 How to Use
1. **Main Predictor:** View current AQI and 9 parameters
2. **Data Input:** Upload CSV/JSON files with location data
3. **Search:** Type location name (CBD Belapur, Sanpada, Vashi)
4. **Graph:** View 6-day historical AQI trends

## 🌐 Shareable Links
- **Main Predictor:** Open `aqi-predictor.html` in browser
- **Data Input:** Open `data-input.html` in browser
- **Sample Data:** Use provided CSV files for testing

## 🎯 Health Recommendations
- **🟢 Good (0-50):** Normal outdoor activities
- **🟡 Moderate (51-100):** Sensitive groups should limit prolonged outdoor exertion
- **🟠 Unhealthy for Sensitive (101-150):** Sensitive groups should avoid outdoor activities
- **🔴 Unhealthy (151-200):** Everyone should limit outdoor activities

## 📧 Contact
Built with accurate EPA AQI calculations for Mumbai locations.
