import React, { useState, useEffect } from 'react';
import { User, ActivityLog } from '../types';
import { db } from '../services/dataService';
import { BONUS_ACTIVITIES } from '../constants';
import {
  Pencil,
  Trash2,
  X,
  Check,
  Calendar,
  Footprints,
  Activity,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface MyEntriesProps {
  user: User;
}

const ACTIVITY_TYPES = [
  'Walking',
  'Running',
  ...BONUS_ACTIVITIES.map(b => b.type)
];

const MyEntries: React.FC<MyEntriesProps> = ({ user }) => {
  const [entries, setEntries] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Edit form state
  const [editSteps, setEditSteps] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editActivityType, setEditActivityType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouping
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const fetchEntries = async () => {
    setLoading(true);
    const logs = await db.getUserLogs(user.id);
    setEntries(logs);
    setLoading(false);

    // Auto-expand today and yesterday (using Mountain Time)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterday = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    setExpandedDates(new Set([today, yesterday]));
  };

  useEffect(() => {
    fetchEntries();
  }, [user.id]);

  const startEdit = (entry: ActivityLog) => {
    setEditingId(entry.id);
    setEditSteps(entry.step_count.toString());
    setEditDate(entry.date_logged);
    setEditActivityType(entry.activity_type);
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSteps('');
    setEditDate('');
    setEditActivityType('');
  };

  const handleUpdate = async (entryId: number) => {
    if (isSubmitting || !editSteps || !editDate || !editActivityType) return;
    setIsSubmitting(true);

    const success = await db.updateLog(
      entryId,
      parseInt(editSteps),
      editActivityType,
      editDate
    );

    if (success) {
      await fetchEntries();
      cancelEdit();
    } else {
      alert('Failed to update entry. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (entryId: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const success = await db.deleteLog(entryId);

    if (success) {
      await fetchEntries();
      setDeleteConfirmId(null);
    } else {
      alert('Failed to delete entry. Please try again.');
    }
    setIsSubmitting(false);
  };

  const toggleDateExpand = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.date_logged;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

    if (dateStr === todayStr) {
      return 'Today';
    }
    if (dateStr === yesterdayStr) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActivityIcon = (type: string) => {
    if (type.startsWith('Bonus:')) {
      return '🎯';
    }
    if (type === 'Running') {
      return '🏃';
    }
    if (type.includes('Workout')) {
      return '💪';
    }
    return '🚶';
  };

  const totalSteps = entries.reduce((sum, e) => sum + e.step_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Activity className="mr-2 text-cyan-500" size={24} />
              My Activity Log
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all your logged entries
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-cyan-600">
              {totalSteps.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Total Steps
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
          <span>{entries.length} entries</span>
          <span>{sortedDates.length} days logged</span>
        </div>
      </div>

      {/* Entries by Date */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No entries yet</h3>
          <p className="text-gray-500 text-sm">
            Start logging your activities from the Dashboard!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => {
            const dateEntries = groupedEntries[date];
            const dayTotal = dateEntries.reduce((sum, e) => sum + e.step_count, 0);
            const isExpanded = expandedDates.has(date);

            return (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Date Header - Clickable */}
                <button
                  onClick={() => toggleDateExpand(date)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Calendar size={18} className="text-gray-400 mr-3" />
                    <div className="text-left">
                      <div className="font-bold text-gray-900">{formatDate(date)}</div>
                      <div className="text-xs text-gray-500">{dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-3">
                      <div className="font-bold text-cyan-600">{dayTotal.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">steps</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Entries List */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {dateEntries.map(entry => (
                      <div
                        key={entry.id}
                        className={`p-4 border-b border-gray-50 last:border-b-0 ${
                          editingId === entry.id ? 'bg-cyan-50' : ''
                        }`}
                      >
                        {editingId === entry.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-cyan-700">Editing Entry</span>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X size={18} />
                              </button>
                            </div>

                            {/* Steps Input */}
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Steps</label>
                              <input
                                type="number"
                                value={editSteps}
                                onChange={(e) => setEditSteps(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                              />
                            </div>

                            {/* Date Input */}
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                              />
                            </div>

                            {/* Activity Type */}
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Activity Type</label>
                              <select
                                value={editActivityType}
                                onChange={(e) => setEditActivityType(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                              >
                                {ACTIVITY_TYPES.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                                {/* Also allow current value if not in list (e.g., custom workouts) */}
                                {!ACTIVITY_TYPES.includes(editActivityType) && (
                                  <option value={editActivityType}>{editActivityType}</option>
                                )}
                              </select>
                            </div>

                            {/* Save/Cancel Buttons */}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleUpdate(entry.id)}
                                disabled={isSubmitting}
                                className="flex-1 bg-cyan-500 text-white py-2 rounded-lg font-bold text-sm hover:bg-cyan-600 disabled:opacity-50 flex items-center justify-center"
                              >
                                <Check size={16} className="mr-1" />
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : deleteConfirmId === entry.id ? (
                          // Delete Confirmation
                          <div className="bg-red-50 rounded-xl p-4">
                            <div className="flex items-start">
                              <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-red-800 mb-1">Delete this entry?</p>
                                <p className="text-xs text-red-600 mb-3">
                                  This will remove {entry.step_count.toLocaleString()} steps from your total. This cannot be undone.
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    disabled={isSubmitting}
                                    className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-600 disabled:opacity-50"
                                  >
                                    {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-4 py-1.5 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-white"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Normal View
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg mr-3">
                                {getActivityIcon(entry.activity_type)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">
                                  {entry.step_count.toLocaleString()} steps
                                </div>
                                <div className="text-xs text-gray-500">
                                  {entry.activity_type}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(entry)}
                                className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                title="Edit entry"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(entry.id);
                                  setEditingId(null);
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyEntries;
