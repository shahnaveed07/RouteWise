import { useState } from 'react';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const BUDGET_REGEX = /^\d{1,10}(\.\d{1,2})?$/;

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export default function TripForm({
  initialValues = {},
  submitLabel = 'Save Trip',
  onSubmit,
  onCancel,
  isSubmitting = false,
  serverError = null,
}) {
  const [title, setTitle] = useState(initialValues.title || '');
  const [destinationName, setDestinationName] = useState(initialValues.destinationName || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [startDate, setStartDate] = useState(initialValues.startDate || '');
  const [endDate, setEndDate] = useState(initialValues.endDate || '');
  const [currency, setCurrency] = useState(initialValues.currency || 'INR');
  const [plannedBudget, setPlannedBudget] = useState(
    initialValues.plannedBudget !== undefined && initialValues.plannedBudget !== null
      ? String(initialValues.plannedBudget)
      : '0.00'
  );
  const [fieldErrors, setFieldErrors] = useState({});

  const validateFields = () => {
    const errors = {};
    const trimmedTitle = title.trim();
    const trimmedDest = destinationName.trim();
    const trimmedDesc = description.trim();
    const trimmedCurrency = currency.trim().toUpperCase();
    const trimmedBudget = plannedBudget.trim();

    if (trimmedTitle.length < 1 || trimmedTitle.length > 150) {
      errors.title = 'Trip title is required (1–150 characters).';
    }

    if (trimmedDest.length < 1 || trimmedDest.length > 180) {
      errors.destinationName = 'Destination is required (1–180 characters).';
    }

    if (trimmedDesc.length > 5000) {
      errors.description = 'Description must not exceed 5,000 characters.';
    }

    if (!isValidCalendarDate(startDate)) {
      errors.startDate = 'Enter a valid start date (YYYY-MM-DD).';
    }

    if (!isValidCalendarDate(endDate)) {
      errors.endDate = 'Enter a valid end date (YYYY-MM-DD).';
    } else if (isValidCalendarDate(startDate) && endDate < startDate) {
      errors.endDate = 'End date must be on or after the start date.';
    }

    if (!CURRENCY_REGEX.test(trimmedCurrency)) {
      errors.currency = 'Currency must be 3 uppercase letters (e.g. INR, USD, EUR).';
    }

    if (trimmedBudget !== '' && !BUDGET_REGEX.test(trimmedBudget)) {
      errors.plannedBudget =
        'Planned budget must be a non-negative amount with up to 2 decimal places.';
    }

    setFieldErrors(errors);
    return {
      isValid: Object.keys(errors).length === 0,
      payload: {
        title: trimmedTitle,
        destinationName: trimmedDest,
        description: trimmedDesc.length > 0 ? trimmedDesc : null,
        startDate,
        endDate,
        currency: trimmedCurrency,
        plannedBudget: trimmedBudget === '' ? '0.00' : trimmedBudget,
      },
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const { isValid, payload } = validateFields();
    if (!isValid) return;

    await onSubmit(payload);
  };

  return (
    <form className="trip-form card" onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div className="form-alert form-alert-error" role="alert">
          {serverError}
        </div>
      )}

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="trip-title" className="form-label">
            Trip Title <span aria-hidden="true">*</span>
          </label>
          <input
            id="trip-title"
            name="title"
            type="text"
            className={fieldErrors.title ? 'form-input form-input-error' : 'form-input'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder="e.g. Kashmir Autumn Expedition"
            required
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'trip-title-error' : undefined}
          />
          {fieldErrors.title && (
            <p id="trip-title-error" className="field-error" role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="trip-destination" className="form-label">
            Destination <span aria-hidden="true">*</span>
          </label>
          <input
            id="trip-destination"
            name="destinationName"
            type="text"
            className={fieldErrors.destinationName ? 'form-input form-input-error' : 'form-input'}
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            maxLength={180}
            placeholder="e.g. Srinagar, Gulmarg & Pahalgam"
            required
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.destinationName)}
            aria-describedby={fieldErrors.destinationName ? 'trip-destination-error' : undefined}
          />
          {fieldErrors.destinationName && (
            <p id="trip-destination-error" className="field-error" role="alert">
              {fieldErrors.destinationName}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="trip-start-date" className="form-label">
            Start Date <span aria-hidden="true">*</span>
          </label>
          <input
            id="trip-start-date"
            name="startDate"
            type="date"
            className={fieldErrors.startDate ? 'form-input form-input-error' : 'form-input'}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.startDate)}
            aria-describedby={fieldErrors.startDate ? 'trip-start-date-error' : undefined}
          />
          {fieldErrors.startDate && (
            <p id="trip-start-date-error" className="field-error" role="alert">
              {fieldErrors.startDate}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="trip-end-date" className="form-label">
            End Date <span aria-hidden="true">*</span>
          </label>
          <input
            id="trip-end-date"
            name="endDate"
            type="date"
            className={fieldErrors.endDate ? 'form-input form-input-error' : 'form-input'}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.endDate)}
            aria-describedby={fieldErrors.endDate ? 'trip-end-date-error' : undefined}
          />
          {fieldErrors.endDate && (
            <p id="trip-end-date-error" className="field-error" role="alert">
              {fieldErrors.endDate}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="trip-currency" className="form-label">
            Currency (3-Letter ISO)
          </label>
          <input
            id="trip-currency"
            name="currency"
            type="text"
            className={fieldErrors.currency ? 'form-input form-input-error' : 'form-input'}
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="INR"
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.currency)}
            aria-describedby={fieldErrors.currency ? 'trip-currency-error' : undefined}
          />
          {fieldErrors.currency && (
            <p id="trip-currency-error" className="field-error" role="alert">
              {fieldErrors.currency}
            </p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="trip-budget" className="form-label">
            Planned Budget
          </label>
          <input
            id="trip-budget"
            name="plannedBudget"
            type="text"
            inputMode="decimal"
            className={fieldErrors.plannedBudget ? 'form-input form-input-error' : 'form-input'}
            value={plannedBudget}
            onChange={(e) => setPlannedBudget(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.plannedBudget)}
            aria-describedby={fieldErrors.plannedBudget ? 'trip-budget-error' : undefined}
          />
          {fieldErrors.plannedBudget && (
            <p id="trip-budget-error" className="field-error" role="alert">
              {fieldErrors.plannedBudget}
            </p>
          )}
        </div>
      </div>

      <div className="form-field form-field-full">
        <label htmlFor="trip-description" className="form-label">
          Description / Planning Notes (Optional)
        </label>
        <textarea
          id="trip-description"
          name="description"
          rows={4}
          className={fieldErrors.description ? 'form-textarea form-input-error' : 'form-textarea'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          placeholder="Add overview notes, travel goals, or group reminders..."
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'trip-description-error' : undefined}
        />
        {fieldErrors.description && (
          <p id="trip-description-error" className="field-error" role="alert">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
