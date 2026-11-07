export default function ItineraryItemCard({
  item,
  index,
  totalItems,
  currency = 'INR',
  canEdit = false,
  isBusy = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
}) {
  const hasPlace = Boolean(item.place && item.place.hasCoordinates);
  const timeRange =
    item.startTime && item.endTime
      ? `${item.startTime} – ${item.endTime}`
      : item.startTime
      ? `Starts ${item.startTime}`
      : item.endTime
      ? `Ends ${item.endTime}`
      : 'Flexible time';

  return (
    <div
      className={
        isDragging
          ? 'itinerary-item-card itinerary-item-card-dragging'
          : 'itinerary-item-card'
      }
      draggable={canEdit && !isBusy}
      onDragStart={(e) => canEdit && onDragStart && onDragStart(e, index)}
      onDragOver={(e) => canEdit && onDragOver && onDragOver(e, index)}
      onDrop={(e) => canEdit && onDrop && onDrop(e, index)}
      data-testid={`itinerary-item-card-${item.sortOrder}`}
    >
      <div className="itinerary-item-main">
        <div className="itinerary-item-header">
          <div className="itinerary-item-title-group">
            <span
              className="itinerary-stop-badge"
              title={`Activity #${item.sortOrder}`}
            >
              #{item.sortOrder}
            </span>
            <h4 className="itinerary-item-title">{item.title}</h4>
          </div>

          <div className="itinerary-item-meta-badges">
            <span className="itinerary-time-badge">{timeRange}</span>
            <span className="itinerary-cost-badge">
              {currency} {item.estimatedCost}
            </span>
          </div>
        </div>

        <div className="itinerary-item-place-row">
          {hasPlace ? (
            <span
              className="coord-status-badge coord-status-verified"
              data-testid="activity-location-confirmed"
            >
              Pin: {item.place.name}
              {item.place.address ? ` (${item.place.address})` : ''} •{' '}
              {Number(item.place.latitude).toFixed(4)}°,{' '}
              {Number(item.place.longitude).toFixed(4)}°
            </span>
          ) : (
            <span
              className="coord-status-badge coord-status-unverified"
              data-testid="activity-location-unconfirmed"
            >
              No Confirmed Location (Skipped in Route Calculation)
            </span>
          )}
        </div>

        {item.description && (
          <p className="itinerary-item-description">{item.description}</p>
        )}
      </div>

      {canEdit && (
        <div
          className="itinerary-item-actions"
          aria-label={`Actions for ${item.title}`}
        >
          <div className="itinerary-reorder-btns">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={onMoveUp}
              disabled={isBusy || index === 0}
              aria-label={`Move ${item.title} up`}
              title="Move Up"
            >
              ↑ Up
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={onMoveDown}
              disabled={isBusy || index === totalItems - 1}
              aria-label={`Move ${item.title} down`}
              title="Move Down"
            >
              ↓ Down
            </button>
          </div>

          <div className="itinerary-crud-btns">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={onEdit}
              disabled={isBusy}
              aria-label={`Edit ${item.title}`}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-danger btn-xs"
              onClick={onDelete}
              disabled={isBusy}
              aria-label={`Delete ${item.title}`}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
