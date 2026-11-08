import { WeatherData } from '../types';

// WMO Weather interpretation codes (WW)
const WMO_CODES: Record<number, string> = {
  0: 'Helder',
  1: 'Overwegend helder',
  2: 'Gedeeltelijk bewolkt',
  3: 'Bewolkt',
  45: 'Mistig',
  48: 'Rijp / ijsmist',
  51: 'Lichte motregen',
  53: 'Matige motregen',
  55: 'Dichte motregen',
  61: 'Lichte regen',
  63: 'Matige regen',
  65: 'Hevige regen',
  71: 'Lichte sneeuwval',
  73: 'Matige sneeuwval',
  75: 'Hevige sneeuwval',
  77: 'Sneeuwkorrels',
  80: 'Lichte regenbui',
  81: 'Matige regenbui',
  82: 'Hevige regenbui',
  85: 'Lichte sneeuwbui',
  86: 'Hevige sneeuwbui',
  95: 'Onweer',
  96: 'Onweer met hagel',
  99: 'Zwaar onweer',
};

export async function fetchCurrentWeather(
  lat: number = 52.3676,
  lon: number = 4.9041,
  cityName: string = 'Amsterdam'
): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Weather fetch failed: ${res.statusText}`);
    }
    const data = await res.json();
    const current = data.current;

    const weatherCode = current.weather_code ?? 0;
    const conditionText = WMO_CODES[weatherCode] || 'Onbewolkt';

    return {
      temperature: Math.round(current.temperature_2m),
      conditionCode: weatherCode,
      conditionText,
      isDay: current.is_day === 1,
      city: cityName,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
    };
  } catch (err) {
    console.warn('Weather fetch error, using default:', err);
    return {
      temperature: 14,
      conditionCode: 2,
      conditionText: 'Gedeeltelijk bewolkt',
      isDay: true,
      city: cityName,
    };
  }
}
