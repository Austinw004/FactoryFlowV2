import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  conditions: string;
  windSpeed: number;
  pressure: number;
  visibility: number;
  timestamp: string;
}

export interface WeatherForecast {
  location: string;
  forecasts: Array<{
    date: string;
    tempHigh: number;
    tempLow: number;
    conditions: string;
    precipProbability: number;
  }>;
}

export interface WeatherAlert {
  event: string;
  severity: string;
  headline: string;
  description: string;
  start: string;
  end: string;
}

export class WeatherIntegration {
  private apiKey: string;
  private companyId: string;
  private baseUrl = "https://api.openweathermap.org/data/2.5";

  constructor(apiKey: string, companyId: string) {
    this.apiKey = apiKey;
    this.companyId = companyId;
  }

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await axios.get(`${this.baseUrl}/weather?q=London&appid=${this.apiKey}`);
      console.log(`[Weather] Connection test successful for company ${this.companyId}`);
      return { success: true, message: "Weather API connection verified" };
    } catch (error: any) {
      console.error(`[Weather] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async getCurrentWeather(location: string): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: { q: location, appid: this.apiKey, units: "metric" },
        timeout: 10000
      });

      const data = response.data;
      console.log(`[Weather] Fetched current weather for ${location}`);
      return {
        location,
        temperature: data.main.temp,
        humidity: data.main.humidity,
        conditions: data.weather[0]?.description || "Unknown",
        windSpeed: data.wind.speed,
        pressure: data.main.pressure,
        visibility: data.visibility / 1000,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("[Weather] Failed to fetch current weather:", error.message);
      throw error;
    }
  }

  async getForecast(location: string, days: number = 5): Promise<WeatherForecast> {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: { q: location, appid: this.apiKey, units: "metric", cnt: days * 8 },
        timeout: 10000
      });

      const data = response.data;
      const dailyForecasts: Map<string, any[]> = new Map();
      
      for (const item of data.list) {
        const date = item.dt_txt.split(" ")[0];
        if (!dailyForecasts.has(date)) {
          dailyForecasts.set(date, []);
        }
        dailyForecasts.get(date)!.push(item);
      }

      const forecasts = Array.from(dailyForecasts.entries()).slice(0, days).map(([date, items]) => {
        const temps = items.map(i => i.main.temp);
        const pops = items.map(i => i.pop || 0);
        return {
          date,
          tempHigh: Math.max(...temps),
          tempLow: Math.min(...temps),
          conditions: items[Math.floor(items.length / 2)]?.weather[0]?.description || "Unknown",
          precipProbability: Math.max(...pops) * 100
        };
      });

      console.log(`[Weather] Fetched ${forecasts.length}-day forecast for ${location}`);
      return { location, forecasts };
    } catch (error: any) {
      console.error("[Weather] Failed to fetch forecast:", error.message);
      throw error;
    }
  }

  async getWeatherForSupplierLocations(): Promise<Map<string, WeatherData>> {
    const weatherMap = new Map<string, WeatherData>();

    try {
      const suppliers = await storage.getSuppliers(this.companyId);
      const locations = new Set<string>();

      for (const supplier of suppliers) {
        if (supplier.name) {
          locations.add(supplier.name.split(" ")[0]?.trim() || "");
        }
      }

      for (const location of Array.from(locations).slice(0, 10)) {
        if (!location || location.length < 2) continue;
        try {
          const weather = await this.getCurrentWeather(location);
          weatherMap.set(location, weather);
        } catch (err) {
          console.log(`[Weather] Could not fetch weather for ${location}`);
        }
      }

      console.log(`[Weather] Fetched weather for ${weatherMap.size} supplier locations`);
      return weatherMap;
    } catch (error: any) {
      console.error("[Weather] Failed to get supplier weather:", error.message);
      throw error;
    }
  }

  async createWeatherRiskAlerts(): Promise<{ alerts: number; locations: string[] }> {
    const alertLocations: string[] = [];

    try {
      const weatherMap = await this.getWeatherForSupplierLocations();

      for (const [location, weather] of Array.from(weatherMap.entries())) {
        const isExtreme = 
          weather.temperature < -10 || 
          weather.temperature > 40 ||
          weather.windSpeed > 20 ||
          weather.conditions.toLowerCase().includes("storm") ||
          weather.conditions.toLowerCase().includes("snow") ||
          weather.conditions.toLowerCase().includes("flood");

        if (isExtreme) {
          alertLocations.push(location);
          
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "weather_alert",
            signalDate: new Date(),
            quantity: 1,
            unit: "alert",
            channel: "weather",
            confidence: 90,
            priority: "high",
            attributes: {
              source: "weather",
              location,
              temperature: weather.temperature,
              conditions: weather.conditions,
              windSpeed: weather.windSpeed
            }
          });
        }
      }

      console.log(`[Weather] Created ${alertLocations.length} weather risk alerts`);
      return { alerts: alertLocations.length, locations: alertLocations };
    } catch (error: any) {
      console.error("[Weather] Failed to create weather alerts:", error.message);
      throw error;
    }
  }

  async syncWeatherDataForLocations(locations: string[]): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      for (const location of locations) {
        try {
          const weather = await this.getCurrentWeather(location);
          
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "weather_update",
            signalDate: new Date(),
            quantity: Math.round(weather.temperature),
            unit: "celsius",
            channel: "weather",
            confidence: 95,
            priority: weather.temperature < 0 || weather.temperature > 35 ? "high" : "low",
            attributes: {
              source: "weather",
              location,
              temperature: weather.temperature,
              humidity: weather.humidity,
              conditions: weather.conditions,
              windSpeed: weather.windSpeed,
              pressure: weather.pressure
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Location ${location}: ${err.message}`);
        }
      }

      console.log(`[Weather] Synced weather data for ${synced} locations`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Weather] Weather sync failed:", error.message);
      throw error;
    }
  }
}

export async function getWeatherIntegration(companyId: string): Promise<WeatherIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'weather');
    if (credentials?.apiKey) {
      console.log(`[Weather] Using centralized credential storage for company ${companyId}`);
      return new WeatherIntegration(credentials.apiKey, companyId);
    }
  } catch (error) {
    console.log(`[Weather] Credentials not available for company ${companyId}`);
  }
  if (process.env.OPENWEATHER_API_KEY) {
    return new WeatherIntegration(process.env.OPENWEATHER_API_KEY, companyId);
  }
  return null;
}
