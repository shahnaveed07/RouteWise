import { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog.jsx';
import ItineraryItemCard from './ItineraryItemCard.jsx';
import ItineraryItemForm from './ItineraryItemForm.jsx';

export default function ItineraryDaySection({
  day,
  currency = 'INR',
  canEdit = false,
  isSelectedForMap = false,
  onSelectDayForMap,
  onCalculateDayRoute,
  isCalculatingRoute = false,
  onSaveNotes,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
}) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(day.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    setNotesDraft(day.notes || '');
  }, [day.notes]);

  const items = Array.isArray(day.items) ? day.items : [];
  const isBusy =
    isSavingNotes || isSubmittingItem || isDeletingItem || isReordering;

  const handleSaveNotesSubmit = async (event) => {
    event.preventDefault();
    setIsSavingNotes(true);
    setNotesError(null);
    try {
      await onSaveNotes(day.id, notesDraft.trim() ? notesDraft.trim() : null);
      setIsEditingNotes(false);
    } catch (err) {
      setNotesError(err.message || 'Unable to save day notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCreateActivity = async (payload) => {
    setIsSubmittingItem(true);
    setActionError(null);
    try {
      await onCreateItem(day.id, payload);
      setIsAddingItem(false);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleUpdateActivity = async (itemId, payload) => {
    setIsSubmittingItem(true);
    setActionError(null);
    try {
      await onUpdateItem(day.id, itemId, payload);
      setEditingItemId(null);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete || isDeletingItem) return;
    setIsDeletingItem(true);
    setActionError(null);
    try {
      await onDeleteItem(day.id, itemToDelete.id);
      setItemToDelete(null);
    } catch (err) {
      setActionError(err.message || 'Unable to delete activity.');
    } finally {
      setIsDeletingItem(false);
    }
  };

  const triggerReorder = async (fromIndex, toIndex) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= items.length ||
      toIndex >= items.length
    ) {
      return;
    }

    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const orderedIds = reordered.map((it) => it.id);

    setIsReordering(true);
    setActionError(null);
    try {
      await onReorderItems(day.id, orderedIds);
    } catch (err) {
      setActionError(err.message || 'Unable to reorder activities.');
    } finally {
      setIsReordering(false);
      setDraggedIndex(null);
    }
  };

  const handleDragStart = (event, index) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event, targetIndex) => {
    event.preventDefault();
    const sourceIndex =
      draggedIndex !== null
        ? draggedIndex
        : Number(event.dataTransfer.getData('text/plain'));
    if (Number.isInteger(sourceIndex) && sourceIndex !== targetIndex) {
      triggerReorder(sourceIndex, targetIndex);
    } else {
      setDraggedIndex(null);
    }
  };

  return (
    <section
      className={
        isSelectedForMap
          ? 'card itinerary-day-card itinerary-day-card-active'
          : 'card itinerary-day-card'
      }
      aria-label={`Day ${day.dayOrder} (${day.dayDate})`}
      data-testid={`itinerary-day-${day.dayOrder}`}
    >
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="Delete Activity?"
        message={
          itemToDelete
            ? `Are you sure you want to delete "${itemToDelete.title}" from Day ${day.dayOrder} (${day.dayDate})?`
            : ''
        }
        confirmLabel={isDeletingItem ? 'Deleting...' : 'Delete Activity'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => {
          if (!isDeletingItem) {
            setItemToDelete(null);
          }
        }}
      />

      <div className="itinerary-day-header">
        <div className="itinerary-day-title-block">
          <div className="itinerary-day-heading-row">
            <span className="itinerary-day-pill">Day {day.dayOrder}</span>
            <h3 className="itinerary-day-date">{day.dayDate}</h3>
            {day.isOutsideTripRange && (
              <span
                className="coord-status-badge coord-status-unverified"
                data-testid={`day-${day.dayOrder}-outside-range-badge`}
              >
                Outside Current Trip Dates
              </span>
            )}
            {isSelectedForMap && (
              <span className="coord-status-badge coord-status-verified">
                Focused on Map
              </span>
            )}
          </div>
          <div className="itinerary-day-submeta">
            <span>
              {items.length} {items.length === 1 ? 'activity' : 'activities'}
            </span>
            <span>•</span>
            <span>
              {day.geocodedStopCount} pinned map{' '}
              {day.geocodedStopCount === 1 ? 'stop' : 'stops'}
            </span>
            <span>•</span>
            <strong
              className="itinerary-day-cost"
              data-testid={`day-${day.dayOrder}-cost`}
            >
              Day Est. Cost: {currency} {day.estimatedCost}
            </strong>
          </div>
        </div>

        <div className="itinerary-day-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onSelectDayForMap(day.id)}
          >
            {isSelectedForMap ? 'Showing on Map' : 'Focus Day on Map'}
          </button>

          {day.geocodedStopCount >= 2 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onCalculateDayRoute(day.id)}
              disabled={isCalculatingRoute}
              data-testid={`calculate-route-day-${day.dayOrder}`}
            >
              {isCalculatingRoute ? 'Routing...' : 'Calculate Day Route'}
            </button>
          )}

          {canEdit && !isAddingItem && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingItemId(null);
                setIsAddingItem(true);
              }}
              disabled={isBusy}
              data-testid={`add-activity-day-${day.dayOrder}`}
            >
              + Add Activity
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="form-alert form-alert-error" role="alert">
          {actionError}
        </div>
      )}

      <div className="itinerary-day-notes-box">
        <div className="itinerary-day-notes-header">
          <span className="itinerary-notes-label">Day Notes &amp; Overview</span>
          {canEdit && !isEditingNotes && (
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => {
                setNotesError(null);
                setNotesDraft(day.notes || '');
                setIsEditingNotes(true);
              }}
              disabled={isBusy}
              data-testid={`edit-notes-day-${day.dayOrder}`}
            >
              {day.notes ? 'Edit Notes' : '+ Add Day Notes'}
            </button>
          )}
        </div>

        {isEditingNotes && canEdit ? (
          <form onSubmit={handleSaveNotesSubmit} className="itinerary-notes-form">
            {notesError && (
              <div className="form-alert form-alert-error" role="alert">
                {notesError}
              </div>
            )}
            <label
              htmlFor={`day-notes-input-${day.dayOrder}`}
              className="sr-only"
            >
              Notes for Day {day.dayOrder}
            </label>
            <textarea
              id={`day-notes-input-${day.dayOrder}`}
              className="form-textarea"
              rows={2}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              maxLength={5000}
              placeholder="Add general plans, hotel check-in reminders, or transport notes for this day..."
              disabled={isSavingNotes}
            />
            <div className="form-actions" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => {
                  setIsEditingNotes(false);
                  setNotesDraft(day.notes || '');
                  setNotesError(null);
                }}
                disabled={isSavingNotes}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-xs"
                disabled={isSavingNotes}
              >
                {isSavingNotes ? 'Saving...' : 'Save Day Notes'}
              </button>
            </div>
          </form>
        ) : (
          <p className="itinerary-day-notes-text">
            {day.notes || 'No notes recorded for this day yet.'}
          </p>
        )}
      </div>

      {isAddingItem && canEdit && (
        <div className="itinerary-inline-form-wrapper">
          <h4 className="detail-subheading">
            New Activity for Day {day.dayOrder} ({day.dayDate})
          </h4>
          <ItineraryItemForm
            dayOrder={day.dayOrder}
            dayDate={day.dayDate}
            currency={currency}
            onSubmit={handleCreateActivity}
            onCancel={() => setIsAddingItem(false)}
            isSubmitting={isSubmittingItem}
            submitLabel="Save Activity"
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="itinerary-empty-day">
          <p>
            No activities scheduled for Day {day.dayOrder} ({day.dayDate}) yet.
          </p>
          {canEdit && !isAddingItem && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsAddingItem(true)}
            >
              + Add First Activity
            </button>
          )}
        </div>
      ) : (
        <div
          className="itinerary-items-list"
          role="list"
          aria-label={`Activities for Day ${day.dayOrder}`}
        >
          {items.map((item, idx) =>
            editingItemId === item.id && canEdit ? (
              <div key={item.id} className="itinerary-inline-form-wrapper">
                <h4 className="detail-subheading">
                  Edit Activity #{item.sortOrder}: {item.title}
                </h4>
                <ItineraryItemForm
                  dayOrder={day.dayOrder}
                  dayDate={day.dayDate}
                  currency={currency}
                  initialValues={item}
                  onSubmit={(updates) => handleUpdateActivity(item.id, updates)}
                  onCancel={() => setEditingItemId(null)}
                  isSubmitting={isSubmittingItem}
                  submitLabel="Update Activity"
                />
              </div>
            ) : (
              <ItineraryItemCard
                key={item.id}
                item={item}
                index={idx}
                totalItems={items.length}
                currency={currency}
                canEdit={canEdit}
                isBusy={isBusy}
                onEdit={() => {
                  setIsAddingItem(false);
                  setEditingItemId(item.id);
                }}
                onDelete={() => setItemToDelete(item)}
                onMoveUp={() => triggerReorder(idx, idx - 1)}
                onMoveDown={() => triggerReorder(idx, idx + 1)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedIndex === idx}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}
