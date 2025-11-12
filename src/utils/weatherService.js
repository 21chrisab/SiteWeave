/**
 * Weather Service
 * Fetches weather data from WeatherAPI.com
 */

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const WEATHER_API_URL = 'https://api.weatherapi.com/v1';

// Debug: Log API key status (without exposing the full key)
if (typeof window !== 'undefined') {
  console.log('Weather API Key Status:', WEATHER_API_KEY ? `Loaded (${WEATHER_API_KEY.substring(0, 8)}...)` : 'MISSING');
  console.log('Weather API Key Length:', WEATHER_API_KEY ? WEATHER_API_KEY.length : 0);
  console.log('Weather API URL:', WEATHER_API_URL);
  
  // Warn if API key seems too short (WeatherAPI.com keys are typically 32 chars)
  if (WEATHER_API_KEY && WEATHER_API_KEY.length < 30) {
    console.warn('Warning: Weather API key seems shorter than expected. WeatherAPI.com keys are typically 32 characters.');
  }
}

/**
 * Get user's location using browser geolocation API
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
      }
    );
  });
};

/**
 * Fetch current weather data by coordinates
 */
export const getCurrentWeather = async (latitude, longitude) => {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key is not configured. Please add VITE_WEATHER_API_KEY to your .env file.');
  }

  try {
    const url = `${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}`;
    console.log('Fetching weather from:', url.replace(WEATHER_API_KEY, '***'));
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Weather API Error Response:', errorData);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Invalid weather API key. Please check your API key in .env file. Error: ${errorData.error?.message || errorData.error?.code || 'Unauthorized'}`);
      }
      throw new Error(`Weather API error: ${errorData.error?.message || errorData.error?.code || response.statusText}`);
    }

    const data = await response.json();
    return {
      temperature: Math.round(data.current.temp_f),
      feelsLike: Math.round(data.current.feelslike_f),
      description: data.current.condition.text,
      icon: data.current.condition.icon,
      humidity: data.current.humidity,
      windSpeed: Math.round(data.current.wind_mph || 0),
      city: data.location.name,
      country: data.location.country,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
};

/**
 * Fetch current weather data by city name
 */
export const getCurrentWeatherByCity = async (cityName) => {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key is not configured. Please add VITE_WEATHER_API_KEY to your .env file.');
  }

  try {
    const url = `${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(cityName)}`;
    
    // Debug logging (without exposing full API key)
    console.log('Weather API Request:', {
      endpoint: '/current.json',
      city: cityName,
      hasApiKey: !!WEATHER_API_KEY,
      apiKeyPrefix: WEATHER_API_KEY ? WEATHER_API_KEY.substring(0, 8) + '...' : 'MISSING'
    });

    console.log('Fetching weather from:', url.replace(WEATHER_API_KEY, '***'));
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Weather API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Invalid weather API key. Please check your API key in .env file. Error: ${errorData.error?.message || errorData.error?.code || 'Unauthorized'}`);
      }
      if (response.status === 400) {
        throw new Error(`City not found: ${errorData.error?.message || 'Please check the spelling.'}`);
      }
      throw new Error(`Weather API error: ${errorData.error?.message || errorData.error?.code || response.statusText}`);
    }

    const data = await response.json();
    return {
      temperature: Math.round(data.current.temp_f),
      feelsLike: Math.round(data.current.feelslike_f),
      description: data.current.condition.text,
      icon: data.current.condition.icon,
      humidity: data.current.humidity,
      windSpeed: Math.round(data.current.wind_mph || 0),
      city: data.location.name,
      country: data.location.country,
      latitude: data.location.lat,
      longitude: data.location.lon,
    };
  } catch (error) {
    console.error('Error fetching weather by city:', error);
    throw error;
  }
};

/**
 * Fetch weather forecast for the next few days by coordinates
 */
export const getWeatherForecast = async (latitude, longitude) => {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key is not configured. Please add VITE_WEATHER_API_KEY to your .env file.');
  }

  try {
    const url = `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=5`;
    console.log('Fetching forecast from:', url.replace(WEATHER_API_KEY, '***'));
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Weather Forecast API Error Response:', errorData);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Invalid weather API key. Please check your API key in .env file. Error: ${errorData.error?.message || errorData.error?.code || 'Unauthorized'}`);
      }
      throw new Error(`Weather API error: ${errorData.error?.message || errorData.error?.code || response.statusText}`);
    }

    const data = await response.json();
    
    // Map forecast data to expected format
    const dailyForecasts = data.forecast.forecastday.map((day) => {
      return {
        date: new Date(day.date),
        temperature: Math.round(day.day.avgtemp_f),
        description: day.day.condition.text,
        icon: day.day.condition.icon,
      };
    });

    return dailyForecasts.slice(0, 5); // Return next 5 days
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    throw error;
  }
};

/**
 * Fetch weather forecast for the next few days by city name
 */
export const getWeatherForecastByCity = async (cityName) => {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key is not configured. Please add VITE_WEATHER_API_KEY to your .env file.');
  }

  try {
    const url = `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(cityName)}&days=5`;
    
    // Debug logging
    console.log('Weather Forecast API Request:', {
      endpoint: '/forecast.json',
      city: cityName,
      hasApiKey: !!WEATHER_API_KEY,
      apiKeyPrefix: WEATHER_API_KEY ? WEATHER_API_KEY.substring(0, 8) + '...' : 'MISSING'
    });

    console.log('Fetching forecast from:', url.replace(WEATHER_API_KEY, '***'));
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Weather Forecast API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Invalid weather API key. Please check your API key in .env file. Error: ${errorData.error?.message || errorData.error?.code || 'Unauthorized'}`);
      }
      if (response.status === 400) {
        throw new Error(`City not found: ${errorData.error?.message || 'Please check the spelling.'}`);
      }
      throw new Error(`Weather API error: ${errorData.error?.message || errorData.error?.code || response.statusText}`);
    }

    const data = await response.json();
    
    // Map forecast data to expected format
    const dailyForecasts = data.forecast.forecastday.map((day) => {
      return {
        date: new Date(day.date),
        temperature: Math.round(day.day.avgtemp_f),
        description: day.day.condition.text,
        icon: day.day.condition.icon,
      };
    });

    return dailyForecasts.slice(0, 5); // Return next 5 days
  } catch (error) {
    console.error('Error fetching weather forecast by city:', error);
    throw error;
  }
};

/**
 * Get weather forecast for extended period (up to 14 days) by city name
 */
export const getExtendedWeatherForecast = async (cityName, days = 14) => {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key is not configured. Please add VITE_WEATHER_API_KEY to your .env file.');
  }

  try {
    // WeatherAPI.com free tier supports up to 14 days
    const maxDays = Math.min(days, 14);
    const url = `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(cityName)}&days=${maxDays}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Invalid weather API key. Error: ${errorData.error?.message || errorData.error?.code || 'Unauthorized'}`);
      }
      if (response.status === 400) {
        throw new Error(`City not found: ${errorData.error?.message || 'Please check the spelling.'}`);
      }
      throw new Error(`Weather API error: ${errorData.error?.message || errorData.error?.code || response.statusText}`);
    }

    const data = await response.json();
    
    // Map forecast data to expected format with date as key
    const forecastMap = {};
    data.forecast.forecastday.forEach((day) => {
      const dateKey = new Date(day.date).toDateString();
      forecastMap[dateKey] = {
        date: new Date(day.date),
        temperature: Math.round(day.day.avgtemp_f),
        high: Math.round(day.day.maxtemp_f),
        low: Math.round(day.day.mintemp_f),
        description: day.day.condition.text,
        icon: day.day.condition.icon,
      };
    });

    return forecastMap;
  } catch (error) {
    console.error('Error fetching extended weather forecast:', error);
    throw error;
  }
};

/**
 * Get weather icon URL from WeatherAPI.com
 * WeatherAPI.com returns full URLs, so we can use them directly
 */
export const getWeatherIconUrl = (iconUrl) => {
  // WeatherAPI.com returns full URLs (e.g., "//cdn.weatherapi.com/weather/64x64/day/113.png")
  // We need to add https: if it's a protocol-relative URL
  if (iconUrl && iconUrl.startsWith('//')) {
    return `https:${iconUrl}`;
  }
  // If it's already a full URL or relative, return as is
  return iconUrl || '';
};

