import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWeather } from '../context/WeatherContext';
import { Search, MapPin, History, X, Compass, Loader2 } from 'lucide-react';
import { DEFAULT_CITIES } from '../utils/constants';
import { searchCities } from '../services/api';

const SearchBar = ({ className = '', placeholder = 'Search city (e.g. London, Tokyo, New York)...' }) => {
  const { city, setCity, recentSearches, clearRecentSearches, useCurrentLocation } = useWeather();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live city search from API
  const fetchLiveSuggestions = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 2) {
      setLiveSuggestions([]);
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchCities(q, 8);
        setLiveSuggestions(results);
      } catch {
        setLiveSuggestions([]);
      } finally {
        setIsFetching(false);
      }
    }, 300);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setCity(query.trim());
    setQuery('');
    setIsOpen(false);
    setLiveSuggestions([]);
  };

  const handleSelectCity = (cityName) => {
    setCity(cityName);
    setQuery('');
    setIsOpen(false);
    setLiveSuggestions([]);
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    fetchLiveSuggestions(val);
  };

  // Static suggestions from local list when no query
  const staticSuggestions = DEFAULT_CITIES.filter(
    (c) => c.toLowerCase().includes(query.toLowerCase()) && c.toLowerCase() !== city.toLowerCase()
  );

  // Determine what to show: live API results (if query) or static list
  const showLive = query.trim().length >= 2;
  const displaySuggestions = showLive
    ? liveSuggestions.filter((s) => s.name?.toLowerCase() !== city.toLowerCase())
    : staticSuggestions;

  return (
    <div className={`searchbar-wrapper ${className}`} ref={containerRef}>
      <form onSubmit={handleSearch} className="searchbar-form">
        <div className="searchbar-input-group">
          {isFetching ? (
            <Loader2 className="search-icon spin-icon" size={18} />
          ) : (
            <Search className="search-icon" size={18} />
          )}
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            aria-label="Search city"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => { setQuery(''); setLiveSuggestions([]); }}
              aria-label="Clear input"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="location-btn"
          onClick={useCurrentLocation}
          title="Detect and use current device location"
          aria-label="Use my location"
        >
          <Compass className="location-icon" size={16} />
          <span className="location-btn-text">My Location</span>
        </button>
      </form>

      {/* Autocomplete & Recent Searches Dropdown */}
      {isOpen && (
        <div className="search-dropdown">
          {/* Recent Searches (only shown when no query typed) */}
          {!query && recentSearches && recentSearches.length > 0 && (
            <div className="dropdown-section">
              <div className="dropdown-section-header">
                <span className="section-title">
                  <History size={13} /> Recent Searches
                </span>
                <button
                  type="button"
                  className="clear-history-btn"
                  onClick={clearRecentSearches}
                >
                  Clear
                </button>
              </div>
              <div className="dropdown-items-wrap">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="dropdown-item"
                    onClick={() => handleSelectCity(item)}
                  >
                    <MapPin size={14} className="item-icon" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live / Static Suggestions */}
          {displaySuggestions.length > 0 && (
            <div className="dropdown-section">
              <div className="dropdown-section-header">
                <span className="section-title">
                  {showLive ? '🌐 Global Search Results' : 'Popular Cities'}
                </span>
              </div>
              <div className="dropdown-items-wrap">
                {displaySuggestions.slice(0, 8).map((item, idx) => {
                  const name = typeof item === 'string' ? item : item.name;
                  const sub = typeof item === 'object' && item.country ? item.country : null;
                  return (
                    <button
                      key={`${name}-${idx}`}
                      type="button"
                      className="dropdown-item"
                      onClick={() => handleSelectCity(name)}
                    >
                      <MapPin size={14} className="item-icon text-muted" />
                      <span>
                        {name}
                        {sub && <span className="item-country"> — {sub}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No results message */}
          {showLive && !isFetching && displaySuggestions.length === 0 && (
            <div className="dropdown-section">
              <p className="dropdown-empty-msg">No cities found for &quot;{query}&quot;. Press Enter to search anyway.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
