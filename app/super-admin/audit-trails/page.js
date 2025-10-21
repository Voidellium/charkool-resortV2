"use client";
import { useEffect, useMemo, useState } from 'react';
import { 
  CheckCircle, 
  Edit3, 
  Trash2, 
  FileText,
  Search
} from 'lucide-react';
import styles from './page.module.css';
import SuperAdminLayout from '@/components/SuperAdminLayout';

function timeAgo(iso) {
	const then = new Date(iso);
	const diff = Date.now() - then.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	return `${days}d ago`;
}

// Convert booking data to human-readable format
function humanizeBookingData(data, isComparison = false) {
	if (!data) return null;
	
	const formatDate = (dateStr) => {
		if (!dateStr) return 'Not specified';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { 
			weekday: 'long', 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric' 
		});
	};

	const formatCurrency = (amount) => {
		if (typeof amount === 'number') {
			return `₱${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
		}
		return amount;
	};

	const humanData = {};

	if (data.guestName) humanData['Guest Name'] = data.guestName;
	if (data.checkIn) humanData['Check-in Date'] = formatDate(data.checkIn);
	if (data.checkOut) humanData['Check-out Date'] = formatDate(data.checkOut);
	if (data.status) humanData['Booking Status'] = data.status.charAt(0).toUpperCase() + data.status.slice(1);
	if (data.paymentStatus) humanData['Payment Status'] = data.paymentStatus.replace(/([A-Z])/g, ' $1').trim();
	if (data.totalPrice) humanData['Total Amount'] = formatCurrency(data.totalPrice);
	if (data.numberOfGuests) humanData['Number of Guests'] = `${data.numberOfGuests} guest${data.numberOfGuests > 1 ? 's' : ''}`;
	
	// Handle rooms array
	if (data.rooms && Array.isArray(data.rooms) && data.rooms.length > 0) {
		humanData['Rooms'] = data.rooms.map(room => {
			const roomInfo = [];
			if (room.room?.name) roomInfo.push(room.room.name);
			if (room.room?.type) roomInfo.push(`(${room.room.type})`);
			if (room.quantity > 1) roomInfo.push(`× ${room.quantity}`);
			return roomInfo.join(' ');
		}).join(', ');
	}

	if (data.createdAt) humanData['Created'] = formatDate(data.createdAt);
	if (data.cancellationRemarks) humanData['Cancellation Reason'] = data.cancellationRemarks;

	return humanData;
}

// Compare two booking objects and return human-readable changes
function getBookingChanges(before, after) {
	const beforeHuman = humanizeBookingData(before);
	const afterHuman = humanizeBookingData(after);
	const changes = [];

	for (const [key, afterValue] of Object.entries(afterHuman)) {
		const beforeValue = beforeHuman[key];
		if (beforeValue !== afterValue) {
			changes.push({
				field: key,
				before: beforeValue || 'Not set',
				after: afterValue
			});
		}
	}

	return changes;
}

export default function AuditTrailsPage() {
	const [loading, setLoading] = useState(true);
	const [records, setRecords] = useState([]);
	const [query, setQuery] = useState('');
	const [roleFilter, setRoleFilter] = useState('ALL');
	const [actionFilter, setActionFilter] = useState('ALL');
	const [currentPage, setCurrentPage] = useState(1);
	const RECORDS_PER_PAGE = 8;

	useEffect(() => {
		let mounted = true;
			setLoading(true);
			fetch('/api/audit-trails')
			.then((r) => r.json())
			.then((json) => {
				if (!mounted) return;
				console.log('Audit API Response:', json);
				console.log('Data array:', json?.data);
				console.log('Is array?:', Array.isArray(json?.data));
				console.log('Data length:', json?.data?.length);
				setRecords(Array.isArray(json?.data) ? json.data : []);
			})
			.catch((err) => {
				console.error('Failed to load audit trails', err);
				setRecords([]);
			})
			.finally(() => mounted && setLoading(false));

		return () => {
			mounted = false;
		};
	}, []);

	const roles = useMemo(() => {
		const s = new Set(records.map((r) => r.actorRole || 'UNKNOWN'));
		return ['ALL', ...Array.from(s)];
	}, [records]);

	const actions = useMemo(() => {
		const s = new Set(records.map((r) => r.action || 'UNKNOWN'));
		return ['ALL', ...Array.from(s)];
	}, [records]);

	const filtered = useMemo(() => {
		return records.filter((r) => {
			if (roleFilter !== 'ALL' && r.actorRole !== roleFilter) return false;
			if (actionFilter !== 'ALL' && r.action !== actionFilter) return false;
			if (query) {
				const q = query.toLowerCase();
				return (
					(r.actorName || '').toLowerCase().includes(q) ||
					(r.entity || '').toLowerCase().includes(q) ||
					(r.details || '').toLowerCase().includes(q)
				);
			}
			return true;
		});
	}, [records, roleFilter, actionFilter, query]);

	// Reset to first page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [roleFilter, actionFilter, query]);

	// Group adjacent records by actor to avoid repeating actor header
	const grouped = useMemo(() => {
		const groups = [];
		for (const r of filtered) {
			const last = groups[groups.length - 1];
			if (last && last.actorName === r.actorName && last.actorRole === r.actorRole && last.actorId === r.actorId) {
				last.items.push(r);
			} else {
				groups.push({ actorId: r.actorId || null, actorName: r.actorName, actorRole: r.actorRole, items: [r] });
			}
		}
		return groups;
	}, [filtered]);

	// Pagination calculation
	const totalPages = Math.ceil(grouped.length / RECORDS_PER_PAGE);
	const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
	const paginatedGroups = grouped.slice(startIndex, startIndex + RECORDS_PER_PAGE);

	// Modal state for showing actor profile
	const [modalOpen, setModalOpen] = useState(false);
	const [modalActor, setModalActor] = useState(null);
	const [modalLoading, setModalLoading] = useState(false);

	// Full entry modal
	const [entryModalOpen, setEntryModalOpen] = useState(false);
	const [entryData, setEntryData] = useState(null);

	function openEntryModal(entry) {
		let parsed = null;
		try { parsed = JSON.parse(entry.details); } catch (e) { parsed = null; }
		setEntryData({ raw: entry, parsed });
		setEntryModalOpen(true);
	}

	function closeEntryModal() {
		setEntryModalOpen(false);
		setEntryData(null);
	}

	function fmtDate(d) {
		if (!d) return '—';
		try { return new Date(d).toLocaleString(); } catch (e) { return String(d); }
	}

	function fmtMoney(cents) {
		if (cents === undefined || cents === null) return '—';
		return `₱${(Number(cents) / 100).toFixed(2)}`;
	}

	function fmtDateFull(d) {
		if (!d) return '—';
		try {
			const dt = new Date(d);
			return dt.toLocaleString();
		} catch (e) { return String(d); }
	}

	function renderBookingDetails(snapshot = {}) {
		if (!snapshot) return <div>No data</div>;
		return (
			<div>
				<div><strong>Name:</strong> {snapshot.guestName || '—'}</div>
				<div><strong>Check in:</strong> {fmtDateFull(snapshot.checkIn)}</div>
				<div><strong>Check out:</strong> {fmtDateFull(snapshot.checkOut)}</div>
				<div><strong>Created time:</strong> {fmtDateFull(snapshot.createdAt || snapshot.created)}</div>
				<div><strong>Status:</strong> {snapshot.status || snapshot.paymentStatus || '—'}</div>
				<div><strong>Updated time:</strong> {fmtDateFull(snapshot.updatedAt || snapshot.updated)}</div>
				<div style={{ marginTop: 8 }}><strong>Optional Amenities:</strong>{renderAmenities(snapshot.optionalAmenities)}</div>
				<div style={{ marginTop: 8 }}><strong>Rental Amenities:</strong>{renderAmenities(snapshot.rentalAmenities)}</div>
				<div style={{ marginTop: 8 }}><strong>Cottage:</strong> {snapshot.cottage || snapshot.cottageName || snapshot.roomName || '—'}</div>
			</div>
		);
	}

	function computeChanges(before = {}, after = {}) {
		const keys = ['guestName','checkIn','checkOut','status','paymentStatus','totalPrice'];
		const changes = [];

		for (const k of keys) {
			const b = before[k];
			const a = after[k];
			if (k === 'checkIn' || k === 'checkOut') {
				if (String(b) !== String(a)) changes.push({ field: k, before: fmtDate(b), after: fmtDate(a) });
				continue;
			}
			if (k === 'totalPrice') {
				if (Number(b || 0) !== Number(a || 0)) changes.push({ field: k, before: fmtMoney(b), after: fmtMoney(a) });
				continue;
			}
			if (String(b) !== String(a)) changes.push({ field: k, before: b ?? '—', after: a ?? '—' });
		}

		// Rooms diff (if present)
		const prevRooms = (before.rooms || []).reduce((acc, r) => { acc[r.roomId || r.room?.id || r.id] = (r.quantity ?? 1); return acc; }, {});
		const newRooms = (after.rooms || []).reduce((acc, r) => { acc[r.roomId || r.room?.id || r.id] = (r.quantity ?? 1); return acc; }, {});
		const allRoomIds = new Set([...Object.keys(prevRooms), ...Object.keys(newRooms)]);
		const roomChanges = [];
		allRoomIds.forEach((rid) => {
			const prevQ = prevRooms[rid] || 0;
			const newQ = newRooms[rid] || 0;
			if (prevQ !== newQ) {
				// try to find a friendly room name
				const prevName = (before.rooms || []).find(r => String(r.roomId || r.room?.id || r.id) === String(rid))?.room?.name;
				const newName = (after.rooms || []).find(r => String(r.roomId || r.room?.id || r.id) === String(rid))?.room?.name;
				const name = newName || prevName || `Room ${rid}`;
				roomChanges.push({ field: 'rooms', name, before: prevQ, after: newQ });
			}
		});
		if (roomChanges.length) changes.push({ field: 'rooms', changes: roomChanges });

		return changes;
	}

	function renderRooms(rooms = []) {
		if (!rooms || rooms.length === 0) return <div>None</div>;
		return (
			<ul style={{ margin: 0, paddingLeft: 16 }}>
				{rooms.map((r, i) => {
					const name = r.room?.name || r.roomName || `Room ${r.roomId || r.id}`;
					const qty = r.quantity ?? 1;
					const price = r.room?.price ?? r.price ?? null;
					return (
						<li key={i}>{name} — qty: {qty}{price ? ` — ${fmtMoney(price)}` : ''}</li>
					);
				})}
			</ul>
		);
	}

	function renderAmenities(list = [], keyName = 'name') {
		if (!list || list.length === 0) return <div>None</div>;
		return (
			<ul style={{ margin: 0, paddingLeft: 16 }}>
				{list.map((a, i) => (
					<li key={i}>{a[keyName] || a.name || `Item ${i+1}`}{a.quantity ? ` — qty: ${a.quantity}` : ''}{a.totalPrice ? ` — ${fmtMoney(a.totalPrice)}` : ''}</li>
				))}
			</ul>
		);
	}

	function renderBookingSummary(snapshot = {}) {
		if (!snapshot) return <div>No data</div>;
		return (
			<div>
				<div><strong>Guest</strong>: {snapshot.guestName || '—'}</div>
				<div><strong>Dates</strong>: {fmtDate(snapshot.checkIn)} → {fmtDate(snapshot.checkOut)}</div>
				<div style={{ marginTop: 8 }}><strong>Rooms</strong>:{renderRooms(snapshot.rooms)}</div>
				<div style={{ marginTop: 8 }}><strong>Optional Amenities</strong>:{renderAmenities(snapshot.optionalAmenities, 'optionalAmenity' in (snapshot.optionalAmenities?.[0]||{}) ? 'optionalAmenity' : 'name')}</div>
				<div style={{ marginTop: 8 }}><strong>Rental Amenities</strong>:{renderAmenities(snapshot.rentalAmenities, 'rentalAmenity' in (snapshot.rentalAmenities?.[0]||{}) ? 'rentalAmenity' : 'name')}</div>
				<div style={{ marginTop: 8 }}><strong>Total</strong>: {fmtMoney(snapshot.totalPrice)}</div>
			</div>
		);
	}

	async function openActorModal(group) {
		setModalOpen(true);
		setModalActor(null);
		if (!group.actorId) {
			// No actorId — show name/role only
			setModalActor({ name: group.actorName, role: group.actorRole });
			return;
		}
		setModalLoading(true);
		try {
			const res = await fetch(`/api/user/${group.actorId}`);
			if (!res.ok) throw new Error('Failed to fetch user');
			const user = await res.json();
			setModalActor(user);
		} catch (err) {
			console.error('Failed to load actor profile', err);
			setModalActor({ name: group.actorName, role: group.actorRole });
		} finally {
			setModalLoading(false);
		}
	}

	function closeModal() {
		setModalOpen(false);
		setModalActor(null);
	}

		return (
			<SuperAdminLayout activePage="audit-trails">
				<div className={styles.container}>
					<div className={styles.header}>
						<div className={styles.title}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', marginRight: '0.5rem' }}>
							<path d="M9.5 3V9L15 15V3C15 2.45 14.55 2 14 2H5C4.45 2 4 2.45 4 3V21C4 21.55 4.45 22 5 22H14C14.55 22 15 21.55 15 21V17L9.5 11V3Z" fill="currentColor"/>
							<path d="M20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill="currentColor"/>
						</svg>
						Audit Trails
					</div>
					<div className={styles.subtitle}>Records of administrative changes across the system</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
					<div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.875rem', color: '#64748b' }}>
						<span style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
								<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
								<path d="M8 12h8M8 8h8M8 16h8" stroke="currentColor" strokeWidth="2"/>
							</svg>
							Total Records: <strong style={{ color: '#1e293b' }}>{records.length}</strong>
						</span>
						<span style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
								<circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
								<path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
							</svg>
							Filtered: <strong style={{ color: '#1e293b' }}>{filtered.length}</strong>
						</span>
					</div>
					<div className={styles.controls}>
						<input
							aria-label="Search audit trails"
							placeholder="Search by actor, entity or details..."
							className={styles.search}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>

						<select className={styles.filter} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
							{roles.map((r) => (
								<option key={r} value={r}>
									{r === 'ALL' ? 'All Roles' : 
									 r === 'SUPERADMIN' ? 'Super Admin' :
									 r === 'RECEPTIONIST' ? 'Receptionist' :
									 r === 'CASHIER' ? 'Cashier' :
									 r === 'AMENITYINVENTORYMANAGER' ? 'Amenity Manager' : r}
								</option>
							))}
						</select>

						<select className={styles.filter} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
							{actions.map((a) => (
								<option key={a} value={a}>
									{a === 'ALL' ? 'All Actions' :
									 a === 'CREATE' ? 'Create' :
									 a === 'UPDATE' ? 'Update' :
									 a === 'DELETE' ? 'Delete' : a}
								</option>
							))}
						</select>
					</div>
				</div>

			{loading ? (
				<div className={styles.loading}>
					<div className={styles.loadingSpinner}></div>
					<span className={styles.loadingText}>Loading audit trails...</span>
				</div>
			) : filtered.length === 0 ? (
				<div className={styles.empty}>
					<div className={styles.emptyIcon}>
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17ZM17 21V10L13 6H7V19H17Z"/>
						</svg>
					</div>
					<div className={styles.emptyText}>No audit records found</div>
					<div className={styles.emptySubtext}>Try adjusting your search filters or create some activity to see audit logs here.</div>
				</div>
			) : (
				<div>
					<div className={styles.list}>
						{paginatedGroups.map((g, gi) => (
						<div key={`${g.actorName}-${gi}`} className={styles.group}>
							<div className={styles.groupItems}>
								{g.items.map((r) => (
									<div className={styles.card} key={r.id} onClick={() => openEntryModal(r)} style={{ cursor: 'pointer' }}>
										<div 
											className={styles.avatar} 
											title={`${r.actorName} (${r.actorRole}) - Click to view profile`} 
											onClick={(e) => { e.stopPropagation(); openActorModal({ actorId: r.actorId, actorName: r.actorName, actorRole: r.actorRole }); }} 
											style={{ 
												cursor: 'pointer',
												background: r.actorRole === 'SUPERADMIN' ? 'linear-gradient(135deg, #EBB307, #EBD591)' :
														   r.actorRole === 'RECEPTIONIST' ? 'linear-gradient(135deg, #EBCE07, #EBD591)' :
														   r.actorRole === 'CASHIER' ? 'linear-gradient(135deg, #EBEA07, #EBD591)' :
														   r.actorRole === 'AMENITYINVENTORYMANAGER' ? 'linear-gradient(135deg, #FEBE52, #EBD591)' :
														   'linear-gradient(135deg, #EB7407, #EBD591)'
											}}
										>
											{(() => {
												// Role-specific icons
												if (r.actorRole === 'SUPERADMIN') {
													return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
														<path d="M12 6L13.13 10.26L17.7 11.08L14.85 13.84L15.61 18.36L12 16.1L8.39 18.36L9.15 13.84L6.3 11.08L10.87 10.26L12 6Z"/>
													</svg>;
												}
												if (r.actorRole === 'RECEPTIONIST') {
													return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
														<path d="M7 13C7 12.45 7.45 12 8 12S9 12.45 9 13 8.55 14 8 14 7 13.55 7 13M13 13C13 12.45 13.45 12 14 12S15 12.45 15 13 14.55 14 14 14 13 13.55 13 13M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V8H19V19Z"/>
													</svg>;
												}
												if (r.actorRole === 'CASHIER') {
													return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
														<path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M12 6C8.69 6 6 8.69 6 12S8.69 18 12 18 18 15.31 18 12 15.31 6 12 6M12 16C9.79 16 8 14.21 8 12S9.79 8 12 8 16 9.79 16 12 14.21 16 12 16Z"/>
													</svg>;
												}
												if (r.actorRole === 'AMENITYINVENTORYMANAGER') {
													return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
														<path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M7 7H17V9H7V7M7 11H17V13H7V11M7 15H17V17H7V15Z"/>
													</svg>;
												}
												// Fallback to initials
												return (r.actorName || '?').split(' ').map(n=>n[0]).slice(0,2).join('');
											})()}
										</div>
										<div className={styles.meta}>
											<div className={styles.metaTop}>
												<div>
													<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
														<div style={{ fontWeight: 700, cursor: 'pointer', color: '#4f46e5' }} onClick={(e) => { e.stopPropagation(); openActorModal({ actorId: r.actorId, actorName: r.actorName, actorRole: r.actorRole }); }} title="Click to view profile">{r.actorName}</div>
														<div className={styles.role} style={{ fontSize: '0.7rem' }}>{r.actorRole}</div>
														<div style={{ marginLeft: '8px', color: '#6b7280' }}>·</div>
														<div style={{ color: '#6b7280', fontSize: '0.85rem' }} title={new Date(r.timestamp).toLocaleString()}>{timeAgo(r.timestamp)}</div>
													</div>
													{/* Prefer human summary from structured details when available; hide backend-only labels like 'UPDATE Room' */}
													{(() => {
														let parsed = null;
														try { parsed = JSON.parse(r.details); } catch (e) { parsed = null; }
														
														// Get action class for styling
														const actionClass = r.action === 'CREATE' ? styles.actionCreate : 
																		   r.action === 'UPDATE' ? styles.actionUpdate : 
																		   r.action === 'DELETE' ? styles.actionDelete : styles.action;
														
														// If this is a booking create, don't duplicate a preview here (we show it in the card details below)
														if (r.action === 'CREATE' && r.entity === 'Booking') {
															return null;
														}
														if (parsed && parsed.summary) {
															return <div className={styles.details} style={{ marginTop: '6px' }}>{parsed.summary}</div>;
														}
														// If we have before/after and it's a Room update that changed the name, show a friendly message
														if (parsed && parsed.before && parsed.after && r.action === 'UPDATE' && r.entity === 'Room') {
															const beforeName = parsed.before.name || parsed.before.roomName || parsed.before.title || null;
															const afterName = parsed.after.name || parsed.after.roomName || parsed.after.title || null;
															if (beforeName && afterName && beforeName !== afterName) {
																return <div className={styles.details} style={{ marginTop: '6px' }}>Updated room "{beforeName}" → "{afterName}"</div>;
															}
														}
														// Hide raw backend update labels for Room entities when not informative
														if (r.action === 'UPDATE' && r.entity === 'Room') return null;
														return <div className={styles.details} style={{ marginTop: '6px' }}><span className={actionClass}>{r.action}</span> {r.entity}</div>;
													})()}
												</div>
                                                
											</div>
											{/* Show concise preview in the card; full JSON is available in modal when clicked */}
											<div className={styles.details}>
												{(() => {
													let parsed = null;
													try { parsed = JSON.parse(r.details); } catch (e) { parsed = null; }
													
													// Generate user-friendly preview text based on action and entity
													const actorName = r.actorName || 'Someone';
													
													if (r.action === 'CREATE') {
														if (r.entity === 'Booking') {
															const guestName = parsed?.after?.guestName || parsed?.guestName;
															return `${actorName} created a booking${guestName ? ` for ${guestName}` : ''}`;
														}
														if (r.entity === 'Payment') {
															return `${actorName} created a payment`;
														}
														if (r.entity === 'Room') {
															const roomName = parsed?.after?.name || parsed?.name;
															return `${actorName} created a room${roomName ? ` "${roomName}"` : ''}`;
														}
														return `${actorName} created ${r.entity.toLowerCase()}`;
													}
													
													if (r.action === 'UPDATE') {
														if (r.entity === 'Booking') {
															const guestName = parsed?.after?.guestName || parsed?.before?.guestName;
															return `${actorName} updated a booking${guestName ? ` for ${guestName}` : ''}`;
														}
														if (r.entity === 'Payment') {
															return `${actorName} updated a payment`;
														}
														if (r.entity === 'Room') {
															const roomName = parsed?.after?.name || parsed?.before?.name;
															return `${actorName} updated a room${roomName ? ` "${roomName}"` : ''}`;
														}
														return `${actorName} updated ${r.entity.toLowerCase()}`;
													}
													
													if (r.action === 'DELETE') {
														if (r.entity === 'Booking') {
															const guestName = parsed?.before?.guestName;
															return `${actorName} deleted a booking${guestName ? ` for ${guestName}` : ''}`;
														}
														return `${actorName} deleted ${r.entity.toLowerCase()}`;
													}
													
													if (r.action === 'CANCEL' && r.entity === 'Booking') {
														const guestName = parsed?.after?.guestName || parsed?.before?.guestName;
														return `${actorName} cancelled a booking${guestName ? ` for ${guestName}` : ''}`;
													}
													
													// Fallback for other actions
													if (parsed && parsed.summary) return parsed.summary;
													return `${actorName} performed ${r.action.toLowerCase()} on ${r.entity.toLowerCase()}`;
												})()}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
					
					{/* Pagination Controls */}
					{totalPages > 1 && (
						<div style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginTop: '2rem',
							padding: '1rem',
							background: 'rgba(255,255,255,0.9)',
							borderRadius: '12px',
							boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
						}}>
							<span style={{
								color: '#666',
								fontSize: '0.9rem'
							}}>
								Showing {startIndex + 1}-{Math.min(startIndex + RECORDS_PER_PAGE, grouped.length)} of {grouped.length} groups
							</span>
							
							<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
								<button
									onClick={() => setCurrentPage(currentPage - 1)}
									disabled={currentPage === 1}
									style={{
										padding: '8px 12px',
										border: '1px solid #e5e7eb',
										borderRadius: '8px',
										background: currentPage === 1 ? '#f9fafb' : 'white',
										color: currentPage === 1 ? '#9ca3af' : '#374151',
										cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
										fontSize: '0.875rem',
										fontWeight: '500',
										transition: 'all 0.2s ease'
									}}
								>
									Previous
								</button>
								
								<div style={{ display: 'flex', gap: '0.25rem' }}>
									{[...Array(totalPages)].map((_, i) => {
										const page = i + 1;
										return (
											<button
												key={page}
												onClick={() => setCurrentPage(page)}
												style={{
													padding: '8px 12px',
													border: '1px solid #e5e7eb',
													borderRadius: '8px',
													background: currentPage === page ? 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)' : 'white',
													color: currentPage === page ? 'white' : '#374151',
													cursor: 'pointer',
													fontSize: '0.875rem',
													fontWeight: '500',
													minWidth: '40px',
													transition: 'all 0.2s ease'
												}}
											>
												{page}
											</button>
										);
									})}
								</div>
								
								<button
									onClick={() => setCurrentPage(currentPage + 1)}
									disabled={currentPage === totalPages}
									style={{
										padding: '8px 12px',
										border: '1px solid #e5e7eb',
										borderRadius: '8px',
										background: currentPage === totalPages ? '#f9fafb' : 'white',
										color: currentPage === totalPages ? '#9ca3af' : '#374151',
										cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
										fontSize: '0.875rem',
										fontWeight: '500',
										transition: 'all 0.2s ease'
									}}
								>
									Next
								</button>
							</div>
						</div>
					)}
				</div>

			{/* Actor profile modal */}
			{modalOpen && (
				<div className={styles.modalBackdrop} onClick={closeModal}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<button className={styles.modalClose} onClick={closeModal}>×</button>
						{modalLoading ? (
							<div>Loading...</div>
						) : modalActor ? (
							<div>
								<div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
									<div style={{ width: 64, height: 64, borderRadius: 8, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{(modalActor.name || '?').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
									<div>
										<div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{modalActor.name}</div>
										<div style={{ color: '#666' }}>{modalActor.role || modalActor.actorRole}</div>
									</div>
								</div>
								<hr style={{ margin: '12px 0' }} />
								<div>
									{modalActor.email && <div><strong>Email:</strong> {modalActor.email}</div>}
									{modalActor.contactNumber && <div><strong>Phone:</strong> {modalActor.contactNumber}</div>}
									{modalActor.redirectUrl && <div><strong>Redirect:</strong> {modalActor.redirectUrl}</div>}
									{/* Add other profile fields as available */}
								</div>
							</div>
						) : (
							<div>No profile available</div>
						)}
					</div>
				</div>
			)}

			{/* Full entry modal */}
			{entryModalOpen && entryData && (
				<div className={styles.modalBackdrop} onClick={closeEntryModal}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<button className={styles.modalClose} onClick={closeEntryModal}>×</button>
						<h3 style={{ 
							marginTop: 0, 
							display: 'flex', 
							alignItems: 'center', 
							gap: '0.5rem',
							color: entryData.raw.action === 'CREATE' ? '#16a34a' : 
								   entryData.raw.action === 'UPDATE' ? '#2563eb' : 
								   entryData.raw.action === 'DELETE' ? '#dc2626' : '#374151'
						}}>
							<span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '8px' }}>
								{entryData.raw.action === 'CREATE' ? <CheckCircle size={20} /> : 
								 entryData.raw.action === 'UPDATE' ? <Edit3 size={20} /> : 
								 entryData.raw.action === 'DELETE' ? <Trash2 size={20} /> : <FileText size={20} />}
							</span>
							{entryData.raw.action === 'CREATE' ? 'Created' : 
							 entryData.raw.action === 'UPDATE' ? 'Updated' : 
							 entryData.raw.action === 'DELETE' ? 'Deleted' : 
							 entryData.raw.action} {entryData.raw.entity}
						</h3>
						<div style={{ color: '#6b7280', marginBottom: 12 }}>{new Date(entryData.raw.timestamp).toLocaleString()} — by {entryData.raw.actorName} ({entryData.raw.actorRole})</div>
						{entryData.parsed ? (
							// If parsed JSON exists, display appropriate content based on action type
							<div>
								{entryData.parsed.summary && <div style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: '500' }}>{entryData.parsed.summary}</div>}
								
								{/* For EDIT/UPDATE actions, show what changed */}
								{entryData.raw.action === 'UPDATE' && entryData.parsed.before && entryData.parsed.after && (
									<div>
										<h4 style={{ marginTop: 16, marginBottom: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
											<Edit3 size={18} />
											Changes Made:
										</h4>
										{(() => {
											const changes = getBookingChanges(entryData.parsed.before, entryData.parsed.after);
											return changes.length ? (
												<div style={{ 
													background: 'linear-gradient(135deg, #fef2f2 0%, #fdf2f8 100%)', 
													border: '1px solid #fecaca', 
													borderRadius: 12, 
													padding: 20,
													boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
												}}>
													{changes.map((change, i) => (
														<div key={i} style={{ 
															marginBottom: i < changes.length - 1 ? 16 : 0,
															padding: '12px',
															background: 'rgba(255, 255, 255, 0.6)',
															borderRadius: '8px',
															border: '1px solid rgba(239, 68, 68, 0.1)'
														}}>
															<div style={{ 
																fontWeight: '600', 
																color: '#374151', 
																marginBottom: '6px',
																fontSize: '0.95rem'
															}}>
																{change.field}
															</div>
															<div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
																<div style={{ 
																	background: '#fee2e2', 
																	padding: '6px 12px', 
																	borderRadius: '6px', 
																	color: '#dc2626',
																	fontSize: '0.9rem',
																	fontWeight: '500'
																}}>
																	Before: {change.before}
																</div>
																<span style={{ color: '#6b7280', fontWeight: 'bold' }}>→</span>
																<div style={{ 
																	background: '#dcfce7', 
																	padding: '6px 12px', 
																	borderRadius: '6px', 
																	color: '#16a34a',
																	fontSize: '0.9rem',
																	fontWeight: '500'
																}}>
																	After: {change.after}
																</div>
															</div>
														</div>
													))}
												</div>
											) : (
												<div style={{ color: '#6b7280', fontStyle: 'italic' }}>No specific field changes detected in this update.</div>
											);
										})()}
									</div>
								)}
								
								{/* For CREATE actions, show what was created */}
								{entryData.raw.action === 'CREATE' && entryData.parsed.after && (
									<div>
										<h4 style={{ marginTop: 16, marginBottom: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
											<CheckCircle size={18} />
											New {entryData.raw.entity} Details:
										</h4>
										<div style={{ 
											background: 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)', 
											border: '1px solid #bbf7d0', 
											borderRadius: 12, 
											padding: 20,
											boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
										}}>
											{(() => {
												const humanData = humanizeBookingData(entryData.parsed.after);
												return humanData ? (
													<div style={{ display: 'grid', gap: '12px' }}>
														{Object.entries(humanData).map(([key, value]) => (
															<div key={key} style={{ 
																background: 'rgba(255, 255, 255, 0.7)',
																padding: '12px 16px',
																borderRadius: '8px',
																border: '1px solid rgba(34, 197, 94, 0.1)',
																display: 'flex',
																justifyContent: 'space-between',
																alignItems: 'center'
															}}>
																<span style={{ fontWeight: '600', color: '#374151' }}>{key}:</span>
																<span style={{ color: '#16a34a', fontWeight: '500' }}>{value}</span>
															</div>
														))}
													</div>
												) : (
													<div style={{ color: '#6b7280', fontStyle: 'italic' }}>No readable data available</div>
												);
											})()}
											
											{/* Technical Details - Collapsible */}
											<div style={{ marginTop: 16 }}>
												<details style={{ cursor: 'pointer' }}>
													<summary style={{ 
														padding: '8px 12px',
														background: 'rgba(255, 255, 255, 0.8)',
														borderRadius: '6px',
														border: '1px solid rgba(34, 197, 94, 0.2)',
														fontWeight: '500',
														fontSize: '0.9rem',
														color: '#374151',
														display: 'flex',
														alignItems: 'center',
														gap: '6px'
													}}>
														<FileText size={14} />
														View Complete Technical Data
													</summary>
													<div style={{ 
														marginTop: 8,
														background: 'rgba(255, 255, 255, 0.9)',
														border: '1px solid rgba(34, 197, 94, 0.1)',
														borderRadius: '8px',
														overflow: 'hidden'
													}}>
														<pre style={{ 
															whiteSpace: 'pre-wrap', 
															padding: 16, 
															margin: 0,
															fontSize: '0.8rem',
															color: '#4b5563',
															maxHeight: '200px',
															overflowY: 'auto'
														}}>
															{JSON.stringify(entryData.parsed.after, null, 2)}
														</pre>
													</div>
												</details>
											</div>
										</div>
									</div>
								)}
								
								{/* For DELETE actions, show what was deleted */}
								{entryData.raw.action === 'DELETE' && entryData.parsed.before && (
									<div>
										<h4 style={{ marginTop: 16, marginBottom: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
											<Trash2 size={18} />
											Deleted {entryData.raw.entity} Details:
										</h4>
										<div style={{ 
											background: 'linear-gradient(135deg, #fef2f2 0%, #fdf2f8 100%)', 
											border: '1px solid #fecaca', 
											borderRadius: 12, 
											padding: 20,
											boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
										}}>
											{(() => {
												const humanData = humanizeBookingData(entryData.parsed.before);
												return humanData ? (
													<div style={{ display: 'grid', gap: '12px' }}>
														{Object.entries(humanData).map(([key, value]) => (
															<div key={key} style={{ 
																background: 'rgba(255, 255, 255, 0.7)',
																padding: '12px 16px',
																borderRadius: '8px',
																border: '1px solid rgba(239, 68, 68, 0.1)',
																display: 'flex',
																justifyContent: 'space-between',
																alignItems: 'center'
															}}>
																<span style={{ fontWeight: '600', color: '#374151' }}>{key}:</span>
																<span style={{ color: '#dc2626', fontWeight: '500' }}>{value}</span>
															</div>
														))}
													</div>
												) : (
													<div style={{ color: '#6b7280', fontStyle: 'italic' }}>No readable data available</div>
												);
											})()}
										</div>
									</div>
								)}
								
								{/* For other actions or when no before/after data */}
								{entryData.raw.action !== 'UPDATE' && entryData.raw.action !== 'CREATE' && entryData.raw.action !== 'DELETE' && (
									<div>
										<h4 style={{ marginTop: 16, marginBottom: 12 }}>Details:</h4>
										{entryData.raw.entity === 'Booking' ? renderBookingDetails(entryData.parsed) : 
										 <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 16, borderRadius: 6 }}>{JSON.stringify(entryData.parsed, null, 2)}</pre>}
									</div>
								)}
							</div>
						) : (
							// Fallback: show raw details
							<div>
								<pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 6 }}>{entryData.raw.details}</pre>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
		)}
		</div>

		{/* Actor profile modal */}
		</SuperAdminLayout>
	);
}


