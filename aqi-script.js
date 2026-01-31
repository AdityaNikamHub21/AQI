// AQI Predictor JavaScript
class AQIPredictor {
    constructor() {
        this.currentAQI = 0;
        this.currentLocation = '';
        this.forecastChart = null;
        this.rawData = [];
        this.cityChangeTimeout = null; // For debouncing
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateAQIDisplay();
        this.initForecastChart();
        this.startRealTimeUpdates();
    }

    loadRawData() {
        // Check for raw data in localStorage
        const storedData = localStorage.getItem('aqiRawData');
        if (storedData) {
            try {
                this.rawData = JSON.parse(storedData);
                console.log('Loaded raw data:', this.rawData.length, 'records');
                
                // Show notification that data was loaded
                this.showNotification(`Loaded ${this.rawData.length} data points from external source`, 'success');
                
                // Use the first data point if available
                if (this.rawData.length > 0) {
                    const firstData = this.rawData[0];
                    this.currentLocation = firstData.location || 'Unknown';
                    this.currentAQI = firstData.aqi || 100;
                    
                    console.log('Using data for:', this.currentLocation, 'AQI:', this.currentAQI);
                    
                    // Update pollutant values from raw data
                    if (firstData.pm25) this.updateSpecificPollutant('PM2.5', firstData.pm25);
                    if (firstData.pm10) this.updateSpecificPollutant('PM10', firstData.pm10);
                    if (firstData.o3) this.updateSpecificPollutant('O₃', firstData.o3);
                    if (firstData.no2) this.updateSpecificPollutant('NO₂', firstData.no2);
                    if (firstData.no) this.updateSpecificPollutant('NO', firstData.no);
                    if (firstData.so2) this.updateSpecificPollutant('SO₂', firstData.so2);
                    if (firstData.co) this.updateSpecificPollutant('CO', firstData.co);
                    if (firstData.windSpeed) this.updateSpecificPollutant('💨', firstData.windSpeed);
                    if (firstData.humidity) this.updateSpecificPollutant('💧', firstData.humidity);
                    
                    // Update the location input field
                    const locationInput = document.getElementById('locationInput');
                    if (locationInput) {
                        locationInput.value = this.currentLocation;
                    }
                }
                
                // Clear the stored data after loading (optional)
                // localStorage.removeItem('aqiRawData');
                
            } catch (error) {
                console.error('Error loading raw data:', error);
                this.showNotification('Error loading external data', 'error');
            }
        } else {
            console.log('No raw data found in localStorage');
        }
    }

    updateSpecificPollutant(pollutant, value) {
        const cards = document.querySelectorAll('.pollutant-card');
        cards.forEach(card => {
            const icon = card.querySelector('.pollutant-icon');
            if (icon && icon.textContent === pollutant) {
                // Handle different display formats
                let displayValue;
                if (pollutant === 'CO') {
                    displayValue = '~' + value.toFixed(1);
                } else {
                    displayValue = '~' + Math.round(value);
                }
                
                card.querySelector('.pollutant-value').textContent = displayValue;
                
                // Update status based on value
                const statusElement = card.querySelector('.pollutant-status');
                if (pollutant === '💨') {
                    // Wind speed status: < 5 = Low, 5-15 = Moderate, > 15 = High
                    if (value <= 5) {
                        statusElement.textContent = 'Low';
                        statusElement.className = 'pollutant-status good';
                    } else if (value <= 15) {
                        statusElement.textContent = 'Moderate';
                        statusElement.className = 'pollutant-status moderate';
                    } else {
                        statusElement.textContent = 'High';
                        statusElement.className = 'pollutant-status high';
                    }
                } else {
                    // Regular pollutant status
                    if (value <= 50) {
                        statusElement.textContent = 'Good';
                        statusElement.className = 'pollutant-status good';
                    } else if (value <= 100) {
                        statusElement.textContent = 'Moderate';
                        statusElement.className = 'pollutant-status moderate';
                    } else {
                        statusElement.textContent = 'High';
                        statusElement.className = 'pollutant-status high';
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Location search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchLocation());
        document.getElementById('locationInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });
        
        // Automatic city switching - detect when user types a different city
        document.getElementById('locationInput').addEventListener('input', (e) => {
            this.handleCityChange(e.target.value.trim());
        });

        // Forecast range buttons
        document.querySelectorAll('.forecast-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log(`Button clicked: ${e.target.dataset.range} hours`);
                document.querySelectorAll('.forecast-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateForecastRange(parseInt(e.target.dataset.range));
            });
        });

        // Mobile menu
        document.querySelector('.mobile-menu-btn').addEventListener('click', () => {
            const navMenu = document.querySelector('.nav-menu');
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
        });

        // Smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    handleCityChange(newLocation) {
        // Clear any existing timeout
        if (this.cityChangeTimeout) {
            clearTimeout(this.cityChangeTimeout);
        }
        
        // Only process if we have a valid location and it's different from current
        if (!newLocation || this.currentLocation === newLocation) {
            return;
        }
        
        // Check if the new location is supported
        const supportedLocations = ['cbd belapur', 'sanpada', 'vashi'];
        if (!supportedLocations.includes(newLocation.toLowerCase())) {
            return; // Don't show error for typing, just ignore unsupported locations
        }
        
        // Debounce the city change to avoid rapid updates while typing
        this.cityChangeTimeout = setTimeout(() => {
            console.log(`=== Automatic city switch: ${this.currentLocation} → ${newLocation} ===`);
            
            // Update current location immediately
            this.currentLocation = newLocation;
            
            // Show notification for automatic switch
            this.showNotification(`Switched to ${newLocation} - Updating data...`, 'info');
            
            // Immediately fetch and display data for the new city
            this.simulateAQIFetch(newLocation);
            
            // Get current active forecast range to maintain it
            const activeBtn = document.querySelector('.forecast-btn.active');
            const currentHours = activeBtn ? parseInt(activeBtn.dataset.range) : 6;
            
            // Update graph with new city data immediately
            setTimeout(() => {
                this.updateForecastRange(currentHours);
            }, 100); // Small delay to ensure data is loaded
        }, 800); // 800ms delay to allow user to finish typing
    }

    searchLocation() {
        const input = document.getElementById('locationInput');
        const location = input.value.trim();
        
        if (location) {
            // Check if the location is supported (CBD Belapur, Sanpada, or Vashi)
            const supportedLocations = ['cbd belapur', 'sanpada', 'vashi'];
            if (!supportedLocations.includes(location.toLowerCase())) {
                this.showNotification(`Data not available for ${location}. Only CBD Belapur, Sanpada, and Vashi data are currently supported.`, 'error');
                return;
            }
            
            this.currentLocation = location;
            this.simulateAQIFetch(location);
            this.showNotification(`Fetching AQI data for ${location}...`, 'info');
        }
    }

    simulateAQIFetch(location) {
        // Fetch real AQI data from our API
        fetch(`http://localhost:5001/current-aqi/${location}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    // Use real data from database
                    this.currentAQI = Math.round(data.data.aqi);
                    this.currentLocation = location;
                    
                    // Update pollutant values with real data
                    this.updatePollutantsWithRealData(data.data);
                    
                    this.updateAQIDisplay();
                    this.updateForecastChart();
                    this.showNotification(`Real AQI data: ${this.currentAQI} for ${location}`, 'success');
                } else {
                    // Fallback to hardcoded values if API fails
                    this.useFallbackData(location);
                }
            })
            .catch(error => {
                console.log('API call failed, using fallback data:', error);
                this.useFallbackData(location);
            });
    }

    useFallbackData(location) {
        // Fallback to hardcoded values if real data is not available
        setTimeout(() => {
            if (location.toLowerCase() === 'cbd belapur') {
                this.currentAQI = 125;
                this.currentLocation = location;
                this.updateAQIDisplay();
                this.updateForecastChart();
                this.showNotification(`Using fallback data for ${location} (AQI: ${this.currentAQI})`, 'info');
            } else if (location.toLowerCase() === 'vashi') {
                this.currentAQI = 138;
                this.currentLocation = location;
                this.updateAQIDisplay();
                this.updateForecastChart();
                this.showNotification(`Using fallback data for ${location} (AQI: ${this.currentAQI})`, 'info');
            } else if (location.toLowerCase() === 'sanpada') {
                this.currentAQI = 97;
                this.currentLocation = location;
                this.updateAQIDisplay();
                this.updateForecastChart();
                this.showNotification(`Using fallback data for ${location} (AQI: ${this.currentAQI})`, 'info');
            } else {
                this.showNotification(`Data not available for ${location}`, 'error');
            }
        }, 500);
    }

    updatePollutantsWithRealData(data) {
        const pollutantCards = document.querySelectorAll('.pollutant-card');
        
        // Update with real data from database
        const pollutantValues = {
            'PM2.5': data.pm25 || 0,
            'PM10': data.pm10 || 0,
            'O₃': data.o3 || 0,
            'NO₂': data.no2 || 0,
            'NO': data.no || 0,
            'SO₂': data.so2 || 0,
            'CO': data.co || 0,
            '💨': data.wind_speed || 0,
            '💧': data.humidity || 0
        };

        const pollutants = ['PM2.5', 'PM10', 'O₃', 'NO₂', 'NO', 'SO₂', 'CO', '💨', '💧'];
        
        pollutantCards.forEach((card, index) => {
            const pollutant = pollutants[index];
            const value = pollutantValues[pollutant];
            
            // Handle different display formats
            let displayValue;
            if (pollutant === 'CO') {
                displayValue = value > 0 ? value.toFixed(1) : '0';
            } else {
                displayValue = value > 0 ? Math.round(value) : '0';
            }
            
            card.querySelector('.pollutant-value').textContent = displayValue;
            
            // Update status based on value
            const statusElement = card.querySelector('.pollutant-status');
            if (pollutant === '💨') {
                if (value <= 5) {
                    statusElement.textContent = 'Low';
                    statusElement.className = 'pollutant-status good';
                } else if (value <= 15) {
                    statusElement.textContent = 'Moderate';
                    statusElement.className = 'pollutant-status moderate';
                } else {
                    statusElement.textContent = 'High';
                    statusElement.className = 'pollutant-status high';
                }
            } else if (pollutant === '💧') {
                if (value <= 30) {
                    statusElement.textContent = 'Low';
                    statusElement.className = 'pollutant-status good';
                } else if (value <= 70) {
                    statusElement.textContent = 'Moderate';
                    statusElement.className = 'pollutant-status moderate';
                } else {
                    statusElement.textContent = 'High';
                    statusElement.className = 'pollutant-status high';
                }
            } else {
                const aqiInfo = this.getAQIInfo(data.aqi);
                statusElement.textContent = aqiInfo.label;
                statusElement.className = `pollutant-status ${aqiInfo.level}`;
            }
        });
    }

    updateAQIDisplay() {
        // Only update if we have data
        if (this.currentAQI === 0 || this.currentLocation === '') {
            // Keep everything at 0/blank state
            document.getElementById('currentAQI').textContent = '0';
            document.getElementById('currentLocation').textContent = '';
            document.getElementById('updateTime').textContent = '';
            document.getElementById('aqiLabel').textContent = '';
            
            // Reset gauge to 0 position
            this.updateGauge(0);
            
            // Set all pollutants to 0
            this.updatePollutants(0);
            
            // Don't update analysis until data is available
            return;
        }
        
        // Update main AQI display with approximately symbol
        document.getElementById('currentAQI').textContent = '~' + this.currentAQI;
        document.getElementById('currentLocation').textContent = this.currentLocation + ', India';
        document.getElementById('updateTime').textContent = 'Updated just now';
        
        // Update AQI label and color
        const aqiInfo = this.getAQIInfo(this.currentAQI);
        document.getElementById('aqiLabel').textContent = aqiInfo.label;
        
        const aqiValueElement = document.querySelector('.aqi-value');
        aqiValueElement.style.background = aqiInfo.color;
        aqiValueElement.style.webkitBackgroundClip = 'text';
        aqiValueElement.style.webkitTextFillColor = 'transparent';
        
        // Update gauge needle
        this.updateGauge(this.currentAQI);
        
        // Update pollutant values with approximately symbol
        this.updatePollutants(this.currentAQI);
        
        // Update analysis
        this.updateAnalysis(this.currentAQI);
    }

    getAQIInfo(aqi) {
        if (aqi <= 50) return { label: 'Good', color: 'var(--good-color)', level: 'good' };
        if (aqi <= 100) return { label: 'Moderate', color: 'var(--moderate-color)', level: 'moderate' };
        if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: 'var(--unhealthy-sensitive-color)', level: 'unhealthy-sensitive' };
        if (aqi <= 200) return { label: 'Unhealthy', color: 'var(--unhealthy-color)', level: 'unhealthy' };
        if (aqi <= 300) return { label: 'Very Unhealthy', color: 'var(--very-unhealthy-color)', level: 'very-unhealthy' };
        return { label: 'Hazardous', color: 'var(--hazardous-color)', level: 'hazardous' };
    }

    updateGauge(aqi) {
        const needle = document.getElementById('gaugeNeedle');
        const gaugeCircle = document.getElementById('gaugeCircle');
        
        if (!needle || !gaugeCircle) {
            console.log('Gauge elements not found');
            return;
        }
        
        // Calculate angle based on AQI to match gauge color segments exactly
        // Gauge segments: 0-72° (Green), 72-144° (Yellow), 144-216° (Orange), 216-288° (Red), 288-324° (Purple), 324-360° (Maroon)
        let angle;
        if (aqi === 0) {
            angle = 0; // Start position for no data (leftmost)
        } else if (aqi <= 50) {
            // Good (Green): Map 0-50 AQI to 0-72°
            angle = (aqi / 50) * 72;
        } else if (aqi <= 100) {
            // Moderate (Yellow): Map 51-100 AQI to 72-144°
            angle = 72 + ((aqi - 50) / 50) * 72;
        } else if (aqi <= 150) {
            // Unhealthy for Sensitive (Orange): Map 101-150 AQI to 144-216°
            angle = 144 + ((aqi - 100) / 50) * 72;
        } else if (aqi <= 200) {
            // Unhealthy (Red): Map 151-200 AQI to 216-288°
            angle = 216 + ((aqi - 150) / 50) * 72;
        } else if (aqi <= 300) {
            // Very Unhealthy (Purple): Map 201-300 AQI to 288-324°
            angle = 288 + ((aqi - 200) / 100) * 36;
        } else {
            // Hazardous (Maroon): Map 301-500 AQI to 324-360°
            angle = 324 + Math.min(((aqi - 300) / 200) * 36, 36);
        }
        
        // Add smooth transition for gauge needle
        needle.style.transition = 'transform 1s ease-in-out';
        needle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
        
        // Update gauge circle with highlight effect based on AQI level
        let glowColor;
        if (aqi === 0) {
            glowColor = 'rgba(156, 163, 175, 0.3)'; // Gray for no data
        } else if (aqi <= 50) {
            glowColor = 'rgba(0, 228, 0, 0.4)'; // Good - Green
        } else if (aqi <= 100) {
            glowColor = 'rgba(255, 255, 0, 0.4)'; // Moderate - Yellow
        } else if (aqi <= 150) {
            glowColor = 'rgba(255, 126, 0, 0.4)'; // Unhealthy for Sensitive - Orange
        } else if (aqi <= 200) {
            glowColor = 'rgba(255, 0, 0, 0.4)'; // Unhealthy - Red
        } else if (aqi <= 300) {
            glowColor = 'rgba(143, 63, 151, 0.4)'; // Very Unhealthy - Purple
        } else {
            glowColor = 'rgba(126, 0, 35, 0.4)'; // Hazardous - Maroon
        }
        
        // Update gauge circle with glow effect
        gaugeCircle.style.transition = 'box-shadow 1s ease-in-out';
        gaugeCircle.style.boxShadow = `0 0 25px ${glowColor}, inset 0 0 25px ${glowColor}`;
        
        console.log(`Gauge updated: AQI=${aqi}, Angle=${angle.toFixed(1)}°, Glow=${glowColor}`);
    }

    updatePollutants(aqi) {
        // Only update if we have valid AQI data
        if (aqi === 0) {
            // Set all pollutant values to 0
            const pollutantCards = document.querySelectorAll('.pollutant-card');
            pollutantCards.forEach(card => {
                card.querySelector('.pollutant-value').textContent = '0';
                card.querySelector('.pollutant-status').textContent = 'No Data';
                card.querySelector('.pollutant-status').className = 'pollutant-status';
            });
            return;
        }
        
        const pollutantCards = document.querySelectorAll('.pollutant-card');
        const baseValues = {
            pm25: aqi * 0.56,
            pm10: aqi * 0.79,
            o3: aqi * 0.30,
            no2: aqi * 0.25,
            no: aqi * 0.12, // NO is typically lower than NO2
            so2: aqi * 0.08,
            co: aqi * 0.005,
            windSpeed: 12, // Constant wind speed in km/h for CBD Belapur
            humidity: 65 // Constant relative humidity in % for CBD Belapur
        };

        const pollutants = ['PM2.5', 'PM10', 'O₃', 'NO₂', 'NO', 'SO₂', 'CO', '💨', '💧'];
        
        pollutantCards.forEach((card, index) => {
            const pollutant = pollutants[index];
            const value = baseValues[Object.keys(baseValues)[index]];
            
            // Handle different display formats
            let displayValue;
            if (pollutant === 'CO') {
                displayValue = '~' + value.toFixed(1);
            } else {
                displayValue = '~' + Math.round(value);
            }
            
            card.querySelector('.pollutant-value').textContent = displayValue;
            
            // Update status based on value (for special parameters, use different thresholds)
            const statusElement = card.querySelector('.pollutant-status');
            if (pollutant === '💨') {
                // Wind speed status: < 5 = Low, 5-15 = Moderate, > 15 = High
                if (value <= 5) {
                    statusElement.textContent = 'Low';
                    statusElement.className = 'pollutant-status good';
                } else if (value <= 15) {
                    statusElement.textContent = 'Moderate';
                    statusElement.className = 'pollutant-status moderate';
                } else {
                    statusElement.textContent = 'High';
                    statusElement.className = 'pollutant-status high';
                }
            } else if (pollutant === '💧') {
                // Humidity status: < 30 = Low, 30-70 = Moderate, > 70 = High
                if (value <= 30) {
                    statusElement.textContent = 'Low';
                    statusElement.className = 'pollutant-status good';
                } else if (value <= 70) {
                    statusElement.textContent = 'Moderate';
                    statusElement.className = 'pollutant-status moderate';
                } else {
                    statusElement.textContent = 'High';
                    statusElement.className = 'pollutant-status high';
                }
            } else {
                // AQI-based status for pollutants
                const aqiInfo = this.getAQIInfo(aqi);
                statusElement.textContent = aqiInfo.label;
                statusElement.className = `pollutant-status ${aqiInfo.level}`;
            }
        });
    }

    updateAnalysis(aqi) {
        // Only update if we have valid AQI data
        if (aqi === 0) {
            // Keep analysis sections blank
            const trendCard = document.querySelector('.analysis-card:nth-child(1)');
            const riskCard = document.querySelector('.analysis-card:nth-child(2)');
            const recommendationCard = document.querySelector('.analysis-card:nth-child(3)');
            
            trendCard.querySelector('h3').textContent = 'Trend Analysis';
            trendCard.querySelector('p').textContent = '';
            
            riskCard.querySelector('h3').textContent = 'Health Risk';
            riskCard.querySelector('p').textContent = '';
            
            recommendationCard.querySelector('h3').textContent = 'Recommendations';
            recommendationCard.querySelector('p').textContent = '';
            
            return;
        }
        
        const trendCard = document.querySelector('.analysis-card:nth-child(1)');
        const riskCard = document.querySelector('.analysis-card:nth-child(2)');
        const recommendationCard = document.querySelector('.analysis-card:nth-child(3)');
        
        // Update trend analysis
        const trend = Math.random() > 0.5 ? 'increased' : 'decreased';
        const trendPercent = Math.floor(Math.random() * 20) + 5;
        const trendDirection = trend === 'increased' ? 'up' : 'down';
        const trendColor = trend === 'increased' ? 'up' : 'down';
        
        trendCard.querySelector('p').textContent = `AQI has ${trend} by ${trendPercent}% over the past week due to ${trend === 'increased' ? 'increased vehicular traffic and industrial activity' : 'favorable weather conditions and reduced emissions'}.`;
        
        const trendIndicator = trendCard.querySelector('.trend-indicator');
        trendIndicator.className = `trend-indicator ${trendColor}`;
        trendIndicator.innerHTML = `<i class="fas fa-arrow-${trendDirection}"></i> ${trend === 'increased' ? 'Rising' : 'Falling'} Trend`;
        
        // Update risk factors
        const mainPollutant = aqi > 150 ? 'PM2.5' : aqi > 100 ? 'PM10' : 'O₃';
        riskCard.querySelector('p').textContent = `High ${mainPollutant} levels detected. Primary sources: ${this.getPollutionSources(aqi)}.`;
        
        const riskLevel = aqi > 200 ? 'high' : aqi > 100 ? 'moderate' : 'low';
        const riskElement = riskCard.querySelector('.risk-level');
        riskElement.className = `risk-level ${riskLevel}`;
        riskElement.textContent = riskLevel === 'high' ? 'High Risk' : riskLevel === 'moderate' ? 'Moderate Risk' : 'Low Risk';
        
        // Update recommendations
        const recommendations = this.getRecommendations(aqi);
        recommendationCard.querySelector('p').textContent = recommendations.general;
        
        const priority = aqi > 200 ? 'urgent' : aqi > 100 ? 'important' : 'advisory';
        const priorityElement = recommendationCard.querySelector('.recommendation-priority');
        priorityElement.className = `recommendation-priority ${priority}`;
        priorityElement.textContent = priority === 'urgent' ? 'Urgent Action Needed' : priority === 'important' ? 'Important Precautions' : 'General Advisory';
    }

    getPollutionSources(aqi) {
        if (aqi > 200) return 'vehicle emissions, industrial pollution, and construction dust';
        if (aqi > 150) return 'vehicle emissions and construction activities';
        if (aqi > 100) return 'vehicular traffic and moderate industrial activity';
        return 'natural sources and light traffic';
    }

    getRecommendations(aqi) {
        if (aqi > 200) {
            return {
                general: 'Avoid all outdoor activities, use high-quality air purifiers, wear N95 masks, and keep windows closed.',
                children: 'No outdoor play, keep indoors with air purification.',
                adults: 'Work from home, avoid outdoor exercise, wear protection.',
                elderly: 'Stay indoors, monitor health closely, have emergency medication ready.'
            };
        }
        if (aqi > 150) {
            return {
                general: 'Limit outdoor activities, use air purifiers indoors, and wear masks when going outside.',
                children: 'Limit outdoor playtime, keep windows closed.',
                adults: 'Reduce outdoor exercise, consider wearing masks.',
                elderly: 'Avoid outdoor activities, keep medication ready.'
            };
        }
        if (aqi > 100) {
            return {
                general: 'Sensitive groups should limit prolonged outdoor exertion.',
                children: 'Monitor for symptoms, limit intense outdoor activities.',
                adults: 'Consider reducing prolonged outdoor exertion.',
                elderly: 'Monitor health, limit outdoor activities if symptomatic.'
            };
        }
        return {
            general: 'Air quality is acceptable for most people.',
            children: 'Normal outdoor activities are fine.',
            adults: 'Enjoy outdoor activities.',
            elderly: 'Normal activities are safe.'
        };
    }

    initForecastChart() {
        const ctx = document.getElementById('forecastChart').getContext('2d');
        const self = this;
        
        // Start with blank data - horizontal line at AQI 0
        const initialLabels = Array(12).fill('').map((_, i) => `${i+1}:00`);
        const initialValues = Array(12).fill(0);
        
        this.forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: initialLabels,
                datasets: [{
                    label: 'AQI Trend',
                    data: initialValues,
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4, // Smooth curve tension
                    pointRadius: 6,
                    pointBackgroundColor: 'rgb(37, 99, 235)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500, // Initial load animation
                    easing: 'easeInOutQuart',
                    onComplete: function() {
                        console.log('Initial chart animation completed');
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const aqi = context.parsed.y;
                                if (aqi === 0) {
                                    return 'No data yet - enter a location';
                                }
                                const aqiInfo = self.getAQIInfo(aqi);
                                const isCurrent = context.dataIndex === context.dataset.data.length - 1;
                                const label = isCurrent ? `Current: ${aqi} (${aqiInfo.label})` : `AQI: ${aqi} (${aqiInfo.label})`;
                                return label;
                            },
                            title: function(context) {
                                const index = context[0].dataIndex;
                                const labels = context[0].chart.data.labels;

    generateForecastData(hours) {
        // Return synthetic data immediately for initial display
        return this.generateSyntheticData(hours);
    }
    
    generateSyntheticData(hours) {
        const labels = [];
        const values = [];
        const now = new Date();
        
        console.log(`=== Generating ${hours} hours of data for ${this.currentLocation} ===`);
        
        // Get base AQI based on current location
        let baseAQI = 125; // Default for CBD Belapur
        if (this.currentLocation.toLowerCase() === 'vashi') {
            baseAQI = 138;
        } else if (this.currentLocation.toLowerCase() === 'sanpada') {
            baseAQI = 97;
        }
        
        // If no location set, return zeros
        if (this.currentLocation === '') {
            console.log('No location, generating zeros');
            for (let i = 0; i < hours; i++) {
                const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
                labels.push(hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                values.push(0);
            }
            console.log(`Generated ${hours} zero values`);
            return { labels, values };
        }
        
        // Generate data for EXACTLY the requested number of hours
        for (let i = 0; i < hours; i++) {
            const hour = new Date(now.getTime() - (hours - 1 - i) * 60 * 60 * 1000);
            const hourValue = hour.getHours();
            
            console.log(`Hour ${i+1}/${hours}: ${hour.toLocaleTimeString()}, hour value: ${hourValue}`);
            
            // Add realistic hourly patterns
            let hourMultiplier = 1.0;
            if (7 <= hourValue && hourValue <= 9) {
                hourMultiplier = 1.15; // Morning rush
            } else if (17 <= hourValue && hourValue <= 19) {
                hourMultiplier = 1.20; // Evening rush
            } else if (22 <= hourValue || hourValue <= 5) {
                hourMultiplier = 0.85; // Night time
            }
            
            // Add some random variation
            const randomVariation = 1.0 + (Math.random() - 0.5) * 0.2;
            const aqiValue = baseAQI * hourMultiplier * randomVariation;
            
            const label = hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const value = Math.round(aqiValue);
            
            labels.push(label);
            values.push(value);
            
            console.log(`  -> ${label}: ${value} AQI (multiplier: ${hourMultiplier.toFixed(2)})`);
        }
        
        console.log(`=== Final Result: ${labels.length} labels, ${values.length} values ===`);
        console.log(`Labels: [${labels.join(', ')}]`);
        console.log(`Values: [${values.join(', ')}]`);
        
        return { labels, values };
    }
    
    updateChartWithRealData(data, hours) {
        // Combine historical and forecast data
        const allLabels = [...data.historical.labels, ...data.forecast.labels];
        const allValues = [...data.historical.values, ...data.forecast.values];
        
        // Update chart with real data
        this.forecastChart.data.labels = allLabels;
        this.forecastChart.data.datasets = [
            {
                label: 'Historical AQI',
                data: [...data.historical.values, ...Array(hours).fill(null)],
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: 'rgb(37, 99, 235)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8
            },
            {
                label: 'ML Forecast',
                data: [...Array(hours).fill(null), ...data.forecast.values],
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: 'rgb(34, 197, 94)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8
            },
            {
                label: 'Current Time',
                data: [...Array(hours).fill(null), data.current_aqi, ...Array(hours-1).fill(null)],
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgb(239, 68, 68)',
                borderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            }
        ];
        
        this.forecastChart.update();
        
        // Update title with forecast info
        const forecastTitle = document.querySelector('#forecast h2');
        forecastTitle.textContent = `AQI Trend - Last ${hours} Hours + ML Forecast`;
        
        // Show notification
        this.showNotification(`ML Forecast loaded for ${data.city}`, 'success');
    }

    updateForecastChart() {
        // Only update if we have valid location data
        if (this.currentLocation === '') {
            return;
        }
        
        // Generate forecast data for the current location
        const forecastData = this.generateForecastData(6); // Default to 6 hours
        
        // Smooth transition: Update the chart with real data
        this.forecastChart.data.labels = forecastData.labels;
        this.forecastChart.data.datasets[0].data = forecastData.values;
        
        // Update point colors to highlight current time
        const self = this;
        this.forecastChart.data.datasets[0].pointBackgroundColor = function(context) {
            const index = context.dataIndex;
            const values = context.dataset.data;
            return index === values.length - 1 ? 'rgb(239, 68, 68)' : 'rgb(37, 99, 235)';
        };
        
        // Add smooth animation for initial data load
        this.forecastChart.options.animation = {
            duration: 1200, // 1.2 seconds for initial data load
            easing: 'easeInOutQuart',
            onComplete: function() {
                console.log('Initial data animation completed');
            }
        };
        
        // Update chart with smooth animation
        this.forecastChart.update('active');
        
        // Update chart title
        const forecastTitle = document.querySelector('#forecast h2');
        forecastTitle.textContent = `AQI Trend - ${this.currentLocation}`;
    }

    updateForecastRange(hours) {
        // Only update if we have valid location data
        if (this.currentLocation === '') {
            console.log('No location set, skipping update');
            return;
        }
        
        console.log(`=== Switching to ${hours} hours for ${this.currentLocation} ===`);
        
        // Generate fresh data for the requested hours
        const forecastData = this.generateSyntheticData(hours);
        
        console.log(`Generated ${forecastData.labels.length} labels and ${forecastData.values.length} values`);
        
        // Smooth transition: Update the chart with new data
        this.forecastChart.data.labels = forecastData.labels;
        this.forecastChart.data.datasets[0].data = forecastData.values;
        
        // Reset and update point colors with smooth transition
        this.forecastChart.data.datasets[0].pointBackgroundColor = function(context) {
            const index = context.dataIndex;
            const values = context.dataset.data;
            return index === values.length - 1 ? 'rgb(239, 68, 68)' : 'rgb(37, 99, 235)';
        };
        
        // Add smooth animation configuration
        this.forecastChart.options.animation = {
            duration: 1000, // 1 second smooth animation
            easing: 'easeInOutQuart', // Smooth easing function
            onComplete: function() {
                console.log('Chart animation completed');
            }
        };
        
        // Update chart with smooth animation
        this.forecastChart.update('active');
        
        // Update chart title to reflect current range
        const forecastTitle = document.querySelector('#forecast h2');
        forecastTitle.textContent = `AQI Trend - ${this.currentLocation} (${hours} Hours)`;
        
        console.log(`Chart successfully updated with ${hours} hours data`);
        console.log(`Labels: ${this.forecastChart.data.labels.join(', ')}`);
        console.log(`Values: ${this.forecastChart.data.datasets[0].data.join(', ')}`);
    }

    startRealTimeUpdates() {
        // Simulate real-time updates every 30 seconds but keep AQI constant for CBD Belapur
        setInterval(() => {
            // Only update if current location is CBD Belapur and we want to show "live" updates
            // But keep the same AQI value to maintain consistency
            if (this.currentLocation.toLowerCase() === 'cbd belapur') {
                // Keep the same AQI value (125) but update the time to show it's "live"
                document.getElementById('updateTime').textContent = 'Updated just now';
                
                // Optional: Show a subtle notification that data is fresh
                // this.showNotification('AQI data refreshed', 'info');
            }
        }, 30000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the AQI Predictor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aqiPredictor = new AQIPredictor();
});

// Global refresh function for navbar
function refreshData() {
    if (window.aqiPredictor) {
        window.aqiPredictor.loadRawData();
        window.aqiPredictor.updateAQIDisplay();
        window.aqiPredictor.showNotification('Data refreshed!', 'info');
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
