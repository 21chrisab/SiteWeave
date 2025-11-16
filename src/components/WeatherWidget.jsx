import React, { useState, useEffect } from 'react';
import { 
  getCurrentWeather, 
  getWeatherForecast, 
  getCurrentWeatherByCity,
  getWeatherForecastByCity,
  getUserLocation, 
  getWeatherIconUrl 
} from '../utils/weatherService';

const STORAGE_KEY = 'weather_location_preference';

function WeatherWidget({ compact = false }) {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCityInput, setShowCityInput] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [useGeolocation, setUseGeolocation] = useState(true);

  useEffect(() => {
    // Always try to use geolocation first
    loadWeather();
  }, []);

  // Auto-submit when user stops typing (debounced)
  useEffect(() => {
    // Only auto-submit if cityInput has a value, we're showing the input, and not currently loading
    if (showCityInput && cityInput.trim() && !loading) {
      const timeoutId = setTimeout(() => {
        loadWeatherByCity(cityInput.trim());
      }, 800); // Wait 800ms after user stops typing

      return () => clearTimeout(timeoutId);
    }
  }, [cityInput, showCityInput, loading]);

  const loadWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowCityInput(false);

      // Get user location
      const location = await getUserLocation();

      // Fetch current weather and forecast
      const [currentWeather, weatherForecast] = await Promise.all([
        getCurrentWeather(location.latitude, location.longitude),
        getWeatherForecast(location.latitude, location.longitude),
      ]);

      setWeather(currentWeather);
      setForecast(weatherForecast);
      setUseGeolocation(true);
      setShowCityInput(false);
    } catch (err) {
      console.error('Error loading weather:', err);
      // If geolocation fails, try saved location preference first, then default city
      const savedLocation = localStorage.getItem(STORAGE_KEY);
      const fallbackCity = savedLocation || 'New York';
      console.log('Geolocation failed, falling back to:', fallbackCity);
      try {
        await loadWeatherByCity(fallbackCity);
      } catch (cityErr) {
        // If fallback city also fails, show city input
        setError('Unable to get your location. Please enter a city name.');
        setShowCityInput(true);
        setUseGeolocation(false);
        setWeather(null);
        setForecast([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWeatherByCity = async (cityName) => {
    if (!cityName || cityName.trim() === '') {
      setError('Please enter a city name');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setShowCityInput(false);

      // Fetch current weather and forecast by city
      const [currentWeather, weatherForecast] = await Promise.all([
        getCurrentWeatherByCity(cityName.trim()),
        getWeatherForecastByCity(cityName.trim()),
      ]);

      setWeather(currentWeather);
      setForecast(weatherForecast);
      setUseGeolocation(false);
      
      // Save preference as fallback (but don't use it on next load - geolocation takes priority)
      localStorage.setItem(STORAGE_KEY, cityName.trim());
    } catch (err) {
      console.error('Error loading weather by city:', err);
      setError(err.message || 'Unable to load weather for this city');
      setShowCityInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySubmit = (e) => {
    e.preventDefault();
    loadWeatherByCity(cityInput);
  };

  const handleUseLocation = () => {
    setShowCityInput(false);
    setCityInput('');
    localStorage.removeItem(STORAGE_KEY);
    loadWeather();
  };

  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      );
    }
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Show city input form if geolocation failed or user wants to enter city
  if (showCityInput && !weather) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        {error && !error.includes('API key') && (
          <div className="text-xs text-gray-500 mb-2">
            {error.includes('location') ? 'Unable to get your location. Please enter a city name.' : error}
          </div>
        )}
        <form onSubmit={handleCitySubmit} className="relative">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onBlur={() => {
              if (cityInput.trim() && !loading) {
                loadWeatherByCity(cityInput.trim());
              }
            }}
            placeholder="Enter city name (e.g., New York)"
            className="w-full px-3 pr-10 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
            title="Use Location"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </form>
      </div>
    );
  }

  // Show error state only for API key errors (not geolocation errors, as those show city input)
  if (error && !weather && !showCityInput) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-xs text-gray-500 mb-3">
          {error.includes('API key') ? (
            <span>Weather API key not configured</span>
          ) : (
            <span>{error}</span>
          )}
        </div>
        <button
          onClick={() => setShowCityInput(true)}
          className="w-full text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Enter City Name
        </button>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  // Compact mode for header
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
        {weather.icon && (
          <img
            src={getWeatherIconUrl(weather.icon)}
            alt={weather.description}
            className="w-4 h-4"
          />
        )}
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-gray-900 leading-tight">
            {weather.temperature}°F
          </div>
          <div className="text-xs text-gray-500 leading-tight">
            {weather.city}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={() => {
              const currentCity = localStorage.getItem(STORAGE_KEY) || weather?.city || '';
              setCityInput(currentCity);
              setShowCityInput(true);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 p-1"
            title="Change location"
          >
            ⚙
          </button>
          <button
            onClick={() => {
              if (useGeolocation) {
                loadWeather();
              } else {
                const savedCity = localStorage.getItem(STORAGE_KEY) || weather?.city || cityInput;
                if (savedCity) {
                  loadWeatherByCity(savedCity);
                }
              }
            }}
            className="text-xs text-gray-400 hover:text-gray-600 p-1"
            title="Refresh weather"
          >
            ↻
          </button>
        </div>
        {showCityInput && (
          <div className="absolute top-full right-0 mt-2 z-50 bg-white p-3 rounded-lg border border-gray-200 shadow-lg min-w-[250px]">
            <form onSubmit={(e) => { e.preventDefault(); loadWeatherByCity(cityInput); }} className="relative">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onBlur={() => {
                  if (cityInput.trim() && !loading) {
                    loadWeatherByCity(cityInput.trim());
                  }
                }}
                placeholder="Enter city name (e.g., New York)"
                className="w-full px-2 pr-8 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleUseLocation}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Use Location"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const currentCity = localStorage.getItem(STORAGE_KEY) || weather?.city || '';
              setCityInput(currentCity);
              setShowCityInput(true);
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Change location"
          >
            ⚙
          </button>
          <button
            onClick={() => {
              if (useGeolocation) {
                loadWeather();
              } else {
                const savedCity = localStorage.getItem(STORAGE_KEY) || weather?.city || cityInput;
                if (savedCity) {
                  loadWeatherByCity(savedCity);
                }
              }
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Refresh weather"
          >
            ↻
          </button>
        </div>
      </div>

      {showCityInput && (
        <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
          <form onSubmit={(e) => { e.preventDefault(); loadWeatherByCity(cityInput); }} className="relative">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onBlur={() => {
                if (cityInput.trim() && !loading) {
                  loadWeatherByCity(cityInput.trim());
                }
              }}
              placeholder="Enter city name (e.g., New York)"
              className="w-full px-2 pr-8 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleUseLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              title="Use Location"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Current Weather */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          {weather.icon && (
            <img
              src={getWeatherIconUrl(weather.icon)}
              alt={weather.description}
              className="w-12 h-12"
            />
          )}
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {weather.temperature}°F
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {weather.description}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-600">
          {weather.city}, {weather.country}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>Feels like {weather.feelsLike}°F</span>
          {weather.humidity && <span>Humidity: {weather.humidity}%</span>}
        </div>
      </div>

      {/* Forecast */}
      {forecast.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-500 mb-2">Forecast</h4>
          <div className="space-y-2">
            {forecast.map((day, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {day.icon && (
                    <img
                      src={getWeatherIconUrl(day.icon)}
                      alt={day.description}
                      className="w-6 h-6"
                    />
                  )}
                  <span className="text-gray-600">
                    {index === 0
                      ? 'Today'
                      : day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 capitalize">{day.description}</span>
                  <span className="font-semibold text-gray-900">{day.temperature}°F</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherWidget;

