'use client';
import { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import AdminDateCalendar from '@/components/AdminDateCalendar';
import { useToast } from '@/components/Toast';
import { Calendar, Clock, Settings, Trash2, Plus, AlertCircle, CheckCircle, X } from 'lucide-react';
import styles from './page.module.css';

// Format date to yyyy-mm-dd using UTC
function formatDate(date) {
  if (!date) return '';
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DateCustomizationPage() {
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [maxBookingMonths, setMaxBookingMonths] = useState(2);
  const [tempMaxMonths, setTempMaxMonths] = useState(2);
  const [disabledDates, setDisabledDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkType, setBulkType] = useState(''); // 'range', 'weekends'
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [currentTab, setCurrentTab] = useState('config'); // 'config' or 'disabled'
  
  const { success, error: errorToast, warning } = useToast();

  // Helper function to check if a date is disabled
  const isDateDisabled = (date) => {
    if (!date) return false;
    const dateStr = formatDate(date);
    return disabledDates.some(d => {
      // Use UTC date parts to avoid timezone issues
      const utcDate = new Date(d.date);
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const dbDateStr = `${year}-${month}-${day}`;
      return dbDateStr === dateStr;
    });
  };

  // Fetch current configuration and disabled dates
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch booking configuration
      const configRes = await fetch('/api/super-admin/booking-config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setMaxBookingMonths(configData.maxBookingMonths);
        setTempMaxMonths(configData.maxBookingMonths);
      }

      // Fetch disabled dates
      const datesRes = await fetch('/api/super-admin/disabled-dates');
      if (datesRes.ok) {
        const datesData = await datesRes.json();
        setDisabledDates(datesData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      errorToast('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  // Update max booking months
  const handleSaveConfig = async () => {
    if (tempMaxMonths < 1) {
      warning('Max booking months must be at least 1');
      return;
    }

    setSavingConfig(true);
    try {
      const res = await fetch('/api/super-admin/booking-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxBookingMonths: tempMaxMonths }),
      });

      if (res.ok) {
        setMaxBookingMonths(tempMaxMonths);
        success('Booking window updated successfully');
      } else {
        throw new Error('Failed to update configuration');
      }
    } catch (err) {
      console.error('Error updating config:', err);
      errorToast('Failed to update configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Add disabled date
  const handleAddDisabledDate = async (dateStr) => {
    if (!dateStr) return;

    // Check if already disabled
    const isAlreadyDisabled = disabledDates.some(d => {
      const utcDate = new Date(d.date);
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const dbDateStr = `${year}-${month}-${day}`;
      return dbDateStr === dateStr;
    });

    if (isAlreadyDisabled) {
      warning('This date is already disabled');
      return;
    }

    try {
      const res = await fetch('/api/super-admin/disabled-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: [dateStr] }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.created && data.created.length > 0) {
          success('Date disabled successfully');
          // Refresh the entire list to ensure accuracy
          await fetchData();
        }
      } else {
        const errorData = await res.json();
        console.error('API Error:', errorData);
        throw new Error('Failed to disable date');
      }
    } catch (err) {
      console.error('Error disabling date:', err);
      errorToast('Failed to disable date');
    }
  };

  // Remove disabled date
  const handleRemoveDisabledDate = async (id) => {
    try {
      const res = await fetch(`/api/super-admin/disabled-dates/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        success('Date re-enabled successfully');
        // Refresh the entire list to ensure accuracy
        await fetchData();
      } else {
        throw new Error('Failed to remove disabled date');
      }
    } catch (err) {
      console.error('Error removing disabled date:', err);
      errorToast('Failed to re-enable date');
    }
  };

  // Bulk disable dates (range or weekends)
  const handleBulkDisable = async () => {
    if (bulkType === 'range') {
      if (!bulkStartDate || !bulkEndDate) {
        warning('Please select both start and end dates');
        return;
      }

      const start = new Date(bulkStartDate);
      const end = new Date(bulkEndDate);
      
      if (start > end) {
        warning('Start date must be before end date');
        return;
      }

      // Generate all dates in range
      const datesToDisable = [];
      const current = new Date(start);
      while (current <= end) {
        datesToDisable.push(formatDate(current));
        current.setDate(current.getDate() + 1);
      }

      // Filter out already disabled dates
      const newDates = datesToDisable.filter(
        date => !disabledDates.some(d => formatDate(new Date(d.date)) === date)
      );

      if (newDates.length === 0) {
        warning('All dates in this range are already disabled');
        return;
      }

      try {
        const res = await fetch('/api/super-admin/disabled-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dates: newDates }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.created) {
            setDisabledDates([...disabledDates, ...data.created]);
            success(`Successfully disabled ${data.created.length} date(s)`);
            setShowBulkModal(false);
            setBulkStartDate('');
            setBulkEndDate('');
          }
        }
      } catch (err) {
        console.error('Error bulk disabling dates:', err);
        errorToast('Failed to disable dates');
      }
    }
  };

  // Calculate preview of max booking date
  const getMaxBookingDatePreview = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + tempMaxMonths);
    return formatDate(maxDate);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="spinner">Loading...</div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <Calendar className={styles.titleIcon} />
              Date Customization
            </h1>
            <p className={styles.subtitle}>
              Configure booking availability and manage disabled dates
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${currentTab === 'config' ? styles.tabActive : ''}`}
            onClick={() => setCurrentTab('config')}
          >
            <Settings size={18} />
            Booking Window Settings
          </button>
          <button
            className={`${styles.tab} ${currentTab === 'disabled' ? styles.tabActive : ''}`}
            onClick={() => setCurrentTab('disabled')}
          >
            <Calendar size={18} />
            Disabled Dates
          </button>
        </div>

        {/* Tab Content */}
        {currentTab === 'config' && (
          <div className={styles.section}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                <Clock size={20} />
                Maximum Booking Window
              </h2>
              <p className={styles.cardDescription}>
                Set how many months ahead customers can make bookings. This restriction will be applied across all booking interfaces.
              </p>

              <div className={styles.configForm}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Booking Months</label>
                  <input
                    type="number"
                    min="1"
                    value={tempMaxMonths}
                    onChange={(e) => setTempMaxMonths(parseInt(e.target.value) || 1)}
                    className={styles.input}
                  />
                  <p className={styles.hint}>
                    Customers can book up to {tempMaxMonths} month{tempMaxMonths !== 1 ? 's' : ''} in advance
                  </p>
                </div>

                <div className={styles.preview}>
                  <AlertCircle size={16} />
                  <div>
                    <strong>Preview:</strong> With current setting, bookings are available until{' '}
                    <span className={styles.previewDate}>{getMaxBookingDatePreview()}</span>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    onClick={handleSaveConfig}
                    disabled={savingConfig || tempMaxMonths === maxBookingMonths}
                    className={styles.btnPrimary}
                  >
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                  {tempMaxMonths !== maxBookingMonths && (
                    <button
                      onClick={() => setTempMaxMonths(maxBookingMonths)}
                      className={styles.btnSecondary}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'disabled' && (
          <div className={styles.section}>
            <div className={styles.gridLayout}>
              {/* Left: Calendar for selecting dates */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>
                  <Calendar size={20} />
                  Select Date to Manage
                </h2>
                <p className={styles.cardDescription}>
                  Click on a date in the calendar to enable or disable it
                </p>

                <div className={styles.calendarWrapper}>
                  <AdminDateCalendar
                    disabledDates={disabledDates.map(d => {
                      // Parse the UTC date and convert to local date string
                      const utcDate = new Date(d.date);
                      const year = utcDate.getUTCFullYear();
                      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
                      const day = String(utcDate.getUTCDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })}
                    onDateSelect={(date) => {
                      setSelectedDate(date);
                    }}
                  />
                </div>

                {/* Selected Date Info & Actions */}
                {selectedDate && (
                  <div className={styles.selectedDateCard}>
                    <div className={styles.selectedDateInfo}>
                      <div className={styles.selectedDateLabel}>Selected Date:</div>
                      <div className={styles.selectedDateValue}>
                        {selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      {isDateDisabled(selectedDate) ? (
                        <div className={styles.statusBadge} data-status="disabled">
                          <X size={14} />
                          Currently Disabled
                        </div>
                      ) : (
                        <div className={styles.statusBadge} data-status="enabled">
                          <CheckCircle size={14} />
                          Currently Available
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.bulkActions}>
                  {selectedDate && (
                    <>
                      {isDateDisabled(selectedDate) ? (
                        <button
                          onClick={async () => {
                            const disabledDate = disabledDates.find(d => d.date.split('T')[0] === formatDate(selectedDate));
                            if (disabledDate) {
                              setSelectedDate(null); // Clear immediately
                              await handleRemoveDisabledDate(disabledDate.id);
                            }
                          }}
                          className={styles.btnEnable}
                        >
                          <CheckCircle size={16} />
                          Enable Date
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            const dateStr = formatDate(selectedDate);
                            setSelectedDate(null); // Clear immediately
                            await handleAddDisabledDate(dateStr);
                          }}
                          className={styles.btnDisable}
                        >
                          <X size={16} />
                          Disable Date
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => {
                      setBulkType('range');
                      setShowBulkModal(true);
                    }}
                    className={styles.btnSecondary}
                  >
                    <Plus size={16} />
                    Disable Date Range
                  </button>
                </div>
              </div>

              {/* Right: List of disabled dates */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>
                  Disabled Dates ({disabledDates.length})
                </h2>
                <p className={styles.cardDescription}>
                  Manage currently disabled booking dates
                </p>

                <div className={styles.disabledList}>
                  {disabledDates.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Calendar size={48} className={styles.emptyIcon} />
                      <p>No disabled dates</p>
                      <p className={styles.emptyHint}>
                        Click on calendar dates to disable them
                      </p>
                    </div>
                  ) : (
                    <div className={styles.table}>
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Created</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disabledDates
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((disabledDate) => (
                              <tr key={disabledDate.id}>
                                <td>
                                  <strong>
                                    {new Date(disabledDate.date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </strong>
                                </td>
                                <td>
                                  {new Date(disabledDate.createdAt).toLocaleDateString()}
                                </td>
                                <td>
                                  <button
                                    onClick={() => handleRemoveDisabledDate(disabledDate.id)}
                                    className={styles.btnDelete}
                                    title="Re-enable this date"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Disable Modal */}
        {showBulkModal && (
          <div className={styles.modalOverlay} onClick={() => setShowBulkModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Disable Date Range</h3>
                <button onClick={() => setShowBulkModal(false)} className={styles.closeBtn}>
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Date</label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>End Date</label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={() => setShowBulkModal(false)} className={styles.btnSecondary}>
                  Cancel
                </button>
                <button onClick={handleBulkDisable} className={styles.btnPrimary}>
                  Disable Dates
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
