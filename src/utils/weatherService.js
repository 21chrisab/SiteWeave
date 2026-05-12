/**
 * Weather Service
 * Fetches weather data from WeatherAPI.com
 */

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const WEATHER_API_URL = 'https://api.weatherapi.com/v1';

export const WEATHER_ERROR_CODES = {
  MISSING_API_KEY: 'MISSING_API_KEY',
  GEOLOCATION_UNSUPPORTED: 'GEOLOCATION_UNSUPPORTED',
  GEOLOCATION_DENIED: 'GEOLOCATION_DENIED',
  GEOLOCATION_UNAVAILABLE: 'GEOLOCATION_UNAVAILABLE',
  GEOLOCATION_TIMEOUT: 'GEOLOCATION_TIMEOUT',
  INVALID_API_KEY: 'INVALID_API_KEY',
  CITY_NOT_FOUND: 'CITY_NOT_FOUND',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

const createWeatherError = (code, message, details = null) => {
  const error = new Error(message);
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
};

const ensureApiKey = () => {
  if (!WEATHER_API_KEY) {
    throw createWeatherError(
      WEATHER_ERROR_CODES.MISSING_API_KEY,
      'Weather API key is not configured. Please add VITE_WEATHER_API_KEY to your .env file.',
    );
  }
};

const parseApiError = async (response) => {
  const errorData = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw createWeatherError(
      WEATHER_ERROR_CODES.INVALID_API_KEY,
      `Invalid weather API key. ${errorData.error?.message || 'Unauthorized request.'}`,
      { status: response.status, apiError: errorData.error || null },
    );
  }

  if (response.status === 400) {
    throw createWeatherError(
      WEATHER_ERROR_CODES.CITY_NOT_FOUND,
      `City not found. ${errorData.error?.message || 'Please check the spelling.'}`,
      { status: response.status, apiError: errorData.error || null },
    );
  }

  throw createWeatherError(
    WEATHER_ERROR_CODES.API_ERROR,
    `Weather API error: ${errorData.error?.message || response.statusText}`,
    { status: response.status, apiError: errorData.error || null },
  );
};

/**
 * Get user's location using browser geolocation API
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(createWeatherError(WEATHER_ERROR_CODES.GEOLOCATION_UNSUPPORTED, 'Geolocation is not supported by this browser.'));
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
        if (error?.code === 1) {
          reject(createWeatherError(WEATHER_ERROR_CODES.GEOLOCATION_DENIED, 'Location access was denied.'));
          return;
        }
        if (error?.code === 2) {
          reject(createWeatherError(WEATHER_ERROR_CODES.GEOLOCATION_UNAVAILABLE, 'Location is currently unavailable.'));
          return;
        }
        if (error?.code === 3) {
          reject(createWeatherError(WEATHER_ERROR_CODES.GEOLOCATION_TIMEOUT, 'Location request timed out.'));
          return;
        }
        reject(createWeatherError(WEATHER_ERROR_CODES.GEOLOCATION_UNAVAILABLE, 'Unable to retrieve device location.'));
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
  ensureApiKey();

  try {
    const url = `${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}`;
    const response = await fetch(url);

    if (!response.ok) {
      await parseApiError(response);
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
    if (error?.code) {
      throw error;
    }
    throw createWeatherError(WEATHER_ERROR_CODES.NETWORK_ERROR, 'Unable to reach weather service.', { cause: error });
  }
};

const normalizeCityName = (cityName) => {
  if (!cityName || !cityName.trim()) {
    throw createWeatherError(WEATHER_ERROR_CODES.CITY_NOT_FOUND, 'Please enter a city name.');
  }
  return cityName.trim();
};

const mapCurrentWeather = (data) => ({
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
});

const mapForecast = (data) => data.forecast.forecastday.map((day) => ({
  date: new Date(day.date),
  temperature: Math.round(day.day.avgtemp_f),
  description: day.day.condition.text,
  icon: day.day.condition.icon,
}));

/**
 * Fetch current weather data by city name
 */
export const getCurrentWeatherByCity = async (cityName) => {
  ensureApiKey();
  const normalizedCity = normalizeCityName(cityName);

  try {
    const url = `${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(normalizedCity)}`;
    const response = await fetch(url);

    if (!response.ok) {
      await parseApiError(response);
    }

    const data = await response.json();
    return mapCurrentWeather(data);
  } catch (error) {
    if (error?.code) {
      throw error;
    }
    throw createWeatherError(WEATHER_ERROR_CODES.NETWORK_ERROR, 'Unable to reach weather service.', { cause: error });
  }
};

/**
 * Fetch weather forecast for the next week by coordinates
 */
export const getWeatherForecast = async (latitude, longitude) => {
  ensureApiKey();

  try {
    const url = `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=7`;
    const response = await fetch(url);

    if (!response.ok) {
      await parseApiError(response);
    }

    const data = await response.json();
    return mapForecast(data).slice(0, 7);
  } catch (error) {
    if (error?.code) {
      throw error;
    }
    throw createWeatherError(WEATHER_ERROR_CODES.NETWORK_ERROR, 'Unable to reach weather service.', { cause: error });
  }
};

/**
 * Fetch weather forecast for the next week by city name
 */
export const getWeatherForecastByCity = async (cityName) => {
  ensureApiKey();
  const normalizedCity = normalizeCityName(cityName);

  try {
    const url = `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(normalizedCity)}&days=7`;
    const response = await fetch(url);

    if (!response.ok) {
      await parseApiError(response);
    }

    const data = await response.json();
    return mapForecast(data).slice(0, 7);
  } catch (error) {
    if (error?.code) {
      throw error;
    }
    throw createWeatherError(WEATHER_ERROR_CODES.NETWORK_ERROR, 'Unable to reach weather service.', { cause: error });
  }
};

/**
 * Get weather forecast for extended period (up to 14 days) by city name
 */
export const getExtendedWeatherForecast = async (cityName, days = 14) => {
  ensureApiKey();
  const normalizedCity = normalizeCityName(cityName);

  try {
    const maxDays = Math.min(days, 14);
    const url = `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(normalizedCity)}&days=${maxDays}`;
    const response = await fetch(url);

    if (!response.ok) {
      await parseApiError(response);
    }

    const data = await response.json();
    const forecastMap = {};
    data.forecast.forecastday.forEach((day) => {
      const [year, month, dayOfMonth] = day.date.split('-').map(Number);
      const date = new Date(year, month - 1, dayOfMonth);
      const dateKey = date.toDateString();

      forecastMap[dateKey] = {
        date,
        temperature: Math.round(day.day.avgtemp_f),
        high: Math.round(day.day.maxtemp_f),
        low: Math.round(day.day.mintemp_f),
        description: day.day.condition.text,
        icon: day.day.condition.icon,
      };
    });

    return forecastMap;
  } catch (error) {
    if (error?.code) {
      throw error;
    }
    throw createWeatherError(WEATHER_ERROR_CODES.NETWORK_ERROR, 'Unable to reach weather service.', { cause: error });
  }
};

/**
 * Get weather icon URL from WeatherAPI.com
 * WeatherAPI.com returns full URLs, so we can use them directly
 */
export const getWeatherIconUrl = (iconUrl) => {
  if (iconUrl && iconUrl.startsWith('//')) {
    return `https:${iconUrl}`;
  }
  return iconUrl || '';
};

