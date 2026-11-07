import { useState } from 'react';
import PlaceSearch from './PlaceSearch.jsx';

export default function ItineraryItemForm({
  dayOrder,
  dayDate,
  currency = 'INR',
  initialValues = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Add Activity',
}) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(
    initialValues?.description || ''
  );
  const [startTime, setStartTime] = useState(initialValues?.startTime || '');
  const [endTime, setEndTime] = useState(initialValues?.endTime || '');
  const [estimatedCost, setEstimatedCost] = useState(
    initialValues?.estimatedCost !== undefined &&
      initialValues?.estimatedCost !== null
      ? String(initialValues.estimatedCost)
      : '0.00'
  );
  const [selectedPlace, setSelectedPlace] = useState(
    initialValues?.place
      ? {
          provider: initialValues.place.provider || 'open-meteo-geocoding',
          providerPlaceId: initialValues.place.providerPlaceId || null,
          name: initialValues.place.name,
          address: initialValues.place.address || null,
          latitude: initialValues.place.latitude,
          longitude: initialValues.place.longitude,
        }
      : null
  );
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Activity title is required.');
      return;
    }
    if (trimmedTitle.length > 180) {
      setFormError('Activity title must be 180 characters or fewer.');
      return;
    }

    if (startTime && endTime && endTime <= startTime) {
      setFormError('End time must be later than start time.');
      return;
    }

    const trimmedCost = String(estimatedCost).trim();
    if (trimmedCost !== '' && !/^\d+(?:\.\d{1,2})?$/.test(trimmedCost)) {
      setFormError(
        'Estimated cost must be a non-negative amount with up to 2 decimal places.'
      );
      return;
    }

    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim() ? description.trim() : null,
        startTime: startTime || null,
        endTime: endTime || null,
        estimatedCost: trimmedCost || '0.00',
        place: selectedPlace,
      });
    } catch (err) {
      setFormError(err.message || 'Unable to save activity.');
    }
  };

  const idPrefix = initialValues?.id
    ? `edit-item-${initialValues.id}`
    : `new-item-day-${dayOrder}`;

  return (
    <form
      className="itinerary-item-form"
      onSubmit={handleSubmit}
      aria-label={`${submitLabel} for Day ${dayOrder} (${dayDate})`}
    >
      {formError && (
        <div className="form-alert form-alert-error" role="alert">
          {formError}
        </div>
      )}

      <div className="form-grid-two">
        <div className="form-field">
          <label htmlFor={`${idPrefix}-title`} className="form-label">
            Activity Title <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${idPrefix}-title`}
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={180}
            placeholder="e.g. Morning Shikara Ride on Dal Lake"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-field">
          <label htmlFor={`${idPrefix}-cost`} className="form-label">
            Estimated Cost ({currency})
          </label>
          <input
            id={`${idPrefix}-cost`}
            type="text"
            inputMode="decimal"
            className="form-input"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-grid-two">
        <div className="form-field">
          <label htmlFor={`${idPrefix}-start-time`} className="form-label">
            Start Time (24h, Optional)
          </label>
          <input
            id={`${idPrefix}-start-time`}
            type="time"
            className="form-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-field">
          <label htmlFor={`${idPrefix}-end-time`} className="form-label">
            End Time (24h, Optional)
          </label>
          <input
            id={`${idPrefix}-end-time`}
            type="time"
            className="form-input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="form-field">
        <PlaceSearch
          selectedPlace={selectedPlace}
          onPlaceChange={setSelectedPlace}
          disabled={isSubmitting}
          inputId={`${idPrefix}-place`}
        />
      </div>

      <div className="form-field">
        <label htmlFor={`${idPrefix}-description`} className="form-label">
          Description &amp; Notes (Optional)
        </label>
        <textarea
          id={`${idPrefix}-description`}
          className="form-textarea"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          placeholder="Booking reference, entry gate, or transport notes..."
          disabled={isSubmitting}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
