import { getForecastByCoordinates } from '../services/weatherService.js';
import { validateWeatherQuery } from '../validators/weatherValidator.js';

export function createWeatherController({ getForecastFn = getForecastByCoordinates } = {}) {
  const handleGetWeather = async (req, res, next) => {
    const validation = validateWeatherQuery(req.query);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const weather = await getForecastFn(
        validation.data.latitude,
        validation.data.longitude
      );
      return res.status(200).json({ weather });
    } catch (error) {
      return next(error);
    }
  };

  return { handleGetWeather };
}

const defaultController = createWeatherController();
export const handleGetWeather = defaultController.handleGetWeather;
