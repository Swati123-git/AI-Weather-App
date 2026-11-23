/**
 * Realistic Mock Data for AI Weather Monitoring & Alert System
 * Used when backend API is offline or not reachable.
 */

// City coordinates and default climates
export const CITY_COORDINATES = {
  'New York': { lat: 40.7128, lon: -74.0060, country: 'USA', baseTemp: 18, baseCond: 'Rainy' },
  'London': { lat: 51.5074, lon: -0.1278, country: 'UK', baseTemp: 14, baseCond: 'Cloudy' },
  'Tokyo': { lat: 35.6762, lon: 139.6503, country: 'Japan', baseTemp: 21, baseCond: 'Clear' },
  'Paris': { lat: 48.8566, lon: 2.3522, country: 'France', baseTemp: 16, baseCond: 'Partly Cloudy' },
  'Mumbai': { lat: 19.0760, lon: 72.8777, country: 'India', baseTemp: 31, baseCond: 'Thunderstorm' },
  'Sydney': { lat: -33.8688, lon: 151.2093, country: 'Australia', baseTemp: 24, baseCond: 'Sunny' },
  'San Francisco': { lat: 37.7749, lon: -122.4194, country: 'USA', baseTemp: 17, baseCond: 'Mist' },
  'Berlin': { lat: 52.5200, lon: 13.4050, country: 'Germany', baseTemp: 15, baseCond: 'Cloudy' },
  'Singapore': { lat: 1.3521, lon: 103.8198, country: 'Singapore', baseTemp: 30, baseCond: 'Rainy' },
  'Dubai': { lat: 25.2048, lon: 55.2708, country: 'UAE', baseTemp: 34, baseCond: 'Sunny' }
};

export const getCityCoordinates = (cityName) => {
  return CITY_COORDINATES[cityName] || {
    lat: 40.7128,
    lon: -74.0060,
    country: 'Global',
    baseTemp: 20,
    baseCond: 'Partly Cloudy'
  };
};

/**
 * Generate current weather data for a city
 */
export const getMockWeather = (city = 'New York') => {
  const info = getCityCoordinates(city);
  const now = new Date();

  return {
    city: city,
    country: info.country,
    coordinates: { lat: info.lat, lon: info.lon },
    temperature: info.baseTemp,
    feelsLike: info.baseTemp + 2,
    tempMin: info.baseTemp - 4,
    tempMax: info.baseTemp + 5,
    condition: info.baseCond,
    description: `Scattered atmospheric moisture with ${info.baseCond.toLowerCase()} intervals`,
    humidity: 74,
    windSpeed: 18.5, // km/h
    windDirection: 'ENE (68°)',
    pressure: 1013, // hPa
    visibility: 9.8, // km
    uvIndex: 6,
    dewPoint: 12,
    cloudCover: 65,
    sunrise: '06:14 AM',
    sunset: '07:48 PM',
    lastUpdated: now.toISOString(),
    aqi: {
      value: city === 'Mumbai' ? 142 : city === 'Tokyo' ? 38 : 55,
      status: city === 'Mumbai' ? 'Unhealthy for Sensitive Groups' : city === 'Tokyo' ? 'Good' : 'Moderate',
      pm25: city === 'Mumbai' ? 58.2 : 14.5,
      pm10: city === 'Mumbai' ? 84.1 : 28.0,
      no2: 24.3,
      o3: 45.1,
      so2: 8.6,
      co: 410
    }
  };
};

/**
 * Generate 24h hourly and 5-day forecast
 */
export const getMockForecast = (city = 'New York') => {
  const info = getCityCoordinates(city);
  const hourly = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() + i * 3600 * 1000);
    const hourLabel = time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    
    // Wave pattern for temp
    const tempDelta = Math.sin((i / 24) * Math.PI * 2) * 5;
    const temp = Math.round(info.baseTemp + tempDelta);
    
    // Rain probability fluctuation
    const rainChance = Math.min(100, Math.max(5, Math.round(45 + Math.sin(i * 0.5) * 35)));
    const windSpeed = Math.round(12 + Math.cos(i * 0.4) * 8);
    const humidity = Math.min(95, Math.max(40, Math.round(65 + Math.cos(i * 0.3) * 20)));

    let condition = 'Partly Cloudy';
    if (rainChance > 60) condition = 'Rainy';
    else if (rainChance > 40) condition = 'Cloudy';
    else if (i >= 7 && i <= 18) condition = 'Sunny';
    else condition = 'Clear';

    hourly.push({
      time: hourLabel,
      fullTime: time.toISOString(),
      temperature: temp,
      rainChance,
      humidity,
      windSpeed,
      condition
    });
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daily = [];

  for (let i = 0; i < 5; i++) {
    const dayDate = new Date(now.getTime() + (i + 1) * 24 * 3600 * 1000);
    const dayName = i === 0 ? 'Tomorrow' : daysOfWeek[dayDate.getDay()];
    const dateFormatted = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const conditions = ['Rainy', 'Thunderstorm', 'Partly Cloudy', 'Sunny', 'Clear'];
    const selectedCondition = conditions[i % conditions.length];
    const rainChance = selectedCondition === 'Thunderstorm' ? 88 : selectedCondition === 'Rainy' ? 70 : 20;

    daily.push({
      day: dayName,
      date: dateFormatted,
      tempMax: info.baseTemp + 4 + (i % 3),
      tempMin: info.baseTemp - 3 - (i % 2),
      condition: selectedCondition,
      rainChance,
      windSpeed: 14 + (i * 2),
      humidity: 60 + (i * 4),
      uvIndex: 5 + (i % 3),
      description: selectedCondition === 'Thunderstorm' 
        ? 'Severe convective lightning with gusty downdrafts'
        : selectedCondition === 'Rainy' 
        ? 'Steady rainfall with reduced road visibility' 
        : 'Pleasant atmospheric conditions throughout the day'
    });
  }

  return {
    city,
    hourly,
    daily
  };
};

/**
 * Generate AI predictions with confidence and risk factors
 */
export const getMockPrediction = (city = 'New York') => {
  const info = getCityCoordinates(city);
  const isStormy = info.baseCond === 'Thunderstorm' || info.baseCond === 'Rainy';

  return {
    city,
    model: 'WeatherGen-AI v4.8 Hybrid Ensemble',
    timestamp: new Date().toISOString(),
    rainPrediction: {
      probability: isStormy ? 86 : 28,
      expectedVolumeMm: isStormy ? 32.4 : 2.1,
      peakWindow: isStormy ? 'Next 2 to 4 hours' : 'Isolated scattered showers at 6:00 PM',
      confidence: 91 // confidence %
    },
    temperaturePrediction: {
      next6HoursDelta: isStormy ? -3.5 : +1.8,
      predictedAverage: info.baseTemp,
      shiftDescription: isStormy ? 'Sharp cold downdraft incoming' : 'Gradual warming with high solar irradiance',
      confidence: 88 // confidence %
    },
    overallConfidence: 89.5, // overall confidence %
    riskLevel: isStormy ? 'High' : 'Low',
    aiExplanation: isStormy
      ? 'Ensemble deep neural network detected an anomalous 850hPa moisture flux convergence colliding with an approaching upper-level cold front. High probability (86%) of intense precipitation and sudden 35+ km/h wind gusts.'
      : 'Atmospheric stability index is high with an expansive ridge of high pressure. Moderate low-altitude moisture prevents thermal escalation. Rain probability remains suppressed below 30%.',
    keyModelFactors: [
      { name: 'Barometric Gradient', status: isStormy ? 'Rapid Drop (-4.2 hPa/3h)' : 'Stable (+0.4 hPa)', impact: 'High' },
      { name: 'Moisture Saturation Index', status: isStormy ? '92% Saturated' : '58% Normal', impact: 'High' },
      { name: 'Radar Echo Vorticity', status: isStormy ? 'Elevated Shear Cell' : 'Quiescent', impact: 'Medium' },
      { name: 'Tropospheric Dewpoint Delta', status: '+4.1°C convergence', impact: 'Medium' }
    ],
    recommendedPrecaution: isStormy
      ? 'Secure loose outdoor items, carry waterproof gear, and avoid low-lying prone drainage routes.'
      : 'Standard conditions apply. Great window for outdoor activities.'
  };
};

/**
 * Mock alerts list with various severities and AI diagnostics
 */
export const MOCK_ALERTS = [
  {
    id: 'alt-001',
    city: 'New York',
    title: 'Severe Flash Flood & Rain Inundation Watch',
    severity: 'Critical',
    category: 'Flash Flood',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    coordinates: { lat: 40.7128, lon: -74.0060 },
    aiExplanation: 'Automated satellite synthetic aperture radar (SAR) combined with hydrologic runoff models projects urban surface accumulation exceeding 50mm within a 90-minute window.',
    safetyTips: [
      'Do not attempt to drive or walk across inundated roads or underpasses.',
      'Move critical electronics and valuables from basement level to higher floors.',
      'Keep backup emergency power banks and flashlight charged.',
      'Monitor local civil emergency broadcasts and transit disruption updates.'
    ],
    isRead: false
  },
  {
    id: 'alt-002',
    city: 'Mumbai',
    title: 'High-Intensity Monsoon Thunderstorm & Gust Alert',
    severity: 'High',
    category: 'Thunderstorm',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    coordinates: { lat: 19.0760, lon: 72.8777 },
    aiExplanation: 'Convective cloud top temperatures plummeted below -65°C over the coastal zone, triggering frequent cloud-to-ground lightning strikes and localized squalls up to 60 km/h.',
    safetyTips: [
      'Disconnect sensitive home electronic appliances during heavy lightning bursts.',
      'Stay away from open balconies, tall metal fences, and solitary trees.',
      'Ensure window shutters and external fixtures are firmly bolted.'
    ],
    isRead: false
  },
  {
    id: 'alt-003',
    city: 'London',
    title: 'Dense Fog & Reduced Navigational Visibility Warning',
    severity: 'Medium',
    category: 'Visibility',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    coordinates: { lat: 51.5074, lon: -0.1278 },
    aiExplanation: 'Radiational nocturnal cooling under low wind conditions produced an inversion layer trapping high relative humidity, dropping visibility below 250 meters across major roadways.',
    safetyTips: [
      'Use low-beam fog headlights on motorways; do not rely solely on daytime running lights.',
      'Double the standard following distance between vehicles.',
      'Allow extra transit time for airport and rail service speed restrictions.'
    ],
    isRead: true
  },
  {
    id: 'alt-004',
    city: 'Dubai',
    title: 'Extreme Heatwave & Solar Radiation Advisory',
    severity: 'Medium',
    category: 'Extreme Heat',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    coordinates: { lat: 25.2048, lon: 55.2708 },
    aiExplanation: 'Subtropical anticyclonic air mass subsidence is creating a thermal dome effect with surface temperatures projected to sustain 41°C with a heat index of 46°C.',
    safetyTips: [
      'Hydrate continuously with electrolyte fluids, even without feeling direct thirst.',
      'Limit strenuous outdoor activities between 11:00 AM and 4:30 PM.',
      'Wear light-colored, loose-fitting UV-protective garments.'
    ],
    isRead: true
  },
  {
    id: 'alt-005',
    city: 'San Francisco',
    title: 'Coastal Marine Wind Squall Advisory',
    severity: 'Low',
    category: 'High Wind',
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    coordinates: { lat: 37.7749, lon: -122.4194 },
    aiExplanation: 'Moderate offshore thermal gradient creating sustained 25-30 km/h gusts through the Golden Gate strait. No infrastructure threat anticipated.',
    safetyTips: [
      'High-profile vehicles should exercise caution when crossing exposed bridges.',
      'Secure patio umbrellas and lightweight outdoor furniture.'
    ],
    isRead: true
  }
];

/**
 * Historical Data for Charts (Past 30 days temperature, rainfall, weekly alerts)
 */
export const getMockHistory = (city = 'New York') => {
  const info = getCityCoordinates(city);
  const temperatureHistory = [];
  const rainfallHistory = [];
  const weeklyAlerts = [];

  const now = new Date();

  // 30 days past temperature and rainfall
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const variance = Math.sin(i * 0.4) * 6;
    const avgTemp = Math.round(info.baseTemp + variance);
    const maxTemp = avgTemp + Math.round(3 + Math.random() * 2);
    const minTemp = avgTemp - Math.round(3 + Math.random() * 2);
    
    temperatureHistory.push({
      date: dateStr,
      avgTemp,
      maxTemp,
      minTemp
    });

    const isRainDay = (i % 4 === 0 || i % 7 === 0);
    const rainAmount = isRainDay ? +(Math.random() * 28 + 4).toFixed(1) : 0;

    rainfallHistory.push({
      date: dateStr,
      rainfallMm: rainAmount
    });
  }

  // Last 4 weeks alerts breakdown
  const weeks = ['Week 1 (Oldest)', 'Week 2', 'Week 3', 'Week 4 (Current)'];
  weeks.forEach((w, idx) => {
    weeklyAlerts.push({
      week: w,
      Low: 3 + idx,
      Medium: 2 + (idx % 2),
      High: 1 + (idx === 3 ? 2 : 0),
      Critical: idx === 3 ? 1 : 0
    });
  });

  return {
    city,
    temperatureHistory,
    rainfallHistory,
    weeklyAlerts,
    summary: {
      avgMonthlyTemp: info.baseTemp,
      totalRainfallMm: 142.6,
      maxRecordedTemp: info.baseTemp + 9,
      minRecordedTemp: info.baseTemp - 8,
      totalAlertsIssued: 24,
      criticalEventsCount: 2
    }
  };
};
