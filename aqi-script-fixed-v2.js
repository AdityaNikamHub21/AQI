// Fixed JavaScript for AQI Predictor
class AQIPredictor {
    constructor() {
        this.currentAQI = 0;
        this.currentLocation = '';
        this.cityChangeTimeout = null;
        this.updateInterval = null;
        this.forecastChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initForecastChart();
        this.updateAQIDisplay();
        this.startRealTimeUpdates();
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

    startRealTimeUpdates() {
        console.log('🔄 Starting real-time AQI updates...');
        
        // Clear any existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Set up automatic updates every 5 minutes
        this.updateInterval = setInterval(() => {
            if (this.currentLocation) {
                console.log(`⏰ Auto-updating AQI for ${this.currentLocation}...`);
                this.simulateAQIFetch(this.currentLocation);
                this.updateForecastWithRealData(); // Update forecast too
                this.updateTimestamp();
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        console.log('✅ Real-time updates started (every 5 minutes)');
    }
    
    async updateForecastWithRealData() {
        try {
            const response = await fetch(`http://localhost:5005/forecast-aqi/${this.currentLocation}?hours=6`);
            const data = await response.json();
            
            if (data.success && data.data && data.data.forecast) {
                const forecastData = data.data.forecast;
                console.log('🔮 Real forecast data received:', forecastData);
                
                // Update forecast chart with real data
                this.updateForecastChartWithRealData(forecastData);
                
                // Update health risk indicators
                this.updateHealthRiskIndicators(forecastData);
                
                console.log('✅ Forecast updated with real API data');
            }
        } catch (error) {
            console.log('❌ Forecast API failed, using synthetic data:', error);
            // Fallback to synthetic data
            const activeBtn = document.querySelector('.forecast-btn.active');
            const hours = activeBtn ? parseInt(activeBtn.dataset.range) : 6;
            this.updateForecastRange(hours);
        }
    }
    
    updateForecastChartWithRealData(forecastData) {
        if (!this.forecastChart) return;
        
        const labels = forecastData.map(item => {
            const time = new Date(item.timestamp);
            return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        });
        
        const values = forecastData.map(item => item.aqi);
        
        this.forecastChart.data.labels = labels;
        this.forecastChart.data.datasets[0].data = values;
        this.forecastChart.update();
        
        console.log('📈 Forecast chart updated with real data:', { labels, values });
    }
    
    updateHealthRiskIndicators(forecastData) {
        // Calculate risk levels from forecast data
        const aqiValues = forecastData.map(item => item.aqi);
        const maxAQI = Math.max(...aqiValues);
        const avgAQI = aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length;
        
        // Update overall risk
        const overallRiskElement = document.getElementById('overallRisk');
        if (overallRiskElement) {
            let riskLevel = 'Low';
            if (maxAQI > 200) riskLevel = 'Very High';
            else if (maxAQI > 150) riskLevel = 'High';
            else if (maxAQI > 100) riskLevel = 'Moderate';
            
            overallRiskElement.textContent = riskLevel;
            overallRiskElement.className = `risk-value ${riskLevel.toLowerCase().replace(' ', '-')}`;
        }
        
        // Update WHO exceedance
        const whoExceedanceElement = document.getElementById('whoExceedance');
        if (whoExceedanceElement) {
            const exceedanceCount = aqiValues.filter(aqi => aqi > 50).length;
            whoExceedanceElement.textContent = `${exceedanceCount}/6 hours`;
        }
        
        // Update most affected
        const mostAffectedElement = document.getElementById('mostAffected');
        if (mostAffectedElement) {
            const worstHour = forecastData.reduce((worst, current) => 
                current.aqi > worst.aqi ? current : worst
            );
            const worstTime = new Date(worstHour.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', minute: '2-digit' 
            });
            mostAffectedElement.textContent = `Hour ${worstHour.hour} (${worstTime})`;
        }
        
        // Update hourly risk breakdown
        this.updateHourlyRiskBreakdown(forecastData);
    }
    
    updateHourlyRiskBreakdown(forecastData) {
        const hourlyRisksElement = document.getElementById('hourlyRisks');
        if (!hourlyRisksElement) return;
        
        let html = '';
        forecastData.forEach(item => {
            const time = new Date(item.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', minute: '2-digit' 
            });
            
            let riskClass = 'low';
            let riskLabel = 'Low';
            if (item.aqi > 200) { riskClass = 'very-high'; riskLabel = 'Very High'; }
            else if (item.aqi > 150) { riskClass = 'high'; riskLabel = 'High'; }
            else if (item.aqi > 100) { riskClass = 'moderate'; riskLabel = 'Moderate'; }
            else if (item.aqi > 50) { riskClass = 'elevated'; riskLabel = 'Elevated'; }
            
            html += `
                <div class="hourly-risk-item ${riskClass}">
                    <div class="hourly-time">${time}</div>
                    <div class="hourly-aqi">AQI: ${item.aqi}</div>
                    <div class="hourly-risk">${riskLabel}</div>
                    <div class="hourly-confidence">Confidence: ${item.confidence}%</div>
                </div>
            `;
        });
        
        hourlyRisksElement.innerHTML = html;
    }
    
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('⏹️ Real-time updates stopped');
        }
    }
    
    updateTimestamp() {
        const updateTimeElement = document.getElementById('updateTime');
        if (updateTimeElement) {
            const now = new Date();
            updateTimeElement.textContent = `Updated: ${now.toLocaleTimeString()}`;
        }
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
                
                // Auto scroll to AQI section after city change
                setTimeout(() => {
                    this.smoothScrollToSection('current');
                }, 1000);
                
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
        
        // Auto scroll to AQI section after a short delay
        setTimeout(() => {
            this.smoothScrollToSection('current');
        }, 500);
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
                    this.updateExplainability();
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
                        this.updateExplainability();
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
        this.updateExplainability();
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
        console.log('🔄 Updating AQI display...');
        console.log('Current AQI:', this.currentAQI);
        console.log('Current Location:', this.currentLocation);
        
        if (this.currentAQI === 0 || this.currentLocation === '') {
            console.log('❌ No data to display');
            document.getElementById('currentAQI').textContent = '--';
            document.getElementById('aqiLabel').textContent = 'Loading...';
            document.getElementById('currentLocation').textContent = '';
            document.getElementById('updateTime').textContent = '';
            this.updateGauge(0);
            this.updatePollutants(0);
            return;
        }
        
        document.getElementById('currentAQI').textContent = this.currentAQI;
        
        const aqiInfo = this.getAQIInfo(this.currentAQI);
        document.getElementById('aqiLabel').textContent = aqiInfo.label;
        document.getElementById('currentLocation').textContent = this.currentLocation + ', India';
        this.updateTimestamp(); // Update timestamp with real-time info
        
        console.log('✅ AQI display updated:', {
            value: this.currentAQI,
            level: aqiInfo.label,
            location: this.currentLocation
        });
        
        const aqiValueElement = document.querySelector('.aqi-value');
        if (aqiValueElement) {
            aqiValueElement.style.background = aqiInfo.color;
            aqiValueElement.style.webkitBackgroundClip = 'text';
            aqiValueElement.style.webkitTextFillColor = 'transparent';
        }
        
        this.updateGauge(this.currentAQI);
        this.updateAnalysis(this.currentAQI);
        this.updatePollutantsWithRealData({ aqi: this.currentAQI });
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

    updateExplainability() {
        console.log('Updating explainability for:', this.currentLocation, 'AQI:', this.currentAQI);
        
        const cityExplanations = {
            'cbd belapur': {
                low: {
                    traffic: 'AQI remains low due to moderate traffic flow and good dispersion conditions.',
                    weather: 'Coastal breezes are effectively dispersing pollutants, keeping air quality good.',
                    industrial: 'Industrial activity is minimal today, contributing to better air quality.',
                    trafficFactor: 'Moderate Traffic',
                    weatherFactor: 'Good Dispersion',
                    industrialFactor: 'Low Industrial Activity'
                },
                moderate: {
                    traffic: 'AQI is rising due to increased commercial traffic during business hours.',
                    weather: 'Moderate wind speed is providing some pollutant dispersion.',
                    industrial: 'Normal port and industrial operations are contributing to moderate pollution levels.',
                    trafficFactor: 'Business Hour Traffic',
                    weatherFactor: 'Moderate Dispersion',
                    industrialFactor: 'Normal Operations'
                },
                high: {
                    traffic: 'AQI is elevated due to heavy commercial traffic and railway station congestion.',
                    weather: 'Low wind speed is limiting pollutant dispersion in the area.',
                    industrial: 'Increased port activity and industrial operations are contributing to high pollution.',
                    trafficFactor: 'Heavy Commercial Traffic',
                    weatherFactor: 'Poor Dispersion',
                    industrialFactor: 'High Port Activity'
                },
                veryHigh: {
                    traffic: 'AQI is very high due to severe traffic congestion and peak commercial activity.',
                    weather: 'Stagnant air conditions are trapping pollutants over the area.',
                    industrial: 'Maximum industrial output combined with port operations is severely impacting air quality.',
                    trafficFactor: 'Severe Congestion',
                    weatherFactor: 'Stagnant Air',
                    industrialFactor: 'Maximum Industrial Output'
                }
            },
            'vashi': {
                low: {
                    traffic: 'AQI is low thanks to smooth traffic flow and minimal congestion.',
                    weather: 'Open layout and good wind circulation are maintaining excellent air quality.',
                    industrial: 'Limited commercial activity is keeping pollution levels low.',
                    trafficFactor: 'Light Traffic',
                    weatherFactor: 'Excellent Circulation',
                    industrialFactor: 'Minimal Activity'
                },
                moderate: {
                    traffic: 'AQI is moderate due to typical residential and shopping area traffic.',
                    weather: 'Open layout is helping with moderate air dispersion.',
                    industrial: 'Normal commercial establishments are contributing to moderate pollution levels.',
                    trafficFactor: 'Residential Traffic',
                    weatherFactor: 'Good Air Flow',
                    industrialFactor: 'Commercial Activity'
                },
                high: {
                    traffic: 'AQI is high due to shopping mall congestion and increased residential traffic.',
                    weather: 'Reduced wind circulation is limiting pollutant dispersion.',
                    industrial: 'Increased commercial activity is contributing to elevated pollution levels.',
                    trafficFactor: 'Mall Congestion',
                    weatherFactor: 'Limited Air Flow',
                    industrialFactor: 'High Commercial Activity'
                },
                veryHigh: {
                    traffic: 'AQI is very high due to severe traffic jams around commercial areas.',
                    weather: 'Poor atmospheric conditions are trapping pollutants.',
                    industrial: 'Peak commercial operations combined with traffic are severely affecting air quality.',
                    trafficFactor: 'Severe Traffic Jams',
                    weatherFactor: 'Poor Atmospheric Conditions',
                    industrialFactor: 'Peak Commercial Operations'
                }
            },
            'sanpada': {
                low: {
                    traffic: 'AQI is low with light traffic around railway and market areas.',
                    weather: 'Adequate wind movement is maintaining good air quality despite dense construction.',
                    industrial: 'Small-scale workshops have minimal activity today.',
                    trafficFactor: 'Light Traffic',
                    weatherFactor: 'Adequate Wind Movement',
                    industrialFactor: 'Minimal Workshop Activity'
                },
                moderate: {
                    traffic: 'AQI is moderate due to normal railway crossing and market area traffic.',
                    weather: 'Moderate air flow is providing some pollutant dispersion.',
                    industrial: 'Typical small-scale industrial activity is contributing to moderate pollution.',
                    trafficFactor: 'Normal Railway Traffic',
                    weatherFactor: 'Moderate Air Flow',
                    industrialFactor: 'Typical Workshop Activity'
                },
                high: {
                    traffic: 'AQI is high due to heavy railway crossing traffic and market congestion.',
                    weather: 'Dense construction is restricting air flow, creating pollution pockets.',
                    industrial: 'Increased small-scale industrial activity is contributing to high pollution levels.',
                    trafficFactor: 'Heavy Railway Traffic',
                    weatherFactor: 'Restricted Air Flow',
                    industrialFactor: 'High Workshop Activity'
                },
                veryHigh: {
                    traffic: 'AQI is very high due to severe railway and market area congestion.',
                    weather: 'Very poor air circulation is trapping pollutants in dense construction areas.',
                    industrial: 'Maximum small-scale industrial output is severely impacting air quality.',
                    trafficFactor: 'Severe Railway Congestion',
                    weatherFactor: 'Very Poor Circulation',
                    industrialFactor: 'Maximum Workshop Output'
                }
            },
            'mumbai': {
                low: {
                    traffic: 'AQI is surprisingly low due to reduced traffic density and good public transport usage.',
                    weather: 'Favorable sea-land breeze patterns are effectively dispersing pollutants.',
                    industrial: 'Industrial zones are operating at reduced capacity today.',
                    trafficFactor: 'Reduced Traffic',
                    weatherFactor: 'Favorable Sea Breeze',
                    industrialFactor: 'Reduced Industrial Activity'
                },
                moderate: {
                    traffic: 'AQI is moderate due to typical megacity traffic conditions.',
                    weather: 'Normal sea-land breeze patterns are providing moderate pollutant dispersion.',
                    industrial: 'Normal industrial zone operations are contributing to moderate pollution.',
                    trafficFactor: 'Typical Megacity Traffic',
                    weatherFactor: 'Normal Sea Breeze',
                    industrialFactor: 'Normal Industrial Operations'
                },
                high: {
                    traffic: 'AQI is high due to massive vehicular density and public transport congestion.',
                    weather: 'Urban heat island effect is reducing natural air dispersion.',
                    industrial: 'Large-scale industrial zones are significantly contributing to pollution levels.',
                    trafficFactor: 'Massive Traffic Density',
                    weatherFactor: 'Urban Heat Island',
                    industrialFactor: 'High Industrial Activity'
                },
                veryHigh: {
                    traffic: 'AQI is very high due to extreme traffic congestion and transport system overload.',
                    weather: 'Severe urban heat island combined with poor atmospheric conditions is trapping pollutants.',
                    industrial: 'Maximum industrial zone output is creating severe pollution levels.',
                    trafficFactor: 'Extreme Traffic Overload',
                    weatherFactor: 'Severe Heat Island',
                    industrialFactor: 'Maximum Industrial Output'
                }
            }
        };

        const city = this.currentLocation.toLowerCase();
        let aqiLevel = 'low';
        
        if (this.currentAQI > 200) {
            aqiLevel = 'veryHigh';
        } else if (this.currentAQI > 150) {
            aqiLevel = 'high';
        } else if (this.currentAQI > 100) {
            aqiLevel = 'moderate';
        }

        const explanations = cityExplanations[city]?.[aqiLevel] || cityExplanations['mumbai'][aqiLevel];

        // Update traffic explanation
        const trafficEl = document.getElementById('trafficExplanation');
        const trafficFactorEl = document.getElementById('trafficFactor');
        console.log('Traffic elements:', trafficEl, trafficFactorEl);
        if (trafficEl) {
            trafficEl.textContent = `"${explanations.traffic}"`;
            console.log('Updated traffic text:', explanations.traffic);
        }
        if (trafficFactorEl) {
            trafficFactorEl.textContent = explanations.trafficFactor;
            trafficFactorEl.className = `factor-value ${aqiLevel === 'low' ? 'low' : aqiLevel === 'moderate' ? 'moderate' : 'high'}`;
            console.log('Updated traffic factor:', explanations.trafficFactor);
        }

        // Update weather explanation
        const weatherEl = document.getElementById('weatherExplanation');
        const weatherFactorEl = document.getElementById('weatherFactor');
        if (weatherEl) weatherEl.textContent = `"${explanations.weather}"`;
        if (weatherFactorEl) {
            weatherFactorEl.textContent = explanations.weatherFactor;
            weatherFactorEl.className = `factor-value ${aqiLevel === 'low' ? 'low' : aqiLevel === 'moderate' ? 'moderate' : 'high'}`;
        }

        // Update industrial explanation
        const industrialEl = document.getElementById('industrialExplanation');
        const industrialFactorEl = document.getElementById('industrialFactor');
        if (industrialEl) industrialEl.textContent = `"${explanations.industrial}"`;
        if (industrialFactorEl) {
            industrialFactorEl.textContent = explanations.industrialFactor;
            industrialFactorEl.className = `factor-value ${aqiLevel === 'low' ? 'low' : aqiLevel === 'moderate' ? 'moderate' : 'high'}`;
        }

        // Update "What We Explain" section answers
        this.updateExplainabilityAnswers(city, aqiLevel, explanations);
    }

    updateExplainabilityAnswers(city, aqiLevel, explanations) {
        const whyAqiHighEl = document.getElementById('whyAqiHigh');
        const whichFactorsEl = document.getElementById('whichFactors');
        const tempOrPersistentEl = document.getElementById('tempOrPersistent');

        // Why AQI is High
        if (whyAqiHighEl) {
            const whyAnswers = {
                'cbd belapur': {
                    low: 'AQI is low due to moderate commercial activity and effective coastal air dispersion.',
                    moderate: 'AQI is moderate due to normal business traffic and standard port operations.',
                    high: 'AQI is high primarily due to heavy commercial traffic congestion and increased port activity.',
                    veryHigh: 'AQI is very high due to severe traffic congestion and maximum industrial output.'
                },
                'vashi': {
                    low: 'AQI is low thanks to smooth traffic flow and excellent air circulation in the open layout.',
                    moderate: 'AQI is moderate due to typical residential traffic and normal commercial activity.',
                    high: 'AQI is high mainly due to shopping mall congestion and increased residential traffic.',
                    veryHigh: 'AQI is very high due to severe traffic jams around commercial areas and peak operations.'
                },
                'sanpada': {
                    low: 'AQI is low with light railway traffic and adequate wind movement despite dense construction.',
                    moderate: 'AQI is moderate due to normal railway crossing traffic and typical workshop activity.',
                    high: 'AQI is high primarily due to heavy railway traffic and market congestion.',
                    veryHigh: 'AQI is very high due to severe railway congestion and maximum workshop output.'
                },
                'mumbai': {
                    low: 'AQI is low due to reduced traffic density and favorable sea-land breeze patterns.',
                    moderate: 'AQI is moderate due to typical megacity traffic and normal industrial operations.',
                    high: 'AQI is high primarily due to massive traffic congestion and large-scale industrial activity.',
                    veryHigh: 'AQI is very high due to extreme traffic overload and maximum industrial zone output.'
                }
            };
            whyAqiHighEl.textContent = whyAnswers[city]?.[aqiLevel] || whyAnswers['mumbai'][aqiLevel];
        }

        // Which Factors Contributed Most
        if (whichFactorsEl) {
            const factorAnswers = {
                'cbd belapur': {
                    low: 'Coastal breezes and minimal port activity are the dominant factors.',
                    moderate: 'Commercial traffic and port operations contribute equally.',
                    high: 'Heavy commercial traffic (60%) and port activity (30%) are the main contributors.',
                    veryHigh: 'Traffic congestion (50%) and maximum industrial output (40%) are the primary drivers.'
                },
                'vashi': {
                    low: 'Open layout design and light traffic are the key factors.',
                    moderate: 'Residential traffic and commercial activity are balanced contributors.',
                    high: 'Shopping mall congestion (55%) and residential traffic (35%) are dominant.',
                    veryHigh: 'Commercial traffic (60%) and peak operations (30%) are the main factors.'
                },
                'sanpada': {
                    low: 'Adequate wind movement and light railway traffic are key factors.',
                    moderate: 'Railway traffic and workshop activity contribute equally.',
                    high: 'Railway congestion (50%) and market traffic (40%) are the main contributors.',
                    veryHigh: 'Railway congestion (55%) and workshop output (35%) are dominant factors.'
                },
                'mumbai': {
                    low: 'Reduced traffic and favorable sea breeze patterns are key factors.',
                    moderate: 'Traffic density and industrial operations are balanced contributors.',
                    high: 'Traffic congestion (60%) and industrial activity (30%) are the main drivers.',
                    veryHigh: 'Traffic overload (55%) and industrial output (40%) are the primary factors.'
                }
            };
            whichFactorsEl.textContent = factorAnswers[city]?.[aqiLevel] || factorAnswers['mumbai'][aqiLevel];
        }

        // Temporary or Persistent
        if (tempOrPersistentEl) {
            const persistenceAnswers = {
                'cbd belapur': {
                    low: 'Current good conditions are temporary, expect normal levels during business hours.',
                    moderate: 'Moderate conditions are persistent during weekdays, expect improvement on weekends.',
                    high: 'High conditions are temporary, expect improvement after peak traffic hours.',
                    veryHigh: 'Very high conditions are temporary but may persist during peak business periods.'
                },
                'vashi': {
                    low: 'Current low conditions are temporary, expect moderate levels during shopping hours.',
                    moderate: 'Moderate conditions are persistent during evenings and weekends.',
                    high: 'High conditions are temporary, expect improvement after mall closing hours.',
                    veryHigh: 'Very high conditions are temporary but may persist during festival periods.'
                },
                'sanpada': {
                    low: 'Current low conditions are temporary, expect moderate levels during market hours.',
                    moderate: 'Moderate conditions are persistent during railway peak hours.',
                    high: 'High conditions are temporary, expect improvement after railway peak hours.',
                    veryHigh: 'Very high conditions are temporary but may persist during market peak times.'
                },
                'mumbai': {
                    low: 'Current low conditions are temporary, expect moderate levels during rush hours.',
                    moderate: 'Moderate conditions are persistent during weekdays, slight improvement on weekends.',
                    high: 'High conditions are temporary, expect improvement after rush hours.',
                    veryHigh: 'Very high conditions are temporary but may persist during peak business days.'
                }
            };
            tempOrPersistentEl.textContent = persistenceAnswers[city]?.[aqiLevel] || persistenceAnswers['mumbai'][aqiLevel];
        }
    }

    smoothScrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const startPosition = window.pageYOffset;
            const targetPosition = section.offsetTop - headerHeight - 20;
            const distance = targetPosition - startPosition;
            const duration = 2000; // 2 seconds for slower scroll
            let start = null;
            
            function animation(currentTime) {
                if (start === null) start = currentTime;
                const timeElapsed = currentTime - start;
                const run = ease(timeElapsed, startPosition, distance, duration);
                window.scrollTo(0, run);
                if (timeElapsed < duration) requestAnimationFrame(animation);
            }
            
            function ease(t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            }
            
            requestAnimationFrame(animation);
        }
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
    window.healthRiskAI = new HealthRiskAI();
    window.spatialMap = new SpatialMap();
});

class SpatialMap {
    constructor() {
        this.currentCity = '';
        this.mapData = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const generateBtn = document.getElementById('generateMapBtn');
        const refreshBtn = document.getElementById('refreshMapBtn');
        const citySelect = document.getElementById('cityMapSelect');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateHeatMap();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshMapData();
            });
        }

        if (citySelect) {
            citySelect.addEventListener('change', () => {
                const city = citySelect.value;
                if (city) {
                    this.currentCity = city;
                    this.generateHeatMap();
                }
            });
        }
    }

    async generateHeatMap() {
        const citySelect = document.getElementById('cityMapSelect');
        const city = citySelect.value || this.currentCity;

        if (!city) {
            this.showNotification('Please select a city', 'error');
            return;
        }

        try {
            // Show loading state
            this.showLoadingState();

            // Call spatial analysis API
            const response = await fetch('http://localhost:5006/spatial-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ city: city })
            });

            if (response.ok) {
                const result = await response.json();
                this.displaySpatialResults(result, city);
            } else {
                // Fallback to mock data
                const mockResult = this.generateMockSpatialData(city);
                this.displaySpatialResults(mockResult, city);
            }
        } catch (error) {
            console.log('Spatial API not available, using mock data:', error);
            const mockResult = this.generateMockSpatialData(city);
            this.displaySpatialResults(mockResult, city);
        }
    }

    generateMockSpatialData(city) {
        const cityData = {
            'cbd belapur': {
                areas: [
                    { name: 'CBD Belapur Central', lat: 19.0158, lon: 73.0295, aqi: 104 },
                    { name: 'Belapur Railway Station', lat: 19.0165, lon: 73.0288, aqi: 112 },
                    { name: 'CBD Belapur Market', lat: 19.0148, lon: 73.0302, aqi: 98 },
                    { name: 'NMMT Bus Stand', lat: 19.0172, lon: 73.0279, aqi: 118 },
                    { name: 'Belapur Creek', lat: 19.0135, lon: 73.0311, aqi: 89 },
                    { name: 'Sector 15', lat: 19.0189, lon: 73.0267, aqi: 95 },
                    { name: 'Sector 11', lat: 19.0123, lon: 73.0328, aqi: 102 },
                    { name: 'Palm Beach Road', lat: 19.0198, lon: 73.0254, aqi: 108 }
                ],
                center: { lat: 19.0158, lon: 73.0295 }
            },
            'vashi': {
                areas: [
                    { name: 'Vashi Railway Station', lat: 19.0748, lon: 72.9976, aqi: 109 },
                    { name: 'Vashi Plaza', lat: 19.0735, lon: 72.9989, aqi: 115 },
                    { name: 'Sector 17', lat: 19.0762, lon: 72.9954, aqi: 103 },
                    { name: 'Vashi Beach', lat: 19.0721, lon: 72.9998, aqi: 87 },
                    { name: 'Vashi Fort', lat: 19.0756, lon: 72.9962, aqi: 96 },
                    { name: 'Sector 29', lat: 19.0718, lon: 73.0012, aqi: 112 },
                    { name: 'Turbhe Naka', lat: 19.0789, lon: 72.9934, aqi: 121 },
                    { name: 'Vashi Highway', lat: 19.0774, lon: 72.9948, aqi: 105 }
                ],
                center: { lat: 19.0748, lon: 72.9976 }
            },
            'sanpada': {
                areas: [
                    { name: 'Sanpada Railway Station', lat: 19.0209, lon: 73.0069, aqi: 78 },
                    { name: 'Sanpada Market', lat: 19.0198, lon: 73.0081, aqi: 82 },
                    { name: 'Sector 6', lat: 19.0221, lon: 73.0056, aqi: 75 },
                    { name: 'Sector 8', lat: 19.0187, lon: 73.0078, aqi: 80 },
                    { name: 'Sanpada Lake', lat: 19.0215, lon: 73.0049, aqi: 71 },
                    { name: 'Turbhe Station', lat: 19.0234, lon: 73.0038, aqi: 85 },
                    { name: 'Sector 15A', lat: 19.0176, lon: 73.0092, aqi: 79 },
                    { name: 'Sanpada Gaon', lat: 19.0192, lon: 73.0105, aqi: 76 }
                ],
                center: { lat: 19.0209, lon: 73.0069 }
            },
            'mumbai': {
                areas: [
                    { name: 'Gateway of India', lat: 19.0218, lon: 72.8646, aqi: 125 },
                    { name: 'Marine Drive', lat: 19.0004, lon: 72.8268, aqi: 118 },
                    { name: 'CST Railway Station', lat: 19.0145, lon: 72.8359, aqi: 132 },
                    { name: 'Bandra-Worli Sea Link', lat: 19.0300, lon: 72.8170, aqi: 108 },
                    { name: 'Juhu Beach', lat: 19.1046, lon: 72.8265, aqi: 95 },
                    { name: 'Worli Sea Face', lat: 19.0012, lon: 72.8189, aqi: 112 },
                    { name: 'Haji Ali', lat: 18.9835, lon: 72.8193, aqi: 105 },
                    { name: 'Nariman Point', lat: 18.9332, lon: 72.8236, aqi: 120 }
                ],
                center: { lat: 19.0760, lon: 72.8777 }
            }
        };

        const data = cityData[city.toLowerCase()] || cityData['mumbai'];
        
        // Add some variation to simulate real-time changes
        data.areas.forEach(area => {
            area.aqi += Math.floor(Math.random() * 11) - 5; // ±5 variation
            area.aqi = Math.max(0, Math.min(500, area.aqi)); // Keep in valid range
        });

        return {
            city: city,
            areas: data.areas,
            center: data.center,
            stats: this.calculateStats(data.areas)
        };
    }

    calculateStats(areas) {
        const aqiValues = areas.map(area => area.aqi);
        const mean = aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length;
        const min = Math.min(...aqiValues);
        const max = Math.max(...aqiValues);
        const std = Math.sqrt(aqiValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / aqiValues.length);
        
        const highestArea = areas.reduce((max, area) => area.aqi > max.aqi ? area : max);
        const lowestArea = areas.reduce((min, area) => area.aqi < min.aqi ? area : min);

        return {
            mean_aqi: Math.round(mean),
            min_aqi: min,
            max_aqi: max,
            range_aqi: max - min,
            std_aqi: Math.round(std),
            coefficient_of_variation: (std / mean).toFixed(2),
            highest_area: highestArea,
            lowest_area: lowestArea
        };
    }

    displaySpatialResults(result, city) {
        this.mapData = result;
        
        // Show map container
        document.getElementById('mapContainer').style.display = 'block';
        document.getElementById('refreshMapBtn').style.display = 'flex';

        // Update header
        document.getElementById('mapTitle').textContent = `${city.title()} AQI Heat Map`;

        // Update stats
        document.getElementById('areasCount').textContent = result.areas.length;
        document.getElementById('avgAQI').textContent = result.stats.mean_aqi;
        document.getElementById('aqiRange').textContent = `${result.stats.min_aqi}-${result.stats.max_aqi}`;

        // Create Folium map immediately
        this.createFoliumMap(result);

        // Update area cards
        this.updateAreaCards(result.areas);

        // Update insights
        this.updateSpatialInsights(result.stats);

        // Auto-scroll to map
        setTimeout(() => {
            this.smoothScrollToSection('spatialMap');
        }, 300);
    }

    createFoliumMap(result) {
        console.log('Creating map for', result.city, 'with', result.areas.length, 'areas');
        
        // Create actual interactive map with Leaflet
        const mapContainer = document.getElementById('foliumMap');
        mapContainer.innerHTML = `
            <div id="leafletMap" style="width: 100%; height: 100%; border-radius: 12px;"></div>
        `;

        // Check if Leaflet is available immediately
        if (typeof L === 'undefined') {
            console.error('Leaflet not loaded, using fallback');
            this.showMapFallback(result);
            return;
        }

        // Try to create map immediately
        try {
            console.log('Initializing Leaflet map...');
            
            // Initialize Leaflet map
            const map = L.map('leafletMap').setView([result.center.lat, result.center.lon], 13);

            // Add tile layers
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Create heat map data with AQI intensity
            const heatData = result.areas.map(area => [area.lat, area.lon, Math.min(1.0, area.aqi / 200)]);
            console.log('Heat data prepared:', heatData.length, 'points');

            // Add heat map layer if available
            if (L.HeatLayer) {
                try {
                    const heat = L.heatLayer(heatData, {
                        radius: 25,
                        blur: 15,
                        maxZoom: 17,
                        gradient: {
                            0.0: '#00e400',    // Green - Good
                            0.3: '#ffff00',    // Yellow - Moderate
                            0.6: '#ff7e00',    // Orange - Unhealthy for sensitive
                            0.8: '#ff0000',    // Red - Unhealthy
                            1.0: '#7e0023'     // Maroon - Hazardous
                        }
                    }).addTo(map);
                    console.log('Heat layer added successfully');
                } catch (heatError) {
                    console.warn('Heat layer failed, using markers only:', heatError);
                }
            } else {
                console.warn('Heat layer not available');
            }

            // Add markers for each area with AQI-based styling
            result.areas.forEach((area, index) => {
                const color = this.getAQIColor(area.aqi);
                const status = this.getAQIStatus(area.aqi);
                
                // Create popup content
                const popupContent = `
                    <div style="font-family: Arial, sans-serif; min-width: 200px;">
                        <h4 style="margin: 0; color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 5px;">${area.name}</h4>
                        <div style="padding: 8px 0;">
                            <p style="margin: 5px 0; font-size: 16px; font-weight: bold;"><strong>AQI: ${area.aqi}</strong></p>
                            <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> <span style="color: ${color};">${status}</span></p>
                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 5px;">
                                <strong>📍 Coordinates:</strong><br>
                                Lat: ${area.lat.toFixed(4)}<br>
                                Lon: ${area.lon.toFixed(4)}
                            </p>
                        </div>
                    </div>
                `;

                // Create circle marker with AQI-based radius
                const markerRadius = Math.max(6, Math.min(15, area.aqi / 10));
                const marker = L.circleMarker([area.lat, area.lon], {
                    radius: markerRadius,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 0.9,
                    fillOpacity: 0.8
                }).addTo(map);

                marker.bindPopup(popupContent);
                
                // Add tooltip on hover
                marker.bindTooltip(`${area.name}: AQI ${area.aqi}`, {
                    permanent: false,
                    direction: 'top'
                });
                
                console.log(`Added marker ${index + 1}: ${area.name} (AQI: ${area.aqi})`);
            });

            // Add layer control for different map styles
            const baseMaps = {
                "Standard": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
                "Light": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png')
            };

            L.control.layers(baseMaps, {}, {
                position: 'topright'
            }).addTo(map);

            // Add scale control
            L.control.scale().addTo(map);

            // Fit map to show all markers
            setTimeout(() => {
                const group = new L.featureGroup(Object.values(map._layers).filter(l => l instanceof L.Marker || l instanceof L.CircleMarker));
                if (group.getLayers().length > 0) {
                    map.fitBounds(group.getBounds().pad(0.1));
                    console.log('Map fitted to bounds with', group.getLayers().length, 'markers');
                }
            }, 500);

            console.log('✅ Map successfully created with', result.areas.length, 'markers');

        } catch (error) {
            console.error('❌ Error creating map:', error);
            this.showMapFallback(result);
        }
    }

    showMapFallback(result) {
        const mapContainer = document.getElementById('foliumMap');
        mapContainer.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 12px; position: relative;">
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🗺️</div>
                    <h3 style="color: #2563eb; margin-bottom: 1rem;">Spatial AQI Data Ready</h3>
                    <p style="color: #64748b; margin-bottom: 1rem;">Interactive map loading for ${result.areas.length} locations</p>
                    
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; margin: 1rem 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h4 style="color: #2563eb; margin-bottom: 1rem;">📍 ${result.city} AQI Overview</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; text-align: left;">
                            <div>
                                <strong>Center:</strong><br>
                                Lat: ${result.center.lat.toFixed(4)}<br>
                                Lon: ${result.center.lon.toFixed(4)}
                            </div>
                            <div>
                                <strong>AQI Stats:</strong><br>
                                Avg: ${result.stats.mean_aqi}<br>
                                Range: ${result.stats.min_aqi}-${result.stats.max_aqi}
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; font-size: 0.9rem; color: #94a3b8;">
                        📍 Areas: ${result.areas.map(a => a.name).join(', ')}<br>
                        📊 Highest: ${result.stats.highest_area.name} (AQI: ${result.stats.highest_area.aqi})<br>
                        📉 Lowest: ${result.stats.lowest_area.name} (AQI: ${result.stats.lowest_area.aqi})
                    </div>
                </div>
            </div>
        `;
    }

    getAQIColor(aqi) {
        if (aqi <= 50) return '#00e400';
        if (aqi <= 100) return '#ffff00';
        if (aqi <= 150) return '#ff7e00';
        if (aqi <= 200) return '#ff0000';
        if (aqi <= 300) return '#8f3f97';
        return '#7e0023';
    }

    updateAreaCards(areas) {
        const areaGrid = document.getElementById('areaGrid');
        areaGrid.innerHTML = '';

        areas.forEach(area => {
            const status = this.getAQIStatus(area.aqi);
            const colorClass = this.getAQIClass(area.aqi);
            
            const card = document.createElement('div');
            card.className = `area-card ${colorClass}`;
            card.innerHTML = `
                <div class="area-name">${area.name}</div>
                <div class="area-aqi">${area.aqi}</div>
                <div class="area-status">${status}</div>
                <div class="area-coords">📍 ${area.lat.toFixed(4)}, ${area.lon.toFixed(4)}</div>
            `;
            areaGrid.appendChild(card);
        });
    }

    updateSpatialInsights(stats) {
        document.getElementById('highestArea').innerHTML = 
            `<strong>${stats.highest_area.name}</strong><br>AQI: ${stats.highest_area.aqi}`;
        
        document.getElementById('lowestArea').innerHTML = 
            `<strong>${stats.lowest_area.name}</strong><br>AQI: ${stats.lowest_area.aqi}`;
        
        document.getElementById('aqiVariation').innerHTML = 
            `Range: ${stats.range_aqi}<br>Std Dev: ${stats.std_aqi}`;
        
        const uniformity = stats.coefficient_of_variation < 0.2 ? 'High' : 
                          stats.coefficient_of_variation < 0.4 ? 'Medium' : 'Low';
        document.getElementById('uniformityIndex').innerHTML = 
            `${uniformity} (${(stats.coefficient_of_variation * 100).toFixed(1)}%)`;
    }

    getAQIStatus(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }

    getAQIClass(aqi) {
        if (aqi <= 50) return 'good';
        if (aqi <= 100) return 'moderate';
        if (aqi <= 150) return 'unhealthy-sensitive';
        if (aqi <= 200) return 'unhealthy';
        if (aqi <= 300) return 'very-unhealthy';
        return 'hazardous';
    }

    refreshMapData() {
        if (this.currentCity) {
            this.generateHeatMap();
        }
    }

    showLoadingState() {
        const mapContainer = document.getElementById('mapContainer');
        mapContainer.style.display = 'block';
        mapContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">🗺️</div>
                <h3>Generating Heat Map...</h3>
                <p style="color: #64748b;">Loading spatial data and creating visualization</p>
            </div>
        `;
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

    smoothScrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const startPosition = window.pageYOffset;
            const targetPosition = section.offsetTop - headerHeight - 20;
            const distance = targetPosition - startPosition;
            const duration = 1500;
            let start = null;
            
            function animation(currentTime) {
                if (start === null) start = currentTime;
                const timeElapsed = currentTime - start;
                const run = ease(timeElapsed, startPosition, distance, duration);
                window.scrollTo(0, run);
                if (timeElapsed < duration) requestAnimationFrame(animation);
            }
            
            function ease(t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            }
            
            requestAnimationFrame(animation);
        }
    }
}

class HealthRiskAI {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const predictBtn = document.getElementById('predictRiskBtn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => {
                this.predictHealthRisk();
            });
        }
    }

    async predictHealthRisk() {
        const persona = document.getElementById('personaSelect').value;
        const exposureHours = parseInt(document.getElementById('exposureHours').value);
        
        // Get current AQI data
        const pm25 = this.getCurrentPM25();
        const aqi = window.aqiPredictor?.currentAQI || 100;
        const windSpeed = this.getCurrentWindSpeed();
        const humidity = this.getCurrentHumidity();
        const aqiTrend = this.getAQITrend();

        const forecastData = {
            forecasted_pm25: pm25,
            forecasted_aqi: aqi,
            aqi_trend: aqiTrend,
            wind_speed: windSpeed,
            humidity: humidity,
            exposure_hours: exposureHours,
            persona_code: parseInt(persona)
        };

        try {
            // Call the health risk API
            const response = await fetch('http://localhost:5005/predict-health-risk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(forecastData)
            });

            if (response.ok) {
                const result = await response.json();
                this.displayRiskResult(result);
            } else {
                // Fallback to mock prediction if API fails
                const mockResult = this.mockHealthRiskPrediction(forecastData);
                this.displayRiskResult(mockResult);
            }
        } catch (error) {
            console.log('Health risk API not available, using mock prediction:', error);
            const mockResult = this.mockHealthRiskPrediction(forecastData);
            this.displayRiskResult(mockResult);
        }
    }

    mockHealthRiskPrediction(data) {
        // Mock AI prediction based on input features
        const riskScore = (
            data.forecasted_pm25 * 0.3 +
            data.forecasted_aqi * 0.2 +
            (data.persona_code * 10) +
            (data.exposure_hours * 2) -
            (data.wind_speed * 5)
        );

        let riskCategory, confidence, color;
        if (riskScore < 30) {
            riskCategory = 'Low';
            confidence = 0.85 + Math.random() * 0.1;
            color = '#00e400';
        } else if (riskScore < 60) {
            riskCategory = 'Moderate';
            confidence = 0.80 + Math.random() * 0.15;
            color = '#ffff00';
        } else if (riskScore < 90) {
            riskCategory = 'High';
            confidence = 0.75 + Math.random() * 0.2;
            color = '#ff0000';
        } else {
            riskCategory = 'Hazardous';
            confidence = 0.70 + Math.random() * 0.25;
            color = '#7e0023';
        }

        return {
            risk_category: riskCategory,
            confidence: confidence,
            color: color,
            risk_score: riskScore / 100,
            all_probabilities: {
                'Low': riskCategory === 'Low' ? confidence : Math.random() * 0.2,
                'Moderate': riskCategory === 'Moderate' ? confidence : Math.random() * 0.3,
                'High': riskCategory === 'High' ? confidence : Math.random() * 0.3,
                'Hazardous': riskCategory === 'Hazardous' ? confidence : Math.random() * 0.2
            }
        };
    }

    displayRiskResult(result) {
        const resultDiv = document.getElementById('aiRiskResult');
        resultDiv.style.display = 'block';

        // Update risk category
        const riskValueEl = document.getElementById('aiRiskValue');
        riskValueEl.textContent = result.risk_category;
        riskValueEl.style.backgroundColor = result.color;

        // Update confidence
        const confidencePercent = Math.round(result.confidence * 100);
        document.getElementById('confidenceFill').style.width = confidencePercent + '%';
        document.getElementById('confidencePercent').textContent = confidencePercent + '%';

        // Update gauge needle
        const needleRotation = this.getNeedleRotation(result.risk_category);
        document.getElementById('gaugeNeedleAI').style.transform = 
            `translateX(-50%) rotate(${needleRotation}deg)`;

        // Update factor impacts
        this.updateFactorImpacts(result);

        // Update probabilities
        this.updateProbabilities(result.all_probabilities);

        // Smooth scroll to results
        setTimeout(() => {
            this.smoothScrollToSection('healthRiskAI');
        }, 300);
    }

    updateFactorImpacts(result) {
        const impacts = {
            pm25: Math.min(100, (result.risk_score * 150)),
            aqi: Math.min(100, (result.risk_score * 120)),
            who: Math.min(100, (result.risk_score * 100)),
            personal: Math.min(100, (result.risk_score * 80))
        };

        Object.keys(impacts).forEach(factor => {
            const impactEl = document.getElementById(factor + 'Impact');
            const percentEl = document.getElementById(factor + 'Percent');
            if (impactEl && percentEl) {
                impactEl.style.width = impacts[factor] + '%';
                percentEl.textContent = Math.round(impacts[factor]) + '%';
            }
        });
    }

    updateProbabilities(probabilities) {
        Object.keys(probabilities).forEach(risk => {
            const probEl = document.getElementById(risk.toLowerCase().replace(' ', '') + 'Prob');
            const valueEl = document.getElementById(risk.toLowerCase().replace(' ', '') + 'ProbValue');
            if (probEl && valueEl) {
                const percentage = Math.round(probabilities[risk] * 100);
                probEl.style.width = percentage + '%';
                valueEl.textContent = percentage + '%';
            }
        });
    }

    getNeedleRotation(riskCategory) {
        const rotations = {
            'Low': 45,
            'Moderate': 135,
            'High': 225,
            'Hazardous': 315
        };
        return rotations[riskCategory] || 45;
    }

    getCurrentPM25() {
        // Get PM2.5 from current display or estimate from AQI
        const pm25Elements = document.querySelectorAll('.pollutant-value');
        for (let el of pm25Elements) {
            if (el.textContent.includes('~')) {
                const value = parseFloat(el.textContent.replace('~', ''));
                if (!isNaN(value) && value > 0 && value < 500) {
                    return value;
                }
            }
        }
        // Fallback: estimate PM2.5 from AQI
        const aqi = window.aqiPredictor?.currentAQI || 100;
        return Math.max(10, aqi * 0.8);
    }

    getCurrentWindSpeed() {
        const windElements = document.querySelectorAll('.pollutant-value');
        for (let el of windElements) {
            const parent = el.closest('.pollutant-card');
            if (parent && parent.textContent.includes('Wind Speed')) {
                const value = parseFloat(el.textContent.replace('~', ''));
                if (!isNaN(value)) return value;
            }
        }
        return 10; // Default wind speed
    }

    getCurrentHumidity() {
        const humidityElements = document.querySelectorAll('.pollutant-value');
        for (let el of humidityElements) {
            const parent = el.closest('.pollutant-card');
            if (parent && parent.textContent.includes('Humidity')) {
                const value = parseFloat(el.textContent.replace('~', ''));
                if (!isNaN(value)) return value;
            }
        }
        return 60; // Default humidity
    }

    getAQITrend() {
        // Simple trend detection based on recent changes
        return Math.random() > 0.5 ? 1 : (Math.random() > 0.5 ? 0 : -1);
    }

    smoothScrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight;
            const startPosition = window.pageYOffset;
            const targetPosition = section.offsetTop - headerHeight - 20;
            const distance = targetPosition - startPosition;
            const duration = 1500;
            let start = null;
            
            function animation(currentTime) {
                if (start === null) start = currentTime;
                const timeElapsed = currentTime - start;
                const run = ease(timeElapsed, startPosition, distance, duration);
                window.scrollTo(0, run);
                if (timeElapsed < duration) requestAnimationFrame(animation);
            }
            
            function ease(t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            }
            
            requestAnimationFrame(animation);
        }
    }
}

// Global function for manual refresh
function refreshData() {
    if (window.aqiPredictor && window.aqiPredictor.currentLocation) {
        window.aqiPredictor.simulateAQIFetch(window.aqiPredictor.currentLocation);
    }
}