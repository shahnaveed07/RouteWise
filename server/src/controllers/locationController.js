import { searchLocations } from '../services/geocodingService.js';
import { validateLocationSearchQuery } from '../validators/locationValidator.js';

export function createLocationController({ searchLocationsFn = searchLocations } = {}) {
  const handleSearchLocations = async (req, res, next) => {
    const validation = validateLocationSearchQuery(req.query);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const results = await searchLocationsFn(validation.data.query, validation.data.count);
      return res.status(200).json({ results });
    } catch (error) {
      return next(error);
    }
  };

  return { handleSearchLocations };
}

const defaultController = createLocationController();
export const handleSearchLocations = defaultController.handleSearchLocations;
