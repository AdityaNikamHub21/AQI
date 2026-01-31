// Fixed JavaScript for AQI Predictor
class AQIPredictor {
    constructor() {
        this.currentAQI = 0;
        this.currentLocation = '';
        this.cityChangeTimeout = null;
        this.forecastChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initForecastChart();
        this.updateAQIDisplay();
    }

    setupEventListeners() {
        const locationInput = document.getElementById('locationInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchLocation();
            });
        }
        
        if (locationInput) {
            locationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchLocation();
            });
            
            locationInput.addEventListener('input', (e) => {
                this.handleCityChange(e.target.value.trim());
            });
        }

        document.querySelectorAll('.forecast-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.forecast-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateForecastRange(parseInt(e.target.dataset.range));
            });
        });
    }

    handleCityChange(newLocation) {
        if (this.cityChangeTimeout) {
            clearTimeout(this.cityChangeTimeout);
        }
        
        this.cityChangeTimeout = setTimeout(() => {
            const supportedCities = ['cbd belapur', 'vashi', 'sanpada', 'mumbai'];
            const normalizedLocation = newLocation.toLowerCase();
            
            if (supportedCities.includes(normalizedLocation) && normalizedLocation !== this.currentLocation.toLowerCase()) {
                this.showNotification(`Switched to ${newLocation} - Updating data...`, 'info');
                this.simulateAQIFetch(newLocation);
                
                const activeBtn = document.querySelector('.forecast-btn.active');
                const hours = activeBtn ? parseInt(activeBtn.dataset.range) : 6;
                
                setTimeout(() => {
                    this.updateForecastRange(hours);
                }, 1000);
            }
        }, 800);
    }

    searchLocation() {
        const location = document.getElementById('locationInput').value.trim();
        if (!location) {
            this.showNotification('Please enter a location', 'error');
            return;
        }
        
        const supportedCities = ['cbd belapur', 'vashi', 'sanpada', 'mumbai'];
        if (!supportedCities.includes(location.toLowerCase())) {
            this.showNotification('Data not available for this location. Try: CBD Belapur, Vashi, Sanpada, or Mumbai', 'error');
            return;
        }
        
        this.currentLocation = location;
        this.simulateAQIFetch(location);
        this.showNotification(`Fetching AQI data for ${location}...`, 'info');
    }

    simulateAQIFetch(location) {
        fetch(`http://localhost:5004/current-aqi/${location}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    this.currentAQI = Math.round(data.data.aqi);
                    this.currentLocation = location;
                    this.updatePollutantsWithRealData(data.data);
                    this.updateAQIDisplay();
                    this.updateForecastChart();
                    this.showNotification(`Real AQI data: ${this.currentAQI} for ${location}`, 'success');
                } else {
                    this.useFallbackData(location);
                }
            })
            .catch(error => {
                console.log('API call failed, using fallback data:', error);
                this.useFallbackData(location);
            });
    }

    useFallbackData(location) {
        setTimeout(() => {
            fetch(`http://localhost:5004/current-aqi/${location}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data) {
                        this.currentAQI = Math.round(data.data.aqi);
                        this.currentLocation = location;
                        this.updatePollutantsWithRealData(data.data);
                        this.updateAQIDisplay();
                        this.updateForecastChart();
                        this.showNotification(`Using latest data for ${location} (AQI: ${this.currentAQI})`, 'success');
                    } else {
                        this.useHardcodedData(location);
                    }
                })
                .catch(error => {
                    console.log('Database API failed, using hardcoded data:', error);
                    this.useHardcodedData(location);
                });
        }, 500);
    }

    useHardcodedData(location) {
        const cachedData = {
            'cbd belapur': { aqi: 104, pm25: 87.1, pm10: 52.0, o3: 22.5, no2: 24.9, no: 13.6, so2: 7.9, co: 4.2, wind_speed: 12.3, humidity: 62.4 },
            'vashi': { aqi: 109, pm25: 95.2, pm10: 58.4, o3: 26.8, no2: 28.7, no: 18.8, so2: 11.2, co: 5.1, wind_speed: 15.2, humidity: 58.9 },
            'sanpada': { aqi: 78, pm25: 78.9, pm10: 45.6, o3: 17.8, no2: 18.6, no: 12.7, so2: 6.5, co: 3.5, wind_speed: 9.7, humidity: 63.3 }
        };
        
        const data = cachedData[location.toLowerCase()] || { aqi: 50, pm25: 50, pm10: 30, o3: 20, no2: 20, no: 10, so2: 5, co: 2, wind_speed: 10, humidity: 60 };
        
        this.currentAQI = data.aqi;
        this.currentLocation = location;
        
        this.updatePollutantsWithRealData(data);
        this.updateAQIDisplay();
        this.updateForecastChart();
        this.showNotification(`Using cached data for ${location} (AQI: ${this.currentAQI})`, 'info');
    }

    updatePollutantsWithRealData(data) {
        const pollutantCards = document.querySelectorAll('.pollutant-card');
        
        const pollutantValues = {
            'PM2.5': data.pm25 || 0,
            'PM10': data.pm10 || 0,
            'O₃': data.o3 || 0,
            'NO₂': data.no2 || 0,
            'SO₂': data.so2 || 0,
            'CO': data.co || 0,
            'NO': data.no || 0,
            '💨': data.wind_speed || 0,
            '💧': data.humidity || 0
        };

        const pollutants = ['PM2.5', 'PM10', 'O₃', 'NO₂', 'SO₂', 'CO', 'NO', '💨', '💧'];
        
        pollutantCards.forEach((card, index) => {
            if (index < pollutants.length) {
                const pollutant = pollutants[index];
                const value = pollutantValues[pollutant];
                const valueElement = card.querySelector('.pollutant-value');
                const statusElement = card.querySelector('.pollutant-status');
                
                if (valueElement) {
                    let displayValue;
                    if (pollutant === 'CO') {
                        displayValue = value > 0 ? value.toFixed(1) : '0';
                    } else if (pollutant === '💨') {
                        displayValue = value > 0 ? value.toFixed(1) : '0';
                    } else if (pollutant === '💧') {
                        displayValue = value > 0 ? value.toFixed(0) : '0';
                    } else {
                        displayValue = value > 0 ? Math.round(value) : '0';
                    }
                    valueElement.textContent = displayValue;
                }
                
                if (statusElement) {
                    const aqiInfo = this.getAQIInfo(data.aqi);
                    statusElement.textContent = aqiInfo.label;
                    statusElement.className = `pollutant-status ${aqiInfo.level}`;
                }
            }
        });
        
        this.updateHealthRisks(data);
    }

    updateHealthRisks(data) {
        const aqi = data.aqi;
        
        let baseRisk;
        if (aqi <= 50) baseRisk = 'low';
        else if (aqi <= 100) baseRisk = 'moderate';
        else if (aqi <= 150) baseRisk = 'high';
        else baseRisk = 'hazardous';
        
        const personas = {
            children: {
                element: 'childrenRisk',
                advice: 'childrenAdvice',
                sensitivity: 1.5
            },
            workers: {
                element: 'workersRisk',
                advice: 'workersAdvice',
                sensitivity: 1.2
            },
            general: {
                element: 'generalRisk',
                advice: 'generalAdvice',
                sensitivity: 1.0
            }
        };
        
        for (const [key, persona] of Object.entries(personas)) {
            const riskElement = document.getElementById(persona.element);
            const adviceElement = document.getElementById(persona.advice);
            
            if (riskElement && adviceElement) {
                const elevatedRisk = this.getElevatedRisk(baseRisk, persona.sensitivity);
                
                riskElement.textContent = elevatedRisk.charAt(0).toUpperCase() + elevatedRisk.slice(1);
                riskElement.className = `risk-level ${elevatedRisk}`;
                
                adviceElement.textContent = this.getHealthAdvice(elevatedRisk, key);
            }
        }
        
        // Update forecast risk indicator
        this.updateForecastRiskIndicator(data);
    }
    
    updateForecastRiskIndicator(data) {
        // Generate forecast data based on current AQI
        const forecastData = this.generateForecastData(data);
        
        // Update overview
        this.updateRiskOverview(forecastData);
        
        // Update hourly breakdown
        this.updateHourlyRisks(forecastData);
    }
    
    generateForecastData(currentData) {
        const baseAQI = currentData.aqi || 100;
        const basePM25 = currentData.pm25 || 50;
        
        // Generate 6-hour forecast with realistic variations
        const forecast = [];
        const personas = ['General Public', 'Children / Elderly', 'Outdoor Workers'];
        
        for (let hour = 1; hour <= 6; hour++) {
            // Add some variation to AQI and PM25
            const variation = 0.8 + (Math.random() * 0.4);
            const aqi = Math.round(baseAQI * variation * (1 + hour * 0.1));
            const pm25 = Math.round(basePM25 * variation * (1 + hour * 0.1));
            
            // Calculate WHO exceedance
            const whoExceedance = pm25 / 15;
            
            // Determine risk level
            let riskLevel;
            if (aqi <= 50) riskLevel = 'low';
            else if (aqi <= 100) riskLevel = 'moderate';
            else if (aqi <= 150) riskLevel = 'high';
            else riskLevel = 'hazardous';
            
            forecast.push({
                hour: hour,
                aqi: aqi,
                pm25: pm25,
                whoExceedance: whoExceedance,
                riskLevel: riskLevel,
                persona: personas[hour % 3],
                exposureHours: Math.min(hour, 8),
                advice: this.getForecastAdvice(riskLevel, personas[hour % 3])
            });
        }
        
        return forecast;
    }
    
    updateRiskOverview(forecastData) {
        // Calculate overall risk
        const riskCounts = { low: 0, moderate: 0, high: 0, hazardous: 0 };
        let totalExceedance = 0;
        let mostAffectedPersona = '';
        let maxRisk = 'low';
        
        forecastData.forEach(item => {
            riskCounts[item.riskLevel]++;
            totalExceedance += item.whoExceedance;
            
            // Find most affected
            if (item.riskLevel === 'hazardous' && item.whoExceedance > 2) {
                mostAffectedPersona = item.persona;
                maxRisk = item.riskLevel;
            }
        });
        
        // Determine overall risk
        let overallRisk = 'low';
        if (riskCounts.hazardous > 0) overallRisk = 'hazardous';
        else if (riskCounts.high > 2) overallRisk = 'high';
        else if (riskCounts.moderate > 2) overallRisk = 'moderate';
        
        // Update DOM
        const overallRiskElement = document.getElementById('overallRisk');
        const whoExceedanceElement = document.getElementById('whoExceedance');
        const mostAffectedElement = document.getElementById('mostAffected');
        
        if (overallRiskElement) {
            overallRiskElement.textContent = overallRisk.toUpperCase();
            overallRiskElement.className = `risk-value ${overallRisk}`;
        }
        
        if (whoExceedanceElement) {
            const avgExceedance = (totalExceedance / forecastData.length).toFixed(1);
            whoExceedanceElement.textContent = `${avgExceedance}x WHO`;
            whoExceedanceElement.className = avgExceedance > 2 ? 'risk-value hazardous' : 'risk-value high';
        }
        
        if (mostAffectedElement) {
            mostAffectedElement.textContent = mostAffectedPersona || 'General Public';
            mostAffectedElement.className = 'risk-value moderate';
        }
    }
    
    updateHourlyRisks(forecastData) {
        const hourlyGrid = document.getElementById('hourlyRisks');
        if (!hourlyGrid) return;
        
        hourlyGrid.innerHTML = '';
        
        forecastData.forEach(item => {
            const hourlyItem = document.createElement('div');
            hourlyItem.className = `hourly-risk-item ${item.riskLevel}`;
            
            hourlyItem.innerHTML = `
                <div class="hourly-risk-hour">Hour ${item.hour}</div>
                <div class="hourly-risk-persona">${item.persona}</div>
                <div class="hourly-risk-risk">Risk: ${item.riskLevel.toUpperCase()}</div>
                <div class="hourly-risk-advice">${item.advice}</div>
            `;
            
            hourlyGrid.appendChild(hourlyItem);
        });
    }
    
    getForecastAdvice(riskLevel, persona) {
        const advice = {
            low: {
                'General Public': 'Safe for outdoor activities',
                'Children / Elderly': 'Safe for outdoor activities',
                'Outdoor Workers': 'Normal working conditions'
            },
            moderate: {
                'General Public': 'Monitor if sensitive',
                'Children / Elderly': 'Reduce prolonged activities',
                'Outdoor Workers': 'Take regular breaks'
            },
            high: {
                'General Public': 'Limit outdoor exertion',
                'Children / Elderly': 'Avoid prolonged activities',
                'Outdoor Workers': 'Use protective equipment'
            },
            hazardous: {
                'General Public': 'Avoid outdoor activities',
                'Children / Elderly': 'Stay indoors',
                'Outdoor Workers': 'Avoid outdoor work'
            }
        };
        return advice[riskLevel][persona];
    }
    
    getElevatedRisk(baseRisk, sensitivity) {
        const riskLevels = ['low', 'moderate', 'high', 'hazardous'];
        const baseIndex = riskLevels.indexOf(baseRisk);
        const elevatedIndex = Math.min(baseIndex + Math.floor(sensitivity - 1), riskLevels.length - 1);
        return riskLevels[elevatedIndex];
    }
    
    getHealthAdvice(riskLevel, persona) {
        const advice = {
            low: {
                children: 'Safe for outdoor activities',
                workers: 'Normal working conditions',
                general: 'Enjoy normal activities'
            },
            moderate: {
                children: 'Reduce prolonged outdoor play',
                workers: 'Monitor health during work',
                general: 'Sensitive people take care'
            },
            high: {
                children: 'Avoid prolonged outdoor exertion',
                workers: 'Reduce prolonged outdoor work',
                general: 'Avoid prolonged outdoor exertion'
            },
            hazardous: {
                children: 'Remain indoors',
                workers: 'Avoid outdoor work',
                general: 'Avoid all outdoor activities'
            }
        };
        return advice[riskLevel][persona];
    }

    updateAQIDisplay() {
        if (this.currentAQI === 0 || this.currentLocation === '') {
            document.getElementById('currentAQI').textContent = '0';
            document.getElementById('currentLocation').textContent = '';
            document.getElementById('updateTime').textContent = '';
            document.getElementById('aqiLabel').textContent = '';
            this.updateGauge(0);
            this.updatePollutants(0);
            return;
        }
        
        document.getElementById('currentAQI').textContent = '~' + this.currentAQI;
        document.getElementById('currentLocation').textContent = this.currentLocation + ', India';
        document.getElementById('updateTime').textContent = 'Updated just now';
        
        const aqiInfo = this.getAQIInfo(this.currentAQI);
        document.getElementById('aqiLabel').textContent = aqiInfo.label;
        
        const aqiValueElement = document.querySelector('.aqi-value');
        aqiValueElement.style.background = aqiInfo.color;
        aqiValueElement.style.webkitBackgroundClip = 'text';
        aqiValueElement.style.webkitTextFillColor = 'transparent';
        
        this.updateGauge(this.currentAQI);
        
        this.updateAnalysis(this.currentAQI);
    }

    updateGauge(aqi) {
        const needle = document.getElementById('gaugeNeedle');
        const gaugeCircle = document.getElementById('gaugeCircle');
        
        if (!needle || !gaugeCircle) {
            return;
        }
        
        let angle;
        if (aqi === 0) {
            angle = 0;
        } else if (aqi <= 50) {
            angle = (aqi / 50) * 72;
        } else if (aqi <= 100) {
            angle = 72 + ((aqi - 50) / 50) * 72;
        } else if (aqi <= 150) {
            angle = 144 + ((aqi - 100) / 50) * 72;
        } else if (aqi <= 200) {
            angle = 216 + ((aqi - 150) / 50) * 72;
        } else if (aqi <= 300) {
            angle = 288 + ((aqi - 200) / 100) * 36;
        } else {
            angle = 324 + Math.min(((aqi - 300) / 200) * 36, 36);
        }
        
        needle.style.transition = 'transform 1s ease-in-out';
        needle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
        
        // Update gauge glow
        let glowColor;
        if (aqi <= 50) {
            glowColor = 'rgba(34, 197, 94, 0.3)'; // Green
        } else if (aqi <= 100) {
            glowColor = 'rgba(234, 179, 8, 0.3)'; // Yellow
        } else if (aqi <= 150) {
            glowColor = 'rgba(251, 146, 60, 0.3)'; // Orange
        } else if (aqi <= 200) {
            glowColor = 'rgba(239, 68, 68, 0.3)'; // Red
        } else if (aqi <= 300) {
            glowColor = 'rgba(168, 85, 247, 0.3)'; // Purple
        } else {
            glowColor = 'rgba(127, 29, 29, 0.3)'; // Maroon
        }
        
        gaugeCircle.style.boxShadow = `0 0 20px ${glowColor}`;
    }

    updatePollutants(aqi) {
        const pollutantCards = document.querySelectorAll('.pollutant-card');
        
        pollutantCards.forEach(card => {
            const valueElement = card.querySelector('.pollutant-value');
            const statusElement = card.querySelector('.pollutant-status');
            
            valueElement.textContent = '0';
            statusElement.textContent = 'No Data';
            statusElement.className = 'pollutant-status';
        });
    }

    updateAnalysis(aqi) {
        const trendElement = document.getElementById('trendAnalysis');
        const riskElement = document.getElementById('riskAnalysis');
        const recommendationsElement = document.getElementById('recommendations');
        
        if (aqi === 0) {
            trendElement.textContent = '';
            riskElement.textContent = '';
            recommendationsElement.textContent = '';
            return;
        }
        
        const aqiInfo = this.getAQIInfo(aqi);
        
        trendElement.textContent = `Current AQI level is ${aqiInfo.label}`;
        riskElement.textContent = this.getRiskAnalysis(aqi);
        recommendationsElement.textContent = this.getRecommendations(aqi);
    }

    getAQIInfo(aqi) {
        if (aqi <= 50) {
            return { label: 'Good', level: 'good', color: 'linear-gradient(135deg, #22c55e, #16a34a)' };
        } else if (aqi <= 100) {
            return { label: 'Moderate', level: 'moderate', color: 'linear-gradient(135deg, #eab308, #ca8a04)' };
        } else if (aqi <= 150) {
            return { label: 'Unhealthy for Sensitive', level: 'unhealthy-sensitive', color: 'linear-gradient(135deg, #fb923c, #ea580c)' };
        } else if (aqi <= 200) {
            return { label: 'Unhealthy', level: 'unhealthy', color: 'linear-gradient(135deg, #ef4444, #dc2626)' };
        } else if (aqi <= 300) {
            return { label: 'Very Unhealthy', level: 'very-unhealthy', color: 'linear-gradient(135deg, #a855f7, #9333ea)' };
        } else {
            return { label: 'Hazardous', level: 'hazardous', color: 'linear-gradient(135deg, #7f1d1d, #991b1b)' };
        }
    }

    getRiskAnalysis(aqi) {
        if (aqi <= 50) return 'Air quality is satisfactory with little or no risk.';
        if (aqi <= 100) return 'Air quality is acceptable; sensitive individuals may experience minor issues.';
        if (aqi <= 150) return 'Members of sensitive groups may experience health effects; general public unlikely to be affected.';
        if (aqi <= 200) return 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects.';
        if (aqi <= 300) return 'Health warnings of emergency conditions; everyone is likely to be affected.';
        return 'Health alert: everyone may experience serious health effects.';
    }

    getRecommendations(aqi) {
        if (aqi <= 50) return 'Enjoy your outdoor activities!';
        if (aqi <= 100) return 'Unusually sensitive people should consider reducing prolonged outdoor exertion.';
        if (aqi <= 150) return 'People with heart disease, older adults, and children should reduce prolonged outdoor exertion.';
        if (aqi <= 200) return 'People with heart disease, older adults, and children should avoid prolonged outdoor exertion; everyone else should reduce prolonged outdoor exertion.';
        if (aqi <= 300) return 'People with heart disease, older adults, and children should avoid all outdoor exertion; everyone else should reduce prolonged outdoor exertion.';
        return 'Everyone should avoid all outdoor exertion.';
    }

    initForecastChart() {
        const ctx = document.getElementById('forecastChart');
        if (!ctx) return;
        
        this.forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Hour 1', 'Hour 2', 'Hour 3', 'Hour 4', 'Hour 5', 'Hour 6'],
                datasets: [{
                    label: 'AQI Forecast',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 300
                    }
                }
            }
        });
    }

    updateForecastChart() {
        if (!this.forecastChart) return;
        
        const forecastData = this.generateSyntheticData(6);
        this.forecastChart.data.labels = forecastData.labels;
        this.forecastChart.data.datasets[0].data = forecastData.values;
        this.forecastChart.update();
    }

    updateForecastRange(hours) {
        if (!this.forecastChart) return;
        
        const forecastData = this.generateSyntheticData(hours);
        this.forecastChart.data.labels = forecastData.labels;
        this.forecastChart.data.datasets[0].data = forecastData.values;
        this.forecastChart.update();
    }

    generateSyntheticData(hours) {
        const labels = [];
        const values = [];
        const now = new Date();
        
        for (let i = 0; i < hours; i++) {
            const hour = new Date(now.getTime() + (i * 60 * 60 * 1000));
            labels.push(hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            
            if (this.currentAQI === 0) {
                values.push(0);
            } else {
                const variation = 0.8 + (Math.random() * 0.4);
                const value = Math.round(this.currentAQI * variation);
                values.push(Math.max(20, Math.min(300, value)));
            }
        }
        
        return { labels, values };
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aqiPredictor = new AQIPredictor();
});

// Global function for manual refresh
function refreshData() {
    if (window.aqiPredictor && window.aqiPredictor.currentLocation) {
        window.aqiPredictor.simulateAQIFetch(window.aqiPredictor.currentLocation);
    }
}
